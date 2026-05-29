import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import type { ChatAdapter, ChatContact, ChatMessage, ChatEvent } from './chat-adapter'
import { APPSYNC_CONFIG } from './appsync-config'

// ── Amplify singleton ─────────────────────────────────────────────────────────
// Configure once; generateClient() is safe to call before configuration —
// it captures the config at call-time of each API operation.

let _amplifyConfigured = false

function ensureAmplifyConfigured() {
  if (_amplifyConfigured) return
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: APPSYNC_CONFIG.identityPoolId,
      },
    },
    API: {
      GraphQL: {
        endpoint: APPSYNC_CONFIG.endpoint,
        region: APPSYNC_CONFIG.region,
        defaultAuthMode: 'iam',
      },
    },
  })
  _amplifyConfigured = true
}

const _client = generateClient()

// ── GraphQL documents ─────────────────────────────────────────────────────────

const LIST_MESSAGES = /* GraphQL */ `
  query ListMessages($roomId: String!, $limit: Int) {
    listMessages(roomId: $roomId, limit: $limit) {
      items {
        id
        roomId
        senderId
        senderName
        text
        createdAt
      }
    }
  }
`

const SEND_MESSAGE = /* GraphQL */ `
  mutation SendMessage(
    $id: ID!
    $roomId: String!
    $senderId: String!
    $senderName: String!
    $text: String!
    $createdAt: AWSDateTime!
  ) {
    sendMessage(
      id: $id
      roomId: $roomId
      senderId: $senderId
      senderName: $senderName
      text: $text
      createdAt: $createdAt
    ) {
      id
      roomId
      senderId
      senderName
      text
      createdAt
    }
  }
`

const ON_NEW_MESSAGE = /* GraphQL */ `
  subscription OnNewMessage($roomId: String!) {
    onNewMessage(roomId: $roomId) {
      id
      roomId
      senderId
      senderName
      text
      createdAt
    }
  }
`

// ── Private types ─────────────────────────────────────────────────────────────

interface AppSyncMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  createdAt: string
}

/** Minimal observable shape returned by Amplify for GraphQL subscriptions. */
interface AppSyncObservable {
  subscribe(observer: {
    next: (value: { data: { onNewMessage: AppSyncMessage | null } }) => void
    error: (err: unknown) => void
  }): { unsubscribe(): void }
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const USER_ID_KEY = 'chat-appsync-user-id'
const DISPLAY_NAME_KEY = 'chat-appsync-display-name'
const ROOM_ID = 'global'

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * ChatAdapter backed by AWS AppSync (GraphQL + WebSocket subscriptions),
 * DynamoDB for persistence, and a Cognito Identity Pool for unauthenticated
 * IAM credentials.
 *
 * Requires infrastructure/chat-appsync.yaml to be deployed and
 * src/lib/components/chat/appsync-config.ts to be filled in.
 *
 * All users join a single "Global Chat" room. Open the page in two browser
 * tabs to demonstrate real-time multi-user messaging.
 */
export class AppSyncChatAdapter implements ChatAdapter {
  private readonly _userId: string
  private _displayName: string

  constructor(displayName?: string) {
    ensureAmplifyConfigured()

    // Stable anonymous identity — persisted across page reloads
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
      userId = crypto.randomUUID()
      localStorage.setItem(USER_ID_KEY, userId)
    }
    this._userId = userId

    // Display name — prefer constructor arg, then localStorage, then a short default
    this._displayName =
      displayName ??
      localStorage.getItem(DISPLAY_NAME_KEY) ??
      `User-${userId.slice(0, 6)}`
    localStorage.setItem(DISPLAY_NAME_KEY, this._displayName)
  }

  get displayName(): string {
    return this._displayName
  }

  set displayName(name: string) {
    this._displayName = name
    localStorage.setItem(DISPLAY_NAME_KEY, name)
  }

  // ── ChatAdapter interface ──────────────────────────────────────────────────

  async getContacts(): Promise<ChatContact[]> {
    return [
      {
        id: ROOM_ID,
        displayName: 'Global Chat',
        status: 'online',
        avatarInitials: 'GC',
        unreadCount: 0,
      },
    ]
  }

  async getMessages(contactId: string): Promise<ChatMessage[]> {
    const result = (await (_client.graphql({
      query: LIST_MESSAGES,
      variables: { roomId: contactId, limit: 50 },
    }) as Promise<{ data: { listMessages: { items: AppSyncMessage[] } } }>))

    const items: AppSyncMessage[] = result.data?.listMessages?.items ?? []
    return items
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((msg) => this._toMessage(msg))
  }

  async sendMessage(contactId: string, text: string): Promise<ChatMessage> {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    // Fire-and-forget — the subscription echo confirms delivery
    ;(_client.graphql({
      query: SEND_MESSAGE,
      variables: {
        id,
        roomId: contactId,
        senderId: this._userId,
        senderName: this._displayName,
        text,
        createdAt,
      },
    }) as Promise<unknown>).catch((err: unknown) => {
      console.error('[AppSyncChatAdapter] sendMessage failed:', err)
    })

    return {
      id,
      contactId,
      direction: 'outbound',
      text,
      timestamp: new Date(createdAt),
      status: 'sending',
    }
  }

  subscribe(callback: (event: ChatEvent) => void): () => void {
    const observable = _client.graphql({
      query: ON_NEW_MESSAGE,
      variables: { roomId: ROOM_ID },
    }) as unknown as AppSyncObservable

    const sub = observable.subscribe({
      next: ({ data }) => {
        const msg = data?.onNewMessage
        if (!msg) return

        if (msg.senderId === this._userId) {
          // Our own message echoed back — confirm delivery
          callback({ type: 'message-status', messageId: msg.id, status: 'delivered' })
        } else {
          // Message from another participant
          callback({ type: 'message', message: this._toMessage(msg) })
        }
      },
      error: (err) => {
        console.error('[AppSyncChatAdapter] Subscription error:', err)
      },
    })

    return () => sub.unsubscribe()
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _toMessage(msg: AppSyncMessage): ChatMessage {
    const isOwn = msg.senderId === this._userId
    return {
      id: msg.id,
      contactId: msg.roomId,
      direction: isOwn ? 'outbound' : 'inbound',
      // Prepend sender name for inbound so multi-user context is clear in the UI
      text: isOwn ? msg.text : `[${msg.senderName}] ${msg.text}`,
      timestamp: new Date(msg.createdAt),
      status: 'read',
    }
  }
}

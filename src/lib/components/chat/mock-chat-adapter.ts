import type {
  ChatAdapter,
  ChatContact,
  ChatMessage,
  ChatEvent,
} from './chat-adapter'

// ── Seed data ─────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: ChatContact[] = [
  { id: 'alice', displayName: 'Alice Tremblay', status: 'online', avatarInitials: 'AT', unreadCount: 2 },
  { id: 'bob', displayName: 'Bob Martin', status: 'away', avatarInitials: 'BM', unreadCount: 0 },
  { id: 'carol', displayName: 'Carol Singh', status: 'offline', avatarInitials: 'CS', unreadCount: 5 },
  { id: 'david', displayName: 'David Okafor', status: 'online', avatarInitials: 'DO', unreadCount: 0 },
]

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000)
}
function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000)
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86_400_000)
}

const MOCK_HISTORY: Record<string, ChatMessage[]> = {
  alice: [
    { id: 'a1', contactId: 'alice', direction: 'inbound', text: 'Hey! How are you doing?', timestamp: hoursAgo(2), status: 'read' },
    { id: 'a2', contactId: 'alice', direction: 'outbound', text: 'Doing great, thanks for asking! How about yourself?', timestamp: hoursAgo(2), status: 'read' },
    { id: 'a3', contactId: 'alice', direction: 'inbound', text: 'Pretty good! Are you coming to the all-hands tomorrow?', timestamp: minutesAgo(30), status: 'read' },
    { id: 'a4', contactId: 'alice', direction: 'inbound', text: 'It starts at 10 am in the main boardroom.', timestamp: minutesAgo(28), status: 'delivered' },
  ],
  bob: [
    { id: 'b1', contactId: 'bob', direction: 'outbound', text: 'Hey Bob, any chance you can review my PR before EOD?', timestamp: hoursAgo(5), status: 'read' },
    { id: 'b2', contactId: 'bob', direction: 'inbound', text: "Sure! I'll take a look this afternoon.", timestamp: hoursAgo(4), status: 'read' },
    { id: 'b3', contactId: 'bob', direction: 'outbound', text: 'Thanks, I really appreciate it!', timestamp: hoursAgo(4), status: 'read' },
  ],
  carol: [
    { id: 'c1', contactId: 'carol', direction: 'inbound', text: 'Hi! Can we catch up this week?', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'c2', contactId: 'carol', direction: 'inbound', text: 'I wanted to talk about the Q3 project scope.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'c3', contactId: 'carol', direction: 'inbound', text: "Let me know when you're free.", timestamp: daysAgo(1), status: 'delivered' },
    { id: 'c4', contactId: 'carol', direction: 'inbound', text: 'I also sent you the updated requirements doc by email.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'c5', contactId: 'carol', direction: 'inbound', text: 'No rush, whenever you get a chance!', timestamp: daysAgo(1), status: 'delivered' },
  ],
  david: [],
}

const MOCK_REPLIES: Record<string, string[]> = {
  alice: [
    "Sounds good! See you there.",
    "Yes, I'll definitely be there.",
    "Of course! Looking forward to it.",
    "Thanks for the heads up!",
    "Got it, I'll block my calendar.",
  ],
  bob: [
    "On it — will leave comments shortly.",
    "Looks good so far, just checking a couple more things.",
    "Left a few suggestions, nothing major.",
    "LGTM! Approved.",
  ],
  carol: [
    "Hey! Tuesday afternoon works well for me.",
    "Got the email, I'll review it tonight.",
    "How about a quick call Thursday at 2 pm?",
    "Sounds great, let's do it!",
    "Perfect, I'll set up a calendar invite.",
  ],
  david: [
    "Hey! What's up?",
    "Sure thing.",
    "No problem at all.",
    "Happy to help!",
  ],
}

// ── Adapter ───────────────────────────────────────────────────────────────────

let _idCounter = 5_000
function nextId(): string {
  return `mock-msg-${_idCounter++}`
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

/**
 * MockChatAdapter — a fully local, in-memory chat service for testing and demos.
 *
 * Behaviour:
 *   • Returns pre-seeded contacts and message history.
 *   • Simulates outbound delivery progression: sending → sent → delivered.
 *   • Online / away contacts auto-reply after a short typing-indicator delay.
 *   • Offline contacts never reply.
 *   • Multiple adapter instances are independent (each gets its own clone of
 *     the seed data).
 */
export class MockChatAdapter implements ChatAdapter {
  private readonly _contacts: ChatContact[]
  private readonly _history: Map<string, ChatMessage[]>
  private readonly _handlers = new Set<(event: ChatEvent) => void>()
  private readonly _replyIndex: Record<string, number> = {}

  constructor() {
    // Deep-clone seed data so multiple instances are independent.
    this._contacts = MOCK_CONTACTS.map(c => ({ ...c }))
    this._history = new Map(
      Object.entries(MOCK_HISTORY).map(([id, msgs]) => [id, msgs.map(m => ({ ...m }))]),
    )
  }

  async getContacts(): Promise<ChatContact[]> {
    await delay(80)
    return this._contacts.map(c => ({ ...c }))
  }

  async getMessages(contactId: string): Promise<ChatMessage[]> {
    await delay(120)
    return (this._history.get(contactId) ?? []).map(m => ({ ...m }))
  }

  async sendMessage(contactId: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: nextId(),
      contactId,
      direction: 'outbound',
      text,
      timestamp: new Date(),
      status: 'sending',
    }

    const history = this._history.get(contactId) ?? []
    history.push(msg)
    this._history.set(contactId, history)

    // Simulate delivery progression.
    window.setTimeout(() => {
      msg.status = 'sent'
      this._emit({ type: 'message-status', messageId: msg.id, status: 'sent' })

      window.setTimeout(() => {
        msg.status = 'delivered'
        this._emit({ type: 'message-status', messageId: msg.id, status: 'delivered' })
      }, 600)
    }, 300)

    const contact = this._contacts.find(c => c.id === contactId)
    if (contact && contact.status !== 'offline') {
      this._scheduleReply(contactId)
    }

    return { ...msg }
  }

  subscribe(handler: (event: ChatEvent) => void): () => void {
    this._handlers.add(handler)
    return () => this._handlers.delete(handler)
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _emit(event: ChatEvent): void {
    this._handlers.forEach(h => h(event))
  }

  private _scheduleReply(contactId: string): void {
    // Typing starts 600–1 000 ms after send; reply arrives 1 200–2 000 ms later.
    const typingStart = 600 + Math.random() * 400
    const typingDuration = 1_200 + Math.random() * 800

    window.setTimeout(() => {
      this._emit({ type: 'typing', contactId, isTyping: true })

      window.setTimeout(() => {
        this._emit({ type: 'typing', contactId, isTyping: false })

        const replies = MOCK_REPLIES[contactId] ?? ['👍']
        const idx = (this._replyIndex[contactId] ?? 0) % replies.length
        this._replyIndex[contactId] = idx + 1

        const reply: ChatMessage = {
          id: nextId(),
          contactId,
          direction: 'inbound',
          text: replies[idx],
          timestamp: new Date(),
          status: 'read',
        }

        const history = this._history.get(contactId) ?? []
        history.push(reply)
        this._history.set(contactId, history)

        this._emit({ type: 'message', message: { ...reply } })

        // Mark all delivered outbound messages as read now that they replied.
        history
          .filter(m => m.direction === 'outbound' && m.status === 'delivered')
          .forEach(m => {
            m.status = 'read'
            this._emit({ type: 'message-status', messageId: m.id, status: 'read' })
          })
      }, typingDuration)
    }, typingStart)
  }
}

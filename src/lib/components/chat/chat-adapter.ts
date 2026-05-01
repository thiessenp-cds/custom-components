// ── Types ─────────────────────────────────────────────────────────────────────

export type ContactStatus = 'online' | 'offline' | 'away'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'
export type MessageDirection = 'outbound' | 'inbound'

export interface ChatContact {
  id: string
  displayName: string
  status: ContactStatus
  /** Two-letter initials for the avatar, e.g. "AT" for Alice Tremblay */
  avatarInitials?: string
  unreadCount: number
}

export interface ChatMessage {
  id: string
  contactId: string
  direction: MessageDirection
  text: string
  timestamp: Date
  status: MessageStatus
}

// ── Events ────────────────────────────────────────────────────────────────────

/** A new inbound message arrived from a contact. */
export interface ChatEventMessage {
  type: 'message'
  message: ChatMessage
}

/** A contact started or stopped typing. */
export interface ChatEventTyping {
  type: 'typing'
  contactId: string
  isTyping: boolean
}

/** The online/away/offline status of a contact changed. */
export interface ChatEventContactStatus {
  type: 'contact-status'
  contactId: string
  status: ContactStatus
}

/** The delivery/read status of an outbound message changed. */
export interface ChatEventMessageStatus {
  type: 'message-status'
  messageId: string
  status: MessageStatus
}

export type ChatEvent =
  | ChatEventMessage
  | ChatEventTyping
  | ChatEventContactStatus
  | ChatEventMessageStatus

// ── Adapter interface ─────────────────────────────────────────────────────────

/**
 * ChatAdapter — the contract any chat backend must satisfy.
 *
 * Implement this interface to connect <app-chat> to any real-time messaging
 * service (WebSocket, SSE, WebRTC, polling, etc.).
 *
 * The adapter is responsible for:
 *   - Providing an initial contact list and per-contact message history
 *   - Sending messages on behalf of the current user
 *   - Pushing real-time events via the subscribe callback
 *
 * All Promises should reject with a descriptive Error on failure.
 */
export interface ChatAdapter {
  /** Returns the full contact list for the current user. */
  getContacts(): Promise<ChatContact[]>

  /**
   * Returns the full message history between the current user and the given
   * contact, ordered chronologically (oldest first).
   */
  getMessages(contactId: string): Promise<ChatMessage[]>

  /**
   * Sends a text message to a contact.
   *
   * The returned message will have `direction: 'outbound'` and an initial
   * status of `'sending'`. The adapter is expected to emit subsequent
   * `message-status` events as delivery progresses.
   */
  sendMessage(contactId: string, text: string): Promise<ChatMessage>

  /**
   * Subscribe to real-time chat events.
   * Returns an unsubscribe function — call it to stop receiving events
   * (e.g. in `disconnectedCallback`).
   */
  subscribe(handler: (event: ChatEvent) => void): () => void
}

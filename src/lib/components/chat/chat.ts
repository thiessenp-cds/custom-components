import { CustomElement } from '../../CustomElement'
import styles from './chat.css?inline'
import type {
  ChatAdapter,
  ChatContact,
  ChatMessage,
  ContactStatus,
  MessageStatus,
  ChatEvent,
} from './chat-adapter'

export type {
  ChatAdapter,
  ChatContact,
  ChatMessage,
  ContactStatus,
  MessageStatus,
  ChatEvent,
} from './chat-adapter'

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * <app-chat> — A generic, accessible chat UI.
 *
 * The chat service is injected via the `adapter` JS property, which must
 * implement the `ChatAdapter` interface.  Swap adapters at any time to connect
 * to a different backend without touching the UI.
 *
 * Features:
 *   - Contact list with search/filter, online/away/offline status dots, and
 *     unread-message badges
 *   - Message history per contact with timestamps
 *   - Outbound message delivery status: sending → sent → delivered → read
 *   - Typing indicator ("Alice is typing…")
 *   - WAI-ARIA: listbox for contacts, role="log" for messages, live regions
 *     for typing indicator and incoming messages
 *   - Full keyboard navigation (arrow keys, Home, End, Enter/Space to select,
 *     Enter to send, Shift+Enter for newline in compose)
 *
 * Usage:
 *   const el = document.querySelector('app-chat')
 *   el.adapter = new MockChatAdapter()
 *
 * CSS custom property:
 *   --chat-height   Height of the component (default: 580px)
 */
export class AppChat extends CustomElement {
  private static _counter = 0

  // ── State ──────────────────────────────────────────────────────────────────
  private _adapter: ChatAdapter | null = null
  private _contacts: ChatContact[] = []
  private _messages = new Map<string, ChatMessage[]>()
  private _selectedContactId: string | null = null
  private _typingContacts = new Set<string>()
  private _searchQuery = ''
  private _unsubscribe: (() => void) | null = null
  /** Incremented on every _cleanup() so in-flight _init() calls can detect they are stale. */
  private _initGen = 0
  private readonly _uid: string

  // ── DOM refs ───────────────────────────────────────────────────────────────
  private _contactListEl!: HTMLUListElement
  private _messagesEl!: HTMLDivElement
  private _emptyStateEl!: HTMLDivElement
  private _panelEl!: HTMLDivElement
  private _panelAvatarEl!: HTMLDivElement
  private _panelNameEl!: HTMLSpanElement
  private _panelStatusEl!: HTMLSpanElement
  private _typingEl!: HTMLDivElement
  private _composeEl!: HTMLTextAreaElement
  private _sendBtnEl!: HTMLButtonElement
  private _searchEl!: HTMLInputElement

  constructor() {
    super()
    this._uid = `chat-${++AppChat._counter}`
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get adapter(): ChatAdapter | null {
    return this._adapter
  }

  set adapter(value: ChatAdapter | null) {
    this._cleanup()
    this._adapter = value
    if (this.isConnected && value) {
      void this._init(value)
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    super.connectedCallback()
    this.adoptStyle(styles)
    this._renderShell()
    if (this._adapter) {
      void this._init(this._adapter)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._cleanup()
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  private _cleanup(): void {
    this._unsubscribe?.()
    this._unsubscribe = null
    this._initGen++  // invalidate any pending _init
  }

  private async _init(adapter: ChatAdapter): Promise<void> {
    const gen = this._initGen
    this._contacts = await adapter.getContacts()
    // If _cleanup() was called (or another _init started) while we were awaiting, bail out.
    if (gen !== this._initGen) return
    this._unsubscribe = adapter.subscribe(e => this._onEvent(e))
    this._renderContactList()
  }

  // ── Shell ──────────────────────────────────────────────────────────────────

  private _renderShell(): void {
    const { _uid: uid } = this

    // innerHTML is safe here: uid is an internal counter-derived string with
    // no user-supplied content.
    this.shadow.innerHTML = `
      <div class="chat" part="root">

        <aside class="chat__sidebar" aria-label="Contacts">
          <div class="chat__sidebar-header">
            <h2 class="chat__sidebar-title">Contacts</h2>
          </div>
          <div class="chat__search-wrap">
            <label class="sr-only" for="${uid}-search">Search contacts</label>
            <input
              id="${uid}-search"
              class="chat__search"
              type="search"
              placeholder="Search contacts\u2026"
              autocomplete="off"
              aria-controls="${uid}-contact-list"
            />
          </div>
          <ul
            id="${uid}-contact-list"
            class="chat__contact-list"
            role="listbox"
            aria-label="Contacts"
            aria-orientation="vertical"
          ></ul>
        </aside>

        <div class="chat__main">
          <div class="chat__empty-state">
            <p>Select a contact to start chatting</p>
          </div>

          <div class="chat__panel" hidden>
            <header class="chat__panel-header">
              <div class="chat__panel-avatar" aria-hidden="true"></div>
              <div class="chat__panel-contact-info">
                <span class="chat__panel-name"></span>
                <span class="chat__panel-status"></span>
              </div>
            </header>

            <div
              id="${uid}-messages"
              class="chat__messages"
              role="log"
              aria-label="Messages"
              aria-live="polite"
              aria-relevant="additions text"
            ></div>

            <div class="chat__typing" aria-live="polite" aria-atomic="true"></div>

            <div class="chat__compose">
              <label class="sr-only" id="${uid}-compose-label" for="${uid}-compose">Type a message</label>
              <textarea
                id="${uid}-compose"
                class="chat__compose-input"
                placeholder="Type a message\u2026"
                rows="1"
                disabled
              ></textarea>
              <button
                type="button"
                class="chat__send-btn"
                aria-label="Send message"
                disabled
              >
                <svg class="chat__send-icon" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 8l14-7-5 7 5 7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    `

    // Cache refs to avoid repeated queries.
    this._contactListEl = this.shadow.getElementById(`${uid}-contact-list`) as HTMLUListElement
    this._messagesEl = this.shadow.getElementById(`${uid}-messages`) as HTMLDivElement
    this._emptyStateEl = this.shadow.querySelector('.chat__empty-state') as HTMLDivElement
    this._panelEl = this.shadow.querySelector('.chat__panel') as HTMLDivElement
    this._panelAvatarEl = this.shadow.querySelector('.chat__panel-avatar') as HTMLDivElement
    this._panelNameEl = this.shadow.querySelector('.chat__panel-name') as HTMLSpanElement
    this._panelStatusEl = this.shadow.querySelector('.chat__panel-status') as HTMLSpanElement
    this._typingEl = this.shadow.querySelector('.chat__typing') as HTMLDivElement
    this._composeEl = this.shadow.getElementById(`${uid}-compose`) as HTMLTextAreaElement
    this._sendBtnEl = this.shadow.querySelector('.chat__send-btn') as HTMLButtonElement
    this._searchEl = this.shadow.getElementById(`${uid}-search`) as HTMLInputElement

    this._bindShellEvents()
  }

  private _bindShellEvents(): void {
    this._searchEl.addEventListener('input', () => {
      this._searchQuery = this._searchEl.value.trim().toLowerCase()
      this._renderContactList()
    })

    this._sendBtnEl.addEventListener('click', () => this._handleSend())

    this._composeEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this._handleSend()
      }
    })

    this._composeEl.addEventListener('input', () => {
      this._autoResizeCompose()
      this._sendBtnEl.disabled = this._composeEl.value.trim().length === 0
    })
  }

  // ── Contact list ───────────────────────────────────────────────────────────

  private _renderContactList(): void {
    const q = this._searchQuery
    const filtered = q
      ? this._contacts.filter(c => c.displayName.toLowerCase().includes(q))
      : this._contacts

    this._contactListEl.innerHTML = ''

    if (filtered.length === 0) {
      const li = document.createElement('li')
      li.className = 'chat__no-results'
      li.textContent = 'No contacts found'
      li.setAttribute('role', 'presentation')
      this._contactListEl.appendChild(li)
      return
    }

    filtered.forEach((contact, i) =>
      this._contactListEl.appendChild(this._createContactItemEl(contact, i, filtered.length)),
    )
  }

  private _createContactItemEl(
    contact: ChatContact,
    index: number,
    total: number,
  ): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'chat__contact-item'
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', String(contact.id === this._selectedContactId))
    // Roving tabindex: selected item (or first if none selected) gets tabindex=0.
    const isFirstFocusable =
      contact.id === this._selectedContactId || (index === 0 && !this._selectedContactId)
    li.setAttribute('tabindex', isFirstFocusable ? '0' : '-1')
    li.setAttribute('aria-setsize', String(total))
    li.setAttribute('aria-posinset', String(index + 1))
    li.dataset.contactId = contact.id

    // Avatar
    const avatar = document.createElement('div')
    avatar.className = `chat__contact-avatar chat__contact-avatar--${contact.status}`
    avatar.style.background = this._avatarColor(contact.id)
    avatar.setAttribute('aria-hidden', 'true')
    avatar.textContent = contact.avatarInitials ?? contact.displayName.charAt(0).toUpperCase()

    // Name + status label
    const info = document.createElement('div')
    info.className = 'chat__contact-info'

    const name = document.createElement('span')
    name.className = 'chat__contact-name'
    name.textContent = contact.displayName

    const statusLabel = document.createElement('span')
    statusLabel.className = `chat__contact-status-label chat__contact-status-label--${contact.status}`
    statusLabel.textContent = this._capitalise(contact.status)

    info.appendChild(name)
    info.appendChild(statusLabel)

    // Unread badge
    const badge = document.createElement('span')
    badge.className = 'chat__contact-badge'
    if (contact.unreadCount > 0) {
      const count = contact.unreadCount > 99 ? '99+' : String(contact.unreadCount)
      badge.textContent = count
      badge.setAttribute('aria-label', `${contact.unreadCount} unread messages`)
    } else {
      badge.hidden = true
      badge.setAttribute('aria-hidden', 'true')
    }

    li.appendChild(avatar)
    li.appendChild(info)
    li.appendChild(badge)

    li.addEventListener('click', () => void this._selectContact(contact.id))
    li.addEventListener('keydown', (e: KeyboardEvent) => this._handleContactKeydown(e, li))

    return li
  }

  private _handleContactKeydown(e: KeyboardEvent, li: HTMLLIElement): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const id = li.dataset.contactId
      if (id) void this._selectContact(id)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._shiftFocus(li, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._shiftFocus(li, -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this._focusContactAt(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this._focusContactAt(-1)
    }
  }

  private _shiftFocus(current: HTMLElement, delta: 1 | -1): void {
    const items = this._contactOptions()
    const idx = items.indexOf(current)
    const next = items[idx + delta]
    if (next) this._focusOption(items, next)
  }

  private _focusContactAt(index: number): void {
    const items = this._contactOptions()
    if (items.length === 0) return
    const target = index === -1 ? items[items.length - 1] : items[index]
    this._focusOption(items, target)
  }

  private _focusOption(items: HTMLElement[], target: HTMLElement): void {
    items.forEach(i => i.setAttribute('tabindex', '-1'))
    target.setAttribute('tabindex', '0')
    target.focus()
  }

  private _contactOptions(): HTMLElement[] {
    return Array.from(this._contactListEl.querySelectorAll<HTMLElement>('[role="option"]'))
  }

  // ── Select a contact ───────────────────────────────────────────────────────

  private async _selectContact(contactId: string): Promise<void> {
    this._selectedContactId = contactId

    // Reflect new selection in the contact list.
    this._contactListEl.querySelectorAll<HTMLElement>('[role="option"]').forEach(item => {
      const selected = item.dataset.contactId === contactId
      item.setAttribute('aria-selected', String(selected))
      item.setAttribute('tabindex', selected ? '0' : '-1')
    })

    // Show the chat panel.
    this._emptyStateEl.hidden = true
    this._panelEl.hidden = false

    // Update header.
    const contact = this._contacts.find(c => c.id === contactId)
    if (contact) {
      this._panelAvatarEl.textContent =
        contact.avatarInitials ?? contact.displayName.charAt(0).toUpperCase()
      this._panelAvatarEl.style.background = this._avatarColor(contact.id)
      this._panelNameEl.textContent = contact.displayName
      this._panelStatusEl.textContent = this._capitalise(contact.status)

      // Update compose label to name the recipient.
      const label = this.shadow.getElementById(`${this._uid}-compose-label`)
      if (label) label.textContent = `Message ${contact.displayName}`
    }

    // Reset compose.
    this._composeEl.disabled = false
    this._composeEl.value = ''
    this._sendBtnEl.disabled = true

    // Clear typing indicator left over from previous contact.
    this._typingEl.textContent = ''

    // Load messages on first visit.
    if (!this._messages.has(contactId) && this._adapter) {
      const msgs = await this._adapter.getMessages(contactId)
      this._messages.set(contactId, msgs)
    }

    this._renderMessages(contactId)

    // Clear unread badge.
    if (contact && contact.unreadCount > 0) {
      contact.unreadCount = 0
      this._updateContactBadge(contactId, 0)
    }

    this._composeEl.focus()
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  private _renderMessages(contactId: string): void {
    const msgs = this._messages.get(contactId) ?? []
    this._messagesEl.innerHTML = ''
    for (const msg of msgs) {
      this._messagesEl.appendChild(this._createMessageEl(msg))
    }
    this._scrollToBottom()
  }

  private _appendMessage(msg: ChatMessage): void {
    this._messagesEl.appendChild(this._createMessageEl(msg))
    this._scrollToBottom()
  }

  private _createMessageEl(msg: ChatMessage): HTMLDivElement {
    const wrapper = document.createElement('div')
    wrapper.className = `chat__msg chat__msg--${msg.direction}`
    wrapper.dataset.msgId = msg.id

    const bubble = document.createElement('div')
    bubble.className = 'chat__msg-bubble'
    bubble.textContent = msg.text

    const meta = document.createElement('div')
    meta.className = 'chat__msg-meta'

    const time = document.createElement('time')
    time.className = 'chat__msg-time'
    time.dateTime = msg.timestamp.toISOString()
    time.textContent = this._formatTime(msg.timestamp)
    meta.appendChild(time)

    if (msg.direction === 'outbound') {
      const statusEl = document.createElement('span')
      const { icon, label } = this._statusInfo(msg.status)
      statusEl.className = `chat__msg-status chat__msg-status--${msg.status}`
      statusEl.textContent = icon
      statusEl.setAttribute('aria-label', label)
      statusEl.dataset.statusFor = msg.id
      meta.appendChild(statusEl)
    }

    wrapper.appendChild(bubble)
    wrapper.appendChild(meta)
    return wrapper
  }

  private _updateMessageStatus(messageId: string, status: MessageStatus): void {
    const el = this._messagesEl.querySelector<HTMLElement>(`[data-status-for="${messageId}"]`)
    if (el) {
      el.className = `chat__msg-status chat__msg-status--${status}`
      const { icon, label } = this._statusInfo(status)
      el.textContent = icon
      el.setAttribute('aria-label', label)
    }

    // Keep the in-memory history consistent.
    this._messages.forEach(msgs => {
      const m = msgs.find(x => x.id === messageId)
      if (m) m.status = status
    })
  }

  // ── Typing indicator ───────────────────────────────────────────────────────

  private _updateTypingIndicator(contactId: string, isTyping: boolean): void {
    if (!isTyping || contactId !== this._selectedContactId) {
      this._typingEl.textContent = ''
      return
    }
    const contact = this._contacts.find(c => c.id === contactId)
    const first = contact?.displayName.split(' ')[0] ?? 'Contact'
    this._typingEl.textContent = `${first} is typing\u2026`
  }

  // ── Contact list updates ───────────────────────────────────────────────────

  private _updateContactBadge(contactId: string, count: number): void {
    const item = this._contactListEl.querySelector<HTMLElement>(
      `[data-contact-id="${contactId}"]`,
    )
    if (!item) return
    const badge = item.querySelector<HTMLElement>('.chat__contact-badge')
    if (!badge) return

    if (count > 0) {
      const display = count > 99 ? '99+' : String(count)
      badge.hidden = false
      badge.removeAttribute('aria-hidden')
      badge.textContent = display
      badge.setAttribute('aria-label', `${count} unread messages`)
    } else {
      badge.hidden = true
      badge.setAttribute('aria-hidden', 'true')
      badge.textContent = ''
    }
  }

  private _updateContactStatus(contactId: string, status: ContactStatus): void {
    const item = this._contactListEl.querySelector<HTMLElement>(
      `[data-contact-id="${contactId}"]`,
    )
    if (item) {
      const avatar = item.querySelector<HTMLElement>('.chat__contact-avatar')
      if (avatar) avatar.className = `chat__contact-avatar chat__contact-avatar--${status}`

      const label = item.querySelector<HTMLElement>('.chat__contact-status-label')
      if (label) {
        label.className = `chat__contact-status-label chat__contact-status-label--${status}`
        label.textContent = this._capitalise(status)
      }
    }

    if (contactId === this._selectedContactId) {
      this._panelStatusEl.textContent = this._capitalise(status)
    }
  }

  // ── Event handler ──────────────────────────────────────────────────────────

  private _onEvent(event: ChatEvent): void {
    switch (event.type) {
      case 'message': {
        const { message } = event
        const history = this._messages.get(message.contactId) ?? []
        history.push(message)
        this._messages.set(message.contactId, history)

        if (message.contactId === this._selectedContactId) {
          this._appendMessage(message)
        } else {
          const contact = this._contacts.find(c => c.id === message.contactId)
          if (contact) {
            contact.unreadCount += 1
            this._updateContactBadge(message.contactId, contact.unreadCount)
          }
        }
        break
      }

      case 'typing': {
        if (event.isTyping) {
          this._typingContacts.add(event.contactId)
        } else {
          this._typingContacts.delete(event.contactId)
        }
        if (event.contactId === this._selectedContactId) {
          this._updateTypingIndicator(event.contactId, event.isTyping)
        }
        break
      }

      case 'message-status': {
        this._updateMessageStatus(event.messageId, event.status)
        break
      }

      case 'contact-status': {
        const contact = this._contacts.find(c => c.id === event.contactId)
        if (contact) {
          contact.status = event.status
          this._updateContactStatus(event.contactId, event.status)
        }
        break
      }
    }
  }

  // ── Compose / send ─────────────────────────────────────────────────────────

  private _handleSend(): void {
    const text = this._composeEl.value.trim()
    if (!text || !this._selectedContactId || !this._adapter) return

    // Optimistic message — visible immediately with "sending" status.
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      contactId: this._selectedContactId,
      direction: 'outbound',
      text,
      timestamp: new Date(),
      status: 'sending',
    }

    const history = this._messages.get(this._selectedContactId) ?? []
    history.push(optimistic)
    this._messages.set(this._selectedContactId, history)
    this._appendMessage(optimistic)

    // Reset compose immediately so it feels responsive.
    this._composeEl.value = ''
    this._autoResizeCompose()
    this._sendBtnEl.disabled = true
    this._composeEl.focus()

    // Persist via adapter; swap the temp ID for the real one when resolved.
    void this._adapter.sendMessage(this._selectedContactId, text).then(sent => {
      const idx = history.findIndex(m => m.id === optimisticId)
      if (idx !== -1) history[idx] = sent

      const tempEl = this._messagesEl.querySelector<HTMLElement>(`[data-msg-id="${optimisticId}"]`)
      if (tempEl) {
        tempEl.dataset.msgId = sent.id
        const statusEl = tempEl.querySelector<HTMLElement>(`[data-status-for="${optimisticId}"]`)
        if (statusEl) {
          statusEl.dataset.statusFor = sent.id
          const { icon, label } = this._statusInfo(sent.status)
          statusEl.className = `chat__msg-status chat__msg-status--${sent.status}`
          statusEl.textContent = icon
          statusEl.setAttribute('aria-label', label)
        }
      }
    })
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private _scrollToBottom(): void {
    this._messagesEl.scrollTop = this._messagesEl.scrollHeight
  }

  private _autoResizeCompose(): void {
    this._composeEl.style.height = 'auto'
    this._composeEl.style.height = `${Math.min(this._composeEl.scrollHeight, 120)}px`
  }

  private _formatTime(date: Date): string {
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    }
    return (
      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    )
  }

  private _statusInfo(status: MessageStatus): { icon: string; label: string } {
    switch (status) {
      case 'sending':   return { icon: '\u25CB', label: 'Sending' }
      case 'sent':      return { icon: '\u2713', label: 'Sent' }
      case 'delivered': return { icon: '\u2713\u2713', label: 'Delivered' }
      case 'read':      return { icon: '\u2713\u2713', label: 'Read' }
    }
  }

  private _avatarColor(id: string): string {
    const palette = [
      '#1b4f72', '#1e8449', '#922b21', '#6c3483',
      '#1a5276', '#117a65', '#7d6608', '#4a235a',
    ]
    let h = 0
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
    return palette[h % palette.length]
  }

  private _capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
}

customElements.define('app-chat', AppChat)

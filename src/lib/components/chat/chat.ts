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

// -- Notes

/**
For the Chat message list Why use `role="log"` for the messages container instead of a semantic list (`<ol>`)?
The key difference is live region behaviour. `role="log"` is a built-in ARIA live region (implicitly `aria-live="polite"` + `aria-relevant="additions text"`). That means screen readers automatically announce new messages as they arrive — without the user having to navigate to them. That's the primary accessibility requirement for a chat UI.
An `<ol>` is purely structural. It would require you to *add* `aria-live="polite"` to it yourself to get the same behaviour. At that point you've hand-rolled what `role="log"` provides natively.
Where `<ol>` would win:
- It announces "list, N items" when the user enters it, which gives a sense of scale.
- Users can jump item-by-item with the virtual cursor in a screen reader.
Why that's less useful here:
- Announcing "list, 47 items" on every new message arrival would be noisy.
- Chat history is typically browsed by scrolling, not by item-jumping.
- The WAI-ARIA spec calls out chat logs as the canonical example for `role="log"`.
A hybrid approach** — `role="log"` on the scroll container, with each message as a `<div>` (no list role) — is what most production chat apps (and the ARIA Authoring Practices Guide) use. That's what the current implementation does.
If a new "message history" view (read-only, navigable archive) was added, then an `<ol>` without a live region would be the right choice there.
*/

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
  /**
   * Tracks which contacts have had their full history fetched via getMessages.
   * Separate from _messages.has() so that inbound messages arriving before the
   * first visit don't suppress the full history load.
   */
  private _historyLoaded = new Set<string>()
  /** Incremented on each _selectContact call to cancel stale async completions. */
  private _selectingGen = 0
  /** The contact currently highlighted by the keyboard cursor in the contact listbox. */
  private _focusedContactId: string | null = null
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
    this._initGen++     // invalidate any pending _init
    this._historyLoaded.clear()
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
            tabindex="0"
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

    // When focus enters the listbox, ensure aria-activedescendant is always set.
    this._contactListEl.addEventListener('focus', () => {
      const target = this._focusedContactId ?? this._selectedContactId ?? this._contacts[0]?.id ?? null
      if (target) this._setActivedescendant(target)
    })

    // All keyboard navigation for the contact list is handled on the container.
    this._contactListEl.addEventListener('keydown', (e: KeyboardEvent) => this._handleListboxKeydown(e))

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
    li.id = this._contactOptionId(contact.id)
    li.className = 'chat__contact-item'
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', String(contact.id === this._selectedContactId))
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

    // Click: update the active-descendant, select, move focus to compose.
    // All other keyboard handling is on the listbox container itself.
    li.addEventListener('click', () => void this._selectContact(contact.id, true))

    return li
  }

  private _contactOptionId(contactId: string): string {
    return `${this._uid}-contact-${contactId}`
  }

  /**
   * Update `aria-activedescendant` on the listbox and apply the visual
   * keyboard-cursor indicator to the corresponding option element.
   */
  private _setActivedescendant(contactId: string | null): void {
    this._contactListEl.querySelectorAll<HTMLElement>('.chat__contact-item--focused')
      .forEach(el => el.classList.remove('chat__contact-item--focused'))

    this._focusedContactId = contactId

    if (contactId) {
      const optId = this._contactOptionId(contactId)
      this._contactListEl.setAttribute('aria-activedescendant', optId)
      const el = this.shadow.getElementById(optId)
      if (el) {
        el.classList.add('chat__contact-item--focused')
        el.scrollIntoView({ block: 'nearest' })
      }
    } else {
      this._contactListEl.removeAttribute('aria-activedescendant')
    }
  }

  /**
   * Keyboard handler on the listbox container.
   *
   * Uses "selection follows focus": arrow keys immediately load the adjacent
   * conversation but keep focus on the listbox.  Enter/Space confirm the
   * selection and move focus to the compose area.
   */
  private _handleListboxKeydown(e: KeyboardEvent): void {
    const items = this._contactOptions()
    if (items.length === 0) return

    const currentId = this._focusedContactId ?? this._selectedContactId
    const currentIndex = currentId
      ? items.findIndex(el => el.dataset.contactId === currentId)
      : -1

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = items[Math.min(currentIndex + 1, items.length - 1)]
        const nextId = next?.dataset.contactId
        if (nextId) void this._selectContact(nextId, false)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = items[Math.max(currentIndex - 1, 0)]
        const prevId = prev?.dataset.contactId
        if (prevId) void this._selectContact(prevId, false)
        break
      }
      case 'Home': {
        e.preventDefault()
        const firstId = items[0]?.dataset.contactId
        if (firstId) void this._selectContact(firstId, false)
        break
      }
      case 'End': {
        e.preventDefault()
        const lastId = items[items.length - 1]?.dataset.contactId
        if (lastId) void this._selectContact(lastId, false)
        break
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (this._focusedContactId) void this._selectContact(this._focusedContactId, true)
        break
      }
    }
  }

  private _contactOptions(): HTMLElement[] {
    return Array.from(this._contactListEl.querySelectorAll<HTMLElement>('[role="option"]'))
  }

  // ── Select a contact ───────────────────────────────────────────────────────

  private async _selectContact(contactId: string, focusCompose = true): Promise<void> {
    const gen = ++this._selectingGen
    const isNewContact = this._selectedContactId !== contactId
    this._selectedContactId = contactId

    // Update aria-selected on all options and sync the virtual cursor.
    // Both happen synchronously (before any awaits) so the UI responds immediately.
    this._contactListEl.querySelectorAll<HTMLElement>('[role="option"]').forEach(item => {
      item.setAttribute('aria-selected', String(item.dataset.contactId === contactId))
    })
    this._setActivedescendant(contactId)

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

    // Only reset the compose area when genuinely switching contacts so that
    // any in-progress text is preserved if the user clicks the same contact.
    if (isNewContact) {
      this._composeEl.disabled = false
      this._composeEl.value = ''
      this._sendBtnEl.disabled = true
      // Clear the typing indicator left over from the previous contact.
      this._typingEl.textContent = ''
    }

    // Load messages on first visit.  Guard with _historyLoaded (not _messages.has)
    // so that inbound messages arriving before the first selection don't suppress
    // the full history fetch from the adapter.
    if (!this._historyLoaded.has(contactId) && this._adapter) {
      const msgs = await this._adapter.getMessages(contactId)
      // Another contact was selected while we were waiting — bail out.
      if (gen !== this._selectingGen) return
      // Merge adapter history with any inbound messages that arrived during the fetch.
      const pending = this._messages.get(contactId) ?? []
      const seen = new Set(msgs.map(m => m.id))
      const merged = [...msgs, ...pending.filter(m => !seen.has(m.id))]
      merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      this._messages.set(contactId, merged)
      this._historyLoaded.add(contactId)
    }

    // Bail if another selection won the race.
    if (gen !== this._selectingGen) return

    this._renderMessages(contactId)

    // Clear unread badge.
    if (contact && contact.unreadCount > 0) {
      contact.unreadCount = 0
      this._updateContactBadge(contactId, 0)
    }

    if (focusCompose) {
      this._composeEl.focus()
    }
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  private _renderMessages(contactId: string): void {
    const msgs = this._messages.get(contactId) ?? []
    this._messagesEl.innerHTML = ''
    if (msgs.length === 0) {
      const contact = this._contacts.find(c => c.id === contactId)
      const first = contact?.displayName.split(' ')[0] ?? 'this contact'
      const hint = document.createElement('p')
      hint.className = 'chat__new-chat-hint'
      hint.setAttribute('aria-live', 'polite')
      hint.textContent = `This is the beginning of your conversation with ${first}. Send a message to get started.`
      this._messagesEl.appendChild(hint)
      return
    }
    for (const msg of msgs) {
      this._messagesEl.appendChild(this._createMessageEl(msg))
    }
    this._scrollToBottom()
  }

  private _appendMessage(msg: ChatMessage): void {
    // Remove the new-chat hint the moment the first message appears.
    this._messagesEl.querySelector('.chat__new-chat-hint')?.remove()
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
      case 'read':      return { icon: '\u2714\u2714', label: 'Read' }
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

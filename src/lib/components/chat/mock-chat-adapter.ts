import type {
  ChatAdapter,
  ChatContact,
  ChatMessage,
  ChatEvent,
} from './chat-adapter'

// ── Seed data ─────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: ChatContact[] = [
  { id: 'ian',    displayName: 'Ian Malcolm',    status: 'online',  avatarInitials: 'IM', unreadCount: 2 },
  { id: 'ellie',  displayName: 'Ellie Sattler',  status: 'online',  avatarInitials: 'ES', unreadCount: 0 },
  { id: 'dennis', displayName: 'Dennis Nedry',   status: 'away',    avatarInitials: 'DN', unreadCount: 5 },
  { id: 'alan',   displayName: 'Alan Grant',     status: 'offline', avatarInitials: 'AG', unreadCount: 0 },
  { id: 'john',   displayName: 'John Hammond',   status: 'online',  avatarInitials: 'JH', unreadCount: 0 },
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
  ian: [
    { id: 'i1', contactId: 'ian', direction: 'inbound',  text: 'Your scientists were so preoccupied with whether or not they could, they didn\'t stop to think if they should.', timestamp: hoursAgo(3), status: 'read' },
    { id: 'i2', contactId: 'ian', direction: 'outbound', text: 'To be fair, the initial containment protocols did look solid on paper.', timestamp: hoursAgo(3), status: 'read' },
    { id: 'i3', contactId: 'ian', direction: 'inbound',  text: 'Life, uh… finds a way. You cannot plan for every variable when you\'re dealing with living systems.', timestamp: minutesAgo(45), status: 'read' },
    { id: 'i4', contactId: 'ian', direction: 'inbound',  text: 'The rex is out. Fences on sector 4 are down. I strongly suggest we revisit the evacuation plan.', timestamp: minutesAgo(20), status: 'delivered' },
  ],
  ellie: [
    { id: 'e1', contactId: 'ellie', direction: 'outbound', text: 'Ellie, the dilophosaurus paddock gate won\'t latch. Can you check the hydraulic line on the east side?', timestamp: hoursAgo(5), status: 'read' },
    { id: 'e2', contactId: 'ellie', direction: 'inbound',  text: 'On it. Also — these plants over here are Veratrum californicum. They\'re incredibly toxic. Someone on the botanical team made a serious mistake.', timestamp: hoursAgo(4), status: 'read' },
    { id: 'e3', contactId: 'ellie', direction: 'outbound', text: 'I\'ll flag it to Hammond. Good catch.', timestamp: hoursAgo(4), status: 'read' },
    { id: 'e4', contactId: 'ellie', direction: 'inbound',  text: 'The power is back on in the visitor centre. Alan and the kids are safe. Muldoon is securing the perimeter now.', timestamp: minutesAgo(10), status: 'read' },
  ],
  dennis: [
    { id: 'd1', contactId: 'dennis', direction: 'inbound',  text: 'I got your message. The package is ready for Dodgson. I just need the boat schedule and I\'m gone.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'd2', contactId: 'dennis', direction: 'inbound',  text: 'Nobody move! I\'ve got a schedule to keep.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'd3', contactId: 'dennis', direction: 'inbound',  text: 'Look, I\'ll be back before the tour returns. The systems will reset themselves in 15 minutes. No one will even notice.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'd4', contactId: 'dennis', direction: 'inbound',  text: 'Ah ah ah… you didn\'t say the magic word.', timestamp: daysAgo(1), status: 'delivered' },
    { id: 'd5', contactId: 'dennis', direction: 'inbound',  text: 'I\'m telling you, Dodgson, we\'ve got Dodgson here! See? Nobody cares.', timestamp: daysAgo(1), status: 'delivered' },
  ],
  alan: [],
  john: [
    { id: 'j1', contactId: 'john', direction: 'inbound',  text: 'Welcome to Jurassic Park. We spared no expense.', timestamp: hoursAgo(6), status: 'read' },
    { id: 'j2', contactId: 'john', direction: 'outbound', text: 'Mr. Hammond, the security systems are offline. We need to talk about Nedry.', timestamp: hoursAgo(6), status: 'read' },
    { id: 'j3', contactId: 'john', direction: 'inbound',  text: 'When they first brought in the dinosaurs, I felt like a god. I still believe we can make this work.', timestamp: hoursAgo(2), status: 'read' },
    { id: 'j4', contactId: 'john', direction: 'outbound', text: 'With respect, the park is not ready. The animals have proved far more dangerous than the models predicted.', timestamp: hoursAgo(2), status: 'read' },
    { id: 'j5', contactId: 'john', direction: 'inbound',  text: 'I don\'t blame people for their mistakes. But I do ask that they pay for them.', timestamp: minutesAgo(35), status: 'delivered' },
  ],
}

const MOCK_REPLIES: Record<string, string[]> = {
  ian: [
    "Chaos theory. It was always going to end this way.",
    "The system is complex. Complex systems fail in complex ways.",
    "I'm simply saying that life… finds a way.",
    "You've heard of the butterfly effect? This is it, playing out in real time.",
    "Fascinating. Terrifying, but fascinating.",
  ],
  ellie: [
    "I'm on the east side now. I can restore power but I'll need a few minutes.",
    "The raptor paddock is clear. Heading back to the visitor centre.",
    "Alan and the kids are with me. We're all okay.",
    "We need to get everyone to the helicopter. Now.",
    "Agreed. I'll meet you at the emergency exit.",
  ],
  dennis: [
    "Ah ah ah… you didn't say the magic word.",
    "I've designed all the systems here. I know the park inside and out.",
    "I could've been on the boat by now.",
    "You'll have your money after I make the drop.",
    "It's a Unix system! I know this.",
  ],
  alan: [
    "They do move in herds.",
    "Velociraptor. You stare at him, and he just stares right back.",
    "That's one big pile of— never mind.",
    "Kids! They're just kids!",
    "Hold on to your butts.",
  ],
  john: [
    "We spared no expense.",
    "All major theme parks have delays. When they opened Disneyland in 1956, nothing worked.",
    "I really hate that man.",
    "Creation is an act of sheer will.",
    "Next time it'll be flawless. I promise you that.",
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

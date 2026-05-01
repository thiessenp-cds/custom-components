import { useEffect, useRef } from 'react'
// Side-effect: registers <app-chat> with customElements.define
import './chat'
import type { AppChat } from './chat'
import type { ChatAdapter } from './chat-adapter'

export type {
  ChatAdapter,
  ChatContact,
  ChatMessage,
  ContactStatus,
  MessageStatus,
  ChatEvent,
} from './chat-adapter'

export { MockChatAdapter } from './mock-chat-adapter'

// ── React wrapper ─────────────────────────────────────────────────────────────

export interface ChatProps {
  /** Chat service adapter. Swap implementations to connect to any backend. */
  adapter: ChatAdapter
  /**
   * CSS height of the component.  Accepts any valid CSS length value.
   * @default '580px'
   */
  height?: string
}

/**
 * React wrapper for <app-chat>.
 *
 * The `adapter` prop is passed as a JS property (not an HTML attribute) because
 * it is a rich object — the underlying custom element reads it via its
 * `adapter` setter.
 *
 * Usage:
 *   const adapter = useMemo(() => new MockChatAdapter(), [])
 *   <Chat adapter={adapter} height="640px" />
 */
export function Chat({ adapter, height = '580px' }: ChatProps) {
  const ref = useRef<AppChat>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.adapter = adapter
    return () => {
      el.adapter = null
    }
  }, [adapter])

  return (
    <app-chat
      ref={ref as React.Ref<AppChat>}
      style={{ display: 'block', height }}
    />
  )
}

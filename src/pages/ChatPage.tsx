import { useMemo } from 'react'
import { Layout } from '../App'
import { Chat, MockChatAdapter } from '../lib/components/chat'
import '../styles/page.css'

export default function ChatPage() {
  // A stable adapter instance for the lifetime of this page.
  const adapter = useMemo(() => new MockChatAdapter(), [])

  return (
    <Layout backLink>
      <div className="page-heading">
        <h1>Chat</h1>
      </div>
      <p className="page-description">
        A generic chat UI backed by a swappable service adapter. The component
        exposes a <code>ChatAdapter</code> interface so any real-time backend
        (WebSocket, SSE, polling, etc.) can be wired in without touching the UI.
        This demo uses the built-in <code>MockChatAdapter</code>.
      </p>
      <ul className="page-description">
        <li>Click a contact in the sidebar to open the conversation.</li>
        <li>
          Type a message and press <kbd>Enter</kbd> to send (
          <kbd>Shift + Enter</kbd> for a newline).
        </li>
        <li>Online and away contacts will auto-reply after a short delay.</li>
        <li>Watch the delivery status tick from ○ → ✓ → ✓✓ → ✓✓ (blue = read).</li>
      </ul>

      <hr className="page-divider" />

      <Chat adapter={adapter} height="600px" />
    </Layout>
  )
}

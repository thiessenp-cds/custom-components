import { useMemo } from 'react'
import { Layout } from '../App'
import { Chat, MockChatAdapter } from '../lib/components/chat'
import { ApiDocs } from '../components/ApiDocs'
import '../styles/page.css'

export default function ChatPage() {
  // A stable adapter instance for the lifetime of this page.
  // In a real app, you might create an adapter that connects to a real backend here.
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

      <ApiDocs
        properties={[
          {
            name: 'adapter',
            type: 'ChatAdapter',
            description: <>The service adapter that provides contacts, message history, and real-time events. Implement the <code>ChatAdapter</code> interface to connect any backend (WebSocket, SSE, polling, etc.). The built-in <code>MockChatAdapter</code> is provided for testing.</>,
          },
        ]}
        cssProperties={[
          { name: '--chat-height', default: '580px', description: 'Controls the height of the component. Accepts any valid CSS length value.' },
        ]}
      />

      <hr className="page-divider" />

      <Chat adapter={adapter} height="600px" />
    </Layout>
  )
}

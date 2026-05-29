import { useMemo, useState } from 'react'
import { Layout } from '../App'
import { Chat, MockChatAdapter, AppSyncChatAdapter, isAppSyncConfigured } from '../lib/components/chat'
import { ApiDocs } from '../components/ApiDocs'
import '../styles/page.css'

// ── Live chat sub-components ──────────────────────────────────────────────────

function AppSyncSetupCallout() {
  return (
    <div style={{
      border: '1px solid var(--gcds-color-blue-dark)',
      borderRadius: '4px',
      padding: '1.25rem 1.5rem',
      background: 'var(--gcds-color-blue-light, #eaf1fb)',
      maxWidth: '640px',
    }}>
      <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
        Deploy the backend to enable this demo
      </p>
      <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
        <li>
          Deploy <code>infrastructure/chat-appsync.yaml</code> to your AWS account:
          <pre style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            borderRadius: '4px',
            padding: '0.6rem 0.9rem',
            fontSize: '0.8rem',
            overflowX: 'auto',
            margin: '0.4rem 0 0',
          }}>{`aws cloudformation deploy \\
  --template-file infrastructure/chat-appsync.yaml \\
  --stack-name custom-components-chat \\
  --capabilities CAPABILITY_NAMED_IAM`}</pre>
        </li>
        <li>
          Open the CloudFormation stack's <strong>Outputs</strong> tab and copy
          the three values into{' '}
          <code>src/lib/components/chat/appsync-config.ts</code>.
        </li>
        <li>Rebuild and redeploy the app.</li>
      </ol>
    </div>
  )
}

function LiveChatDemo() {
  const storedName = () => localStorage.getItem('chat-appsync-display-name') ?? ''
  const [nameInput, setNameInput] = useState(storedName)
  const [displayName, setDisplayName] = useState(
    () => storedName() || `User-${crypto.randomUUID().slice(0, 6)}`
  )
  const adapter = useMemo(() => new AppSyncChatAdapter(displayName), [displayName])

  function applyName() {
    const trimmed = nameInput.trim()
    if (trimmed) setDisplayName(trimmed)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <label
          htmlFor="appsync-display-name"
          style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          Your display name:
        </label>
        <input
          id="appsync-display-name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyName()}
          placeholder={displayName}
          style={{
            padding: '0.35rem 0.6rem',
            border: '1px solid #767676',
            borderRadius: '4px',
            fontSize: '0.875rem',
            width: '200px',
          }}
        />
        <button
          onClick={applyName}
          style={{
            padding: '0.35rem 0.9rem',
            border: '1px solid var(--gcds-color-blue-dark)',
            borderRadius: '4px',
            background: 'var(--gcds-color-blue-dark)',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
        <span style={{ fontSize: '0.8rem', color: '#555' }}>
          Open this page in a second tab and use a different name to chat between tabs.
        </span>
      </div>
      <Chat adapter={adapter} height="600px" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const mockAdapter = useMemo(() => new MockChatAdapter(), [])

  return (
    <Layout backLink>
      <div className="page-heading">
        <h1>Chat</h1>
      </div>
      <p className="page-description">
        A generic chat UI backed by a swappable service adapter. The component
        exposes a <code>ChatAdapter</code> interface so any real-time backend
        (WebSocket, SSE, polling, etc.) can be wired in without touching the UI.
      </p>
      <ul className="page-description">
        <li>Click a contact in the sidebar to open the conversation.</li>
        <li>
          Type a message and press <kbd>Enter</kbd> to send (
          <kbd>Shift + Enter</kbd> for a newline).
        </li>
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

      <div className="variant-heading">
        <h2 className="variant-heading__title">Mock adapter</h2>
        <p className="variant-heading__desc">
          Fully client-side. The <code>MockChatAdapter</code> simulates network
          latency, typing indicators, delivery receipts, and contact-status
          changes — no backend required.
        </p>
      </div>

      <hr className="page-divider" />

      <Chat adapter={mockAdapter} height="600px" />

      <div className="variant-heading variant-heading--spaced">
        <h2 className="variant-heading__title">Live adapter — AWS AppSync</h2>
        <p className="variant-heading__desc">
          Real multi-user messaging backed by AWS AppSync + DynamoDB.
          Messages are persisted and delivered in real time over WebSocket
          subscriptions. Deploy the CloudFormation stack in{' '}
          <code>infrastructure/chat-appsync.yaml</code> to activate.
        </p>
      </div>

      <hr className="page-divider" />

      {isAppSyncConfigured() ? <LiveChatDemo /> : <AppSyncSetupCallout />}
    </Layout>
  )
}

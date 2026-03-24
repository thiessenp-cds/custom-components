import type { ReactNode } from 'react'
import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import ComboboxPage from './pages/ComboboxPage'
import ComboboxReactPage from './pages/ComboboxReactPage'
import './App.css'

// ── Component registry ────────────────────────────────
// Add new components here as they are built.
interface ComponentEntry {
  name: string
  path: string
  description?: string
}

const components: ComponentEntry[] = [
  { name: 'Combobox', path: 'combobox', description: 'Accessible combobox with type-to-filter autocomplete.' },
]

// ── Layout ────────────────────────────────────────────
interface LayoutProps {
  children: ReactNode
  backLink?: boolean
  backLinkTo?: string
  backLinkLabel?: string
}

export function Layout({ children, backLink, backLinkTo = '/', backLinkLabel = 'Back to components' }: LayoutProps) {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to main content
      </a>
      <div className="layout-container">
        {backLink && (
          <nav aria-label="Breadcrumb">
            <Link to={backLinkTo} className="back-link">← {backLinkLabel}</Link>
          </nav>
        )}
        <main className="main-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  )
}

// ── Home page ─────────────────────────────────────────
function HomePage() {
  return (
    <Layout>
      <h1 className="home-heading">My Custom Components</h1>
      <p className="home-description">
        A workbench for exploring and prototyping accessible HTML custom elements.
      </p>

      {components.length > 0 && (
        <>
          <h2 className="section-heading">Components</h2>
          <div className="component-grid">
              {components.map(({ name, path, description }: ComponentEntry) => (
              <Link key={path} className="component-card" to={`/${path}`}>
                <h3 className="component-card__name">{name}</h3>
                {description && <p className="component-card__description">{description}</p>}
              </Link>
            ))}
          </div>
        </>
      )}


    </Layout>
  )
}

// ── Router ────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/combobox" element={<ComboboxPage />} />
        <Route path="/combobox/react" element={<ComboboxReactPage />} />
      </Routes>
    </HashRouter>
  )
}

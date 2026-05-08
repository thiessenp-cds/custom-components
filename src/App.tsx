import type { ReactNode } from 'react'
import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import ComboboxPage from './pages/ComboboxPage'
import ComboboxReactPage from './pages/ComboboxReactPage'
import ComboboxFallbackSelectPage from './pages/ComboboxFallbackSelectPage'
import ChatPage from './pages/ChatPage'
import StarRatingPage from './pages/StarRatingPage'
import './App.css'

// ── Component registry ────────────────────────────────
// Add new components here as they are built.
interface ComponentEntry {
  name: string
  path: string
  description?: string
}

const components: ComponentEntry[] = [
  { name: 'Chat', path: 'chat', description: 'Generic chat UI with a swappable service adapter. Supports typing indicators, delivery status, unread badges, and contact search.' },  
  { name: 'Combobox', path: 'combobox', description: 'Accessible combobox with type-to-filter autocomplete. Most tested method across industry (gov.uk, APG..) but has iOS limitations)' },
  { name: 'Combobox with fallback select', path: 'combobox-fallback-select', description: 'Combobox on desktop; native select on mobile. More reliable but looses some UX on very large lists.' },
  { name: 'Star Rating', path: 'star-rating', description: 'Accessible star rating input using the WAI-ARIA radiogroup pattern. Roving tabindex, arrow-key navigation, hover highlighting, and sparkle animation on selection.' },
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
      <header className="site-header" role="banner">
        <div className="site-header__inner">
          <Link to="/" className="site-header__title">My Custom Components</Link>
          <span className="site-header__tagline">Accessible Web Component Workbench</span>
        </div>
      </header>
      <div className="layout-container">
        {backLink && (
          <nav aria-label="Breadcrumb" className="breadcrumb">
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
        A workbench for exploring and prototyping accessible HTML custom elements. The <a href="https://design-system.canada.ca/en/">GCDS</a> tokens are used to style this site and the components here.
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
        <Route path="/combobox-fallback-select" element={<ComboboxFallbackSelectPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/star-rating" element={<StarRatingPage />} />
      </Routes>
    </HashRouter>
  )
}

import { useState, type ReactNode } from 'react'
import { Layout } from '../App'
import { StarRating } from '../lib/components/star-rating'
import type { StarRatingChangeDetail } from '../lib/components/star-rating'
import '../styles/page.css'

// ── Local helpers ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="section">
      <h2 className="section__heading">{title}</h2>
      {description && <p className="section__description">{description}</p>}
      <div className="section__body">
        <div className="preview">{children}</div>
      </div>
    </section>
  )
}

// ── Demo wrapper ──────────────────────────────────────────────────────────────

interface DemoProps {
  label: string
  hint?: string
  required?: boolean
  error?: string
}

function Demo({ label, hint, required, error }: DemoProps) {
  const [value, setValue] = useState('')

  const handleChange = (detail: StarRatingChangeDetail) => setValue(detail.value)

  return (
    <div>
      <StarRating
        label={label}
        hint={hint}
        name="rating"
        required={required}
        error={error}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <p style={{ marginTop: '0.5rem', color: '#333333' }}>
          Selected: {value} star{value === '1' ? '' : 's'}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StarRatingPage() {
  return (
    <Layout backLink>
      <h1>Star Rating</h1>
      <p>
        An accessible star rating input using the WAI-ARIA radiogroup pattern. Roving
        tabindex, arrow-key navigation, hover highlighting, and a sparkle animation on
        selection (respects <code>prefers-reduced-motion</code>).
      </p>

      <Section title="Default">
        <Demo label="Rate your experience" />
      </Section>

      <Section title="With hint">
        <Demo
          label="Rate your experience"
          hint="Select a rating from 1 to 5 stars."
        />
      </Section>

      <Section title="Required">
        <Demo label="Rate your experience" required />
      </Section>

      <Section title="With error">
        <Demo label="Rate your experience" error="Please select a rating." />
      </Section>
    </Layout>
  )
}

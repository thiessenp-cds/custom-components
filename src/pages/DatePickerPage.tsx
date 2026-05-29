import { useState, type ReactNode } from 'react'
import { Layout } from '../App'
import { DatePicker } from '../lib/components/date-picker'
import type { DateChangeDetail } from '../lib/components/date-picker'
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

// ── Demos ─────────────────────────────────────────────────────────────────────

function DefaultDemo() {
  const [value, setValue] = useState('')
  return (
    <>
      <DatePicker
        label="Appointment date"
        name="appointment"
        hint="Choose the date of your appointment."
        onChange={(d: DateChangeDetail) => setValue(d.value)}
      />
      {value && <p style={{ fontSize: '0.875rem', marginTop: 0 }}>Selected: <strong>{value}</strong></p>}
    </>
  )
}

function RequiredDemo() {
  const [value, setValue] = useState('')
  return (
    <>
      <DatePicker
        label="Start date"
        name="start"
        required
        onChange={(d: DateChangeDetail) => setValue(d.value)}
      />
      {value && <p style={{ fontSize: '0.875rem', marginTop: 0 }}>Selected: <strong>{value}</strong></p>}
    </>
  )
}

function MinMaxDemo() {
  // Allow only the next 30 days
  const todayDate   = new Date()
  const maxDate     = new Date(todayDate)
  maxDate.setDate(maxDate.getDate() + 30)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const minStr = fmt(todayDate)
  const maxStr = fmt(maxDate)

  const [value, setValue] = useState('')
  return (
    <>
      <DatePicker
        label="Booking date"
        name="booking"
        hint={`Select a date between ${minStr} and ${maxStr}.`}
        min={minStr}
        max={maxStr}
        onChange={(d: DateChangeDetail) => setValue(d.value)}
      />
      {value && <p style={{ fontSize: '0.875rem', marginTop: 0 }}>Selected: <strong>{value}</strong></p>}
    </>
  )
}

function DisabledDatesDemo() {
  // Disable all Saturdays and Sundays for the current month
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  const weekends: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(y, m, d).getDay()
    if (dow === 0 || dow === 6) {
      weekends.push(`${y}-${pad(m + 1)}-${pad(d)}`)
    }
  }

  const [value, setValue] = useState('')
  return (
    <>
      <DatePicker
        label="Working day"
        name="working-day"
        hint="Weekends are unavailable. Weekdays only."
        disabledDates={weekends}
        onChange={(d: DateChangeDetail) => setValue(d.value)}
      />
      {value && <p style={{ fontSize: '0.875rem', marginTop: 0 }}>Selected: <strong>{value}</strong></p>}
    </>
  )
}

function WithErrorDemo() {
  return (
    <DatePicker
      label="Event date"
      name="event-date"
      value="2024-07-15"
      error="This date is no longer available. Please choose another."
    />
  )
}

function DisabledDemo() {
  return (
    <DatePicker
      label="Archived date"
      name="archived"
      value="2023-11-30"
      disabled
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DatePickerPage() {
  return (
    <Layout backLink>
      <div className="page-heading">
        <h1>Date Picker</h1>
        <a
          className="page-heading__ref-link"
          href="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/"
          target="_blank"
          rel="noreferrer"
        >
          W3C APG reference ↗
        </a>
      </div>

      <p className="page-description">
        An accessible date picker built as a custom element, following the{' '}
        <a
          href="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/"
          target="_blank"
          rel="noreferrer"
        >
          W3C APG Date Picker Dialog
        </a>{' '}
        pattern. Uses a modal calendar grid (<code>role="dialog"</code> +{' '}
        <code>role="grid"</code>) with full keyboard navigation, focus trapping,
        and form association.
      </p>

      <ul className="page-description">
        <li>Type a date directly into the field (YYYY-MM-DD) or click the calendar icon.</li>
        <li>Arrow keys navigate days; Page Up/Down changes months; Shift + Page Up/Down changes years.</li>
        <li>Enter or Space selects the focused date. Esc closes without selecting.</li>
        <li>Tab cycles through: ‹‹ ‹ month/year heading › ›› · focused grid cell · Cancel · OK.</li>
      </ul>

      <hr className="page-divider" />

      <Section title="Default" description="A basic date picker with a label and hint.">
        <DefaultDemo />
      </Section>

      <Section title="Required" description="When required, the field must have a value before form submission.">
        <RequiredDemo />
      </Section>

      <Section
        title="Min / Max dates"
        description="Dates outside the permitted range are greyed out and not selectable."
      >
        <MinMaxDemo />
      </Section>

      <Section
        title="Disabled dates"
        description="Individual dates can be disabled — weekends are blocked in this example."
      >
        <DisabledDatesDemo />
      </Section>

      <Section title="With error" description="An error message is shown when the field fails validation.">
        <WithErrorDemo />
      </Section>

      <Section title="Disabled" description="The entire control is disabled.">
        <DisabledDemo />
      </Section>
    </Layout>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Layout } from '../App'
import IssueTable from '../components/IssueTable'
import type { Issue } from '../components/IssueTable'
import type { ComboboxOption, ComboboxChangeDetail } from '../lib/components/combobox-fallback-select/combobox-fallback-select'
// Registers <app-combobox-fallback-select> as a custom element
import '../lib/components/combobox-fallback-select/combobox-fallback-select'
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

// ── RawFallbackSelectDemo ─────────────────────────────────────────────────────

interface RawFallbackSelectDemoProps {
  label: string
  hint?: string
  placeholder?: string
  name: string
  required?: boolean
  disabled?: boolean
  error?: string
  options: ComboboxOption[]
  showValue?: boolean
  onChange?: (detail: ComboboxChangeDetail) => void
}

function RawFallbackSelectDemo({
  label,
  hint,
  placeholder,
  name,
  required,
  disabled,
  error,
  options,
  showValue = true,
  onChange,
}: RawFallbackSelectDemoProps) {
  const ref = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState<ComboboxChangeDetail | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ComboboxChangeDetail>).detail
      setSelected(detail.value ? detail : null)
      onChange?.(detail)
    }
    el.addEventListener('combobox-change', handler)
    return () => el.removeEventListener('combobox-change', handler)
  }, [onChange])

  return (
    <>
      <app-combobox-fallback-select
        ref={ref}
        label={label}
        hint={hint}
        placeholder={placeholder}
        name={name}
        options={JSON.stringify(options)}
        required={required}
        disabled={disabled}
        error={error}
      />
      {showValue && selected && (
        <p className="example-value">
          Selected: <code>{selected.label} ({selected.value})</code>
        </p>
      )}
    </>
  )
}

// ── RequiredFormDemo ──────────────────────────────────────────────────────────

function RequiredFormDemo() {
  const [error, setError] = useState<string | null>(null)
  const [submittedValue, setSubmittedValue] = useState<string | null>(null)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const province = data.get('province-cfs') as string
        if (!province) {
          setError('Select a province or territory')
          setSubmittedValue(null)
          return
        }
        setError(null)
        setSubmittedValue(province)
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'flex-start' }}
      noValidate
    >
      <RawFallbackSelectDemo
        label="Province or territory"
        hint="Select the province or territory where you currently reside."
        name="province-cfs"
        required
        options={PROVINCES}
        error={error ?? undefined}
        onChange={() => setError(null)}
        showValue={false}
      />
      <button
        type="submit"
        style={{
          padding: '0.5rem 1.25rem',
          background: '#4a3f8c',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontFamily: 'inherit',
        }}
      >
        Submit
      </button>
      {submittedValue && (
        <p className="example-success" role="status">
          ✓ Submitted: <strong>{submittedValue}</strong>
        </p>
      )}
    </form>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const COUNTRIES: ComboboxOption[] = [
  { value: 'af', label: 'Afghanistan' },
  { value: 'al', label: 'Albania' },
  { value: 'dz', label: 'Algeria' },
  { value: 'au', label: 'Australia' },
  { value: 'at', label: 'Austria' },
  { value: 'bd', label: 'Bangladesh' },
  { value: 'be', label: 'Belgium' },
  { value: 'br', label: 'Brazil' },
  { value: 'ca', label: 'Canada' },
  { value: 'cl', label: 'Chile' },
  { value: 'cn', label: 'China' },
  { value: 'co', label: 'Colombia' },
  { value: 'dk', label: 'Denmark' },
  { value: 'eg', label: 'Egypt' },
  { value: 'fi', label: 'Finland' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'gh', label: 'Ghana' },
  { value: 'gr', label: 'Greece' },
  { value: 'in', label: 'India' },
  { value: 'ie', label: 'Ireland' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan' },
  { value: 'ke', label: 'Kenya' },
  { value: 'mx', label: 'Mexico' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'nz', label: 'New Zealand' },
  { value: 'ng', label: 'Nigeria' },
  { value: 'no', label: 'Norway' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'pt', label: 'Portugal' },
  { value: 'ru', label: 'Russia' },
  { value: 'sa', label: 'Saudi Arabia' },
  { value: 'za', label: 'South Africa' },
  { value: 'kr', label: 'South Korea' },
  { value: 'es', label: 'Spain' },
  { value: 'se', label: 'Sweden' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'tr', label: 'Turkey' },
  { value: 'ua', label: 'Ukraine' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'vn', label: 'Vietnam' },
]

const PROVINCES: ComboboxOption[] = [
  { value: 'ab', label: 'Alberta' },
  { value: 'bc', label: 'British Columbia' },
  { value: 'mb', label: 'Manitoba' },
  { value: 'nb', label: 'New Brunswick' },
  { value: 'nl', label: 'Newfoundland and Labrador' },
  { value: 'ns', label: 'Nova Scotia' },
  { value: 'nt', label: 'Northwest Territories' },
  { value: 'nu', label: 'Nunavut' },
  { value: 'on', label: 'Ontario' },
  { value: 'pe', label: 'Prince Edward Island' },
  { value: 'qc', label: 'Quebec' },
  { value: 'sk', label: 'Saskatchewan' },
  { value: 'yt', label: 'Yukon' },
]

// ── Known issues ──────────────────────────────────────────────────────────────

const ISSUES: Issue[] = []

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComboboxFallbackSelectPage() {
  return (
    <Layout backLink>
      <h1 className="page-heading">
        Combobox with fallback select
        <a
          className="page-heading__ref-link"
          href="https://github.com/alphagov/accessible-autocomplete"
          target="_blank"
          rel="noreferrer"
        >
          inspired by GOV.UK accessible autocomplete
        </a>
      </h1>

      <p className="page-description">
        On <strong>touch / mobile devices</strong> (<code>pointer: coarse</code>), a native{' '}
        <code>&lt;select&gt;</code> is rendered for reliable cross-device support. On{' '}
        <strong>pointer devices</strong> (mouse / trackpad), the full combobox autocomplete widget is
        shown. Both modes fire the same <code>combobox-change</code> event and participate in forms
        via <code>ElementInternals</code>.
      </p>

      <hr className="page-divider" />

      <Section
        title="Default"
        description="Type to filter the list of options. Use ↓ / ↑ to navigate, Enter to select, Escape to dismiss. On a touch device a native select is shown instead."
      >
        <RawFallbackSelectDemo
          label="Select a country"
          placeholder="Search countries…"
          name="country-default"
          options={COUNTRIES}
        />
      </Section>

      <Section
        title="Required"
        description="Form participation via ElementInternals. Works in both modes — submitting without a selection triggers inline error handling."
      >
        <RequiredFormDemo />
      </Section>

      <Section
        title="With error"
        description="The error attribute renders an error message and applies error styling in both combobox and native select modes."
      >
        <RawFallbackSelectDemo
          label="Province or territory"
          hint="Select the province or territory where you currently reside."
          name="country-error-static"
          options={PROVINCES}
          error="Select a province or territory"
          showValue={false}
        />
      </Section>

      <Section
        title="Disabled"
        description="The disabled attribute is reflected to both the combobox input and the native select."
      >
        <RawFallbackSelectDemo
          label="Select a country"
          placeholder="Search countries…"
          name="country-disabled"
          options={COUNTRIES}
          disabled
          showValue={false}
        />
      </Section>

      <IssueTable issues={ISSUES} />
    </Layout>
  )
}

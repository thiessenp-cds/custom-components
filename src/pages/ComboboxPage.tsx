import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../App'
import IssueTable from '../components/IssueTable'
import type { Issue } from '../components/IssueTable'
import type { ComboboxOption, ComboboxChangeDetail } from '../lib/components/combobox/combobox'
// Registers <app-combobox> as a custom element
import '../lib/components/combobox/combobox'
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

// ── RawComboboxDemo ───────────────────────────────────────────────────────────

interface RawComboboxDemoProps {
  label: string
  hint?: string
  placeholder?: string
  name: string
  required?: boolean
  disabled?: boolean
  error?: string
  options: ComboboxOption[]
  showValue?: boolean
  fallbackSelect?: boolean
  onChange?: (detail: ComboboxChangeDetail) => void
}

function RawComboboxDemo({
  label,
  hint,
  placeholder,
  name,
  required,
  disabled,
  error,
  options,
  showValue = true,
  fallbackSelect,
  onChange,
}: RawComboboxDemoProps) {
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
      <app-combobox
        ref={ref}
        label={label}
        hint={hint}
        placeholder={placeholder}
        name={name}
        options={JSON.stringify(options)}
        required={required}
        disabled={disabled}
        error={error}
        fallback-select={fallbackSelect || undefined}
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
// Shows inline error handling: error message appears on submit with no selection
// and clears as soon as the user makes a choice.

interface RequiredFormDemoProps {
  fallbackSelect?: boolean
}

function RequiredFormDemo({ fallbackSelect }: RequiredFormDemoProps) {
  const [error, setError] = useState<string | null>(null)
  const [submittedValue, setSubmittedValue] = useState<string | null>(null)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const province = data.get('province') as string
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
      <RawComboboxDemo
        label="Province or territory"
        hint="Select the province or territory where you currently reside."
        name="province"
        required
        options={PROVINCES}
        error={error ?? undefined}
        fallbackSelect={fallbackSelect}
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
  { value: 'hr', label: 'Croatia' },
  { value: 'cz', label: 'Czech Republic' },
  { value: 'dk', label: 'Denmark' },
  { value: 'eg', label: 'Egypt' },
  { value: 'et', label: 'Ethiopia' },
  { value: 'fi', label: 'Finland' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'gh', label: 'Ghana' },
  { value: 'gr', label: 'Greece' },
  { value: 'hu', label: 'Hungary' },
  { value: 'in', label: 'India' },
  { value: 'id', label: 'Indonesia' },
  { value: 'ie', label: 'Ireland' },
  { value: 'il', label: 'Israel' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan' },
  { value: 'jo', label: 'Jordan' },
  { value: 'ke', label: 'Kenya' },
  { value: 'mx', label: 'Mexico' },
  { value: 'ma', label: 'Morocco' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'nz', label: 'New Zealand' },
  { value: 'ng', label: 'Nigeria' },
  { value: 'no', label: 'Norway' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'pe', label: 'Peru' },
  { value: 'ph', label: 'Philippines' },
  { value: 'pl', label: 'Poland' },
  { value: 'pt', label: 'Portugal' },
  { value: 'ro', label: 'Romania' },
  { value: 'ru', label: 'Russia' },
  { value: 'sa', label: 'Saudi Arabia' },
  { value: 'za', label: 'South Africa' },
  { value: 'kr', label: 'South Korea' },
  { value: 'es', label: 'Spain' },
  { value: 'se', label: 'Sweden' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'th', label: 'Thailand' },
  { value: 'tr', label: 'Turkey' },
  { value: 'ua', label: 'Ukraine' },
  { value: 'ae', label: 'United Arab Emirates' },
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

const ISSUES: Issue[] = [
  {
    combo: 'iOS / on-screen keyboard',
    description:
      'When the dropdown list is showing, the on-screen keyboard up/down navigation buttons do not move focus through the options.',
  },
  {
    combo: 'iOS / swipe gesture',
    description:
      'Swiping through the dropdown list, a user can swipe past the end of the list and exit the combobox, leaving them disoriented.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComboboxPage() {
  return (
    <Layout backLink>
      <h1 className="page-heading">
        Combobox
      </h1>

      <p className="page-description">
        An accessible combobox with list autocomplete (type-to-filter). Options are filtered as the
        user types; keyboard navigation (↓ / ↑, Enter, Escape) and full form participation via{' '}
        <code>ElementInternals</code> are supported. This was implemented following the{' '}
        <a
          href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/"
          target="_blank"
          rel="noreferrer"
        >
          WAI-ARIA combobox with list autocomplete
        </a>{' '}
        authoring pattern.
      </p>
      <p className="page-description">
        For a React compatible version, visit the <Link to="/combobox/react">React wrapped combobox</Link> page.
      </p>

      <IssueTable issues={ISSUES} />

      <hr className="page-divider" />

      <div className="variant-heading">
        <h2 className="variant-heading__title">Standard</h2>
        <p className="variant-heading__desc">
          Full combobox autocomplete widget. Best suited for pointer devices (mouse / trackpad)
          where typing and keyboard navigation are natural.
        </p>
      </div>

      <Section
        title="Default"
        description="Type to filter the list of options. Use ↓ / ↑ to navigate, Enter to select, Escape to dismiss."
      >
        <RawComboboxDemo
          label="Select a country"
          placeholder="Search countries…"
          name="country-default"
          options={COUNTRIES}
        />
      </Section>

      <Section
        title="Required"
        description="Form participation via ElementInternals. Submitting without a selection triggers inline error handling."
      >
        <RequiredFormDemo />
      </Section>

      <Section
        title="With error"
        description="The error attribute renders an error message and applies error styling — shown here in its pre-set state."
      >
        <RawComboboxDemo
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
        description="The disabled attribute is reflected to the shadow DOM input and toggle button."
      >
        <RawComboboxDemo
          label="Select a country"
          placeholder="Search countries…"
          name="country-disabled"
          options={COUNTRIES}
          disabled
          showValue={false}
        />
      </Section>

      <div className="variant-heading variant-heading--spaced">
        <h2 className="variant-heading__title">With native select fallback</h2>
        <p className="variant-heading__desc">
          Add the <code>fallback-select</code> attribute to enable a native{' '}
          <code>&lt;select&gt;</code> fallback for touch / mobile devices{' '}
          (<code>pointer: coarse</code>). On pointer devices the full combobox widget is shown; on
          touch devices the native select is shown instead for reliable cross-device support. The
          switch is CSS-driven and reinforced with the <code>inert</code> attribute so the hidden
          widget is never reachable by keyboard.
        </p>
      </div>

      <Section
        title="Default"
        description="On a touch device (pointer: coarse) a native select is shown. Resize your browser or use device emulation to test."
      >
        <RawComboboxDemo
          label="Select a country"
          placeholder="Search countries…"
          name="fs-country-default"
          options={COUNTRIES}
          fallbackSelect
        />
      </Section>

      <Section
        title="Required"
        description="Form participation works in both modes — the active widget (combobox or select) anchors validation."
      >
        <RequiredFormDemo fallbackSelect />
      </Section>

      <Section
        title="With error"
        description="The error message and styling are applied to both the combobox and select sections simultaneously."
      >
        <RawComboboxDemo
          label="Province or territory"
          hint="Select the province or territory where you currently reside."
          name="fs-province-error"
          options={PROVINCES}
          error="Select a province or territory"
          showValue={false}
          fallbackSelect
        />
      </Section>

      <Section
        title="Disabled"
        description="The disabled attribute is reflected to both the combobox input and the native select."
      >
        <RawComboboxDemo
          label="Select a country"
          placeholder="Search countries…"
          name="fs-country-disabled"
          options={COUNTRIES}
          disabled
          showValue={false}
          fallbackSelect
        />
      </Section>
    </Layout>
  )
}

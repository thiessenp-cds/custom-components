import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../App'
import IssueTable from '../components/IssueTable'
import type { Issue } from '../components/IssueTable'
import { Combobox } from '../lib/components/combobox'
import type { ComboboxOption, ComboboxChangeDetail } from '../lib/components/combobox/combobox'
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

const ISSUES: Issue[] = []

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComboboxReactPage() {
  const [defaultSelected, setDefaultSelected] = useState<ComboboxChangeDetail | null>(null)
  const [hintSelected, setHintSelected] = useState<ComboboxChangeDetail | null>(null)
  const [requiredError, setRequiredError] = useState<string | null>(null)
  const [submittedValue, setSubmittedValue] = useState<string | null>(null)

  return (
    <Layout
      backLink
      backLinkTo="/combobox"
      backLinkLabel="Back to Combobox"
    >
      <h1 className="page-heading">
        Combobox — React wrapper
        <a
          className="page-heading__ref-link"
          href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/"
          target="_blank"
          rel="noreferrer"
        >
          WAI-ARIA pattern reference
        </a>
      </h1>

      <hr className="page-divider" />

      <Section
        title="Default"
        description="Type to filter the list of options. Use ↓ / ↑ to navigate, Enter to select, Escape to dismiss."
      >
        <Combobox
          label="Select a country"
          placeholder="Search countries…"
          name="country-default"
          options={COUNTRIES}
          onChange={(d) => setDefaultSelected(d.value ? d : null)}
        />
        {defaultSelected && (
          <p className="example-value">
            Selected: <code>{defaultSelected.label} ({defaultSelected.value})</code>
          </p>
        )}
      </Section>

      <Section
        title="Required"
        description="Submitting without a selection triggers inline error handling via the error prop."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const province = data.get('province') as string
            if (!province) {
              setRequiredError('Select a province or territory')
              setSubmittedValue(null)
              return
            }
            setRequiredError(null)
            setSubmittedValue(province)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'flex-start' }}
          noValidate
        >
          <Combobox
            label="Province or territory"
            hint="Select the province or territory where you currently reside."
            name="province"
            required
            options={PROVINCES}
            error={requiredError ?? undefined}
            onChange={() => setRequiredError(null)}
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
      </Section>

      <Section
        title="With error"
        description="The error prop renders an error message and applies error styling — shown here in its pre-set state."
      >
        <Combobox
          label="Province or territory"
          hint="Select the province or territory where you currently reside."
          name="country-error-static"
          options={PROVINCES}
          error="Select a province or territory"
        />
      </Section>

      <Section
        title="Disabled"
        description="The disabled prop is forwarded to the underlying custom element."
      >
        <Combobox
          label="Select a country"
          placeholder="Search countries…"
          name="country-disabled"
          options={COUNTRIES}
          disabled
        />
      </Section>

      <IssueTable issues={ISSUES} />

      <hr className="page-divider" />

      <p className="page-related">
        Also see: <Link to="/combobox">Combobox — custom element</Link>
      </p>
    </Layout>
  )
}

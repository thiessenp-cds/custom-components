import type { ReactNode } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttrRow {
  name: string
  /** e.g. 'string', 'boolean', 'string[]' */
  type: string
  /** Pass undefined to show '—' */
  default?: string
  description: ReactNode
}

export interface EventRow {
  name: string
  /** TypeScript type of the CustomEvent detail */
  detail: string
  description: ReactNode
}

export interface PropRow {
  name: string
  type: string
  description: ReactNode
}

export interface CssPropRow {
  name: string
  default: string
  description: ReactNode
}

export interface ApiDocsProps {
  /** HTML attribute table */
  attributes?: AttrRow[]
  /** JS-only properties (not reflected as attributes) */
  properties?: PropRow[]
  /** Custom DOM events emitted by the component */
  events?: EventRow[]
  /** CSS custom properties (--tokens) */
  cssProperties?: CssPropRow[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Dash() {
  return <span style={{ color: '#767676' }}>—</span>
}

// ── ApiDocs component ──────────────────────────────────────────────────────────

export function ApiDocs({ attributes, properties, events, cssProperties }: ApiDocsProps) {
  return (
    <div className="api-docs">
      {attributes && attributes.length > 0 && (
        <div>
          <p className="api-docs__section-title">Attributes</p>
          <div className="api-docs__table-wrap">
            <table className="api-docs__table">
              <thead>
                <tr>
                  <th scope="col">Attribute</th>
                  <th scope="col">Type</th>
                  <th scope="col">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="api-docs__col--type">{row.type}</td>
                    <td className="api-docs__col--default">
                      {row.default !== undefined ? row.default : <Dash />}
                    </td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {properties && properties.length > 0 && (
        <div>
          <p className="api-docs__section-title">JS Properties</p>
          <div className="api-docs__table-wrap">
            <table className="api-docs__table">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Type</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="api-docs__col--type">{row.type}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {events && events.length > 0 && (
        <div>
          <p className="api-docs__section-title">Events</p>
          <div className="api-docs__table-wrap">
            <table className="api-docs__table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Detail type</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="api-docs__col--type">{row.detail}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cssProperties && cssProperties.length > 0 && (
        <div>
          <p className="api-docs__section-title">CSS Custom Properties</p>
          <div className="api-docs__table-wrap">
            <table className="api-docs__table">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {cssProperties.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="api-docs__col--default">{row.default}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

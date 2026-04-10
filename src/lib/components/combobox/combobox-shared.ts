/**
 * combobox-shared.ts — Shared types and pure utilities for combobox components.
 *
 * Consumed by:
 *   - <app-combobox>                  (combobox/combobox.ts)
 *   - <app-combobox-fallback-select>  (combobox-fallback-select/combobox-fallback-select.ts)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ComboboxChangeDetail {
  value: string
  label: string
}

export interface ComboboxInputDetail {
  inputValue: string
}

// ── Option parsing utilities ───────────────────────────────────────────────────

/**
 * Parse a JSON attribute string into an array of ComboboxOption.
 * Returns an empty array on parse failure.
 */
export function parseOptionsFromAttr(json: string): ComboboxOption[] {
  try {
    return JSON.parse(json) as ComboboxOption[]
  } catch {
    return []
  }
}

/**
 * Scrape child <option> elements of `host` into ComboboxOption objects.
 */
export function parseOptionsFromChildren(host: HTMLElement): ComboboxOption[] {
  return Array.from(host.querySelectorAll<HTMLOptionElement>('option')).map((opt) => ({
    value: opt.value,
    label: opt.textContent?.trim() ?? opt.value,
    disabled: opt.disabled,
  }))
}

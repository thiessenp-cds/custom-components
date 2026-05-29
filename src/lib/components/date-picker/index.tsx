import { useEffect, useRef } from 'react'
// Side-effect: registers <app-date-picker> with customElements.define
import './date-picker'
import type { AppDatePicker, DateChangeDetail, DateRangeChangeDetail } from './date-picker'

export type { DateChangeDetail, DateRangeChangeDetail } from './date-picker'

// ── React wrapper ─────────────────────────────────────────────────────────────

export interface DatePickerProps {
  /** Visible label text */
  label: string
  /** Hint text shown below the label */
  hint?: string
  /** Form field name */
  name: string
  /** Selected ISO date string (YYYY-MM-DD) */
  value?: string
  /** Marks the field as required */
  required?: boolean
  /** Disables the control */
  disabled?: boolean
  /** Validation error message */
  error?: string
  /** Earliest selectable date (YYYY-MM-DD) */
  min?: string
  /** Latest selectable date (YYYY-MM-DD) */
  max?: string
  /**
   * Individual dates to disable, as an array of YYYY-MM-DD strings.
   * Passed as a JS property (not an HTML attribute).
   */
  disabledDates?: string[]
  /** Fires when a date is selected or the text field is committed. */
  onChange?: (detail: DateChangeDetail) => void
}

/**
 * React wrapper for <app-date-picker>.
 *
 * Bridges React props to the custom element's attributes and JS properties,
 * and wires the `date-change` custom event to the `onChange` callback.
 *
 * Usage:
 *   <DatePicker
 *     label="Date of birth"
 *     name="dob"
 *     onChange={(d) => setValue(d.value)}
 *   />
 */
export function DatePicker({
  label,
  hint,
  name,
  value,
  required,
  disabled,
  error,
  min,
  max,
  disabledDates,
  onChange,
}: DatePickerProps) {
  const ref = useRef<AppDatePicker>(null)

  // Sync disabledDates (JS-only property) and onChange event listener
  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (disabledDates !== undefined) {
      el.disabledDates = disabledDates
    }

    if (!onChange) return

    const handler = (e: Event) => {
      onChange((e as CustomEvent<DateChangeDetail>).detail)
    }
    el.addEventListener('date-change', handler)
    return () => el.removeEventListener('date-change', handler)
  }, [disabledDates, onChange])

  return (
    <app-date-picker
      ref={ref as React.Ref<AppDatePicker>}
      label={label}
      hint={hint}
      name={name}
      value={value}
      required={required || undefined}
      disabled={disabled || undefined}
      error={error}
      min={min}
      max={max}
    />
  )
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  /** Visible label text */
  label: string
  /** Hint text shown below the label */
  hint?: string
  /** Form field name prefix (submitted as name-start / name-end) */
  name: string
  /** Selected range start ISO date string (YYYY-MM-DD) */
  valueStart?: string
  /** Selected range end ISO date string (YYYY-MM-DD) */
  valueEnd?: string
  /** Marks the field as required */
  required?: boolean
  /** Disables the control */
  disabled?: boolean
  /** Validation error message */
  error?: string
  /** Earliest selectable date (YYYY-MM-DD) */
  min?: string
  /** Latest selectable date (YYYY-MM-DD) */
  max?: string
  /** Individual dates to disable, as YYYY-MM-DD strings */
  disabledDates?: string[]
  /** Fires when a range is committed; detail: { start, end } */
  onChange?: (detail: DateRangeChangeDetail) => void
}

/**
 * React wrapper for <app-date-picker range>.
 *
 * Renders the same custom element with `range` attribute set, exposing
 * start/end props and wiring the `date-range-change` event to `onChange`.
 */
export function DateRangePicker({
  label,
  hint,
  name,
  valueStart,
  valueEnd,
  required,
  disabled,
  error,
  min,
  max,
  disabledDates,
  onChange,
}: DateRangePickerProps) {
  const ref = useRef<AppDatePicker>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (disabledDates !== undefined) {
      el.disabledDates = disabledDates
    }

    if (!onChange) return

    const handler = (e: Event) => {
      onChange((e as CustomEvent<DateRangeChangeDetail>).detail)
    }
    el.addEventListener('date-range-change', handler)
    return () => el.removeEventListener('date-range-change', handler)
  }, [disabledDates, onChange])

  return (
    <app-date-picker
      ref={ref as React.Ref<AppDatePicker>}
      label={label}
      hint={hint}
      name={name}
      range
      value-start={valueStart}
      value-end={valueEnd}
      required={required || undefined}
      disabled={disabled || undefined}
      error={error}
      min={min}
      max={max}
    />
  )
}

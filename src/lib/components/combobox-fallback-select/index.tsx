import { useEffect, useRef } from 'react'
// Side-effect: registers <app-combobox-fallback-select> with customElements.define
import './combobox-fallback-select'
import type {
  ComboboxOption,
  ComboboxChangeDetail,
  ComboboxInputDetail,
} from './combobox-fallback-select'

export type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail }

export interface ComboboxFallbackSelectProps {
  label: string
  hint?: string
  placeholder?: string
  name: string
  required?: boolean
  disabled?: boolean
  error?: string
  options: ComboboxOption[]
  value?: string
  onChange?: (detail: ComboboxChangeDetail) => void
  onInput?: (detail: ComboboxInputDetail) => void
}

/**
 * React wrapper for <app-combobox-fallback-select>.
 *
 * On touch/mobile (pointer: coarse), a native <select> is rendered.
 * On pointer devices, the full combobox autocomplete widget is shown.
 *
 * Usage:
 *   <ComboboxFallbackSelect
 *     label="Country"
 *     name="country"
 *     options={options}
 *     onChange={(detail) => setCountry(detail.value)}
 *   />
 */
export function ComboboxFallbackSelect({
  label,
  hint,
  placeholder,
  name,
  required,
  disabled,
  error,
  options,
  value,
  onChange,
  onInput,
}: ComboboxFallbackSelectProps) {
  const ref = useRef<HTMLElement>(null)
  const optionsJson = JSON.stringify(options)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const changeHandler = (e: Event) => {
      onChange?.((e as CustomEvent<ComboboxChangeDetail>).detail)
    }
    const inputHandler = (e: Event) => {
      onInput?.((e as CustomEvent<ComboboxInputDetail>).detail)
    }

    el.addEventListener('combobox-change', changeHandler)
    el.addEventListener('combobox-input', inputHandler)
    return () => {
      el.removeEventListener('combobox-change', changeHandler)
      el.removeEventListener('combobox-input', inputHandler)
    }
  }, [onChange, onInput])

  return (
    <app-combobox-fallback-select
      ref={ref}
      label={label}
      hint={hint}
      placeholder={placeholder}
      name={name}
      options={optionsJson}
      required={required}
      disabled={disabled}
      error={error}
      value={value}
    />
  )
}

import { useEffect, useRef } from 'react'
// Side-effect: registers <app-combobox> with customElements.define
import type {
  ComboboxOption,
  ComboboxChangeDetail,
  ComboboxInputDetail,
} from './combobox'
import './combobox'

export type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail }

export interface ComboboxProps {
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
 * React wrapper for <app-combobox>.
 *
 * Bridges React's synthetic event system to the custom events fired by the
 * underlying custom element (`combobox-change`, `combobox-input`).
 *
 * Usage:
 *   <Combobox
 *     label="Country"
 *     name="country"
 *     options={options}
 *     onChange={(detail) => setCountry(detail.value)}
 *   />
 */
export function Combobox({
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
}: ComboboxProps) {
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
    <app-combobox
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

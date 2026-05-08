import { useEffect, useRef } from 'react'
// Side-effect: registers <app-star-rating> with customElements.define
import type { StarRatingChangeDetail } from './star-rating'
import './star-rating'

export type { StarRatingChangeDetail }

export interface StarRatingProps {
  label: string
  hint?: string
  name: string
  required?: boolean
  error?: string
  value?: string
  onChange?: (detail: StarRatingChangeDetail) => void
}

/**
 * React wrapper for <app-star-rating>.
 *
 * Bridges React's synthetic event system to the custom event fired by the
 * underlying custom element (`star-rating-change`).
 *
 * Usage:
 *   <StarRating
 *     label="Rate your experience"
 *     name="rating"
 *     value={value}
 *     onChange={(detail) => setValue(detail.value)}
 *   />
 */
export function StarRating({
  label,
  hint,
  name,
  required,
  error,
  value,
  onChange,
}: StarRatingProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handler = (e: Event) => {
      onChange?.((e as CustomEvent<StarRatingChangeDetail>).detail)
    }

    el.addEventListener('star-rating-change', handler)
    return () => el.removeEventListener('star-rating-change', handler)
  }, [onChange])

  return (
    <app-star-rating
      ref={ref}
      label={label}
      hint={hint}
      name={name}
      required={required ? '' : undefined}
      error={error}
      value={value}
    />
  )
}

import { CustomElement } from '../../CustomElement'
import styles from './star-rating.css?inline'

export interface StarRatingChangeDetail {
  value: string
}

/**
 * <app-star-rating> — Accessible star rating input.
 *
 * ARIA pattern:
 *   WAI-ARIA radiogroup pattern.
 *   aria-required / aria-invalid / aria-describedby go on the radiogroup div,
 *   not on individual inputs — per Adrian Roselli's research.
 *
 * Attributes:
 *   label     — visible label text (required)
 *   hint      — hint / description text
 *   name      — form field name
 *   required  — marks as required
 *   error     — error message
 *   value     — currently selected value ("1"–"5")
 *
 * Custom events (bubble, composed):
 *   star-rating-change — fires on selection; detail: StarRatingChangeDetail
 *
 * Features:
 *   - 5 stars (fixed)
 *   - Roving tabindex: selected star (or first if none) is tabbable
 *   - Arrow-key navigation between stars
 *   - Hover highlighting for all stars up to the hovered one
 *   - Focus ring on the focused star label (:focus-visible only)
 *   - Sparkle animation (6 particles) on selection; respects prefers-reduced-motion
 *   - Form-associated (ElementInternals) — participates in <form> submission
 */
export class AppStarRating extends CustomElement {
  static formAssociated = true

  static observedAttributes = ['label', 'hint', 'name', 'required', 'error', 'value']

  private static _counter = 0

  private readonly _internals: ElementInternals
  private readonly _uid: string

  // DOM refs — populated by _render()
  private _labelEl!: HTMLSpanElement
  private _starsEl!: HTMLDivElement
  private _inputEls: HTMLInputElement[] = []
  private _starLabelEls: HTMLLabelElement[] = []

  // State
  private _value = ''
  private _hoveredIndex: number | null = null

  constructor() {
    super()
    this._internals = this.attachInternals()
    this._uid = `sr-${++AppStarRating._counter}`
    this.adoptStyle(styles)
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    this._render()
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this._starsEl) return

    switch (name) {
      case 'label':
        if (this._labelEl.firstChild?.nodeType === Node.TEXT_NODE) {
          this._labelEl.firstChild.textContent = newValue ?? ''
        }
        break
      case 'hint':
        this._syncHint(newValue)
        break
      case 'required': {
        const isRequired = newValue !== null
        this._starsEl.toggleAttribute('aria-required', isRequired)
        this._inputEls.forEach((input) => {
          input.required = isRequired
        })
        this._syncValidity()
        break
      }
      case 'error':
        this._syncError(newValue)
        break
      case 'value':
        this._value = newValue ?? ''
        this._internals.setFormValue(this._value || null)
        this._updateStars()
        this._syncValidity()
        break
    }
  }

  // ── Form-associated element API ──────────────────────────────────────────────

  get value(): string {
    return this._value
  }
  set value(v: string) {
    this.setAttribute('value', v)
  }

  get name(): string {
    return this.getAttribute('name') ?? ''
  }
  set name(v: string) {
    this.setAttribute('name', v)
  }

  get required(): boolean {
    return this.hasAttribute('required')
  }
  set required(v: boolean) {
    if (v) {
      this.setAttribute('required', '')
    } else {
      this.removeAttribute('required')
    }
  }

  get error(): string {
    return this.getAttribute('error') ?? ''
  }
  set error(v: string) {
    if (v) {
      this.setAttribute('error', v)
    } else {
      this.removeAttribute('error')
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  private _render(): void {
    const uid = this._uid
    const label = this.getAttribute('label') ?? ''
    const hint = this.getAttribute('hint')
    const error = this.getAttribute('error')
    const name = this.getAttribute('name') ?? uid
    const required = this.hasAttribute('required')
    const currentValue = this._value ? Number(this._value) : 0

    // Wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'star-rating'

    // Label
    const labelEl = document.createElement('span')
    labelEl.id = `${uid}-label`
    labelEl.className = 'star-rating__label'
    labelEl.appendChild(document.createTextNode(label))
    if (required) {
      const req = document.createElement('span')
      req.className = 'star-rating__required'
      req.setAttribute('aria-hidden', 'true')
      req.textContent = ' (required)'
      labelEl.appendChild(req)
    }
    wrapper.appendChild(labelEl)
    this._labelEl = labelEl

    // Hint
    if (hint) {
      const hintEl = document.createElement('div')
      hintEl.id = `${uid}-hint`
      hintEl.className = 'star-rating__hint'
      hintEl.textContent = hint
      wrapper.appendChild(hintEl)
    }

    // Error
    if (error) {
      const errorEl = document.createElement('div')
      errorEl.id = `${uid}-error`
      errorEl.className = 'star-rating__error'
      errorEl.setAttribute('role', 'alert')
      errorEl.textContent = error
      wrapper.appendChild(errorEl)
    }

    // Stars container (radiogroup)
    const starsEl = document.createElement('div')
    starsEl.className = 'star-rating__stars'
    starsEl.setAttribute('role', 'radiogroup')
    starsEl.setAttribute('aria-labelledby', `${uid}-label`)
    if (required) starsEl.setAttribute('aria-required', 'true')
    if (error) {
      starsEl.setAttribute('aria-invalid', 'true')
      starsEl.setAttribute('aria-describedby', `${uid}-error`)
    } else if (hint) {
      starsEl.setAttribute('aria-describedby', `${uid}-hint`)
    }
    wrapper.appendChild(starsEl)
    this._starsEl = starsEl

    this._inputEls = []
    this._starLabelEls = []

    for (let i = 1; i <= 5; i++) {
      const inputId = `${uid}-${i}`
      const tabIndex =
        currentValue > 0 ? (currentValue === i ? 0 : -1) : i === 1 ? 0 : -1

      // Hidden radio input
      const input = document.createElement('input')
      input.type = 'radio'
      input.className = 'sr-only'
      input.id = inputId
      input.name = name
      input.value = String(i)
      if (required) input.required = true
      input.checked = currentValue === i
      input.tabIndex = tabIndex
      input.setAttribute('aria-label', i === 1 ? '1 star' : `${i} stars`)
      input.addEventListener('change', () => this._handleChange(i))
      input.addEventListener('focus', (e) => this._handleFocus(e, i))
      input.addEventListener('blur', () => this._handleBlur(i))
      input.addEventListener('keydown', (e) => this._handleKeyDown(e, i))
      starsEl.appendChild(input)
      this._inputEls.push(input)

      // Star label with sparkle particles
      const starLabel = document.createElement('label')
      starLabel.htmlFor = inputId
      starLabel.className = 'star-rating__star-label'

      for (let n = 1; n <= 6; n++) {
        const particle = document.createElement('span')
        particle.className = `star-particle star-particle--${n}`
        particle.setAttribute('aria-hidden', 'true')
        particle.textContent = '★'
        // Particle 2 has the longest effective duration (500ms + 30ms delay = 530ms)
        // so its animationend is used to clean up the sparkle state.
        if (n === 2) {
          particle.addEventListener('animationend', () => {
            starLabel.classList.remove('star-rating__star-label--sparkle')
          })
        }
        starLabel.appendChild(particle)
      }

      // Visible star glyph
      const glyph = document.createElement('span')
      glyph.className =
        'star-rating__glyph' + (currentValue >= i ? ' star-rating__glyph--active' : '')
      glyph.setAttribute('aria-hidden', 'true')
      glyph.textContent = '★'
      starLabel.appendChild(glyph)

      starLabel.addEventListener('mouseenter', () => this._handleMouseEnter(i))
      starLabel.addEventListener('mouseleave', () => this._handleMouseLeave())

      starsEl.appendChild(starLabel)
      this._starLabelEls.push(starLabel)
    }

    this.shadow.appendChild(wrapper)
    this._syncValidity()
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  private _handleChange(starValue: number): void {
    this._setValue(starValue)
    this._triggerSparkle(starValue)
  }

  private _handleFocus(e: FocusEvent, starValue: number): void {
    this._hoveredIndex = starValue
    this._updateGlyphs()
    const input = e.target as HTMLInputElement
    if (input.matches(':focus-visible')) {
      this._starLabelEls[starValue - 1].classList.add('star-rating__star-label--focused')
    }
  }

  private _handleBlur(starValue: number): void {
    this._hoveredIndex = null
    this._updateGlyphs()
    this._starLabelEls[starValue - 1].classList.remove('star-rating__star-label--focused')
  }

  private _handleKeyDown(e: KeyboardEvent, starValue: number): void {
    const currentIndex = starValue - 1
    let newIndex: number
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        newIndex = (currentIndex + 1) % 5
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        newIndex = (currentIndex - 1 + 5) % 5
        break
      default:
        return
    }
    const newValue = newIndex + 1
    this._setValue(newValue)
    this._triggerSparkle(newValue)
    this._inputEls[newIndex]?.focus()
  }

  private _handleMouseEnter(starValue: number): void {
    this._hoveredIndex = starValue
    this._updateGlyphs()
  }

  private _handleMouseLeave(): void {
    this._hoveredIndex = null
    this._updateGlyphs()
  }

  // ── State helpers ────────────────────────────────────────────────────────────

  private _setValue(starValue: number): void {
    this._value = String(starValue)
    this._internals.setFormValue(this._value)
    this._updateStars()
    this._syncValidity()
    this.emit<StarRatingChangeDetail>('star-rating-change', { value: this._value })
  }

  private _triggerSparkle(starValue: number): void {
    const labelEl = this._starLabelEls[starValue - 1]
    // Force reflow so re-selecting the same star replays the animation.
    labelEl.classList.remove('star-rating__star-label--sparkle')
    void labelEl.offsetWidth
    labelEl.classList.add('star-rating__star-label--sparkle')
  }

  private _updateStars(): void {
    const currentValue = this._value ? Number(this._value) : 0
    for (let i = 0; i < 5; i++) {
      const input = this._inputEls[i]
      if (!input) continue
      input.checked = currentValue === i + 1
      input.tabIndex =
        currentValue > 0 ? (currentValue === i + 1 ? 0 : -1) : i === 0 ? 0 : -1
    }
    this._updateGlyphs()
  }

  private _updateGlyphs(): void {
    const currentValue = this._value ? Number(this._value) : 0
    const activeValue = this._hoveredIndex !== null ? this._hoveredIndex : currentValue
    for (let i = 0; i < 5; i++) {
      const glyph = this._starLabelEls[i]?.querySelector<HTMLSpanElement>('.star-rating__glyph')
      if (!glyph) continue
      glyph.classList.toggle('star-rating__glyph--active', activeValue >= i + 1)
    }
  }

  private _syncValidity(): void {
    if (this.hasAttribute('required') && !this._value) {
      this._internals.setValidity(
        { valueMissing: true },
        'Please select a rating',
        this._inputEls[0],
      )
    } else {
      this._internals.setValidity({})
    }
  }

  private _syncHint(hint: string | null): void {
    const uid = this._uid
    const existing = this.shadow.querySelector<HTMLDivElement>(`#${uid}-hint`)
    if (hint) {
      if (!existing) {
        const hintEl = document.createElement('div')
        hintEl.id = `${uid}-hint`
        hintEl.className = 'star-rating__hint'
        hintEl.textContent = hint
        this._starsEl.parentElement!.insertBefore(hintEl, this._starsEl)
      } else {
        existing.textContent = hint
      }
      if (!this.getAttribute('error')) {
        this._starsEl.setAttribute('aria-describedby', `${uid}-hint`)
      }
    } else if (existing) {
      existing.remove()
      if (!this.getAttribute('error')) {
        this._starsEl.removeAttribute('aria-describedby')
      }
    }
  }

  private _syncError(error: string | null): void {
    const uid = this._uid
    const existing = this.shadow.querySelector<HTMLDivElement>(`#${uid}-error`)
    if (error) {
      if (!existing) {
        const errorEl = document.createElement('div')
        errorEl.id = `${uid}-error`
        errorEl.className = 'star-rating__error'
        errorEl.setAttribute('role', 'alert')
        errorEl.textContent = error
        this._starsEl.parentElement!.insertBefore(errorEl, this._starsEl)
      } else {
        existing.textContent = error
      }
      this._starsEl.setAttribute('aria-invalid', 'true')
      this._starsEl.setAttribute('aria-describedby', `${uid}-error`)
    } else {
      existing?.remove()
      this._starsEl.removeAttribute('aria-invalid')
      const hint = this.getAttribute('hint')
      if (hint) {
        this._starsEl.setAttribute('aria-describedby', `${uid}-hint`)
      } else {
        this._starsEl.removeAttribute('aria-describedby')
      }
    }
  }
}

customElements.define('app-star-rating', AppStarRating)

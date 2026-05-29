import { CustomElement } from '../../CustomElement'
import styles from './date-picker.css?inline'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DateChangeDetail {
  /** Selected ISO date string (YYYY-MM-DD), or '' when cleared. */
  value: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const MONTHS     = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const ISO_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

// ── Date helpers ──────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse an ISO date string without time-zone shift. Returns null if invalid. */
function fromIso(s: string): Date | null {
  if (!ISO_RE.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

function today(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Clamp day to last valid day of the given year/month. */
function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * <app-date-picker> — Accessible date picker following the W3C APG
 * Date Picker Dialog pattern (Dialog + Grid).
 *
 * ARIA reference:
 *   https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
 *
 * Attributes:
 *   label        — visible label text (required for accessibility)
 *   hint         — hint text shown below the label
 *   name         — form field name
 *   value        — selected date in YYYY-MM-DD format
 *   required     — marks field as required
 *   disabled     — disables the entire control
 *   error        — validation error message
 *   min          — earliest selectable date (YYYY-MM-DD)
 *   max          — latest selectable date (YYYY-MM-DD)
 *
 * JS-only properties:
 *   disabledDates  — string[] of YYYY-MM-DD dates to disable individually
 *
 * Custom events (bubble, composed):
 *   date-change — fires when date is committed; detail: DateChangeDetail
 *
 * Keyboard (dialog open):
 *   Arrow keys    — navigate days (auto-pages to adjacent months)
 *   Page Up/Down  — previous/next month
 *   Shift+PgUp/Dn — previous/next year
 *   Home / End    — first / last day of current week
 *   Enter / Space — select focused date, close dialog
 *   Esc           — close dialog without selecting
 *   Tab           — cycle through: prev-year, prev-month, next-month,
 *                   next-year, grid cell, Cancel, OK (wraps)
 */
export class AppDatePicker extends CustomElement {
  static formAssociated = true

  static observedAttributes = [
    'label', 'hint', 'name', 'value',
    'required', 'disabled', 'error',
    'min', 'max',
  ]

  private static _counter = 0

  // ── ElementInternals ───────────────────────────────────────────────────────
  private readonly _internals: ElementInternals

  // ── State ──────────────────────────────────────────────────────────────────
  /** Committed ISO date string (YYYY-MM-DD) or '' */
  private _value = ''
  /** Year currently displayed in the calendar */
  private _viewYear = 0
  /** Month currently displayed (0-11) */
  private _viewMonth = 0
  /** The date cell currently focused in the grid (roving tabindex target) */
  private _focusedDate: Date = today()
  /** Whether the calendar dialog is open */
  private _isOpen = false
  /** Individually disabled dates */
  private _disabledDates = new Set<string>()
  /** Parsed min/max constraints */
  private _minDate: Date | null = null
  private _maxDate: Date | null = null

  private readonly _uid: string

  // ── DOM refs ───────────────────────────────────────────────────────────────
  private _labelEl!: HTMLLabelElement
  private _requiredSpan!: HTMLSpanElement
  private _hintEl!: HTMLElement
  private _errorEl!: HTMLElement
  private _inputEl!: HTMLInputElement
  private _toggleBtnEl!: HTMLButtonElement
  private _dialogEl!: HTMLElement
  private _monthYearEl!: HTMLHeadingElement
  private _prevYearBtnEl!: HTMLButtonElement
  private _prevMonthBtnEl!: HTMLButtonElement
  private _nextMonthBtnEl!: HTMLButtonElement
  private _nextYearBtnEl!: HTMLButtonElement
  private _gridBodyEl!: HTMLTableSectionElement
  private _cancelBtnEl!: HTMLButtonElement
  private _okBtnEl!: HTMLButtonElement
  private _kbHintEl!: HTMLElement

  /** Used to dismiss the dialog when clicking outside */
  private _outsideClickHandler: ((e: MouseEvent) => void) | null = null

  constructor() {
    super()
    this._internals = this.attachInternals()
    this._uid = `dp-${++AppDatePicker._counter}`
    this.adoptStyle(styles)
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get value(): string { return this._value }
  set value(v: string) { this._setCommittedValue(v, false) }

  get name(): string { return this.getAttribute('name') ?? '' }
  set name(v: string) { this.setAttribute('name', v) }

  get min(): string { return this.getAttribute('min') ?? '' }
  set min(v: string) {
    if (v) this.setAttribute('min', v)
    else this.removeAttribute('min')
  }

  get max(): string { return this.getAttribute('max') ?? '' }
  set max(v: string) {
    if (v) this.setAttribute('max', v)
    else this.removeAttribute('max')
  }

  get disabled(): boolean { return this.hasAttribute('disabled') }
  set disabled(v: boolean) {
    if (v) this.setAttribute('disabled', '')
    else this.removeAttribute('disabled')
  }

  get required(): boolean { return this.hasAttribute('required') }
  set required(v: boolean) {
    if (v) this.setAttribute('required', '')
    else this.removeAttribute('required')
  }

  get error(): string { return this.getAttribute('error') ?? '' }
  set error(v: string) {
    if (v) this.setAttribute('error', v)
    else this.removeAttribute('error')
  }

  get disabledDates(): string[] { return [...this._disabledDates] }
  set disabledDates(dates: string[]) {
    this._disabledDates = new Set(dates)
    if (this._isOpen) this._renderGrid()
  }

  // Form-associated API
  get form(): HTMLFormElement | null { return this._internals.form }
  get validity(): ValidityState { return this._internals.validity }
  get validationMessage(): string { return this._internals.validationMessage }
  checkValidity(): boolean { return this._internals.checkValidity() }
  reportValidity(): boolean { return this._internals.reportValidity() }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    super.connectedCallback()
    this._renderShell()
    this._syncAllAttrs()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._detachOutsideClick()
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this._inputEl) return

    switch (name) {
      case 'label':
        this._labelEl.querySelector('.dp__label-text')!.textContent = newValue ?? ''
        break
      case 'hint':
        this._syncHint(newValue)
        break
      case 'value':
        this._setCommittedValue(newValue ?? '', false)
        break
      case 'required':
        this._inputEl.required = newValue !== null
        this._requiredSpan.hidden = newValue === null
        this._syncValidity()
        break
      case 'disabled':
        this._inputEl.disabled = newValue !== null
        this._toggleBtnEl.disabled = newValue !== null
        if (newValue !== null && this._isOpen) this._closeDialog(false)
        break
      case 'error':
        this._syncError(newValue)
        break
      case 'min':
        this._minDate = newValue ? fromIso(newValue) : null
        if (this._isOpen) this._renderGrid()
        break
      case 'max':
        this._maxDate = newValue ? fromIso(newValue) : null
        if (this._isOpen) this._renderGrid()
        break
    }
  }

  // ── Shell rendering ────────────────────────────────────────────────────────

  private _renderShell(): void {
    const uid = this._uid

    this.shadow.innerHTML = `
      <div class="dp" part="root">

        <label class="dp__label" for="${uid}-input">
          <span class="dp__label-text"></span>
          <span class="dp__required" aria-hidden="true" hidden> (required)</span>
        </label>

        <div id="${uid}-hint" class="dp__hint" hidden></div>

        <div
          id="${uid}-error"
          class="dp__error"
          role="alert"
          aria-live="polite"
          hidden
        ></div>

        <div class="dp__field">
          <input
            type="text"
            id="${uid}-input"
            class="dp__input"
            placeholder="YYYY-MM-DD"
            autocomplete="off"
            inputmode="none"
            aria-describedby="${uid}-hint ${uid}-format ${uid}-error"
          />
          <button
            type="button"
            class="dp__toggle"
            aria-label="Choose date"
            aria-haspopup="dialog"
            aria-expanded="false"
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>

        <span id="${uid}-format" class="sr-only">Date format: YYYY-MM-DD</span>

        <div
          id="${uid}-dialog"
          class="dp__dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Choose date"
          tabindex="-1"
          hidden
        >
          <div class="dp__dialog-header">
            <button type="button" class="dp__nav-btn" data-action="prev-year"
                    aria-label="Previous year">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
            <button type="button" class="dp__nav-btn" data-action="prev-month"
                    aria-label="Previous month">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <h2 id="${uid}-grid-label" class="dp__month-year" aria-live="polite"></h2>

            <button type="button" class="dp__nav-btn" data-action="next-month"
                    aria-label="Next month">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button type="button" class="dp__nav-btn" data-action="next-year"
                    aria-label="Next year">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
          </div>

          <div class="dp__grid-wrap">
            <table
              class="dp__grid"
              role="grid"
              aria-labelledby="${uid}-grid-label"
            >
              <thead>
                <tr>
                  ${DAYS_SHORT.map((d, i) =>
                    `<th scope="col" abbr="${DAYS_FULL[i]}">${d}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody id="${uid}-grid-body"></tbody>
            </table>
          </div>

          <div class="dp__dialog-footer">
            <button type="button" class="dp__footer-btn dp__footer-btn--cancel">Cancel</button>
            <button type="button" class="dp__footer-btn dp__footer-btn--ok">OK</button>
          </div>

          <div
            id="${uid}-kb-hint"
            class="dp__kb-hint"
            aria-live="polite"
          ></div>
        </div>

      </div>
    `

    // Cache refs
    const q = <T extends Element>(sel: string) => this.shadow.querySelector<T>(sel)!
    const id = <T extends Element>(s: string) => this.shadow.getElementById(`${uid}-${s}`) as unknown as T

    this._labelEl        = q('.dp__label')
    this._requiredSpan   = q('.dp__required')
    this._hintEl         = id('hint')
    this._errorEl        = id('error')
    this._inputEl        = id<HTMLInputElement>('input')
    this._toggleBtnEl    = q('.dp__toggle')
    this._dialogEl       = id('dialog')
    this._monthYearEl    = id<HTMLHeadingElement>('grid-label')
    this._gridBodyEl     = id<HTMLTableSectionElement>('grid-body')
    this._prevYearBtnEl  = q('[data-action="prev-year"]')
    this._prevMonthBtnEl = q('[data-action="prev-month"]')
    this._nextMonthBtnEl = q('[data-action="next-month"]')
    this._nextYearBtnEl  = q('[data-action="next-year"]')
    this._cancelBtnEl    = q('.dp__footer-btn--cancel')
    this._okBtnEl        = q('.dp__footer-btn--ok')
    this._kbHintEl       = id('kb-hint')

    this._bindEvents()
  }

  // ── Event binding ──────────────────────────────────────────────────────────

  private _bindEvents(): void {
    // Toggle button — open/close dialog
    this._toggleBtnEl.addEventListener('click', () => {
      if (this._isOpen) this._closeDialog(true)
      else this._openDialog()
    })

    // Text input — validate on blur, open on Enter
    this._inputEl.addEventListener('blur', () => this._handleInputBlur())
    this._inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); this._openDialog() }
    })

    // Navigation buttons
    this._prevYearBtnEl.addEventListener('click',  () => this._navigate(0, -1))
    this._prevMonthBtnEl.addEventListener('click', () => this._navigate(-1, 0))
    this._nextMonthBtnEl.addEventListener('click', () => this._navigate(1, 0))
    this._nextYearBtnEl.addEventListener('click',  () => this._navigate(0, 1))

    // Footer buttons
    this._cancelBtnEl.addEventListener('click', () => this._closeDialog(true))
    this._okBtnEl.addEventListener('click', () => {
      this._commitDate(this._focusedDate)
      this._closeDialog(true)
    })

    // Dialog-level keyboard handling (Tab trap + Esc)
    this._dialogEl.addEventListener('keydown', (e: KeyboardEvent) => this._handleDialogKeydown(e))

    // Grid keyboard handling
    this._gridBodyEl.addEventListener('keydown', (e: KeyboardEvent) => this._handleGridKeydown(e))

    // Show keyboard hint when grid receives focus
    this._gridBodyEl.addEventListener('focusin', () => {
      // Slight delay so it's announced after focus-change
      window.setTimeout(() => {
        this._kbHintEl.textContent =
          'Arrow keys to navigate days. Page Up/Down for months. Shift+Page Up/Down for years.'
      }, 150)
    })

    this._gridBodyEl.addEventListener('focusout', (e: FocusEvent) => {
      if (!this._gridBodyEl.contains(e.relatedTarget as Node | null)) {
        this._kbHintEl.textContent = ''
      }
    })
  }

  // ── Dialog open/close ──────────────────────────────────────────────────────

  private _openDialog(): void {
    if (this._isOpen || this.disabled) return

    // Determine initial focused date: committed value, or today
    const committed = fromIso(this._value)
    this._focusedDate = committed ?? today()
    this._viewYear  = this._focusedDate.getFullYear()
    this._viewMonth = this._focusedDate.getMonth()

    this._renderGrid()
    this._dialogEl.hidden = false
    this._isOpen = true
    this._toggleBtnEl.setAttribute('aria-expanded', 'true')

    // Focus the active grid cell
    this._focusGridCell(this._focusedDate)

    this._attachOutsideClick()
  }

  private _closeDialog(returnFocusToToggle: boolean): void {
    if (!this._isOpen) return
    this._dialogEl.hidden = true
    this._isOpen = false
    this._toggleBtnEl.setAttribute('aria-expanded', 'false')
    this._kbHintEl.textContent = ''
    this._detachOutsideClick()
    if (returnFocusToToggle) this._toggleBtnEl.focus()
  }

  // ── Navigate to prev/next month or year ───────────────────────────────────

  private _navigate(monthDelta: number, yearDelta: number): void {
    let y = this._viewYear  + yearDelta
    let m = this._viewMonth + monthDelta
    if (m < 0)  { m += 12; y-- }
    if (m > 11) { m -= 12; y++ }
    this._viewYear  = y
    this._viewMonth = m

    // Keep the focused day in the new month (clamped to last day if needed)
    this._focusedDate = clampDay(y, m, this._focusedDate.getDate())

    this._renderGrid()
    this._focusGridCell(this._focusedDate)
  }

  // ── Grid rendering ─────────────────────────────────────────────────────────

  private _renderGrid(): void {
    const y = this._viewYear
    const m = this._viewMonth

    this._monthYearEl.textContent = `${MONTHS[m]} ${y}`

    const firstDow  = new Date(y, m, 1).getDay()   // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const todayIso  = toIso(today())
    const selectedIso = this._value

    const rows: string[] = []
    let day = 1 - firstDow  // start from the first visible cell (may be negative)

    for (let row = 0; row < 6; row++) {
      const cells: string[] = []
      for (let col = 0; col < 7; col++, day++) {
        if (day < 1 || day > daysInMonth) {
          cells.push('<td class="dp__day dp__day--padding" aria-hidden="true"><span></span></td>')
        } else {
          const date   = new Date(y, m, day)
          const iso    = toIso(date)
          const isTod  = iso === todayIso
          const isSel  = iso === selectedIso
          const isFoc  = sameDay(date, this._focusedDate)
          const isDis  = this._isDateDisabled(date)

          const todayAttr    = isTod ? ' data-today' : ''
          const pressedAttr  = isSel ? ' aria-pressed="true"' : ' aria-pressed="false"'
          const disabledAttr = isDis ? ' disabled' : ''
          const tabindex     = isFoc && !isDis ? '0' : '-1'
          const label        = `${DAYS_FULL[date.getDay()]}, ${MONTHS[m]} ${day}, ${y}${isTod ? ', today' : ''}${isSel ? ', selected' : ''}`

          cells.push(`
            <td class="dp__day" role="gridcell">
              <button
                type="button"
                class="dp__day-btn"
                data-date="${iso}"
                tabindex="${tabindex}"
                aria-label="${label}"
                ${pressedAttr}${todayAttr}${disabledAttr}
              >${day}</button>
            </td>`)
        }
      }
      // Only emit the row if it contains at least one real day
      if (day - 7 <= daysInMonth) {
        rows.push(`<tr>${cells.join('')}</tr>`)
      }
    }

    this._gridBodyEl.innerHTML = rows.join('')

    // Wire click handlers on day buttons
    this._gridBodyEl.querySelectorAll<HTMLButtonElement>('.dp__day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.dataset.date
        if (!iso) return
        const d = fromIso(iso)
        if (!d) return
        this._commitDate(d)
        this._closeDialog(true)
      })
    })
  }

  // ── Focus management in the grid ──────────────────────────────────────────

  private _focusGridCell(date: Date): void {
    const iso = toIso(date)
    const btn = this._gridBodyEl.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)
    if (btn && !btn.disabled) {
      // Update roving tabindex
      this._gridBodyEl.querySelectorAll<HTMLButtonElement>('.dp__day-btn').forEach(b => {
        b.setAttribute('tabindex', '-1')
      })
      btn.setAttribute('tabindex', '0')
      btn.focus()
    }
  }

  // ── Grid keyboard navigation (W3C APG pattern) ────────────────────────────

  private _handleGridKeydown(e: KeyboardEvent): void {
    let date = new Date(this._focusedDate)
    let handled = true

    switch (e.key) {
      case 'ArrowRight': date.setDate(date.getDate() + 1); break
      case 'ArrowLeft':  date.setDate(date.getDate() - 1); break
      case 'ArrowDown':  date.setDate(date.getDate() + 7); break
      case 'ArrowUp':    date.setDate(date.getDate() - 7); break
      case 'Home': {
        // First day of current week (Sunday)
        date.setDate(date.getDate() - date.getDay())
        break
      }
      case 'End': {
        // Last day of current week (Saturday)
        date.setDate(date.getDate() + (6 - date.getDay()))
        break
      }
      case 'PageUp':
        if (e.shiftKey) date = clampDay(date.getFullYear() - 1, date.getMonth(), date.getDate())
        else            date = clampDay(date.getFullYear(), date.getMonth() - 1, date.getDate())
        break
      case 'PageDown':
        if (e.shiftKey) date = clampDay(date.getFullYear() + 1, date.getMonth(), date.getDate())
        else            date = clampDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
        break
      case 'Enter':
      case ' ':
        if (!this._isDateDisabled(this._focusedDate)) {
          this._commitDate(this._focusedDate)
          this._closeDialog(true)
        }
        break
      default:
        handled = false
    }

    if (!handled) return
    e.preventDefault()

    if (e.key === 'Enter' || e.key === ' ') return

    // Skip disabled dates in arrow navigation
    if (this._isDateDisabled(date)) return

    this._focusedDate = date

    // If navigated to a different month, re-render
    if (date.getFullYear() !== this._viewYear || date.getMonth() !== this._viewMonth) {
      this._viewYear  = date.getFullYear()
      this._viewMonth = date.getMonth()
      this._renderGrid()
    }

    this._focusGridCell(date)
  }

  // ── Dialog Tab-trap keyboard handling ─────────────────────────────────────

  private _handleDialogKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this._closeDialog(true)
      return
    }

    if (e.key !== 'Tab') return

    // Build the ordered list of focusable elements in the dialog
    const focusable = [
      this._prevYearBtnEl,
      this._prevMonthBtnEl,
      this._nextMonthBtnEl,
      this._nextYearBtnEl,
      this._gridBodyEl.querySelector<HTMLButtonElement>('[tabindex="0"]') ?? null,
      this._cancelBtnEl,
      this._okBtnEl,
    ].filter((el): el is HTMLButtonElement => el !== null && !el.disabled)

    if (focusable.length === 0) return

    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    const active = this.shadow.activeElement

    if (e.shiftKey) {
      if (active === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // ── Outside-click dismiss ──────────────────────────────────────────────────

  private _attachOutsideClick(): void {
    this._outsideClickHandler = (e: MouseEvent) => {
      if (!this.contains(e.target as Node) && !(e.composedPath().includes(this))) {
        this._closeDialog(false)
      }
    }
    document.addEventListener('mousedown', this._outsideClickHandler)
  }

  private _detachOutsideClick(): void {
    if (this._outsideClickHandler) {
      document.removeEventListener('mousedown', this._outsideClickHandler)
      this._outsideClickHandler = null
    }
  }

  // ── Committing a date ──────────────────────────────────────────────────────

  private _commitDate(date: Date): void {
    const iso = toIso(date)
    // Clear any displayed error when the user picks a valid date via the calendar.
    if (!this.getAttribute('error')) this._syncError(null)
    this._setCommittedValue(iso, true)
  }

  private _setCommittedValue(iso: string, fireEvent: boolean): void {
    const normalised = iso.trim()
    const isValid    = normalised === '' || fromIso(normalised) !== null
    if (!isValid) return

    this._value = normalised

    // Guard: DOM refs may not exist yet if the setter is called before
    // connectedCallback (e.g. React sets `value` as a property before the
    // element is inserted). _syncAllAttrs() will flush _value once connected.
    if (!this._inputEl) return

    this._inputEl.value = normalised

    // Update FormData
    this._internals.setFormValue(normalised || null)

    // Update toggle button accessible name
    this._toggleBtnEl.setAttribute(
      'aria-label',
      normalised ? `Change date, ${normalised}` : 'Choose date',
    )

    this._syncValidity()
    if (fireEvent) {
      this.emit<DateChangeDetail>('date-change', { value: normalised })
    }
  }

  // ── Text input blur validation ─────────────────────────────────────────────

  private _handleInputBlur(): void {
    const raw = this._inputEl.value.trim()
    if (raw === '') {
      this._setCommittedValue('', true)
      return
    }
    const parsed = fromIso(raw)
    if (!parsed) {
      this._syncError('Please enter a valid date in YYYY-MM-DD format.')
      return
    }
    if (this._minDate && parsed < this._minDate) {
      this._syncError(`Date must be on or after ${toIso(this._minDate)}.`)
      return
    }
    if (this._maxDate && parsed > this._maxDate) {
      this._syncError(`Date must be on or before ${toIso(this._maxDate)}.`)
      return
    }
    // Clear any previous format error, then commit
    if (!this.getAttribute('error')) this._syncError(null)
    this._setCommittedValue(raw, true)
  }

  // ── Validity ───────────────────────────────────────────────────────────────

  private _syncValidity(): void {
    const required = this.hasAttribute('required')
    if (required && !this._value) {
      this._internals.setValidity(
        { valueMissing: true },
        'Please select a date.',
        this._inputEl,
      )
    } else {
      this._internals.setValidity({})
    }
  }

  // ── Attribute sync helpers ─────────────────────────────────────────────────

  private _syncAllAttrs(): void {
    const label    = this.getAttribute('label')    ?? ''
    const hint     = this.getAttribute('hint')
    // Prefer _value (may have been set via JS property before connectedCallback)
    // over the attribute; fall back to the attribute if _value is empty.
    const value    = this._value || (this.getAttribute('value') ?? '')
    const error    = this.getAttribute('error')
    const required = this.hasAttribute('required')
    const disabled = this.hasAttribute('disabled')
    const minAttr  = this.getAttribute('min')
    const maxAttr  = this.getAttribute('max')

    this._labelEl.querySelector('.dp__label-text')!.textContent = label

    if (hint)     this._syncHint(hint)
    if (error)    this._syncError(error)

    if (required) {
      this._inputEl.required   = true
      this._requiredSpan.hidden = false
    }
    if (disabled) {
      this._inputEl.disabled    = true
      this._toggleBtnEl.disabled = true
    }

    this._minDate = minAttr ? fromIso(minAttr) : null
    this._maxDate = maxAttr ? fromIso(maxAttr) : null

    if (value) this._setCommittedValue(value, false)

    this._syncValidity()
  }

  private _syncHint(hint: string | null): void {
    if (hint) {
      this._hintEl.textContent = hint
      this._hintEl.hidden = false
    } else {
      this._hintEl.hidden = true
      this._hintEl.textContent = ''
    }
  }

  private _syncError(msg: string | null): void {
    const wrapper = this._labelEl.closest('.dp') ?? this.shadow.querySelector('.dp')!
    if (msg) {
      this._errorEl.textContent = msg
      this._errorEl.hidden = false
      wrapper.classList.add('dp--error')
    } else {
      this._errorEl.hidden = true
      this._errorEl.textContent = ''
      wrapper.classList.remove('dp--error')
    }
  }

  // ── Date constraint check ──────────────────────────────────────────────────

  private _isDateDisabled(date: Date): boolean {
    if (this._minDate && date < this._minDate) return true
    if (this._maxDate && date > this._maxDate) return true
    if (this._disabledDates.has(toIso(date)))  return true
    return false
  }

  // ── Event helper (re-uses CustomElement.emit) ──────────────────────────────
  // (inherited from CustomElement base class)
}

if (!customElements.get('app-date-picker')) {
  customElements.define('app-date-picker', AppDatePicker)
}

import { CustomElement } from '../../CustomElement'
import type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail } from '../combobox/combobox-shared'
import { parseOptionsFromAttr, parseOptionsFromChildren } from '../combobox/combobox-shared'
import comboboxStyles from '../combobox/combobox.css?inline'
import ownStyles from './combobox-fallback-select.css?inline'

export type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail }

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * <app-combobox-fallback-select> — Combobox with native select fallback.
 *
 * On touch/mobile devices (pointer: coarse), a native <select> is displayed for
 * reliable cross-device support. On pointer devices (pointer: fine), the full
 * combobox autocomplete widget is shown.
 *
 * Inspired by the GOV.UK accessible autocomplete component:
 *   https://github.com/alphagov/accessible-autocomplete
 *
 * The switch is CSS-driven via @media (pointer: coarse) and reinforced with
 * the `inert` attribute so the hidden widget is never reachable by keyboard.
 *
 * Attributes (same as <app-combobox>):
 *   label        — visible label text
 *   hint         — hint / description text shown below the label
 *   placeholder  — input placeholder (combobox mode only)
 *   name         — form field name (used in FormData)
 *   disabled     — disables the control
 *   required     — marks as required; wired to ElementInternals validity
 *   value        — programmatically set the committed value
 *   options      — JSON array of { value, label, disabled? } objects
 *
 * Custom events (bubble, composed):
 *   combobox-change — fires on selection; detail: ComboboxChangeDetail
 *   combobox-input  — fires on text input (combobox mode only); detail: ComboboxInputDetail
 */
export class AppComboboxFallbackSelect extends CustomElement {
  static formAssociated = true

  static observedAttributes = [
    'label',
    'hint',
    'placeholder',
    'name',
    'disabled',
    'required',
    'value',
    'error',
  ]

  // ── Instance counter for unique IDs ─────────────────────────────────────────
  private static _counter = 0

  // ── ElementInternals for form participation ───────────────────────────────────
  private readonly _internals: ElementInternals

  // ── Media query for pointer type ─────────────────────────────────────────────
  private readonly _mql: MediaQueryList

  // ── DOM refs — combobox section ───────────────────────────────────────────────
  private _cbSection!: HTMLDivElement
  private _cbRoot!: HTMLDivElement
  private _cbLabelEl!: HTMLLabelElement
  private _cbHintEl: HTMLElement | null = null
  private _cbErrorEl: HTMLElement | null = null
  private _cbInputEl!: HTMLInputElement
  private _cbToggleBtn!: HTMLButtonElement
  private _cbListboxEl!: HTMLUListElement
  private _cbOptionEls: HTMLLIElement[] = []

  // ── DOM refs — select section ─────────────────────────────────────────────────
  private _selSection!: HTMLDivElement
  private _selRoot!: HTMLDivElement
  private _selLabelEl!: HTMLLabelElement
  private _selHintEl: HTMLElement | null = null
  private _selErrorEl: HTMLElement | null = null
  private _selectEl!: HTMLSelectElement

  // ── State ─────────────────────────────────────────────────────────────────────
  private _options: ComboboxOption[] = []
  private _filteredOptions: ComboboxOption[] = []
  private _value = ''
  private _activeIndex = -1
  private _isOpen = false
  private readonly _uid: string

  constructor() {
    super()
    this._internals = this.attachInternals()
    this._uid = `cfs-${++AppComboboxFallbackSelect._counter}`
    this._mql = window.matchMedia('(pointer: coarse)')
    this.adoptStyle(comboboxStyles)
    this.adoptStyle(ownStyles)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    const optionsAttr = this.getAttribute('options')
    if (optionsAttr) {
      this._options = parseOptionsFromAttr(optionsAttr)
      this._filteredOptions = [...this._options]
      this._render()
      this._bindEvents()
    } else {
      queueMicrotask(() => {
        this._options = parseOptionsFromChildren(this)
        this._filteredOptions = [...this._options]
        this._render()
        this._bindEvents()
      })
    }
  }

  override disconnectedCallback(): void {
    this._mql.removeEventListener('change', this._onPointerChange)
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this._cbInputEl) return

    switch (name) {
      case 'label':
        this._cbLabelEl.firstChild!.textContent = newValue ?? ''
        this._cbListboxEl.setAttribute('aria-label', newValue ?? '')
        this._selLabelEl.firstChild!.textContent = newValue ?? ''
        break
      case 'hint':
        this._syncHintCb(newValue)
        this._syncHintSel(newValue)
        break
      case 'placeholder':
        this._cbInputEl.placeholder = newValue ?? ''
        break
      case 'disabled':
        this._cbInputEl.disabled = newValue !== null
        this._cbToggleBtn.disabled = newValue !== null
        this._selectEl.disabled = newValue !== null
        break
      case 'required':
        this._cbInputEl.required = newValue !== null
        this._syncValidity()
        break
      case 'value':
        this._setCommittedValue(newValue ?? '')
        break
      case 'error':
        this._syncErrorCb(newValue)
        this._syncErrorSel(newValue)
        break
    }
  }

  // ── Form-associated element API ───────────────────────────────────────────────

  get value(): string {
    return this._value
  }

  set value(v: string) {
    this._setCommittedValue(v)
  }

  get name(): string {
    return this.getAttribute('name') ?? ''
  }

  set name(v: string) {
    this.setAttribute('name', v)
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

  get form(): HTMLFormElement | null {
    return this._internals.form
  }

  get validity(): ValidityState {
    return this._internals.validity
  }

  get validationMessage(): string {
    return this._internals.validationMessage
  }

  checkValidity(): boolean {
    return this._internals.checkValidity()
  }

  reportValidity(): boolean {
    return this._internals.reportValidity()
  }

  // ── Private: rendering ────────────────────────────────────────────────────────

  private _render(): void {
    const label = this.getAttribute('label') ?? ''
    const hint = this.getAttribute('hint')
    const error = this.getAttribute('error')
    const placeholder = this.getAttribute('placeholder') ?? ''
    const disabled = this.hasAttribute('disabled')
    const required = this.hasAttribute('required')

    this.shadow.innerHTML = ''

    // ── Combobox section ───────────────────────────────────────────────────
    this._cbSection = document.createElement('div')
    this._cbSection.className = 'cfs__combobox-section'
    this._renderComboboxSection(label, hint, error, placeholder, disabled, required)
    this.shadow.appendChild(this._cbSection)

    // ── Select section ─────────────────────────────────────────────────────
    this._selSection = document.createElement('div')
    this._selSection.className = 'cfs__select-section'
    this._renderSelectSection(label, hint, error, disabled, required)
    this.shadow.appendChild(this._selSection)

    // ── Apply initial inert state ──────────────────────────────────────────
    this._applyInert(this._mql.matches)
    this._mql.addEventListener('change', this._onPointerChange)
  }

  private _renderComboboxSection(
    label: string,
    hint: string | null,
    error: string | null,
    placeholder: string,
    disabled: boolean,
    required: boolean,
  ): void {
    const inputId = `${this._uid}-cb-input`
    const listboxId = `${this._uid}-cb-listbox`
    const hintId = `${this._uid}-cb-hint`
    const errorId = `${this._uid}-cb-error`

    this._cbRoot = document.createElement('div')
    this._cbRoot.className = 'combobox'
    if (error) this._cbRoot.classList.add('combobox--error')

    // Label
    this._cbLabelEl = document.createElement('label')
    this._cbLabelEl.className = 'combobox__label'
    this._cbLabelEl.setAttribute('for', inputId)
    this._cbLabelEl.appendChild(document.createTextNode(label))
    if (required) {
      const asterisk = document.createElement('span')
      asterisk.className = 'combobox__required'
      asterisk.setAttribute('aria-hidden', 'true')
      asterisk.textContent = ' *'
      this._cbLabelEl.appendChild(asterisk)
    }
    this._cbRoot.appendChild(this._cbLabelEl)

    // Hint
    this._cbHintEl = null
    if (hint) {
      this._cbHintEl = document.createElement('div')
      this._cbHintEl.className = 'combobox__hint'
      this._cbHintEl.id = hintId
      this._cbHintEl.textContent = hint
      this._cbRoot.appendChild(this._cbHintEl)
    }

    // Error
    this._cbErrorEl = null
    if (error) {
      this._cbErrorEl = document.createElement('div')
      this._cbErrorEl.className = 'combobox__error'
      this._cbErrorEl.id = errorId
      this._cbErrorEl.textContent = error
      this._cbRoot.appendChild(this._cbErrorEl)
    }

    // Field
    const field = document.createElement('div')
    field.className = 'combobox__field'

    this._cbInputEl = document.createElement('input')
    this._cbInputEl.type = 'text'
    this._cbInputEl.id = inputId
    this._cbInputEl.className = 'combobox__input'
    this._cbInputEl.autocomplete = 'off'
    this._cbInputEl.spellcheck = false
    this._cbInputEl.setAttribute('role', 'combobox')
    this._cbInputEl.setAttribute('aria-autocomplete', 'list')
    this._cbInputEl.setAttribute('aria-expanded', 'false')
    this._cbInputEl.setAttribute('aria-haspopup', 'listbox')
    this._cbInputEl.setAttribute('aria-controls', listboxId)
    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
    if (describedBy) this._cbInputEl.setAttribute('aria-describedby', describedBy)
    if (error) this._cbInputEl.setAttribute('aria-invalid', 'true')
    if (placeholder) this._cbInputEl.placeholder = placeholder
    if (disabled) this._cbInputEl.disabled = true
    if (required) this._cbInputEl.required = true

    this._cbToggleBtn = document.createElement('button')
    this._cbToggleBtn.type = 'button'
    this._cbToggleBtn.className = 'combobox__toggle'
    this._cbToggleBtn.tabIndex = -1
    this._cbToggleBtn.setAttribute('aria-label', 'Show options')
    if (disabled) this._cbToggleBtn.disabled = true
    this._cbToggleBtn.innerHTML = `
      <svg aria-hidden="true" focusable="false" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`

    field.appendChild(this._cbInputEl)
    field.appendChild(this._cbToggleBtn)
    this._cbRoot.appendChild(field)

    // Listbox
    this._cbListboxEl = document.createElement('ul')
    this._cbListboxEl.className = 'combobox__listbox'
    this._cbListboxEl.id = listboxId
    this._cbListboxEl.setAttribute('role', 'listbox')
    this._cbListboxEl.setAttribute('aria-label', label)
    this._cbListboxEl.hidden = true
    this._cbRoot.appendChild(this._cbListboxEl)

    this._cbSection.appendChild(this._cbRoot)
    this._renderComboboxOptions(this._filteredOptions)
  }

  private _renderSelectSection(
    label: string,
    hint: string | null,
    error: string | null,
    disabled: boolean,
    required: boolean,
  ): void {
    const selectId = `${this._uid}-sel-input`
    const hintId = `${this._uid}-sel-hint`
    const errorId = `${this._uid}-sel-error`

    this._selRoot = document.createElement('div')
    this._selRoot.className = 'combobox'
    if (error) this._selRoot.classList.add('combobox--error')

    // Label
    this._selLabelEl = document.createElement('label')
    this._selLabelEl.className = 'combobox__label'
    this._selLabelEl.setAttribute('for', selectId)
    this._selLabelEl.appendChild(document.createTextNode(label))
    if (required) {
      const asterisk = document.createElement('span')
      asterisk.className = 'combobox__required'
      asterisk.setAttribute('aria-hidden', 'true')
      asterisk.textContent = ' *'
      this._selLabelEl.appendChild(asterisk)
    }
    this._selRoot.appendChild(this._selLabelEl)

    // Hint
    this._selHintEl = null
    if (hint) {
      this._selHintEl = document.createElement('div')
      this._selHintEl.className = 'combobox__hint'
      this._selHintEl.id = hintId
      this._selHintEl.textContent = hint
      this._selRoot.appendChild(this._selHintEl)
    }

    // Error
    this._selErrorEl = null
    if (error) {
      this._selErrorEl = document.createElement('div')
      this._selErrorEl.className = 'combobox__error'
      this._selErrorEl.id = errorId
      this._selErrorEl.textContent = error
      this._selRoot.appendChild(this._selErrorEl)
    }

    // Native select
    this._selectEl = document.createElement('select')
    this._selectEl.id = selectId
    this._selectEl.className = 'cfs__select'
    if (disabled) this._selectEl.disabled = true
    if (required) this._selectEl.required = true
    const selDescribedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
    if (selDescribedBy) this._selectEl.setAttribute('aria-describedby', selDescribedBy)
    if (error) this._selectEl.setAttribute('aria-invalid', 'true')

    this._selRoot.appendChild(this._selectEl)
    this._selSection.appendChild(this._selRoot)
    this._renderSelectOptions()
  }

  private _renderComboboxOptions(options: ComboboxOption[]): void {
    this._cbOptionEls = []
    this._cbListboxEl.innerHTML = ''

    if (options.length === 0) {
      const li = document.createElement('li')
      li.className = 'combobox__no-results'
      li.setAttribute('role', 'option')
      li.setAttribute('aria-disabled', 'true')
      li.setAttribute('aria-selected', 'false')
      li.textContent = 'No results found'
      this._cbListboxEl.appendChild(li)
      return
    }

    options.forEach((opt, idx) => {
      const li = document.createElement('li')
      li.className = 'combobox__option'
      li.id = `${this._uid}-opt-${idx}`
      li.setAttribute('role', 'option')
      li.setAttribute('data-value', opt.value)

      const isSelected = opt.value === this._value
      li.setAttribute('aria-selected', isSelected ? 'true' : 'false')
      if (isSelected) li.classList.add('combobox__option--selected')

      if (opt.disabled) {
        li.setAttribute('aria-disabled', 'true')
        li.classList.add('combobox__option--disabled')
      }

      li.textContent = opt.label
      this._cbOptionEls.push(li)
      this._cbListboxEl.appendChild(li)
    })
  }

  private _renderSelectOptions(): void {
    this._selectEl.innerHTML = ''

    // Empty / placeholder option so required validation works correctly
    const emptyOpt = document.createElement('option')
    emptyOpt.value = ''
    emptyOpt.textContent = ''
    this._selectEl.appendChild(emptyOpt)

    for (const opt of this._options) {
      const o = document.createElement('option')
      o.value = opt.value
      o.textContent = opt.label
      o.disabled = opt.disabled ?? false
      if (opt.value === this._value) o.selected = true
      this._selectEl.appendChild(o)
    }

    // Ensure the current value is reflected
    this._selectEl.value = this._value
  }

  // ── Private: event binding ────────────────────────────────────────────────────

  private _bindEvents(): void {
    // Combobox events
    this._cbInputEl.addEventListener('input', this._onCbInput)
    this._cbInputEl.addEventListener('keydown', this._onCbKeydown)
    this._cbInputEl.addEventListener('blur', this._onCbBlur)
    this._cbInputEl.addEventListener('click', this._onCbInputClick)
    this._cbToggleBtn.addEventListener('click', this._onCbToggleClick)
    this._cbListboxEl.addEventListener('mousedown', this._onCbListMousedown)
    this._cbListboxEl.addEventListener('click', this._onCbListClick)

    // Native select events
    this._selectEl.addEventListener('change', this._onSelectChange)
  }

  // ── Combobox event handlers ───────────────────────────────────────────────────

  private _onCbInput = (e: Event): void => {
    const query = (e.target as HTMLInputElement).value
    this._cbFilter(query)
    this._cbSetActive(-1)
    this._cbOpen()
    this.emit<ComboboxInputDetail>('combobox-input', { inputValue: query })
  }

  private _onCbKeydown = (e: KeyboardEvent): void => {
    const maxIdx = this._cbOptionEls.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!this._isOpen) {
          this._cbFilter('')
          this._cbOpen()
        }
        this._cbSetActive(Math.min(this._activeIndex + 1, maxIdx))
        break

      case 'ArrowUp':
        e.preventDefault()
        if (!this._isOpen) {
          this._cbFilter('')
          this._cbOpen()
        }
        this._cbSetActive(Math.max(this._activeIndex - 1, 0))
        break

      case 'Enter':
        if (this._isOpen && this._activeIndex >= 0) {
          const opt = this._filteredOptions[this._activeIndex]
          if (opt) {
            e.preventDefault()
            this._cbSelectOption(opt)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        if (this._isOpen) {
          this._cbClose()
          this._cbInputEl.value = this._getSelectedLabel()
        } else {
          this._cbClearValue()
        }
        break

      case 'Home':
        if (this._isOpen) {
          e.preventDefault()
          this._cbSetActive(0)
        }
        break

      case 'End':
        if (this._isOpen) {
          e.preventDefault()
          this._cbSetActive(maxIdx)
        }
        break

      case 'Tab':
        if (this._isOpen && this._activeIndex >= 0) {
          const opt = this._filteredOptions[this._activeIndex]
          if (opt) this._cbSelectOption(opt)
        }
        this._cbClose()
        break
    }
  }

  private _onCbBlur = (): void => {
    setTimeout(() => {
      if (!this._isOpen) return

      const inputLabel = this._cbInputEl.value.trim()
      const exactMatch = this._options.find(
        (o) => o.label.toLowerCase() === inputLabel.toLowerCase(),
      )

      if (exactMatch) {
        this._cbSelectOption(exactMatch)
      } else {
        this._cbClose()
        this._cbInputEl.value = this._getSelectedLabel()
      }
    }, 200)
  }

  private _onCbInputClick = (): void => {
    if (!this._isOpen) {
      this._cbFilter(this._cbInputEl.value)
      this._cbOpen()
    }
  }

  private _onCbToggleClick = (): void => {
    if (this._isOpen) {
      this._cbClose()
      this._cbInputEl.focus()
    } else {
      this._cbInputEl.value = ''
      this._cbFilter('')
      this._cbOpen()
      this._cbInputEl.focus()
    }
  }

  private _onCbListMousedown = (e: Event): void => {
    e.preventDefault()
  }

  private _onCbListClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLLIElement>('[role="option"]')
    if (!target || target.getAttribute('aria-disabled') === 'true') return

    const value = target.getAttribute('data-value') ?? ''
    const option = this._options.find((o) => o.value === value)
    if (option) {
      this._cbSelectOption(option)
      this._cbInputEl.focus()
    }
  }

  // ── Native select event handler ───────────────────────────────────────────────

  private _onSelectChange = (): void => {
    const selectedOpt = this._options.find((o) => o.value === this._selectEl.value)
    if (selectedOpt) {
      this._setCommittedValue(selectedOpt.value)
      this.emit<ComboboxChangeDetail>('combobox-change', {
        value: selectedOpt.value,
        label: selectedOpt.label,
      })
    } else if (this._selectEl.value === '') {
      this._setCommittedValue('')
      this.emit<ComboboxChangeDetail>('combobox-change', { value: '', label: '' })
    }
  }

  // ── Media query handler ───────────────────────────────────────────────────────

  private _onPointerChange = (e: MediaQueryListEvent): void => {
    this._applyInert(e.matches)
  }

  private _applyInert(isMobile: boolean): void {
    // inert hides the section from keyboard navigation and AT
    this._cbSection.inert = isMobile
    this._selSection.inert = !isMobile
  }

  // ── Private: combobox state ───────────────────────────────────────────────────

  private _cbFilter(query: string): void {
    const q = query.toLowerCase().trim()
    this._filteredOptions = q
      ? this._options.filter((o) => o.label.toLowerCase().includes(q))
      : [...this._options]
    this._renderComboboxOptions(this._filteredOptions)
  }

  private _cbOpen(): void {
    this._isOpen = true
    this._cbListboxEl.hidden = false
    this._cbInputEl.setAttribute('aria-expanded', 'true')
    this._cbToggleBtn.setAttribute('aria-label', 'Hide options')
    this._cbToggleBtn.classList.add('combobox__toggle--open')
  }

  private _cbClose(): void {
    this._isOpen = false
    this._cbListboxEl.hidden = true
    this._cbInputEl.setAttribute('aria-expanded', 'false')
    this._cbInputEl.removeAttribute('aria-activedescendant')
    this._activeIndex = -1
    this._cbOptionEls.forEach((el) => el.classList.remove('combobox__option--active'))
    this._cbToggleBtn.setAttribute('aria-label', 'Show options')
    this._cbToggleBtn.classList.remove('combobox__toggle--open')
  }

  private _cbSetActive(idx: number): void {
    this._cbOptionEls.forEach((el) => el.classList.remove('combobox__option--active'))
    this._activeIndex = idx

    if (idx < 0 || idx >= this._cbOptionEls.length) {
      this._cbInputEl.removeAttribute('aria-activedescendant')
      return
    }

    const el = this._cbOptionEls[idx]
    el.classList.add('combobox__option--active')
    this._cbInputEl.setAttribute('aria-activedescendant', el.id)
    el.scrollIntoView({ block: 'nearest' })
  }

  private _cbSelectOption(option: ComboboxOption): void {
    this._cbInputEl.value = option.label
    this._setCommittedValue(option.value)
    this._cbClose()
    this.emit<ComboboxChangeDetail>('combobox-change', {
      value: option.value,
      label: option.label,
    })
  }

  private _cbClearValue(): void {
    this._cbInputEl.value = ''
    this._setCommittedValue('')
    this.emit<ComboboxChangeDetail>('combobox-change', { value: '', label: '' })
  }

  // ── Private: shared state ─────────────────────────────────────────────────────

  private _setCommittedValue(value: string): void {
    this._value = value
    this._internals.setFormValue(value)

    // Sync combobox display
    if (this._cbInputEl) {
      this._cbInputEl.value = this._getSelectedLabel()
      this._syncSelectedStateCb()
    }

    // Sync native select
    if (this._selectEl) {
      this._selectEl.value = value
    }

    this._syncValidity()
  }

  private _syncSelectedStateCb(): void {
    this._cbOptionEls.forEach((el) => {
      const selected = el.getAttribute('data-value') === this._value
      el.setAttribute('aria-selected', selected ? 'true' : 'false')
      el.classList.toggle('combobox__option--selected', selected)
    })
  }

  private _syncValidity(): void {
    if (this.hasAttribute('required') && !this._value) {
      this._internals.setValidity(
        { valueMissing: true },
        'Please select an option',
        this._cbInputEl ?? this._selectEl,
      )
    } else {
      this._internals.setValidity({})
    }
  }

  private _syncHintCb(hint: string | null): void {
    const hintId = `${this._uid}-cb-hint`
    if (hint) {
      if (!this._cbHintEl) {
        this._cbHintEl = document.createElement('div')
        this._cbHintEl.className = 'combobox__hint'
        this._cbHintEl.id = hintId
        this._cbLabelEl.insertAdjacentElement('afterend', this._cbHintEl)
        this._cbAddDescribedBy(hintId)
      }
      this._cbHintEl.textContent = hint
    } else {
      this._cbHintEl?.remove()
      this._cbHintEl = null
      this._cbRemoveDescribedBy(hintId)
    }
  }

  private _syncHintSel(hint: string | null): void {
    const hintId = `${this._uid}-sel-hint`
    if (hint) {
      if (!this._selHintEl) {
        this._selHintEl = document.createElement('div')
        this._selHintEl.className = 'combobox__hint'
        this._selHintEl.id = hintId
        this._selLabelEl.insertAdjacentElement('afterend', this._selHintEl)
        const current = this._selectEl.getAttribute('aria-describedby') ?? ''
        const ids = current.split(' ').filter(Boolean)
        if (!ids.includes(hintId)) {
          this._selectEl.setAttribute('aria-describedby', [...ids, hintId].join(' '))
        }
      }
      this._selHintEl.textContent = hint
    } else {
      this._selHintEl?.remove()
      this._selHintEl = null
      const current = this._selectEl.getAttribute('aria-describedby') ?? ''
      const ids = current.split(' ').filter((s) => s !== hintId)
      ids.length > 0
        ? this._selectEl.setAttribute('aria-describedby', ids.join(' '))
        : this._selectEl.removeAttribute('aria-describedby')
    }
  }

  private _syncErrorCb(message: string | null): void {
    const errorId = `${this._uid}-cb-error`

    if (message) {
      if (!this._cbErrorEl) {
        this._cbErrorEl = document.createElement('div')
        this._cbErrorEl.className = 'combobox__error'
        this._cbErrorEl.id = errorId
        const field = this._cbRoot.querySelector('.combobox__field')!
        field.insertAdjacentElement('beforebegin', this._cbErrorEl)
        this._cbAddDescribedBy(errorId)
      }
      this._cbErrorEl.textContent = message
      this._cbInputEl.setAttribute('aria-invalid', 'true')
      this._cbRoot.classList.add('combobox--error')
    } else {
      this._cbErrorEl?.remove()
      this._cbErrorEl = null
      this._cbRemoveDescribedBy(errorId)
      this._cbInputEl.removeAttribute('aria-invalid')
      this._cbRoot.classList.remove('combobox--error')
    }
  }

  private _syncErrorSel(message: string | null): void {
    const errorId = `${this._uid}-sel-error`

    if (message) {
      if (!this._selErrorEl) {
        this._selErrorEl = document.createElement('div')
        this._selErrorEl.className = 'combobox__error'
        this._selErrorEl.id = errorId
        this._selectEl.insertAdjacentElement('beforebegin', this._selErrorEl)
        const current = this._selectEl.getAttribute('aria-describedby') ?? ''
        const ids = current.split(' ').filter(Boolean)
        if (!ids.includes(errorId)) {
          this._selectEl.setAttribute('aria-describedby', [...ids, errorId].join(' '))
        }
      }
      this._selErrorEl.textContent = message
      this._selectEl.setAttribute('aria-invalid', 'true')
      this._selRoot.classList.add('combobox--error')
    } else {
      this._selErrorEl?.remove()
      this._selErrorEl = null
      const current = this._selectEl.getAttribute('aria-describedby') ?? ''
      const ids = current.split(' ').filter((s) => s !== errorId)
      ids.length > 0
        ? this._selectEl.setAttribute('aria-describedby', ids.join(' '))
        : this._selectEl.removeAttribute('aria-describedby')
      this._selectEl.removeAttribute('aria-invalid')
      this._selRoot.classList.remove('combobox--error')
    }
  }

  private _cbAddDescribedBy(id: string): void {
    const current = this._cbInputEl.getAttribute('aria-describedby') ?? ''
    const ids = current.split(' ').filter(Boolean)
    if (!ids.includes(id)) {
      this._cbInputEl.setAttribute('aria-describedby', [...ids, id].join(' '))
    }
  }

  private _cbRemoveDescribedBy(id: string): void {
    const current = this._cbInputEl.getAttribute('aria-describedby') ?? ''
    const ids = current.split(' ').filter((s) => s !== id)
    ids.length > 0
      ? this._cbInputEl.setAttribute('aria-describedby', ids.join(' '))
      : this._cbInputEl.removeAttribute('aria-describedby')
  }

  private _getSelectedLabel(): string {
    return this._options.find((o) => o.value === this._value)?.label ?? ''
  }
}

customElements.define('app-combobox-fallback-select', AppComboboxFallbackSelect)

import { CustomElement } from '../../CustomElement'
import styles from './combobox.css?inline'
import fallbackStyles from './combobox-fallback-select.css?inline'
import {
  parseOptionsFromAttr,
  parseOptionsFromChildren,
} from './combobox-shared'

export type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail } from './combobox-shared'
import type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail } from './combobox-shared'

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * <app-combobox> — Accessible combobox with list autocomplete (type-to-filter).
 *
 * ARIA pattern:
 *   WAI-ARIA Authoring Practices — Combobox with List Autocomplete
 *   https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 *
 * Options are provided in one of two ways (evaluated in order):
 *   1. `options` attribute — JSON string: '[{"value":"ca","label":"Canada"}]'
 *   2. Child <option> elements — standard HTML select syntax
 *
 * Attributes (all optional except label):
 *   label        — visible label text
 *   hint         — hint / description text shown below the label
 *   placeholder  — input placeholder
 *   name         — form field name (used in FormData)
 *   disabled     — disables the control
 *   required     — marks as required; wired to ElementInternals validity
 *   value        — programmatically set the committed value
 *   options      — JSON array of { value, label, disabled? } objects
 *
 * Custom events (bubble, composed):
 *   combobox-change — fires on selection; detail: ComboboxChangeDetail
 *   combobox-input  — fires on text input; detail: ComboboxInputDetail
 */
export class AppCombobox extends CustomElement {
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
    'fallback-select',
  ]

  // ── Instance counter for unique IDs ─────────────────────────────────────────
  private static _counter = 0

  // ── ElementInternals for form participation ──────────────────────────────────
  private readonly _internals: ElementInternals

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  private _labelEl!: HTMLLabelElement
  private _hintEl: HTMLElement | null = null
  private _errorEl: HTMLElement | null = null
  private _inputEl!: HTMLInputElement
  private _toggleBtn!: HTMLButtonElement
  private _listboxEl!: HTMLUListElement
  private _optionEls: HTMLLIElement[] = []

  // ── DOM refs — fallback-select mode ──────────────────────────────────────────
  private _cbSection: HTMLDivElement | null = null
  private _selSection: HTMLDivElement | null = null
  private _selRoot: HTMLDivElement | null = null
  private _selLabelEl: HTMLLabelElement | null = null
  private _selHintEl: HTMLElement | null = null
  private _selErrorEl: HTMLElement | null = null
  private _selectEl: HTMLSelectElement | null = null

  // ── State ─────────────────────────────────────────────────────────────────────
  private _options: ComboboxOption[] = []
  private _filteredOptions: ComboboxOption[] = []
  private _value = ''
  private _activeIndex = -1
  private _isOpen = false
  private _isFallback = false
  private _fallbackStylesAdopted = false
  private _mql: MediaQueryList | null = null
  private readonly _uid: string

  constructor() {
    super()
    this._internals = this.attachInternals()
    this._uid = `cb-${++AppCombobox._counter}`
    // Adopt styles once in the constructor — shadow root is already created by super()
    this.adoptStyle(styles)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    const optionsAttr = this.getAttribute('options')
    if (optionsAttr) {
      this._parseOptionsFromAttr(optionsAttr)
      this._render()
      this._bindEvents()
    } else {
      // Defer to allow child <option> elements to be inserted by the parser/framework
      queueMicrotask(() => {
        this._parseOptionsFromChildren()
        this._render()
        this._bindEvents()
      })
    }
  }

  override disconnectedCallback(): void {
    if (this._mql) {
      this._mql.removeEventListener('change', this._onPointerChange)
    }
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this._inputEl) return

    switch (name) {
      case 'label':
        // Preserve the required-asterisk span if present
        this._labelEl.firstChild!.textContent = newValue ?? ''
        this._listboxEl.setAttribute('aria-label', newValue ?? '')
        break
      case 'hint':
        this._syncHint(newValue)
        break
      case 'placeholder':
        this._inputEl.placeholder = newValue ?? ''
        break
      case 'disabled':
        this._inputEl.disabled = newValue !== null
        this._toggleBtn.disabled = newValue !== null
        if (this._selectEl) this._selectEl.disabled = newValue !== null
        break
      case 'required':
        this._inputEl.required = newValue !== null
        this._syncValidity()
        break
      case 'value':
        this._setCommittedValue(newValue ?? '')
        break
      case 'error':
        this._syncError(newValue)
        break
      case 'fallback-select':
        this._isFallback = newValue !== null
        this._render()
        this._bindEvents()
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

  // ── Private: option parsing ───────────────────────────────────────────────────

  private _parseOptionsFromAttr(json: string): void {
    this._options = parseOptionsFromAttr(json)
    this._filteredOptions = [...this._options]
  }

  private _parseOptionsFromChildren(): void {
    this._options = parseOptionsFromChildren(this)
    this._filteredOptions = [...this._options]
  }

  // ── Private: rendering ────────────────────────────────────────────────────────

  private _render(): void {
    const label = this.getAttribute('label') ?? ''
    const hint = this.getAttribute('hint')
    const error = this.getAttribute('error')
    const placeholder = this.getAttribute('placeholder') ?? ''
    const disabled = this.hasAttribute('disabled')
    const required = this.hasAttribute('required')
    this._isFallback = this.hasAttribute('fallback-select')

    const inputId = `${this._uid}-input`
    const listboxId = `${this._uid}-listbox`
    const hintId = `${this._uid}-hint`
    const errorId = `${this._uid}-error`

    // Clear any previous render (leaves adoptedStyleSheets intact)
    this.shadow.innerHTML = ''

    // Reset fallback section refs on each render
    this._cbSection = null
    this._selSection = null
    this._selRoot = null
    this._selLabelEl = null
    this._selHintEl = null
    this._selErrorEl = null
    this._selectEl = null

    const root = document.createElement('div')
    root.className = 'combobox'

    // ── Label ──────────────────────────────────────────────────────────────
    this._labelEl = document.createElement('label')
    this._labelEl.className = 'combobox__label'
    this._labelEl.setAttribute('for', inputId)
    // Use a text node so we can update it safely without removing the asterisk span
    this._labelEl.appendChild(document.createTextNode(label))
    if (required) {
      const asterisk = document.createElement('span')
      asterisk.className = 'combobox__required'
      asterisk.setAttribute('aria-hidden', 'true')
      asterisk.textContent = ' *'
      this._labelEl.appendChild(asterisk)
    }
    root.appendChild(this._labelEl)

    // ── Hint ───────────────────────────────────────────────────────────────
    if (hint) {
      this._hintEl = document.createElement('div')
      this._hintEl.className = 'combobox__hint'
      this._hintEl.id = hintId
      this._hintEl.textContent = hint
      root.appendChild(this._hintEl)
    }

    // ── Error ──────────────────────────────────────────────────────────────
    if (error) {
      this._errorEl = document.createElement('div')
      this._errorEl.className = 'combobox__error'
      this._errorEl.id = errorId
      this._errorEl.textContent = error
      root.appendChild(this._errorEl)
      root.classList.add('combobox--error')
    }

    // ── Input field wrapper ────────────────────────────────────────────────
    const field = document.createElement('div')
    field.className = 'combobox__field'

    this._inputEl = document.createElement('input')
    this._inputEl.type = 'text'
    this._inputEl.id = inputId
    this._inputEl.className = 'combobox__input'
    this._inputEl.autocomplete = 'off'
    this._inputEl.spellcheck = false
    this._inputEl.setAttribute('role', 'combobox')
    this._inputEl.setAttribute('aria-autocomplete', 'list')
    this._inputEl.setAttribute('aria-expanded', 'false')
    this._inputEl.setAttribute('aria-haspopup', 'listbox')
    this._inputEl.setAttribute('aria-controls', listboxId)
    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
    if (describedBy) this._inputEl.setAttribute('aria-describedby', describedBy)
    if (error) this._inputEl.setAttribute('aria-invalid', 'true')
    if (placeholder) this._inputEl.placeholder = placeholder
    if (disabled) this._inputEl.disabled = true
    if (required) this._inputEl.required = true

    // Toggle button — tabindex=-1 so Tab skips it (keyboard users use ↓)
    this._toggleBtn = document.createElement('button')
    this._toggleBtn.type = 'button'
    this._toggleBtn.className = 'combobox__toggle'
    this._toggleBtn.tabIndex = -1
    this._toggleBtn.setAttribute('aria-label', 'Show options')
    if (disabled) this._toggleBtn.disabled = true
    this._toggleBtn.innerHTML = `
      <svg aria-hidden="true" focusable="false" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`

    field.appendChild(this._inputEl)
    field.appendChild(this._toggleBtn)
    root.appendChild(field)

    // ── Listbox ────────────────────────────────────────────────────────────
    this._listboxEl = document.createElement('ul')
    this._listboxEl.className = 'combobox__listbox'
    this._listboxEl.id = listboxId
    this._listboxEl.setAttribute('role', 'listbox')
    this._listboxEl.setAttribute('aria-label', label)
    this._listboxEl.hidden = true
    root.appendChild(this._listboxEl)

    if (this._isFallback) {
      // Adopt fallback styles once per instance
      if (!this._fallbackStylesAdopted) {
        this.adoptStyle(fallbackStyles)
        this._fallbackStylesAdopted = true
      }

      // Wrap combobox in a section so CSS can toggle it
      this._cbSection = document.createElement('div')
      this._cbSection.className = 'cfs__combobox-section'
      this._cbSection.appendChild(root)
      this.shadow.appendChild(this._cbSection)

      // Build the native select section
      this._selSection = document.createElement('div')
      this._selSection.className = 'cfs__select-section'
      this._renderSelectSection(label, hint, error, disabled, required)
      this.shadow.appendChild(this._selSection)

      // Wire media query
      if (this._mql) this._mql.removeEventListener('change', this._onPointerChange)
      this._mql = window.matchMedia('(pointer: coarse)')
      this._applyInert(this._mql.matches)
      this._mql.addEventListener('change', this._onPointerChange)
    } else {
      // Clean up any previous fallback mode
      if (this._mql) {
        this._mql.removeEventListener('change', this._onPointerChange)
        this._mql = null
      }
      this.shadow.appendChild(root)
    }

    this._renderOptions(this._filteredOptions)
  }

  private _renderOptions(options: ComboboxOption[]): void {
    this._optionEls = []
    this._listboxEl.innerHTML = ''

    if (options.length === 0) {
      const li = document.createElement('li')
      li.className = 'combobox__no-results'
      li.setAttribute('role', 'option')
      li.setAttribute('aria-disabled', 'true')
      li.setAttribute('aria-selected', 'false')
      li.textContent = 'No results found'
      this._listboxEl.appendChild(li)
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
      this._optionEls.push(li)
      this._listboxEl.appendChild(li)
    })
  }

  // ── Private: event binding ────────────────────────────────────────────────────

  private _bindEvents(): void {
    this._inputEl.addEventListener('input', this._onInput)
    this._inputEl.addEventListener('keydown', this._onKeydown)
    this._inputEl.addEventListener('blur', this._onBlur)
    this._inputEl.addEventListener('click', this._onInputClick)
    this._toggleBtn.addEventListener('click', this._onToggleClick)
    // mousedown prevents blur firing before the click is processed
    this._listboxEl.addEventListener('mousedown', this._onListMousedown)
    this._listboxEl.addEventListener('click', this._onListClick)
    // Native select (only in fallback mode)
    if (this._selectEl) {
      this._selectEl.addEventListener('change', this._onSelectChange)
    }
  }

  // ── Private: event handlers (arrow functions keep `this` bound) ──────────────

  private _onInput = (e: Event): void => {
    const query = (e.target as HTMLInputElement).value
    this._filter(query)
    this._setActive(-1)
    this._open()
    this.emit<ComboboxInputDetail>('combobox-input', { inputValue: query })
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    const maxIdx = this._optionEls.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!this._isOpen) {
          this._filter('')
          this._open()
        }
        this._setActive(Math.min(this._activeIndex + 1, maxIdx))
        break

      case 'ArrowUp':
        e.preventDefault()
        if (!this._isOpen) {
          this._filter('')
          this._open()
        }
        this._setActive(Math.max(this._activeIndex - 1, 0))
        break

      case 'Enter':
        if (this._isOpen && this._activeIndex >= 0) {
          const opt = this._filteredOptions[this._activeIndex]
          if (opt) {
            e.preventDefault()
            this._selectOption(opt)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        if (this._isOpen) {
          this._close()
          // Restore the display value to the last committed selection
          this._inputEl.value = this._getSelectedLabel()
        } else {
          // Second Escape clears the field entirely
          this._clearValue()
        }
        break

      case 'Home':
        if (this._isOpen) {
          e.preventDefault()
          this._setActive(0)
        }
        break

      case 'End':
        if (this._isOpen) {
          e.preventDefault()
          this._setActive(maxIdx)
        }
        break

      case 'Tab':
        // Commit the active option (if any) when tabbing away
        if (this._isOpen && this._activeIndex >= 0) {
          const opt = this._filteredOptions[this._activeIndex]
          if (opt) this._selectOption(opt)
        }
        this._close()
        break
    }
  }

  private _onBlur = (): void => {
    // Small delay so the listbox click handler fires before we act on blur
    setTimeout(() => {
      if (!this._isOpen) return

      const inputLabel = this._inputEl.value.trim()
      const exactMatch = this._options.find(
        (o) => o.label.toLowerCase() === inputLabel.toLowerCase(),
      )

      if (exactMatch) {
        this._selectOption(exactMatch)
      } else {
        this._close()
        // Restore the input to the last committed value
        this._inputEl.value = this._getSelectedLabel()
      }
    }, 200)
  }

  private _onInputClick = (): void => {
    if (!this._isOpen) {
      this._filter(this._inputEl.value)
      this._open()
    }
  }

  private _onToggleClick = (): void => {
    if (this._isOpen) {
      this._close()
      this._inputEl.focus()
    } else {
      // Show all options when the toggle is clicked
      this._inputEl.value = ''
      this._filter('')
      this._open()
      this._inputEl.focus()
    }
  }

  private _onListMousedown = (e: Event): void => {
    // Prevent the input losing focus before the click fires
    e.preventDefault()
  }

  private _onListClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLLIElement>('[role="option"]')
    if (!target || target.getAttribute('aria-disabled') === 'true') return

    const value = target.getAttribute('data-value') ?? ''
    const option = this._options.find((o) => o.value === value)
    if (option) {
      this._selectOption(option)
      this._inputEl.focus()
    }
  }

  // ── Private: state management ─────────────────────────────────────────────────

  private _filter(query: string): void {
    const q = query.toLowerCase().trim()
    this._filteredOptions = q
      ? this._options.filter((o) => o.label.toLowerCase().includes(q))
      : [...this._options]
    this._renderOptions(this._filteredOptions)
  }

  private _open(): void {
    this._isOpen = true
    this._listboxEl.hidden = false
    this._inputEl.setAttribute('aria-expanded', 'true')
    this._toggleBtn.setAttribute('aria-label', 'Hide options')
    this._toggleBtn.classList.add('combobox__toggle--open')
  }

  private _close(): void {
    this._isOpen = false
    this._listboxEl.hidden = true
    this._inputEl.setAttribute('aria-expanded', 'false')
    this._inputEl.removeAttribute('aria-activedescendant')
    this._activeIndex = -1
    this._optionEls.forEach((el) => el.classList.remove('combobox__option--active'))
    this._toggleBtn.setAttribute('aria-label', 'Show options')
    this._toggleBtn.classList.remove('combobox__toggle--open')
  }

  private _setActive(idx: number): void {
    this._optionEls.forEach((el) => el.classList.remove('combobox__option--active'))
    this._activeIndex = idx

    if (idx < 0 || idx >= this._optionEls.length) {
      this._inputEl.removeAttribute('aria-activedescendant')
      return
    }

    const el = this._optionEls[idx]
    el.classList.add('combobox__option--active')
    this._inputEl.setAttribute('aria-activedescendant', el.id)
    el.scrollIntoView({ block: 'nearest' })
  }

  private _selectOption(option: ComboboxOption): void {
    this._inputEl.value = option.label
    this._setCommittedValue(option.value)
    this._close()
    this.emit<ComboboxChangeDetail>('combobox-change', {
      value: option.value,
      label: option.label,
    })
  }

  private _setCommittedValue(value: string): void {
    this._value = value
    this._internals.setFormValue(value)
    this._syncSelectedState()
    if (this._selectEl) this._selectEl.value = value
    this._syncValidity()
  }

  private _clearValue(): void {
    this._inputEl.value = ''
    this._setCommittedValue('')
    this.emit<ComboboxChangeDetail>('combobox-change', { value: '', label: '' })
  }

  private _syncSelectedState(): void {
    this._optionEls.forEach((el) => {
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
        this._inputEl,
      )
    } else {
      this._internals.setValidity({})
    }
  }

  private _syncError(message: string | null): void {
    const errorId = `${this._uid}-error`
    const root = this.shadow.querySelector('.combobox')

    if (message) {
      if (!this._errorEl) {
        this._errorEl = document.createElement('div')
        this._errorEl.className = 'combobox__error'
        this._errorEl.id = errorId
        const field = this.shadow.querySelector('.combobox__field')!
        field.insertAdjacentElement('beforebegin', this._errorEl)
        this._addDescribedBy(errorId)
      }
      this._errorEl.textContent = message
      this._inputEl.setAttribute('aria-invalid', 'true')
      root?.classList.add('combobox--error')
    } else {
      this._errorEl?.remove()
      this._errorEl = null
      this._removeDescribedBy(errorId)
      this._inputEl.removeAttribute('aria-invalid')
      root?.classList.remove('combobox--error')
    }

    if (this._selRoot) this._syncErrorSel(message)
  }

  private _addDescribedBy(id: string): void {
    const current = this._inputEl.getAttribute('aria-describedby') ?? ''
    const ids = current.split(' ').filter(Boolean)
    if (!ids.includes(id)) {
      this._inputEl.setAttribute('aria-describedby', [...ids, id].join(' '))
    }
  }

  private _removeDescribedBy(id: string): void {
    const current = this._inputEl.getAttribute('aria-describedby') ?? ''
    const ids = current.split(' ').filter((s) => s !== id)
    if (ids.length > 0) {
      this._inputEl.setAttribute('aria-describedby', ids.join(' '))
    } else {
      this._inputEl.removeAttribute('aria-describedby')
    }
  }

  private _syncHint(hint: string | null): void {
    const hintId = `${this._uid}-hint`
    if (hint) {
      if (!this._hintEl) {
        this._hintEl = document.createElement('div')
        this._hintEl.className = 'combobox__hint'
        this._hintEl.id = hintId
        this._labelEl.insertAdjacentElement('afterend', this._hintEl)
        this._inputEl.setAttribute('aria-describedby', hintId)
      }
      this._hintEl.textContent = hint
    } else {
      this._hintEl?.remove()
      this._hintEl = null
      this._inputEl.removeAttribute('aria-describedby')
    }

    if (this._selRoot) this._syncHintSel(hint)
  }

  private _getSelectedLabel(): string {
    return this._options.find((o) => o.value === this._value)?.label ?? ''
  }

  // ── Private: fallback-select rendering ───────────────────────────────────────

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
    this._selSection!.appendChild(this._selRoot)
    this._renderSelectOptions()
  }

  private _renderSelectOptions(): void {
    if (!this._selectEl) return
    this._selectEl.innerHTML = ''

    // Empty placeholder option so required validation works
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

    this._selectEl.value = this._value
  }

  // ── Private: fallback-select event handlers ───────────────────────────────────

  private _onSelectChange = (): void => {
    if (!this._selectEl) return
    const selectedOpt = this._options.find((o) => o.value === this._selectEl!.value)
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

  private _onPointerChange = (e: MediaQueryListEvent): void => {
    this._applyInert(e.matches)
  }

  private _applyInert(isMobile: boolean): void {
    if (this._cbSection) this._cbSection.inert = isMobile
    if (this._selSection) this._selSection.inert = !isMobile
  }

  // ── Private: fallback-select sync helpers ─────────────────────────────────────

  private _syncErrorSel(message: string | null): void {
    if (!this._selRoot || !this._selectEl) return
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

  private _syncHintSel(hint: string | null): void {
    if (!this._selRoot || !this._selectEl || !this._selLabelEl) return
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
}

if (!customElements.get('app-combobox')) {
  customElements.define('app-combobox', AppCombobox)
}

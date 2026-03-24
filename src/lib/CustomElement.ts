/**
 * CustomElement — shared base class for all custom components in this library.
 *
 * Provides convenience helpers so individual components don't need to repeat
 * boilerplate for shadow DOM attachment, stylesheet adoption, and attribute
 * observation.
 *
 * Usage:
 *   export class MyAccordion extends CustomElement {
 *     static observedAttributes = ['open', 'disabled']
 *
 *     override connectedCallback() {
 *       super.connectedCallback()
 *       this.render()
 *     }
 *   }
 *   customElements.define('my-accordion', MyAccordion)
 */
export abstract class CustomElement extends HTMLElement {
  /** Shadow root — always open so consumers can query internals during testing. */
  protected readonly shadow: ShadowRoot

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  /**
   * Attach a CSSStyleSheet (Constructable Stylesheet) to the shadow root.
   * Call inside the constructor or connectedCallback.
   */
  protected adoptStyle(css: string): void {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    this.shadow.adoptedStyleSheets = [...this.shadow.adoptedStyleSheets, sheet]
  }

  /**
   * Emit a composed, bubbling custom event from this element.
   * Returns false if the event was cancelled.
   */
  protected emit<T = unknown>(name: string, detail?: T): boolean {
    return this.dispatchEvent(
      new CustomEvent<T>(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  }

  // Subclasses can override these without calling super (but may).
  connectedCallback(): void {}
  disconnectedCallback(): void {}
  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {}
}

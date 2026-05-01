/**
 * Custom component library entry point.
 *
 * Each component lives in its own subfolder:
 *   src/lib/components/<name>/
 *     <name>.ts   — custom element class (extends HTMLElement)
 *     <name>.css  — component styles
 *
 * Register components here and re-export their types/classes
 * so demo pages can import them in one shot.
 *
 * Example (once a component exists):
 *   import './components/my-accordion/my-accordion'
 *   export { MyAccordion } from './components/my-accordion/my-accordion'
 */

export { CustomElement } from './CustomElement'

// ── Registered components ─────────────────────────────────────────────────────
export { AppCombobox } from './components/combobox/combobox'
export type { ComboboxOption, ComboboxChangeDetail, ComboboxInputDetail } from './components/combobox/combobox'

// React wrappers
export { Combobox } from './components/combobox'
export type { ComboboxProps } from './components/combobox'

export { AppChat } from './components/chat/chat'
export type { ChatAdapter, ChatContact, ChatMessage, ContactStatus, MessageStatus, ChatEvent } from './components/chat/chat'
export { Chat, MockChatAdapter } from './components/chat'
export type { ChatProps } from './components/chat'

// ── Combobox with fallback select ─────────────────────────────────────────────
export { AppComboboxFallbackSelect } from './components/combobox-fallback-select/combobox-fallback-select'

export { ComboboxFallbackSelect } from './components/combobox-fallback-select'
export type { ComboboxFallbackSelectProps } from './components/combobox-fallback-select'

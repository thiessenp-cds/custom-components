/**
 * JSX intrinsic element declarations for custom elements.
 *
 * Extend this file as new custom elements are added to src/lib/components/.
 * Each element needs its attribute interface declared here so TypeScript
 * allows it in TSX without using `any` casts or wrapper components.
 */

import type React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * <app-combobox> — accessible combobox with list autocomplete.
       * Registered by: src/lib/components/combobox/combobox.ts
       */
      'app-combobox': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        /** Visible label text */
        label?: string
        /** Hint / description text */
        hint?: string
        /** Input placeholder */
        placeholder?: string
        /** Form field name */
        name?: string
        /** Disables the control */
        disabled?: boolean
        /** Marks as required */
        required?: boolean
        /** Programmatically sets the value */
        value?: string
        /** JSON array of options: '[{"value":"ca","label":"Canada"}]' */
        options?: string
        /** Error message; when set applies red border and shows message below the label */
        error?: string
      }

      /**
       * <app-combobox-fallback-select> — combobox on pointer devices; native
       * select on touch/mobile (pointer: coarse).
       * Registered by: src/lib/components/combobox-fallback-select/combobox-fallback-select.ts
       */
      'app-combobox-fallback-select': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        /** Visible label text */
        label?: string
        /** Hint / description text */
        hint?: string
        /** Input placeholder */
        placeholder?: string
        /** Form field name */
        name?: string
        /** Disables the control */
        disabled?: boolean
        /** Marks as required */
        required?: boolean
        /** Programmatically sets the value */
        value?: string
        /** JSON array of options: '[{"value":"ca","label":"Canada"}]' */
        options?: string
        /** Error message; when set applies red border and shows message below the label */
        error?: string
      }

      /**
       * <app-chat> — Generic accessible chat UI.
       * Adapter is set via the JS property `adapter`, not an HTML attribute.
       * Registered by: src/lib/components/chat/chat.ts
       */
      'app-chat': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >

      /**
       * <app-star-rating> — Accessible star rating input (WAI-ARIA radiogroup).
       * Registered by: src/lib/components/star-rating/star-rating.ts
       */
      'app-star-rating': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        /** Visible label text */
        label?: string
        /** Hint / description text */
        hint?: string
        /** Form field name */
        name?: string
        /** Marks as required; pass empty string for boolean true */
        required?: string
        /** Error message */
        error?: string
        /** Currently selected value ("1"–"5") */
        value?: string
      }
    }
  }
}

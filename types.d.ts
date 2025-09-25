// Type declarations for external modules
declare module 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}

// Process env types for Vite
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
      GEMINI_API_KEY?: string;
      VITE_API_TIMEOUT?: string;
      VITE_DEBUG?: string;
    }
  }

  // Shadow DOM support for Lit elements
  interface HTMLElement {
    shadowRoot: ShadowRoot | null;
  }
}

// Lit Element shadow root
declare module 'lit' {
  interface LitElement {
    shadowRoot: ShadowRoot | null;
  }
}

export {};
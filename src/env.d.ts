/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_STRIPE_PRICE_STARTER: string
  readonly VITE_STRIPE_PRICE_BUSINESS: string
  readonly VITE_STRIPE_PRICE_ENTERPRISE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Webhook that receives placed orders. Leave unset to have customers show the order at the counter. */
  readonly VITE_ORDER_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

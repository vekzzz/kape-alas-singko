/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API, e.g. https://kape-api.onrender.com. Defaults to http://localhost:3000 in dev. */
  readonly VITE_API_URL?: string;
  /** Old order webhook. Orders still go here until the order endpoints land (slice 3). */
  readonly VITE_ORDER_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

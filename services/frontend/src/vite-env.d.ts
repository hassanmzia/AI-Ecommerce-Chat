/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_AI_SERVICE_URL: string;
  readonly VITE_MCP_URL: string;
  readonly VITE_A2A_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

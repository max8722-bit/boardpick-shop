/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_NAVER_PAY_CLIENT_ID?: string;
  readonly NEXT_PUBLIC_NAVER_PAY_CHAIN_ID?: string;
  readonly NAVER_PAY_MODE?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

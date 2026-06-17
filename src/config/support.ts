// src/config/support.ts
//
// App-wide support configuration. The WhatsApp support number is read from a
// Vite env var (VITE_SUPPORT_WHATSAPP_NUMBER) and is NEVER committed to source —
// this repo is public. Set the value in Vercel (and a local, git-ignored .env).
//
// Expected format: full international number, digits only, no '+' or spaces.
//   e.g. 9198XXXXXXXX  (country code + number)
//
// When the env var is unset/empty this resolves to '' so consumers can render
// nothing rather than produce a broken wa.me link.
export const SUPPORT_WHATSAPP_NUMBER =
  import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? '';

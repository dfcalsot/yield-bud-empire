import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// the account service (server/index.mjs) is reached through the same origin, so the session cookie never crosses sites
const proxy = { '/api': { target: process.env.AUTH_API ?? 'http://127.0.0.1:3020', changeOrigin: false, xfwd: true } };

// Content-Security-Policy of the production build: only what the game really uses (Solana RPC, fonts; no external images: all art is in-game SVG)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.devnet.solana.com https://api.testnet.solana.com https://api.mainnet-beta.solana.com wss://api.devnet.solana.com wss://api.testnet.solana.com wss://api.mainnet-beta.solana.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const secure = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const BUILD = new Date().toISOString();

/** Emits dist/version.json so an open tab can tell that a newer build was published (see components/UpdateBanner.tsx). */
const versionFile = { name: 'ybe-version', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); } };

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), versionFile],
    define: { __BUILD__: JSON.stringify(BUILD) },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      proxy,
      headers: secure,   // no CSP in dev: Vite's HMR needs inline scripts
    },
    preview: {
      // players open the game by Tailscale / LAN address or MagicDNS name, not only localhost (private networks only)
      allowedHosts: true as const,
      proxy,
      headers: { ...secure, 'Content-Security-Policy': CSP },
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// the account service (server/index.mjs) is reached through the same origin, so the session cookie never crosses sites
const proxy = { '/api': { target: process.env.AUTH_API ?? 'http://127.0.0.1:3020', changeOrigin: false, xfwd: true } };

// Content-Security-Policy of the production build: only what the game really uses (Solana RPC, fonts, Unsplash / imgur images)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.unsplash.com https://i.imgur.com",
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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy,
      headers: secure,   // no CSP in dev: Vite's HMR needs inline scripts
    },
    preview: {
      proxy,
      headers: { ...secure, 'Content-Security-Policy': CSP },
    },
  };
});

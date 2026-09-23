<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6aa77698-a510-4d0a-9621-c12a524de435

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Idiomas (español / inglés)

El juego abre en el idioma del navegador (español → ES, cualquier otro → EN); `?lang=es|en` lo fuerza y el selector ES/EN lo recuerda
(en el navegador y en la cuenta, que también decide el idioma de los correos).

- Todo texto visible se escribe en español dentro de `t('…')` (con datos: `t('Tienes {n} plantas', { n })`). El inglés va en
  `src/i18n/en/core.json`, con el texto en español como clave. **`npm run build` falla si un texto no tiene inglés** (`scripts/i18n-check.mjs`).
- Tablas de datos del módulo: los textos se marcan con `k('…')` y la tabla se envuelve con `localize(tabla, ['campo', …])`, o se traduce al
  mostrarla con `t(x.campo)`. Los valores que usa la lógica (tipos, ids, roles) nunca se traducen en los datos: solo al mostrarlos.
- `src/i18n/core.ts` no usa React (lo importan la simulación y el servidor); el hook `useLang()` está en `src/i18n/index.ts`.
- Codemod para archivos nuevos: `TS5_DIR=<carpeta con typescript@5> node scripts/i18n-wrap.mjs [--mark --all-props] [--data] archivo…`
  (el proyecto usa TypeScript 7, que no trae la API de compilador) y revisar el diff.

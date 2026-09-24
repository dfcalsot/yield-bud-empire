# Yield Bud Empire — el juego

Juego de cultivo en el navegador (React + Vite) con un servicio de cuentas y juego en Node (`server/`). Lo publica el repositorio de despliegue.

## Correr en local

Requisitos: Node.js 22 o más.

1. `npm install`
2. Servicio de cuentas y juego: `npm run auth` (puerto 3020)
3. Juego: `npm run dev` (puerto 3000; `/api` va al servicio)

Pruebas del servidor: `npm run auth:test`. Chequeo de tipos e idiomas: `npm run lint`.

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

## El juego corre en el servidor

Nada de la partida vive en el navegador. El navegador es una pantalla: pide el estado y manda acciones; el servidor decide.

- **Núcleo** (`src/core/`, sin React): `state.ts` (la partida y su normalización con topes), `actions.ts` (cada acción, validada),
  `tick.ts` (el reloj del mundo: crecimiento, consumo, plagas, entregas de forja y cría), `run.ts` (XP, misiones, quemas, insumos).
  Se empaqueta para el servidor en `server/gen/sim.mjs` (`npm run build:server`).
- **Servidor** (`server/game.mjs`): tabla `game_state`; `GET /api/game/state` y `POST /api/game/action {type, params, idem}`, cada una
  en una transacción con la economía (`server/economy.mjs`: $FLORA, NFT, inventario). La clave `idem` evita aplicar dos veces un doble clic.
  El azar lo pone el servidor; el tiempo, su reloj. Las acciones que la economía hacía por pedido del navegador (cosechar, procesar,
  premios, gastos sueltos) ya no se pueden pedir desde afuera: solo corren dentro de una acción del juego.
- **Navegador** (`src/context/GameContext.tsx` + `src/core/predict.ts`): predice cada acción con el mismo núcleo para que la pantalla
  responda al instante, la manda, y la respuesta del servidor reemplaza la predicción. Sin conexión muestra «Sin conexión, reintentando…».
- **Migración**: al arrancar, las cuentas con la partida vieja del navegador (tabla `saves`) pasan al servidor con topes (nivel ≤ el ya
  pagado, semillas y lotes con máximo, plantas dentro de lo posible). `node server/admin.mjs games` muestra cómo quedó cada una.
- **Pruebas**: `npm run auth:test` (servidor, incluye ataques: mandar estado, acciones inventadas, adelantar el reloj, rendimientos falsos).

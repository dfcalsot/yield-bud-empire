# Yield Bud Empire — el juego

## English Overview

Yield Bud Empire is a next-generation cultivation simulation game, playable in the browser and on
mobile, built on the Solana blockchain. It blends immersive agricultural simulation — focused on
growing cannabis and premium hemp — with a deflationary, strict, and sustainable in-game economy.

Players start as independent growers under a totally free model (Free-to-Play / F2P) and evolve from
a basic home setup into master growers. The full game logic runs server-side (Node.js); the browser
is a client that predicts actions for responsiveness and syncs with the authoritative server state.
Relics (rare in-game items) can bridge out to Solana as Metaplex Core NFTs and back, with daily and
lifetime caps to keep the economy controlled.

### Running locally

Requirements: Node.js 22 or newer.

1. `npm install`
2. Start the accounts/game service: `npm run auth` (port 3020)
3. Start the game: `npm run dev` (port 3000; `/api` proxies to the service)

Server tests: `npm run auth:test`. Type and i18n check: `npm run lint`.

The rest of this README (architecture, i18n workflow, Solana bridge details) is written in Spanish
for the development team; translations are welcome via PR.

---

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

## Puente de reliquias a Solana (`server/bridge.mjs`)
- Las reliquias salen como NFT de Metaplex Core a la billetera vinculada y vuelven al juego enviándolas a la bóveda (la billetera del puente).
  La colección «Yield Bud Empire · Reliquias» lleva un 5 % de regalía. Al salir se quema $FLORA según la rareza (20/40/80/150), y el SOL lo pone el equipo.
- Topes: 3 salidas al día por cuenta y 50 en todo el juego; las cuentas de desarrollador no sacan nada. Afuera, la reliquia no da bonos ni se vende adentro.
- Configuración: `BRIDGE_ENABLED=1`, `SOLANA_RPC` (devnet por defecto) y `BRIDGE_ROYALTY_WALLET` (por defecto, la del puente).
  La llave está en `DATA_DIR/bridge-keypair.json` (600, entra en el respaldo nocturno).
- `node server/admin.mjs bridge` muestra la billetera, el saldo, la colección y los últimos trabajos. Las pruebas usan una cadena falsa (`BRIDGE_FAKE=1`).
- Devnet (2026-09-24): colección `7qQdqWMWsGD3SG7Ubp9ELTQ4oqZENLwbs9QQMbj9Sw7a`, billetera `8b1E4KU6M8T8ZXU3YGAEBz77tenDZHPsZhEkewA2eAFj`.
  Probado de punta a punta con dos cuentas y dos billeteras: sacar, vender afuera y traer. Mainnet solo con aprobación y con una billetera nueva.

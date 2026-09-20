# Seguridad de ChronoFlora

Este documento dice **qué está protegido, cómo, y qué falta configurar o construir** antes de abrir el juego al público. Está escrito sin adornos: si algo no está resuelto, se dice.

## Arquitectura

```
navegador ── https ──▶ (proxy inverso: Caddy / Cloudflare)  ──▶  juego estático (vite build) + /api ──▶ server/index.mjs (cuentas)
                                                                                                     └─ server/data/accounts.db (SQLite)
```

* El **servicio de cuentas** (`server/`) no tiene dependencias de terceros: solo Node (`http`, `crypto`, `node:sqlite`). Es fácil de auditar.
* El navegador habla con `/api` **en el mismo origen** (proxy de Vite en desarrollo y en `vite preview`; el proxy inverso en producción), así la cookie de sesión nunca viaja entre sitios.
* El juego solo abre con una sesión válida (`src/auth/AuthGate.tsx`).

## Controles implementados (todos con pruebas: `npm run auth:test`, 55 casos)

| Amenaza | Control |
|---|---|
| **Bots creando cuentas** | Prueba de trabajo (PoW) propia y gratuita: el navegador resuelve un reto SHA-256 en un Web Worker (~2 s); la dificultad **sube para IPs insistentes** (cada bit duplica el coste). Retos firmados con HMAC, con caducidad de 5 min y **de un solo uso** (anti-replay). Campo trampa (*honeypot*) y tiempo mínimo de formulario (2,5 s): un bot que falla recibe un "ok" falso para no darle pistas. |
| **Granjas de cuentas** | Máx. 3 cuentas por IP y 24 h, 5 altas por IP y hora, tope global de 60 altas/min (responde "ocupado" en vez de caerse). IP guardada solo como hash (HMAC). Cuentas con varias altas por IP quedan **marcadas** (`node server/admin.mjs flagged`). |
| **Cuentas duplicadas** | Clave canónica de correo (NFKC, minúsculas, sin `+etiqueta`, sin puntos en Gmail, `googlemail`=`gmail`), clave visual de usuario (detecta letras cirílicas/griegas parecidas, `0/o`, `1/l/i`), nombres reservados (admin, soporte…), correos desechables bloqueados, el dominio debe poder recibir correo (MX). Restricciones `UNIQUE` en la base de datos (a prueba de carreras). Identidades OAuth únicas por proveedor. |
| **Correos falsos** | Verificación por enlace de un solo uso (24 h). Sin confirmar el correo no se abre el juego. El enlace va en el `#fragmento` y se confirma con un POST desde la página (los escáneres de correo no lo consumen). |
| **Enumeración de usuarios** | Registro y "olvidé mi contraseña" responden **igual** exista o no el correo (el dueño recibe un aviso). Login con mensaje único y un hash "falso" para igualar el tiempo. |
| **Fuerza bruta** | 8 intentos/15 min por cuenta y 20 por IP; a los 3 fallos la cuenta se bloquea con espera exponencial y exige captcha. |
| **Contraseñas** | scrypt (N=2¹⁵) con sal por usuario y *pepper* del servidor; mínimo 10 caracteres, lista de contraseñas comunes, no puede contener el usuario/correo; máx. 3 hashes a la vez fuera del bucle de eventos (un aluvión de logins no congela el servidor). |
| **Sesiones** | Token aleatorio de 256 bits; en la base solo su hash SHA-256. Cookie `HttpOnly; SameSite=Lax` (`Secure` con HTTPS). Máx. 5 sesiones por cuenta, caducidad deslizante de 30 días, logout real, y **restablecer contraseña cierra todas las sesiones**. |
| **CSRF / origen** | Todo POST exige la cabecera `x-cf-csrf` y, si trae `Origin`, debe estar en la lista permitida. |
| **OAuth (Google, X)** | Código de autorización + **PKCE (S256)** + `state` firmado en cookie `HttpOnly` de 10 min. Google: correo verificado obligatorio. **Anti pre-secuestro**: si alguien registró antes el correo de otra persona, al entrar ella con Google se anula la contraseña del intruso. X: no da correo, así que se exige una cuenta con **≥ 60 días** (configurable) para frenar bots. |
| **Caídas por abuso (DoS)** | Límite global 300 peticiones/min por IP, cuerpo máx. 8 KB, solo `application/json`, *timeouts* contra slowloris (cabeceras 10 s, petición 15 s), máx. 2000 conexiones, errores no capturados registrados sin tumbar el proceso, purga periódica de sesiones/tokens/retos. |
| **Cabeceras** | API: `nosniff`, `X-Frame-Options: DENY`, `no-store`, CSP `default-src 'none'`, `Referrer-Policy`, `Permissions-Policy`, HSTS con HTTPS. Juego (`vite preview`): **CSP estricta** (solo Solana RPC, fuentes, imágenes conocidas), `frame-ancestors 'none'`, etc. |
| **Imágenes de perfil** | Se recodifican a 256×256 WebP/JPEG en el navegador: se pierden metadatos y cargas maliciosas. |
| **Auditoría** | Tabla `audit` (altas, logins, fallos, señales de bot, límites). `node server/admin.mjs stats | flagged | audit | ban <usuario>`. |

## Lo que NO está resuelto todavía (léelo antes de lanzar)

1. **El estado del juego vive en el navegador (`localStorage`).** Un jugador con conocimientos puede editar su saldo de $FLORA, sus NFT o sus plantas. Mientras la economía sea "del cliente", **ningún login ni anti-bot impide hacer trampa**. La solución de fondo es un **servidor autoritativo**: la simulación, las compras y los cofres se calculan en el servidor y el navegador solo los muestra. Es la siguiente fase y es grande.
2. **Google y X no están activados**: hacen falta credenciales que solo tú puedes crear (pasos abajo). El código está probado contra un proveedor simulado, **no contra Google/X reales**.
3. **Correo real**: sin `SMTP_URL` los correos se guardan en `server/data/outbox.log`. Además `DEV_EXPOSE_LINKS=1` (activo ahora) devuelve el enlace de verificación a la web: **con eso la verificación de correo no protege nada**. En producción debe ser `0` y hay que configurar SMTP.
4. **HTTPS**: hoy se sirve por HTTP. Con HTTPS delante (Caddy o Cloudflare) las cookies llevan `Secure` y se activa HSTS. También da protección DDoS de red que este servicio no puede dar por sí solo.
5. **Un humano con muchas cuentas** (granjas humanas o IP rotativas) no lo detiene un PoW. Capas siguientes: vincular una **billetera Solana con firma** (una billetera = una cuenta), edad mínima de la billetera, y límites económicos para cuentas nuevas.
6. Copias de seguridad de `server/data/` y rotación del secreto (`server/data/secret.key`).

## Puesta en marcha

```bash
npm run auth          # servicio de cuentas en 127.0.0.1:3020
npm run auth:test     # 55 pruebas de seguridad
node server/admin.mjs stats
```

Variables (todas opcionales salvo en producción): `PUBLIC_URL` (origen público, https), `ALLOWED_ORIGINS`, `TRUST_PROXY=1` (detrás de un proxy propio), `SMTP_URL` (`smtps://usuario:clave@host:465`), `MAIL_FROM`, `GOOGLE_CLIENT_ID/SECRET`, `X_CLIENT_ID/SECRET`, `POW_BITS` (20), `MAX_ACCOUNTS_PER_IP` (3), `X_MIN_AGE_DAYS` (60), `DATA_DIR`. **Producción:** `DEV_EXPOSE_LINKS=0` y `SKIP_MX=0`.

### Activar Google
Google Cloud Console → APIs y servicios → Credenciales → *ID de cliente de OAuth* (aplicación web). URI de redirección: `<PUBLIC_URL>/api/auth/google/callback`. Copia el ID y el secreto a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Activar X
developer.x.com → proyecto y app → *User authentication settings* → OAuth 2.0 (app "Web App", confidencial). Callback: `<PUBLIC_URL>/api/auth/x/callback`. Permisos de lectura (`users.read`, `tweet.read`). Copia *Client ID/Secret* a `X_CLIENT_ID` / `X_CLIENT_SECRET`.

### Correo (gratis)
Cualquier SMTP sirve (Brevo, Resend, tu dominio…). Instala el envío con `npm i nodemailer` y define `SMTP_URL`.

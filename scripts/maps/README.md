# Cartografía del Planeta

`public/maps/monti-1587.webp` es el planisferio de **Urbano Monti (1587)**, remuestreado a proyección equirectangular (2400×1200) para que
encaje con las coordenadas del mapa del juego (`proj(lon, lat)` en `WorldMap.tsx`) y con la textura del globo 3D.

- Original: *Urbano Monti — World Map as of 1587*, Wikimedia Commons (dominio público, 3000×3004).
  https://commons.wikimedia.org/wiki/File:Urbano_Monti_—_World_Map_as_of_1587.jpg
- El original es una proyección azimutal polar (Polo Norte al centro, ecuador en el círculo rojo, Polo Sur en el borde).
  Calibración a ojo: centro (1452, 1460) px, radio al Polo Sur 1375 px, rotación 285° con el este en sentido antihorario.
  El dibujo es a mano, así que la línea del ecuador ondula un poco: es fiel al original, no un error.
- Regenerar: `cd scripts/maps && curl -o monti.jpg <url del original> && python3 monti-build.py` (necesita Pillow).
  Los bordes norte y sur se funden con el fondo oscuro del juego (el borde sur del original son los pétalos decorativos).

## Estilo del juego (por defecto)

`public/maps/monti-game.webp` es la misma geografía repintada con la paleta del juego: océano azul profundo, tierra verde iluminada por el dibujo
original y costa en neón. El original tiene el mar amarillento de forma desigual, así que no se usa un color fijo: se calcula una medida suave de
«cuánto se parece a mar» (clara, poco saturada, sin verde ni rojo pintados), se corta, se limpian motas y agujeros y se pinta.

- Script: `monti-game-style.py` (necesita `raw-2400.png`, la reproyección sin desvanecer que genera `monti_reproject.py`).
- Tres estilos en el Planeta: Monti (juego), pergamino 1587 y mapa clásico (`WorldMap.tsx`, tipo `MapSkin`).
- Comprobación: con rotación 285° todos los pines de región caen sobre tierra (Jamaica, una isla, queda en el mar).

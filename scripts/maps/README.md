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

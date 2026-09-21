"""Urbano Monti (1587) restyled for the game: his geography (land/sea from the painted saturation), the game's palette
(deep-blue ocean, green land with a neon coast) and a faint trace of his engraving so it still reads as a chart."""
import sys
from PIL import Image, ImageFilter, ImageChops, ImageDraw
raw = Image.open('raw-2400.png').convert('RGB')       # Monti resampled to equirectangular, unfaded (see monti_reproject.py)
W, H = raw.size; w, h = W // 2, H // 2
small = raw.resize((w, h), Image.LANCZOS); px = small.load()

# 1 ─ land / sea. The sea is pale and barely saturated (the paint has yellowed unevenly, so a fixed colour cannot be used); painted land is
# darker, greener, redder or more saturated. A soft "seaness" is computed per pixel, smoothed, then cut.
def sstep(a, b, x): t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
sea = Image.new('L', (w, h)); sp = sea.load()
for j in range(h):
    for i in range(w):
        r, g, b = [c / 255 for c in px[i, j]]
        mx, mn = max(r, g, b), min(r, g, b); v = mx; s_ = (mx - mn) / mx if mx else 0
        k = sstep(0.60, 0.72, v) * (1 - sstep(0.13, 0.23, s_)) * (1 - sstep(0.03, 0.09, max(0.0, g - max(r, b)))) * (1 - sstep(0.05, 0.14, max(0.0, r - max(g, b) - 0.06)))
        sp[i, j] = int(255 * k)
sea = sea.filter(ImageFilter.GaussianBlur(4))
land = sea.point(lambda v: 0 if v >= 110 else 255).filter(ImageFilter.MedianFilter(7))

def components(img, value):
    ww, hh = img.size; d = img.load(); seen = bytearray(ww * hh)
    for y0 in range(hh):
        for x0 in range(ww):
            if seen[y0 * ww + x0] or d[x0, y0] != value: continue
            stack = [(x0, y0)]; seen[y0 * ww + x0] = 1; pts = []
            while stack:
                x, y = stack.pop(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < ww and 0 <= ny < hh and not seen[ny * ww + nx] and d[nx, ny] == value:
                        seen[ny * ww + nx] = 1; stack.append((nx, ny))
            yield pts
d = land.load()
for pts in components(land, 255):          # specks of land in the sea (ships, cartouches, labels)
    if len(pts) < 420:
        for x, y in pts: d[x, y] = 0
for pts in components(land, 0):            # holes in the land (lakes, text, trees)
    if len(pts) < 700:
        for x, y in pts: d[x, y] = 255
# the outer fringe of the projection (decorative petals, the south pole) is not land
for j in range(int(h * 0.865), h):
    for i in range(w): d[i, j] = 0
land.save('land-small.png')

mask = land.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2)).point(lambda v: 255 if v >= 128 else 0)
soft = mask.filter(ImageFilter.GaussianBlur(1.1))

# 2 ─ the game's palette
def vgrad(top, bot):
    g = Image.new('RGB', (1, H)); gp = g.load()
    for j in range(H):
        t = j / (H - 1); gp[0, j] = tuple(int(top[c] * (1 - t) + bot[c] * t) for c in range(3))
    return g.resize((W, H))
hexc = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
ocean = vgrad(hexc('#0d3556'), hexc('#071a2e'))
ground = vgrad(hexc('#2f9a63'), hexc('#155238'))
L = raw.convert('L')
# a trace of the engraving: high-pass of the original luminance
hp = ImageChops.subtract(L, L.filter(ImageFilter.GaussianBlur(7)), 1.0, 128)   # (L - blur) + 128
hp_lo = hp.point(lambda v: max(0, min(255, int((v - 128) * 2.6 + 128))))
def modulate(base, detail, amount):
    """base * (1 + amount * (detail - 0.5) * 2)"""
    lut = detail.point(lambda v: int(128 + (v - 128) * amount * 1.0))
    plus = Image.merge('RGB', (lut, lut, lut))
    return ImageChops.add(base, plus, 1.0, -128)
ocean = modulate(ocean, hp_lo, 0.35)
# land: the game's green lit by Monti's own light and shade (hills, hatching, rivers), plus a hint of his colours
Lb = L.filter(ImageFilter.GaussianBlur(1.2))
shade = Lb.point(lambda v: int(150 + v * 0.55))          # 150..290 → multiply factor
lit = ImageChops.multiply(ground, Image.merge('RGB', (shade.point(lambda v: min(255, v)),) * 3))
lit = ImageChops.add(lit, Image.merge('RGB', (hp_lo.point(lambda v: max(0, v - 128) // 2),) * 3))
tint = raw.filter(ImageFilter.GaussianBlur(3))
lit = Image.blend(lit, ImageChops.multiply(tint, Image.new('RGB', (W, H), (150, 200, 160))), 0.14)
img = Image.composite(lit, ocean, soft)

# 3 ─ neon coast: a wide soft glow and a crisp line, both from the mask
dil = mask.filter(ImageFilter.MaxFilter(5)); ero = mask.filter(ImageFilter.MinFilter(5))
edge = ImageChops.subtract(dil, ero)
glow = edge.filter(ImageFilter.GaussianBlur(7)).point(lambda v: min(255, int(v * 1.6)))
img = Image.composite(Image.new('RGB', (W, H), hexc('#67e8f9')), img, glow.point(lambda v: int(v * 0.30)))
line = edge.filter(ImageFilter.GaussianBlur(0.9))
img = Image.composite(Image.new('RGB', (W, H), hexc('#34d399')), img, line.point(lambda v: int(v * 0.62)))

# 4 ─ the game's faint graticule, then the poles dissolve into the deep ocean
dr = ImageDraw.Draw(img, 'RGBA')
for lat in (-60, -30, 0, 30, 60):
    y = (90 - lat) / 180 * H; dr.line((0, y, W, y), fill=(125, 211, 252, 22), width=2)
for lon in range(-150, 181, 30):
    x = (lon + 180) / 360 * W; dr.line((x, 0, x, H), fill=(125, 211, 252, 22), width=2)
bg = hexc('#071a2e'); ip = img.load()
for j in range(H):
    lat = 90 - (j + .5) / H * 180; a = 0.0
    if lat < -56: a = min(1.0, (-56 - lat) / 14)
    if lat > 80: a = min(0.85, (lat - 80) / 10 * 0.85)
    if a <= 0: continue
    for i in range(W):
        p = ip[i, j]; ip[i, j] = tuple(int(p[c] * (1 - a) + bg[c] * a) for c in range(3))
img.save('monti-game.png')
img.save('monti-game.webp', 'WEBP', quality=82, method=6)
import os; print(os.path.getsize('monti-game.webp') // 1024, 'KB')
img.resize((1200, 600), Image.LANCZOS).save('monti-game-preview.png')

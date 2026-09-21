from PIL import Image, ImageDraw, ImageFilter
import importlib.util, sys
sys.path.insert(0, ".")
import monti_reproject as rp
src = Image.open('monti.jpg').convert('RGB')
W, H = 2400, 1200
t = rp.build(src, W, H, 285, 1, 1452.0, 1460.0, 1375.0)
# the south pole of the projection is the fringe of the outer petals: fade the last band into the game's dark ocean, and soften the stretched pole on top
bg = (7, 10, 24)
px = t.load()
for j in range(H):
    lat = 90 - (j + .5) / H * 180
    a = 0.0
    if lat < -58: a = min(1.0, (-58 - lat) / 14)
    if lat > 82: a = max(a, min(0.8, (lat - 82) / 8 * 0.8))
    if a <= 0: continue
    for i in range(W):
        p = px[i, j]; px[i, j] = tuple(int(p[c] * (1 - a) + bg[c] * a) for c in range(3))
t.save('monti-equirect.png')
t.save('monti-1587.webp', 'WEBP', quality=80, method=6)
import os; print(os.path.getsize('monti-1587.webp') // 1024, 'KB')
t.resize((1200, 600)).save('monti-preview.png')

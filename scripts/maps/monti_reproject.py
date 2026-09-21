import math, sys
from PIL import Image
# Monti 1587 planisphere: north-polar azimuthal equidistant, south pole on the outer circle.
CX, CY, R = 1443.0, 1455.0, 1383.0          # pixels of the original: centre (north pole) and radius to the south pole
def build(src, W, H, off, sign, cx=CX, cy=CY, r=R):
    out = Image.new('RGB', (W, H)); px = out.load(); sp = src.load(); sw, sh = src.size
    k = sw / 3000.0
    for j in range(H):
        lat = 90 - (j + 0.5) / H * 180
        rr = r * (90 - lat) / 180
        for i in range(W):
            lon = (i + 0.5) / W * 360 - 180
            a = math.radians(sign * lon + off)
            x = (cx + rr * math.cos(a)) * k; y = (cy - rr * math.sin(a)) * k
            xi, yi = int(x), int(y)
            if 0 <= xi < sw - 1 and 0 <= yi < sh - 1:
                fx, fy = x - xi, y - yi
                p00, p10, p01, p11 = sp[xi, yi], sp[xi + 1, yi], sp[xi, yi + 1], sp[xi + 1, yi + 1]
                px[i, j] = tuple(int(p00[c] * (1 - fx) * (1 - fy) + p10[c] * fx * (1 - fy) + p01[c] * (1 - fx) * fy + p11[c] * fx * fy) for c in range(3))
    return out
if __name__ == '__main__':
    src = Image.open('monti.jpg').convert('RGB'); src.thumbnail((1500, 1500))
    tiles = []
    for sign in (1, -1):
        for off in (0, 90, 180, 270):
            t = build(src, 480, 240, off, sign); tiles.append((sign, off, t))
    M = Image.new('RGB', (960, 4 * 250), (0, 0, 0))
    from PIL import ImageDraw
    d = ImageDraw.Draw(M)
    for n, (sign, off, t) in enumerate(tiles):
        x, y = (n % 2) * 480, (n // 2) * 250
        M.paste(t, (x, y + 10)); d.text((x + 4, y), f'sign={sign} off={off}', fill=(255, 255, 0))
    M.save('rot-test.png')

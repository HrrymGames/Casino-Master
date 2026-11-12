"""Crop the dealer photo below the face and cut out the dark backdrop.
Each row keeps everything between the person's outermost visible (non-black)
pixels, so the black waistcoat and bow tie inside the white sleeves are kept.
Usage: python3 tools/make_dealer.py <photo> <out.png> [top] [bottom]"""
import sys
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
top = int(sys.argv[3]) if len(sys.argv) > 3 else 124
bottom = int(sys.argv[4]) if len(sys.argv) > 4 else 275
im = Image.open(src).convert('RGB')
im = im.crop((0, top, im.width, bottom))
W, H = im.size
px = im.load()

mask = Image.new('L', (W, H), 0)
mp = mask.load()
spans = []
for y in range(H):
    vis = [x for x in range(W) if max(px[x, y]) > 75]
    spans.append((vis[0], vis[-1]) if len(vis) > 3 else None)
# smooth spans a little so single noisy pixels don't stick out
for y in range(H):
    s = spans[y]
    if not s:
        continue
    for x in range(s[0], s[1] + 1):
        mp[x, y] = 255
mask = mask.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.3))
mp = mask.load()
for y in range(min(8, H)):  # soft top edge at the collar cut
    for x in range(W):
        mp[x, y] = int(mp[x, y] * (0.4 + 0.6 * y / 8))
res = im.convert('RGBA')
res.putalpha(mask)
res = res.crop(res.getbbox())
res = res.resize((res.width * 2, res.height * 2), Image.LANCZOS)
res.save(out, optimize=True)
print('saved', out, res.size)

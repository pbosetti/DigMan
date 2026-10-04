"""8-track punched tape encoding a G-code block in ISO 7-bit code (ISO 840):
bits 1-7 carry the character, bit 8 is the even-parity bit; sprocket holes
run between tracks 3 and 4."""
from svgkit import Svg, INK, RED, BLUE, GREEN

WORDS = ["N012", "G00", "X0013500", "Y0042800", "M03"]
BLOCK = "".join(WORDS) + "\n"       # LF = end of block
PITCH = 16                           # column pitch (0.1 in on a real tape)
TRACK = 16                           # track spacing
X0, Y0 = 70, 50                      # first column, top edge of the tape
NCOL = len(BLOCK)
W = X0 + PITCH * (NCOL + 2) + 230
H = 300


def bits(ch):
  code = ord(ch)
  b = [(code >> i) & 1 for i in range(7)]  # bit 1 .. bit 7
  b.append(sum(b) % 2)                      # bit 8: even parity
  return b


def track_y(t):
  """y of track t (1..8); the sprocket row sits between tracks 3 and 4."""
  row = t - 1 if t <= 3 else t          # rows 0..8, row 3 is the sprocket
  return Y0 + 18 + TRACK * (8 - row)


s = Svg(W, H, pad=4)
# tape body with a notched leading edge
xe = X0 + PITCH * (NCOL + 1)
s.polygon([(X0 - 30, Y0), (xe, Y0), (xe + 12, Y0 + 80), (xe, Y0 + 168), (X0 - 30, Y0 + 168),
           (X0 - 18, Y0 + 84)], fill="#fdf6e3", stroke=INK, sw=1.4)
for c, ch in enumerate(BLOCK):
  x = X0 + PITCH * (c + 0.5)
  s.circle(x, Y0 + 18 + TRACK * 5, 2.6, fill="#ffffff", stroke="#888888", sw=1)  # sprocket
  for t, b in enumerate(bits(ch), start=1):
    if b:
      s.circle(x, track_y(t), 5.2, fill=RED if t == 8 else INK, stroke="none", sw=0)
  label = "LF" if ch == "\n" else ch
  s.text(x, Y0 + 186, label, size=13 if ch != "\n" else 10, family="'Courier New', monospace", weight="bold")

# track numbers
for t in range(1, 9):
  s.text(X0 - 40, track_y(t), str(t), size=12, anchor="end", color="#777777")
s.text(X0 - 40, Y0 + 18 + TRACK * 5, "·", size=14, anchor="end", color="#777777")

# braces: words and block
c = 0
for w in WORDS:
  x1 = X0 + PITCH * c + 2
  x2 = X0 + PITCH * (c + len(w)) - 2
  s.polyline([(x1, Y0 + 198), (x1, Y0 + 204), (x2, Y0 + 204), (x2, Y0 + 198)], stroke=BLUE, sw=1.4)
  s.text((x1 + x2) / 2, Y0 + 218, "word", size=13, color=BLUE)
  c += len(w)
x2 = X0 + PITCH * NCOL - 2
s.polyline([(X0 + 2, Y0 + 226), (X0 + 2, Y0 + 232), (x2, Y0 + 232), (x2, Y0 + 226)], stroke=GREEN, sw=1.4)
s.text((X0 + x2) / 2, Y0 + 246, "block", size=13, color=GREEN)

# callouts
xr = xe + 30
xp = X0 + PITCH * 2.5  # '1' = 0x31 has three bits set: parity hole punched
s.leader(xp, track_y(8), xp + 40, Y0 - 22, "parity bit (track 8)", size=15)
s.leader(X0 + PITCH * (NCOL - 0.5), Y0 + 18 + TRACK * 5, xr, Y0 + 98, "sprocket holes", size=15)
s.text(xr + 6, Y0 + 134, "1 column = 1 character", size=14, anchor="start", color="#555555", italic=True)
s.save("punch-tape.svg")

"""IEC 61131-3 Ladder Diagram: motor start/stop with seal-in, interlock and timer."""
from svgkit import Svg, INK, BLUE, GREEN, RED, FILL_GREEN

W, H = 900, 470
L, R = 40, W - 40          # power rails
RUNG = [70, 205, 320, 420]  # y of the rungs
MONO = "'Courier New', Courier, monospace"

s = Svg(W, H, pad=6)


def contact(x, y, name, nc=False):
  """Contact symbol centred at x on rung y; returns (left, right) x."""
  s.line(x - 10, y - 16, x - 10, y + 16, sw=2.2)
  s.line(x + 10, y - 16, x + 10, y + 16, sw=2.2)
  if nc:
    s.line(x - 14, y + 18, x + 14, y - 18, sw=1.8)
  s.text(x, y - 28, name, size=15, family=MONO, color=BLUE)
  return x - 10, x + 10


def coil(x, y, name, kind=""):
  s.path(f"M{x - 6},{y - 16} A18,18 0 0 0 {x - 6},{y + 16}", sw=2.2)
  s.path(f"M{x + 6},{y - 16} A18,18 0 0 1 {x + 6},{y + 16}", sw=2.2)
  if kind:
    s.text(x, y + 1, kind, size=14, weight="bold")
  s.text(x, y - 28, name, size=15, family=MONO, color=GREEN)
  return x - 12, x + 12


def wire(pts):
  s.polyline(pts, sw=1.8)


def node(x, y):
  s.circle(x, y, 3.5, fill=INK, stroke="none", sw=0)


# power rails
s.line(L, 20, L, H - 20, sw=4)
s.line(R, 20, R, H - 20, sw=4)

# rung 1: Motor := (Start OR Motor) AND NOT Stop AND NOT Overload
y = RUNG[0]
a = contact(130, y, "Start_PB")
b = contact(330, y, "Stop_PB", nc=True)
c = contact(480, y, "Overload", nc=True)
d = coil(760, y, "Motor")
wire([(L, y), (a[0], y)])
wire([(a[1], y), (b[0], y)])
wire([(b[1], y), (c[0], y)])
wire([(c[1], y), (d[0], y)])
wire([(d[1], y), (R, y)])
# seal-in branch
yb = y + 70
e = contact(130, yb, "Motor")
wire([(70, y), (70, yb), (e[0], yb)])
wire([(e[1], yb), (230, yb), (230, y)])
node(70, y)
node(230, y)
s.text(330, yb, "seal-in (self-holding) branch", size=13, anchor="start", color="#777777", italic=True)

# rung 2: Inlet_Valve := Motor AND NOT Level_Hi
y = RUNG[1]
a = contact(130, y, "Motor")
b = contact(330, y, "Level_Hi", nc=True)
d = coil(760, y, "Inlet_Valve")
wire([(L, y), (a[0], y)])
wire([(a[1], y), (b[0], y)])
wire([(b[1], y), (d[0], y)])
wire([(d[1], y), (R, y)])

# rung 3: timer T1 starts when the motor runs
y = RUNG[2]
a = contact(130, y, "Motor")
bx, bw, bh = 400, 120, 70
s.rect(bx, y - 26, bw, bh, fill=FILL_GREEN, stroke=GREEN)
s.text(bx + bw / 2, y - 40, "T1", size=15, family=MONO, color=GREEN)
s.text(bx + bw / 2, y - 12, "TON", size=15, weight="bold")
s.text(bx + 8, y, "IN", size=13, anchor="start")
s.text(bx + bw - 8, y, "Q", size=13, anchor="end")
s.text(bx + 8, y + 28, "PT", size=13, anchor="start")
s.text(bx + bw - 8, y + 28, "ET", size=13, anchor="end")
wire([(L, y), (a[0], y)])
wire([(a[1], y), (bx, y)])
s.line(bx - 60, y + 28, bx, y + 28, sw=1.8)
s.text(bx - 66, y + 28, "T#10s", size=14, anchor="end", family=MONO, color=BLUE)

# rung 4: Lamp := T1.Q (set coil)
y = RUNG[3]
a = contact(130, y, "T1.Q")
d = coil(760, y, "Run_Lamp", kind="S")
wire([(L, y), (a[0], y)])
wire([(a[1], y), (d[0], y)])
wire([(d[1], y), (R, y)])

s.save("plc-ladder.svg")

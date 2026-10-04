"""IEC 61131-3 Function Block Diagram: same logic as the ladder example."""
from svgkit import Svg, INK, BLUE, GREEN, FILL_BLUE, FILL_GREEN

W, H = 880, 500
MONO = "'Courier New', Courier, monospace"
PIN = 26  # vertical pin spacing

s = Svg(W, H, pad=6)


def block(x, y, name, ins, outs, inst=None, w=90, fill=FILL_BLUE, stroke=BLUE, neg=()):
  """Function block with input pins on the left and outputs on the right.
  Returns dicts of pin coordinates."""
  n = max(len(ins), len(outs))
  h = 34 + PIN * n
  s.rect(x, y, w, h, fill=fill, stroke=stroke)
  if inst:
    s.text(x + w / 2, y - 12, inst, size=14, family=MONO, color=stroke)
  s.text(x + w / 2, y + 16, name, size=15, weight="bold")
  pi, po = {}, {}
  for i, p in enumerate(ins):
    yy = y + 34 + PIN * i + PIN / 2 - 4
    s.text(x + 7, yy, p, size=12, anchor="start")
    xx = x
    if p in neg or i in neg:
      s.circle(x - 5, yy, 5, fill="#ffffff", stroke=INK, sw=1.4)
      xx = x - 10
    pi[p] = (xx, yy)
  for i, p in enumerate(outs):
    yy = y + 34 + PIN * i + PIN / 2 - 4
    s.text(x + w - 7, yy, p, size=12, anchor="end")
    po[p] = (x + w, yy)
  return pi, po


def var(x, y, name, anchor="end", color=BLUE):
  s.text(x, y, name, size=15, anchor=anchor, family=MONO, color=color, weight="bold")


def wire(pts):
  s.polyline(pts, sw=1.6)


def node(x, y):
  s.circle(x, y, 3.5, fill=INK, stroke="none", sw=0)


XV = 150  # x where input variable names end

# OR: Start_PB OR Motor (feedback)
oi, oo = block(230, 30, "OR", ["IN1", "IN2"], ["OUT"])
var(XV, oi["IN2"][1], "Start_PB")
wire([(XV + 6, oi["IN2"][1]), oi["IN2"]])

# AND with two negated inputs: NOT Stop_PB, NOT Overload
ai, ao = block(430, 110, "AND", ["IN1", "IN2", "IN3"], ["OUT"], neg=("IN2", "IN3"))
wire([oo["OUT"], (380, oo["OUT"][1]), (380, ai["IN1"][1]), ai["IN1"]])
var(XV, ai["IN2"][1], "Stop_PB")
wire([(XV + 6, ai["IN2"][1]), ai["IN2"]])
var(XV, ai["IN3"][1], "Overload")
wire([(XV + 6, ai["IN3"][1]), ai["IN3"]])

# output variable Motor, fed back into OR.IN2
mx = 640
var(mx + 70, ao["OUT"][1], "Motor", anchor="start", color=GREEN)
wire([ao["OUT"], (mx + 64, ao["OUT"][1])])
node(mx, ao["OUT"][1])
wire([(mx, ao["OUT"][1]), (mx, 10), (200, 10), (200, oi["IN1"][1]), oi["IN1"]])

# AND: Motor AND NOT Level_Hi -> Inlet_Valve
bi, bo = block(430, 270, "AND", ["IN1", "IN2"], ["OUT"], neg=("IN2",))
YB = 250  # bus carrying Motor down to the lower blocks
wire([(mx - 30, ao["OUT"][1]), (mx - 30, YB), (395, YB), (395, bi["IN1"][1]), bi["IN1"]])
node(mx - 30, ao["OUT"][1])
var(XV, bi["IN2"][1], "Level_Hi")
wire([(XV + 6, bi["IN2"][1]), bi["IN2"]])
var(mx + 70, bo["OUT"][1], "Inlet_Valve", anchor="start", color=GREEN)
wire([bo["OUT"], (mx + 64, bo["OUT"][1])])

# TON timer: Motor -> T1, T1.Q -> Run_Lamp
ti, to = block(430, 405, "TON", ["IN", "PT"], ["Q", "ET"], inst="T1", fill=FILL_GREEN, stroke=GREEN)
wire([(395, YB), (375, YB), (375, ti["IN"][1]), ti["IN"]])
node(395, YB)
var(XV, ti["PT"][1], "T#10s")
wire([(XV + 6, ti["PT"][1]), ti["PT"]])
var(mx + 70, to["Q"][1], "Run_Lamp", anchor="start", color=GREEN)
wire([to["Q"], (mx + 64, to["Q"][1])])

s.save("plc-fbd.svg")

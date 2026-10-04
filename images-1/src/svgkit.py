"""Minimal helpers for writing the course SVG figures (standard library only).

Coordinates are SVG user units (y grows downwards). Each figure script builds
an `Svg`, draws on it, and saves it into images-1/.
"""
import math
import os

# Palette shared with slides.scss and the Graphviz diagrams
INK = "#333333"
GRID = "#999999"
RED = "#880000"
BLUE = "#000088"
GREEN = "#008800"
ORANGE = "#e08a1e"
FILL = "#f9f9ff"
FILL_RED = "#f3eaea"
FILL_BLUE = "#e8e8f8"
FILL_GREEN = "#e8f4e8"
FILL_ORANGE = "#fdf0dc"
STEEL = "#c9d3dc"     # workpiece
STEEL_DK = "#9fb0bf"
METAL = "#d9d9d9"     # machine parts
FONT = "Helvetica, Arial, sans-serif"
MATH = "'Times New Roman', Times, serif"

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def _fmt(v):
  if isinstance(v, float):
    return f"{v:.2f}".rstrip("0").rstrip(".")
  return str(v)


def _attrs(**kw):
  out = []
  for k, v in kw.items():
    if v is None:
      continue
    k = k.rstrip("_").replace("_", "-")
    out.append(f'{k}="{_fmt(v)}"')
  return " ".join(out)


class Svg:
  def __init__(self, width, height, pad=0):
    self.w, self.h, self.pad = width, height, pad
    self.items = []
    self.defs = []
    self._marker_ids = set()

  # -- primitives ---------------------------------------------------------
  def add(self, raw):
    self.items.append(raw)

  def line(self, x1, y1, x2, y2, stroke=INK, sw=1.5, dash=None, arrow=None, start_arrow=None, **kw):
    self.items.append(
      f'<line {_attrs(x1=x1, y1=y1, x2=x2, y2=y2, stroke=stroke, stroke_width=sw, stroke_dasharray=dash, **kw)}'
      f'{self._markers(arrow, start_arrow, stroke)}/>')

  def polyline(self, pts, stroke=INK, sw=1.5, fill="none", dash=None, arrow=None, start_arrow=None, **kw):
    p = " ".join(f"{_fmt(float(x))},{_fmt(float(y))}" for x, y in pts)
    self.items.append(
      f'<polyline points="{p}" {_attrs(stroke=stroke, stroke_width=sw, fill=fill, stroke_dasharray=dash, stroke_linejoin="round", **kw)}'
      f'{self._markers(arrow, start_arrow, stroke)}/>')

  def polygon(self, pts, fill=FILL, stroke=INK, sw=1.5, **kw):
    p = " ".join(f"{_fmt(float(x))},{_fmt(float(y))}" for x, y in pts)
    self.items.append(f'<polygon points="{p}" {_attrs(fill=fill, stroke=stroke, stroke_width=sw, stroke_linejoin="round", **kw)}/>')

  def path(self, d, stroke=INK, sw=1.5, fill="none", dash=None, arrow=None, start_arrow=None, **kw):
    self.items.append(
      f'<path d="{d}" {_attrs(stroke=stroke, stroke_width=sw, fill=fill, stroke_dasharray=dash, stroke_linejoin="round", **kw)}'
      f'{self._markers(arrow, start_arrow, stroke)}/>')

  def rect(self, x, y, w, h, fill=FILL, stroke=INK, sw=1.5, rx=0, dash=None, **kw):
    self.items.append(f'<rect {_attrs(x=x, y=y, width=w, height=h, rx=rx, fill=fill, stroke=stroke, stroke_width=sw, stroke_dasharray=dash, **kw)}/>')

  def circle(self, cx, cy, r, fill="#ffffff", stroke=INK, sw=1.5, **kw):
    self.items.append(f'<circle {_attrs(cx=cx, cy=cy, r=r, fill=fill, stroke=stroke, stroke_width=sw, **kw)}/>')

  def ellipse(self, cx, cy, rx, ry, fill="#ffffff", stroke=INK, sw=1.5, **kw):
    self.items.append(f'<ellipse {_attrs(cx=cx, cy=cy, rx=rx, ry=ry, fill=fill, stroke=stroke, stroke_width=sw, **kw)}/>')

  def text(self, x, y, s, size=16, anchor="middle", color=INK, weight=None, italic=False,
           family=FONT, baseline="middle", rotate=None):
    style = "italic" if italic else None
    tr = f' transform="rotate({rotate} {_fmt(x)} {_fmt(y)})"' if rotate else ""
    self.items.append(
      f'<text {_attrs(x=x, y=y, font_size=size, text_anchor=anchor, fill=color, font_weight=weight, font_style=style, font_family=family, dominant_baseline=baseline)}{tr}>{s}</text>')

  def math(self, x, y, s, size=20, anchor="middle", color=INK, **kw):
    """Italic serif text for symbols; use <tspan> markup for sub/superscripts (see sub())."""
    self.text(x, y, s, size=size, anchor=anchor, color=color, italic=True, family=MATH, **kw)

  def group(self, inner, transform=None, **kw):
    t = f' transform="{transform}"' if transform else ""
    self.items.append(f'<g{t} {_attrs(**kw)}>' + "".join(inner) + "</g>")

  def _marker(self, kind, color):
    """Return the id of an arrowhead/dot marker of the given kind and colour, defining it once."""
    kind = kind if isinstance(kind, str) else "arr"
    mid = f"{kind}-{color.lstrip('#')}"
    if mid not in self._marker_ids:
      self._marker_ids.add(mid)
      if kind == "dot":
        self.defs.append(
          f'<marker id="{mid}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" '
          f'markerUnits="userSpaceOnUse"><circle cx="5" cy="5" r="4" fill="{color}"/></marker>')
      else:
        size = 11 if kind == "arr" else 8
        self.defs.append(
          f'<marker id="{mid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="{size}" markerHeight="{size}" '
          f'orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,1.5 L10,5 L0,8.5 z" fill="{color}"/></marker>')
    return mid

  def _markers(self, end, start, color=INK):
    out = ""
    if end:
      out += f' marker-end="url(#{self._marker(end, color)})"'
    if start:
      out += f' marker-start="url(#{self._marker(start, color)})"'
    return out

  # -- composite helpers -------------------------------------------------
  def dim_h(self, x1, x2, y, label, ext_from=None, size=15, color=INK, above=True):
    """Horizontal dimension line with arrows at both ends and a centred label."""
    if ext_from is not None:
      for x, y0 in zip((x1, x2), ext_from):
        self.line(x, y0, x, y + (4 if y > y0 else -4), stroke=color, sw=0.8)
    self.line(x1, y, x2, y, stroke=color, sw=0.9, arrow="arrs", start_arrow="arrs")
    self.text((x1 + x2) / 2, y - 9 if above else y + 11, label, size=size, color=color)

  def dim_v(self, x, y1, y2, label, ext_from=None, size=15, color=INK, left=True):
    """Vertical dimension line, label rotated along it."""
    if ext_from is not None:
      for y, x0 in zip((y1, y2), ext_from):
        self.line(x0, y, x + (4 if x > x0 else -4), y, stroke=color, sw=0.8)
    self.line(x, y1, x, y2, stroke=color, sw=0.9, arrow="arrs", start_arrow="arrs")
    xx = x - 9 if left else x + 11
    self.text(xx, (y1 + y2) / 2, label, size=size, color=color, rotate=-90)

  def origin(self, cx, cy, r=12, color="#000000"):
    """Datum symbol: circle with two opposite filled quadrants."""
    self.circle(cx, cy, r, fill="#ffffff", stroke=color, sw=1.5)
    self.path(f"M{cx},{cy} L{cx + r},{cy} A{r},{r} 0 0 1 {cx},{cy + r} Z", fill=color, stroke="none", sw=0)
    self.path(f"M{cx},{cy} L{cx - r},{cy} A{r},{r} 0 0 1 {cx},{cy - r} Z", fill=color, stroke="none", sw=0)

  def target(self, cx, cy, r=7, color=INK):
    """Support / registration point: small circle with cross."""
    self.circle(cx, cy, r, fill="#ffffff", stroke=color, sw=1.3)
    self.line(cx - r - 3, cy, cx + r + 3, cy, stroke=color, sw=1)
    self.line(cx, cy - r - 3, cx, cy + r + 3, stroke=color, sw=1)

  def leader(self, x1, y1, x2, y2, label, anchor="start", size=15, color=INK):
    """Callout: dot on the feature, line to the label (tool-wear.png style)."""
    self.line(x1, y1, x2, y2, stroke="#444444", sw=1.2)
    self.circle(x1, y1, 3, fill="#444444", stroke="none", sw=0)
    dx = 6 if anchor == "start" else (-6 if anchor == "end" else 0)
    self.text(x2 + dx, y2, label, size=size, anchor=anchor, color=color)

  def save(self, name):
    p = self.pad
    body = "\n".join(self.items)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-p} {-p} {self.w + 2 * p} {self.h + 2 * p}" '
           f'width="{self.w + 2 * p}" height="{self.h + 2 * p}" font-family="{FONT}">\n'
           f'<defs>{"".join(self.defs)}</defs>\n{body}\n</svg>\n')
    path = os.path.join(OUT_DIR, name)
    with open(path, "w") as f:
      f.write(svg)
    return path


def sub(base, s, sup=None):
  """Symbol with subscript (and optional superscript) as SVG tspans."""
  out = f'{base}<tspan font-size="70%" baseline-shift="sub">{s}</tspan>'
  if sup:
    out += f'<tspan font-size="70%" baseline-shift="super">{sup}</tspan>'
  return out


def arc_pts(cx, cy, r, a0, a1, n=40):
  """Points on a circular arc (angles in degrees, math convention, y up -> flipped)."""
  return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
           cy - r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

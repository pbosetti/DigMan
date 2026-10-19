// Tool presetter: the measuring model, shared by the build and the live page.
// Lengths in mm, angles in degrees unless noted.
//
// An ISO 40 (7:24) holder carries a Ø40 shell end mill with four inserts.
// The optics look along y through the edge plane: lamp on one side, objective
// on the other, 50× onto a ground-glass screen whose field is 1 mm across.
// The radial axis X measures from the spindle axis toward the column (world
// −x), the axial axis Z from the spindle gauge plane up.

export const ISO40 = {
  gauge: 44.45, // gauge diameter, mm
  taper: 7 / 24, // diameter change per unit length
  length: 68.4, // taper length from the gauge line
  flange: 63.55, // flange diameter
  vgroove: 60, // V-groove angle, degrees
  slot: 16.1, // drive slot width
};

export const CUTTER = {
  d: 40, // nominal cutting diameter
  body: 19.0, // body radius below the inserts
  z: 4,
  nose: 0.2, // insert corner radius (a finishing insert)
  thick: 4.76, // insert thickness (tangential)
  L: 92.4, // nominal tool length, gauge plane to tip
};

// Each insert's seat: angle on the body, and how far its corner stands from
// nominal (radially, axially). Insert 3 sits on a chip: 42 µm proud.
export const INSERTS = [
  { phi: 0, dr: 0.004, dz: 0.003 },
  { phi: 90, dr: -0.006, dz: -0.002 },
  { phi: 180, dr: 0.042, dz: -0.005 },
  { phi: 270, dr: 0.002, dz: 0.018 },
];

export const OPTICS = { magnification: 50, field: 1.0 }; // field: mm across the screen

// Where the operator clamps the coarse slides, read on the scales.
export const COARSE = { X: 19.982, Z: 92.386 };
export const PARK = { X: 62, Z: 140 }; // head clear of the tool for a change

const RAD = Math.PI / 180;
const wrap = (deg) => ((deg % 360) + 540) % 360 - 180;

// Corner of insert i in the edge plane at spindle angle `theta`: how far it
// reaches toward the column (its shadow edge) and its tip height.
export function cornerOf(insert, theta) {
  const r = CUTTER.d / 2 + insert.dr;
  const alpha = wrap(insert.phi + theta); // 0 when the rake face lies in the edge plane
  const span = (CUTTER.thick / r) / RAD; // the insert trails its rake face by this much
  // largest projection over the insert's outer edge, from alpha back to alpha − span:
  // the angle of that edge nearest to the edge plane
  const nearest = Math.min(Math.max(0, alpha - span), alpha);
  const reach = Math.abs(nearest) < 90 ? r * Math.cos(nearest * RAD) : -Infinity;
  return { reach, tip: CUTTER.L + insert.dz, alpha };
}

// The shadow in the screen field: a list of rounded corners (x outward, z up)
// that are inside or near the field around the head position.
export function shadowAt(theta, head = COARSE) {
  const half = OPTICS.field / 2;
  const corners = INSERTS.map((insert, index) => ({ index, ...cornerOf(insert, theta) })).filter((c) => c.reach > head.X - half - CUTTER.nose);
  return corners;
}

// Peak hold, as the operator does it turning the holder through the beam:
// the outermost edge and the highest tip seen so far.
export function peakOf(previous, theta, head = COARSE) {
  const seen = shadowAt(theta, head);
  const peak = previous ? { ...previous } : { R: -Infinity, L: -Infinity, rFrom: -1, lFrom: -1 };
  for (const corner of seen) {
    if (corner.reach > peak.R) {
      peak.R = corner.reach;
      peak.rFrom = corner.index;
    }
    if (corner.tip > peak.L && corner.reach > head.X - OPTICS.field / 2) {
      peak.L = corner.tip;
      peak.lFrom = corner.index;
    }
  }
  return peak;
}

// True values the full turn converges to.
export const TRUE = {
  R: Math.max(...INSERTS.map((i) => CUTTER.d / 2 + i.dr)),
  L: Math.max(...INSERTS.map((i) => CUTTER.L + i.dz)),
};

export const fmt = (value, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : "—");

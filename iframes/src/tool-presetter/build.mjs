// Tool presetter slide: builds ../../tool-presetter-slide.html
//
//   node iframes/src/tool-presetter/build.mjs
//
// Uses the anatomy kit (https://github.com/…/anatomy skill); set ANATOMY to its
// folder if it is not in ~/.claude/skills/anatomy. The page shell (styles,
// fonts, deck keyboard hand-off) is copied from ../../touch-probe-slide.html so
// every slide iframe shares one look.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { makeParts } from "./parts.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.ANATOMY || join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit", "iso-kit.mjs")));
const G = await import(pathToFileURL(join(SKILL, "kit", "lathe.mjs")));
const OUT = join(HERE, "..", "..", "tool-presetter-slide.html");
const SHELL = join(HERE, "..", "..", "touch-probe-slide.html");

const WIDTH = 600;
const HEIGHT = 600;
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- world ----
const ZG = 62; // spindle gauge plane
const D = {
  ZG,
  RING: { r: 60, z0: 44, z1: 52 },
  NOSE: { r: 34, z0: 52, z1: ZG },
  FLANGE: { r: 31.8, z0: ZG + 3 },
  CUT: { r: M.CUTTER.d / 2, body: M.CUTTER.body, bottom: ZG + 3 + 47.6, top: ZG + M.CUTTER.L - 0.4, tip: ZG + M.CUTTER.L, thick: M.CUTTER.thick },
  INSERTS: M.INSERTS,
  NOSE_R: M.CUTTER.nose,
  RACK: [45, -89, 40],
};
const HOLDER_IN_RACK = [D.RACK[0], D.RACK[1], D.RACK[2] - D.FLANGE.z0];
const LIFT = 122;

// head: the beam runs along y at x = −X, z = ZG + Z; the arm rides 32 above it
const HEAD0 = { X: M.COARSE.X, Z: M.COARSE.Z };
const colX = (X) => -X - 92; // column centre
const beamZ = (Z) => ZG + Z;
const armZ = (Z) => ZG + Z + 32;
const C0 = colX(HEAD0.X);
const B0 = beamZ(HEAD0.Z);
const A0 = armZ(HEAD0.Z);
const XB = -HEAD0.X; // beam x at rest

const CAB = { x: -234, y: -128, w: 336, d: 214, r: 6 };
const CAB_Z = [-60, 0];
const BED = { x: -220, y: -56, w: 154, d: 112, r: 3 };
const BED_H = 16;
const RAIL_Y = [-30, 30];

const pts = [
  ...k.boxCorners(CAB, CAB_Z[0] - 8, 0),
  [colX(M.PARK.X) - 22, -26, 330],
  [C0 + 22, 26, 330],
  [XB + 24, -216, armZ(M.PARK.Z) + 46],
  [XB, 62, A0 + 8],
  [0, 0, D.CUT.tip + LIFT + 4],
  [-32, 32, D.CUT.tip + LIFT],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 22, azimuth: 25 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const PT = makeParts(k, G, P, D);
const Fz = (x, y, z) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const Fy = (x, y, z, sign = 1) => G.frameAlong([x, y, z], [0, sign, 0]);
const Fx = (x, y, z, sign = 1) => G.frameAlong([x, y, z], [sign, 0, 0]);
const label = (plan, z, lines = [0.8, 0.6, 0.45]) => {
  let out = S(k.slabOf(plan, z, 0.8, P, 3), { tone: "lo", crease: "none" });
  out += L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 3), { tone: "faint" });
  return out;
};

// ------------------------------------------------------------- cabinet ----
function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CAB, CAB_Z[0] - 8, 60, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(CAB, 20))) {
    out.push(S(k.cylinder(x, y, 8, CAB_Z[0] - 8, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4, CAB_Z[0] - 6, 6, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 6, CAB_Z[0] - 3.5, 2.4, P, 6), { tone: "mid" }));
  }
  const seam = k.sideSeam(CAB, -8, P, 8);
  out.push(S(k.slabOf(CAB, CAB_Z[0], 60, P, 8, 1.2), { tone: "lo", inner: L(seam, { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(CAB, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(CAB, 10);
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // front panel (+x face): door outline, a knob, a label plate
  const xf = CAB.x + CAB.w;
  const door = [[xf, -110, -14], [xf, -110, -52], [xf, 60, -52], [xf, 60, -14]];
  out.push(L(k.pathOf(door.map(at), true), { tone: "faint" }));
  out.push(Dt([[xf, -104, -18], [xf, 54, -18], [xf, -104, -48], [xf, 54, -48]].map(at), { size: 0.45, tone: "mid" }));
  const KF = Fx(xf, -20, -33);
  out.push(S(G.disc(0, 2, 10, KF, P), { tone: "mid" }));
  out.push(S(G.disc(2, 9, 7.5, KF, P), { tone: "hi" }));
  out.push(k.fadedSvg(G.ribsOf(KF, 2, 9, 7.5, 40, P, { fade: [0.1, 0.55] }), { tone: "lo" }));
  out.push(L(G.circleOf(KF, 9, 2.2, P), { tone: "lo" }));
  // vent slots on the left (+y) face
  const yf = CAB.y + CAB.d;
  for (let i = 0; i < 6; i++) {
    const x0 = -60 + i * 9;
    const slot = [[x0, yf, -18], [x0 + 5, yf, -18], [x0 + 5, yf, -44], [x0, yf, -44]];
    out.push(L(k.pathOf(slot.map(at), true), { tone: "lo" }));
  }
  // engraved plate on the front
  const plate = [[xf, 40, -22], [xf, 10, -22], [xf, 10, -32], [xf, 40, -32]];
  out.push(`<path class="tp-plate" d="${k.pathOf(plate.map(at), true)}"/>`);
  out.push(L(k.pathOf(plate.map(at), true), { tone: "lo" }));
  out.push(L(k.segment([xf, 36, -26], [xf, 18, -26], P), { tone: "lo", free: true }));
  out.push(L(k.segment([xf, 36, -29], [xf, 24, -29], P), { tone: "faint", free: true }));
  return out.join("");
}

function bed() {
  const out = [];
  out.push(S(k.slabOf(BED, 0, BED_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 3.5), BED_H, P, 4), { tone: "faint" }));
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: BED.x + 4, y: y - 4, w: BED.w - 8, d: 8, r: 1 }, BED_H, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([-200, -170, -140, -110, -80].map((x) => at([x, y, BED_H + 6])), { size: 0.42, tone: "lo" }));
  }
  // end stops
  for (const x of [BED.x + 1, BED.x + BED.w - 6]) {
    out.push(S(k.slabOf({ x, y: -44, w: 5, d: 88, r: 1 }, BED_H, 9, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([x + 2.5, -38, BED_H + 9]), at([x + 2.5, 38, BED_H + 9])], { size: 0.45 }));
  }
  // X scale along the bed, read by the saddle
  const strip = { x: BED.x + 10, y: 42, w: BED.w - 20, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, BED_H, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 2.5, 4, strip.y + 0.6, BED_H + 0.6, [2, 3.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- rack ----
function rack() {
  const [x, y, top] = D.RACK;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 24, y: y - 24, w: 48, d: 48, r: 4 }, 0, 20, P)}" style="opacity:.18"/>`];
  const plan = { x: x - 23, y: y - 23, w: 46, d: 46, r: 4 };
  out.push(S(k.slabOf(plan, 0, 20, P, 4, 0.6), { tone: "mid" }));
  out.push(Dt(k.corners(plan, 5).map(([a, b]) => at([a, b, 20])), { size: 0.5 }));
  out.push(S(k.cylinder(x, y, 30, 20, top - 20, P, 72, 0.6), { tone: "mid", inner: L(k.sideArc(x, y, 30, 30, P, 40), { tone: "faint" }) }));
  out.push(`<path class="tp-hole" d="${k.ring(x, y, 22.4, top, P, 64)}"/>`);
  out.push(L(k.ring(x, y, 22.4, top, P, 64), { tone: "lo" }));
  out.push(L(k.ring(x, y, 26.4, top, P, 64), { tone: "faint" }));
  // label plate on the front of the block
  const xf = x + 23;
  const plateD = [[xf, y + 12, 15], [xf, y - 12, 15], [xf, y - 12, 6], [xf, y + 12, 6]];
  out.push(`<path class="tp-plate" d="${k.pathOf(plateD.map(at), true)}"/>`, L(k.pathOf(plateD.map(at), true), { tone: "lo" }));
  out.push(L(k.segment([xf, y + 9, 12], [xf, y - 7, 12], P), { tone: "lo", free: true }));
  out.push(L(k.segment([xf, y + 9, 9], [xf, y - 2, 9], P), { tone: "faint", free: true }));
  return out.join("");
}

// ------------------------------------------------- column (moves in X) ----
const SADDLE = { x: C0 - 32, y: -46, w: 64, d: 110, r: 3 };
const COL = { x: C0 - 22, y: -26, w: 44, d: 52, r: 3 };
const COL_Z = [38, 322];
const WHEEL_X = { o: [C0 + 6, SADDLE.y + SADDLE.d, 31], a: [0, 1, 0], s: 0, r: 13 };
const WHEEL_Z = { o: [C0 - 2, COL.y + COL.d, 112], a: [0, 1, 0], s: 2.5, r: 17 };

function column() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(SADDLE, 4), BED_H + 6, 0.1, P)}" style="filter:blur(4px);opacity:.25"/>`);
  for (const [x, y] of byDepth([[C0 - 18, -30], [C0 + 18, -30], [C0 - 18, 30], [C0 + 18, 30]])) {
    out.push(S(k.slabOf({ x: x - 11, y: y - 7, w: 22, d: 14, r: 1.5 }, BED_H + 6, 8, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([x - 7, y, BED_H + 14]), at([x + 7, y, BED_H + 14])], { size: 0.4, tone: "lo" }));
  }
  out.push(S(k.slabOf(SADDLE, 30, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(Dt(k.corners(SADDLE, 5).map(([x, y]) => at([x, y, 38])), { size: 0.45 }));
  // X read head over the scale strip, with its pointer
  out.push(S(k.slabOf({ x: C0 - 6, y: 40, w: 12, d: 14, r: 1 }, BED_H + 2, 12, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.lineOnTop([C0, 50.6], [C0, 54], BED_H + 2, P), { tone: "hi" }));
  // X clamp knob on the saddle top, front right
  out.push(S(k.cylinder(C0 + 24, -36, 3.2, 38, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(C0 + 24, -36, 4.4, 41, 4, P, 24), { tone: "hi" }));
  out.push(L(k.knurl(C0 + 24, -36, 4.4, 41, 45, 20, P, 0.3), { tone: "lo" }));
  // the column
  const seams = [120, 230].map((z) => k.sideSeam(COL, z, P, 3)).join("");
  out.push(S(k.slabOf(COL, COL_Z[0], COL_Z[1] - COL_Z[0], P, 3, 0.6), { tone: "mid", inner: L(seams, { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(COL, -2), COL_Z[1], 6, P, 3, 0.6), { tone: "mid" }));
  out.push(Dt(k.corners(COL, 4).map(([x, y]) => at([x, y, COL_Z[1] + 6])), { size: 0.45 }));
  // Z rails and scale on the front face
  const xf = COL.x + COL.w;
  for (const y of [-17, 17]) {
    out.push(S(k.slabOf({ x: xf, y: y - 3, w: 4, d: 6, r: 0.8 }, COL_Z[0] + 6, COL_Z[1] - COL_Z[0] - 12, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: xf, y: -5, w: 1, d: 10, r: 0.3 }, COL_Z[0] + 10, COL_Z[1] - COL_Z[0] - 20, P, 2), { tone: "lo", crease: "none" }));
  const ticks = { minor: [], major: [] };
  for (let z = COL_Z[0] + 14, i = 0; z <= COL_Z[1] - 12; z += 5, i++) (i % 5 ? ticks.minor : ticks.major).push(k.segment([xf + 1, 5, z], [xf + 1, i % 5 ? 2 : 0, z], P));
  out.push(L(ticks.minor.join(""), { tone: "lo" }), L(ticks.major.join(""), { tone: "mid" }));
  // Z handwheel boss on the left face
  out.push(S(G.disc(0, 2.5, 8, G.frameAlong(WHEEL_Z.o, [0, 1, 0]), P), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------- carriage, arm and optics (X, Z) ----
const ARM = { x: XB - 7, y: -160, w: 14, d: 222, r: 2 };
const BOX = { x: XB - 20, y: -216, w: 44, d: 56, r: 3 };
const BOX_Z = [A0 - 32, A0 + 44];
const SCREEN = { x: BOX.x + BOX.w, y0: -207, y1: -169, z0: A0 + 6, z1: A0 + 38 };
const DRO = { y0: -207, y1: -169, z0: A0 - 24, z1: A0 - 6 };

function carriageBack() {
  const out = [];
  const xf = COL.x + COL.w + 4;
  out.push(S(k.slabOf({ x: xf, y: -24, w: 14, d: 48, r: 2 }, A0 - 34, 68, P, 3, 0.5), { tone: "mid" }));
  out.push(Dt([[xf + 14, -18, A0 + 30], [xf + 14, 18, A0 + 30], [xf + 14, -18, A0 - 30], [xf + 14, 18, A0 - 30]].map(at), { size: 0.45 }));
  // Z read head: a pointer onto the column scale
  out.push(S(k.slabOf({ x: xf - 4, y: 6, w: 4, d: 8, r: 0.6 }, B0 - 4, 8, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.segment([xf - 3, 5.6, B0], [xf - 3, 2.6, B0], P), { tone: "hi" }));
  // Z clamp lever on the carriage side
  const LF = G.frameAlong([xf + 7, 24, A0 + 14], [0, 1, 0]);
  out.push(S(G.disc(0, 4, 3, LF, P), { tone: "mid" }));
  out.push(S(G.disc(4, 13, 1.3, LF, P), { tone: "mid" }));
  out.push(S(G.sphereOf(G.pointOf(LF, 14.6, 0, 0), 2.6, P, { steps: 28 }), { tone: "hi" }));
  // bracket out to the arm
  out.push(S(k.slabOf({ x: xf + 14, y: -9, w: ARM.x - xf - 14, d: 18, r: 2 }, A0 - 8, 16, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

function screenBox() {
  const out = [];
  out.push(S(k.slabOf(BOX, BOX_Z[0], BOX_Z[1] - BOX_Z[0], P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(BOX, A0 - 2, P, 3), { tone: "faint" }) }));
  // hood around the screen
  const xf = SCREEN.x;
  out.push(S(k.slabOf({ x: xf, y: SCREEN.y0 - 3, w: 9, d: SCREEN.y1 - SCREEN.y0 + 6, r: 0.6 }, SCREEN.z1 + 2, 2, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: xf, y: SCREEN.y1 + 1, w: 9, d: 2, r: 0.4 }, SCREEN.z0 - 2, SCREEN.z1 - SCREEN.z0 + 4, P, 2), { tone: "mid", crease: "none" }));
  // screen glass (contents are live) and the DRO window
  const glass = [[xf, SCREEN.y1, SCREEN.z1], [xf, SCREEN.y0, SCREEN.z1], [xf, SCREEN.y0, SCREEN.z0], [xf, SCREEN.y1, SCREEN.z0]];
  out.push(`<path class="tp-glass" d="${k.pathOf(glass.map(at), true)}"/>`);
  out.push(`<g data-dyn="screen" transform="${screenMatrix()}"></g>`);
  out.push(L(k.pathOf(glass.map(at), true), { tone: "lo" }));
  out.push(S(k.slabOf({ x: xf, y: SCREEN.y0 - 3, w: 9, d: 2, r: 0.4 }, SCREEN.z0 - 2, SCREEN.z1 - SCREEN.z0 + 4, P, 2), { tone: "mid", crease: "none" }));
  const dro = [[xf, DRO.y1, DRO.z1], [xf, DRO.y0, DRO.z1], [xf, DRO.y0, DRO.z0], [xf, DRO.y1, DRO.z0]];
  out.push(`<path class="tp-dro" d="${k.pathOf(dro.map(at), true)}"/>`);
  out.push(`<g data-dyn="dro" transform="${k.sideMatrix([xf, DRO.y1], DRO.z1, P, "right")}"></g>`);
  out.push(L(k.pathOf(dro.map(at), true), { tone: "lo" }));
  // three keys under the DRO
  for (const y of [-201, -188, -175]) {
    const KF = Fx(xf, y, A0 - 28);
    out.push(S(G.disc(0, 1.6, 2.4, KF, P), { tone: "hi" }));
  }
  out.push(Dt([[xf, BOX.y + 3, BOX_Z[1] - 3], [xf, BOX.y + BOX.d - 3, BOX_Z[1] - 3], [xf, BOX.y + 3, BOX_Z[0] + 3], [xf, BOX.y + BOX.d - 3, BOX_Z[0] + 3]].map(at), { size: 0.45 }));
  return out.join("");
}

function screenMatrix() {
  return k.sideMatrix([SCREEN.x, SCREEN.y1], SCREEN.z1, P, "right");
}

function objective() {
  const out = [];
  // objective tube, pointing at the edge
  const F = Fy(XB, -62, B0, 1);
  const prof = [[0, 9], [17, 9], [17, 7.2], [27, 7.2], [27.6, 6.2], [36, 6.2]];
  out.push(S(G.solidOf(prof, F, P), { tone: "hi" }));
  out.push(k.fadedSvg(G.ribsOf(F, 4, 15, 9, 36, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }));
  out.push(`<path class="tp-lens" d="${G.circleOf(F, 36, 4.6, P)}"/>`);
  out.push(L(G.circleOf(F, 36, 4.6, P), { tone: "lo" }));
  // mirror box on the tube, and its post up to the arm
  const mb = { x: XB - 9, y: -66, w: 18, d: 16, r: 2 };
  out.push(S(k.slabOf(mb, B0 + 8.6, 15.4, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(mb, 2.5), B0 + 24, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: XB - 4, y: -62, w: 8, d: 8, r: 1 }, B0 + 24, A0 - 8 - B0 - 24, P, 2, 0.3), { tone: "mid", crease: "none" }));
  out.push(Dt([[XB - 6, -64, B0 + 24], [XB + 6, -52, B0 + 24]].map(at), { size: 0.4 }));
  return out.join("");
}

function lamp() {
  const out = [];
  const F = Fy(XB, 62, B0, -1);
  out.push(S(G.disc(-3, 0, 3, F, P), { tone: "mid" })); // cable gland on the back cap
  const prof = [[0, 6], [1.6, 9.6], [21, 9.6], [21, 8], [26.4, 8], [27, 6.8], [30, 6.8]];
  out.push(S(G.solidOf(prof, F, P), { tone: "mid" }));
  out.push(k.fadedSvg(G.ribsOf(F, 4, 19, 9.6, 30, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }));
  out.push(`<path class="tp-lens" d="${G.circleOf(F, 30, 5.2, P)}"/>`);
  out.push(L(G.circleOf(F, 30, 5.2, P), { tone: "lo" }));
  // hanger: a saddle block on the housing and a post up to the arm
  out.push(S(k.slabOf({ x: XB - 6, y: 44, w: 12, d: 13, r: 1.5 }, B0 + 8.4, 4, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: XB - 4, y: 46, w: 8, d: 9, r: 1 }, B0 + 12.4, A0 - 8 - B0 - 12.4, P, 2, 0.3), { tone: "mid", crease: "none" }));
  return out.join("");
}

function arm() {
  const out = [];
  out.push(S(k.slabOf(ARM, A0 - 8, 16, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(ARM, A0, P, 3), { tone: "faint" }) }));
  out.push(Dt([[XB, 54, A0 + 8], [XB, 40, A0 + 8], [XB, -56, A0 + 8], [XB, -70, A0 + 8], [XB, -6, A0 + 8], [XB, 6, A0 + 8]].map(at), { size: 0.45 }));
  return out.join("");
}

// -------------------------------------------------------- spindle (static) ----
function spindle() {
  const out = [];
  const F = Fz(0, 0, 0);
  out.push(S(G.disc(0, 6, 50, F, P), { tone: "mid" }));
  out.push(Dt(G.dotsOf(F, 6, 46, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.5 }));
  out.push(S(G.disc(6, D.RING.z0, 42, F, P), { tone: "mid", crease: "none", inner: L(G.arcOf(F, 26, 42, P), { tone: "faint" }) }));
  // brake lever on the housing, front left
  const dir = [Math.cos(52 * RAD), Math.sin(52 * RAD), 0];
  const LF = G.frameAlong([dir[0] * 40, dir[1] * 40, 24], dir);
  out.push(S(G.disc(0, 6, 5, LF, P), { tone: "mid" }));
  out.push(S(G.disc(6, 18, 1.6, LF, P), { tone: "mid" }));
  out.push(S(G.sphereOf(G.pointOf(LF, 20.4, 0, 0), 3.2, P, { steps: 32 }), { tone: "hi" }));
  // the rotation ring (turns with the spindle; ticks and knob are live)
  out.push(S(G.disc(D.RING.z0, D.RING.z1, D.RING.r, F, P), { tone: "mid", crease: "lo" }));
  out.push(k.fadedSvg(G.ribsOf(F, D.RING.z0 + 1.4, D.RING.z1 - 1.4, D.RING.r, 120, P, { fade: [0.08, 0.5], seams: true }), { tone: "lo" }));
  out.push(L(k.ring(0, 0, D.RING.r - 7, D.RING.z1, P, 96), { tone: "faint" }));
  return out.join("");
}

function spindleTop() {
  const out = [];
  const F = Fz(0, 0, 0);
  out.push(S(G.disc(D.NOSE.z0, D.NOSE.z1, D.NOSE.r, F, P), { tone: "mid" }));
  out.push(`<path class="tp-hole" d="${k.ring(0, 0, 22.4, D.NOSE.z1, P, 72)}"/>`);
  out.push(L(k.ring(0, 0, 22.4, D.NOSE.z1, P, 72), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 27, D.NOSE.z1, P, 72), { tone: "faint" }));
  return out.join("");
}

// fixed index pointer for the ring, on a post at the front
function pointer() {
  const out = [];
  const a = 22 * RAD;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const side = [-sn, c];
  const w = 2.4;
  // an L bracket from the housing, under the ring, up past its rim
  const bar = [[c * 41 + side[0] * w, sn * 41 + side[1] * w], [c * 66 + side[0] * w, sn * 66 + side[1] * w], [c * 66 - side[0] * w, sn * 66 - side[1] * w], [c * 41 - side[0] * w, sn * 41 - side[1] * w]];
  out.push(S(k.extrude(bar, 34, 4, P), { tone: "mid" }));
  out.push(S(k.cylinder(c * 64.5, sn * 64.5, 2.2, 38, D.RING.z1 + 1 - 38, P, 18), { tone: "mid", crease: "none" }));
  const plate = [[c * 66.5 + side[0] * w, sn * 66.5 + side[1] * w], [c * 66.5 - side[0] * w, sn * 66.5 - side[1] * w], [c * 57.5, sn * 57.5]];
  out.push(S(k.extrude(plate, D.RING.z1 + 1, 1.2, P), { tone: "hi" }));
  out.push(Dt([at([c * 44, sn * 44, 38])], { size: 0.45 }));
  return out.join("");
}

// ------------------------------------------------- holder (moves as one) ----
// the part of the holder below the gauge plane is clipped where it sits in
// the spindle or in the rack, so it shows only when lifted out
function clipHoles() {
  const hole = (cx, cy, r, zt) => {
    const A = 25 * RAD;
    const arc = [];
    for (let i = 0; i <= 40; i++) {
      const t = A - Math.PI / 2 + (Math.PI * i) / 40;
      arc.push(at([cx + r * Math.cos(t), cy + r * Math.sin(t), zt]));
    }
    const a = arc[0];
    const b = arc[arc.length - 1];
    return "M" + [...arc, [b[0], b[1] + 400], [a[0], a[1] + 400]].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
  };
  // cut at the front rim of each bore: what is below it is inside the bore
  return `M-1000 -1000H2000V2000H-1000Z${hole(0, 0, 22.4, D.NOSE.z1)}${hole(D.RACK[0], D.RACK[1], 22.4, D.RACK[2])}`;
}

function holderBelow() {
  const F = Fz(0, 0, D.FLANGE.z0);
  const out = [];
  const taper = [[-70, 8], [-68.4, 12.25], [-2.5, 21.5], [0, 21.5]];
  out.push(S(G.solidOf([[-92, 3], [-90.6, 7.5], [-85, 7.5], [-84, 5], [-76, 5], [-75, 8], [-70, 8]], F, P), { tone: "mid" }));
  out.push(S(G.solidOf(taper, F, P), { tone: "hi" }));
  return out.join("");
}

function holderAbove() {
  const F = Fz(0, 0, D.FLANGE.z0);
  const out = [];
  // the 60° V-groove the tool changer grips: its two flanks as seams under the outline
  const flange = [[0, 30.6], [1, 31.8], [15, 31.8], [16, 30.6]];
  const groove = [5.6, 8, 10.4].map((s, i) => L(G.arcOf(F, s, 31.8, P), { tone: i === 1 ? "lo" : "faint" })).join("");
  out.push(S(G.solidOf(flange, F, P), { tone: "hi", crease: "lo", inner: groove }));
  out.push(`<g data-dyn="slots"></g>`);
  out.push(S(G.disc(16, 47.6, 24.6, F, P), { tone: "hi", crease: "lo", inner: L(G.arcOf(F, 34, 24.6, P), { tone: "faint" }) }));
  return out.join("");
}

function cutterBody() {
  const F = Fz(0, 0, D.CUT.bottom);
  const h = D.CUT.top - D.CUT.bottom;
  return S(G.solidOf([[0, 18.2], [0.8, 19], [h - 1.2, 19], [h, 17.8]], F, P), { tone: "hi", crease: "lo", inner: L(G.arcOf(F, 8, 19, P), { tone: "faint" }) });
}

// ------------------------------------------------------------- assemble ----
const theta0 = 0;
const live = PT.cutterLive(theta0);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A tool presetter. A cabinet carries a dummy spindle with an ISO 40 taper and a rotation ring, a tool rack, and a granite bed on which a column slides toward the spindle. A carriage on the column holds an arm with a lamp on one side of the cutting edge and an objective on the other; the shadow of the edge is projected onto a screen at the end of the arm. A Ø40 shell mill with four inserts sits in an ISO 40 holder in the spindle.",
  body: [
    cabinet(),
    bed(),
    rack(),
    `<g class="tp-col" data-move="col">${column()}<g data-dyn="wheelZ">${PT.wheel(WHEEL_Z, 0)}</g>`,
    `<g data-dyn="wheelX">${PT.wheel(WHEEL_X, 0)}</g>`,
    `<g class="tp-car" data-move="car">${carriageBack()}${screenBox()}${objective()}${lamp()}${arm()}</g></g>`,
    `<g data-move="beam"><g class="tp-beamset">${L(k.segment([XB, 31, B0], [XB, -26, B0], P), { tone: "hi", className: "tp-beam" })}${Dt([at([XB, 31.6, B0]), at([XB, -26.6, B0])], { size: 0.9, tone: "hi" }).replace("iso-dots", "iso-dots tp-spot")}</g></g>`,
    spindle(),
    `<g data-dyn="ticks">${PT.ringTicks(theta0)}</g>`,
    pointer(),
    `<g data-dyn="knob">${PT.ringKnob(theta0)}</g>`,
    spindleTop(),
    `<g data-dyn="keysBack">${PT.noseKeys(theta0).back}</g>`,
    `<g class="tp-shank" data-move="shank"><clipPath id="tp-clip"><path data-hold clip-rule="evenodd" d="${clipHoles()}"/></clipPath><g clip-path="url(#tp-clip)">${holderBelow()}</g></g>`,
    `<g data-dyn="keysFront">${PT.noseKeys(theta0).front}</g>`,
    `<g class="tp-holder" data-move="holder">`,
    holderAbove(),
    `<g data-dyn="cutBack">${live.back}</g>`,
    cutterBody(),
    `<g data-dyn="cutFront">${live.front}</g>`,
    `<g data-dyn="screw">${PT.arborScrew(theta0)}</g>`,
    `</g>`,
  ],
});

// ------------------------------------------------------------------ page ----
const DATA = {
  P,
  D,
  ZG,
  HEAD0,
  LIFT,
  HOLDER_IN_RACK,
  WHEEL_X,
  WHEEL_Z,
  SCREEN: { w: SCREEN.y1 - SCREEN.y0, h: SCREEN.z1 - SCREEN.z0 },
  DRO: { w: DRO.y1 - DRO.y0, h: DRO.z1 - DRO.z0 },
  EX: k.axisVector(P, [1, 0, 0]),
  EY: k.axisVector(P, [0, 1, 0]),
  EZ: k.axisVector(P, [0, 0, 1]),
};

const shell = readFileSync(SHELL, "utf8");
let head = shell.slice(0, shell.indexOf("</head>") + "</head>".length);
head = head.replace(/<title>[^<]*<\/title>/, "<title>Tool presetter</title>");
const PLATE_W = 640;
const SIDE_W = 556;
const SVG_W = PLATE_W - 44;
head = head
  .replace(/\.sl \.iso-figure\{[^}]*\}/, `.sl .iso-figure{margin:0;height:100%;display:grid;grid-template-columns:${PLATE_W}px ${SIDE_W}px;justify-content:center;align-items:center;gap:36px}`)
  .replace(/\.sl \.iso-plate\{width:[^}]*\}/, `.sl .iso-plate{width:${PLATE_W}px;padding:40px 22px}`)
  .replace(/\.sl \.iso-plate \.iso-svg\{[^}]*\}/, `.sl .iso-plate .iso-svg{width:${SVG_W}px;height:${((SVG_W * HEIGHT) / WIDTH).toFixed(1)}px}`);

const PAGE_CSS = readFileSync(join(HERE, "presetter.css"), "utf8");
const panel = readFileSync(join(HERE, "panel.html"), "utf8");
const latheSource = readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, solidOf, sphereOf, prismOf, circleOf, arcOf, ribsOf, dotsOf, radialOf, tangentOf, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf };})();\n`;
const kitSource = readFileSync(join(SKILL, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const modelScript = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${text}</span>`;
const body = `<body><main class="sl"><style>${PAGE_CSS}</style><figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", "Fig 4")}${corner("title", "Tool presetter")}${corner("hint", "Hover turns the holder · click swaps it")}${corner("readout", "turn the holder", " data-readout")}</div><div class="iso-stage tp-stage" tabindex="0" role="group" aria-label="Tool presetter. Move the pointer across the figure to turn the holder in the spindle; click or press Space to take the holder out to the rack and back. Left and right arrows turn it by 5 degrees, with Shift by 45.">${svg}</div></div>${panel}</figure></main><script type="module">${(kitSource + latheScript + modelScript + partsScript + LIVE).replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;

writeFileSync(OUT, head + body);
console.log("wrote", OUT, (head + body).length, "bytes");

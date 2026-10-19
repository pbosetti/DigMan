// Tool presetter: geometry. `makeParts(k, G, P, D)` is used by the build for
// the static art and inlined in the page for the parts that turn or change.
// World units are millimetres (the frame is compressed, the tool is true size):
// x toward the viewer (the column sits behind the spindle at −x), y to the
// left, z up. The spindle axis is the z axis; its gauge plane is at z = D.ZG.

export function makeParts(k, G, P, D) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const at = (p) => k.iso(p, P);
  const V = G.viewOf(P);
  const RAD = Math.PI / 180;
  const ZG = D.ZG;

  // the spindle frame turned by theta: angle 0 points at the column (−x)
  const spin = (theta, z = 0) => {
    const t = theta * RAD;
    return G.frameOf([0, 0, z], [0, 0, 1], [-Math.cos(t), -Math.sin(t), 0], [Math.sin(t), -Math.cos(t), 0]);
  };
  const radial = (F, deg) => G.radialOf(F, deg * RAD);
  const facing = (F, deg) => G.dot3(radial(F, deg), V);
  const depth = (p) => G.dot3(p, V);

  // ---- spindle: rotation ring ticks and finger knob --------------------
  function ringTicks(theta) {
    const R = D.RING.r - 1.2;
    const z = D.RING.z1;
    // radialTicks: angle 0 → −y, clockwise from above; our 0 is −x
    const from = (theta - 90) * RAD;
    const t = k.radialTicks(0, 0, R, 72, 6, z, [1.8, 3.6], P, from);
    const zero = k.radialTicks(0, 0, R, 1, 1, z, [5, 5], P, from);
    return Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) + Ln(zero.major, { tone: "hi" });
  }

  function ringKnob(theta) {
    const F = spin(theta);
    const p = G.pointOf(F, 0, D.RING.r - 7, 135 * RAD);
    const z = D.RING.z1;
    return S(k.cylinder(p[0], p[1], 3.6, z, 1.2, P, 20), { tone: "mid" }) + S(k.cylinder(p[0], p[1], 2.8, z + 1.2, 7, P, 20), { tone: "hi" }) + Ln(k.knurl(p[0], p[1], 2.8, z + 3, z + 8.2, 14, P, 0.3), { tone: "lo" });
  }

  function knobDepth(theta) {
    const p = G.pointOf(spin(theta), 0, D.RING.r - 7, 135 * RAD);
    return depth([p[0], p[1], D.RING.z1]);
  }

  // drive keys on the spindle nose, under the holder's slots
  function noseKeys(theta) {
    const out = [];
    for (const deg of [90, 270]) {
      const F = spin(theta + deg, D.NOSE.z1);
      const K = G.frameOf(F.o, [0, 0, 1], F.u, F.v);
      const half = 7.9;
      const box = G.prismOf(G.frameOf([0, 0, D.NOSE.z1], [0, 0, 1], F.u, F.v), [[21, -half], [31, -half], [31, half], [21, half]], 0, 6, P);
      out.push({ d: depth(G.pointOf(K, 3, 26, 0)), svg: S(box, { tone: "mid" }) + Dots([at(G.pointOf(K, 6, 26, 0))], { size: 0.5, tone: "lo" }) });
    }
    // a key on the far side of the bore sits behind the shank passing through it, a near one in front
    const sorted = out.sort((a, b) => a.d - b.d);
    return { back: sorted.filter((p) => p.d < 0).map((p) => p.svg).join(""), front: sorted.filter((p) => p.d >= 0).map((p) => p.svg).join("") };
  }

  // ---- holder: drive slots on the flange ---------------------------------
  function flangeSlots(theta) {
    const out = [];
    const r = D.FLANGE.r;
    const z0 = D.FLANGE.z0;
    for (const deg of [90, 270]) {
      const F = spin(theta + deg);
      const half = Math.asin(8.05 / r) / RAD;
      const a0 = -half;
      const a1 = half;
      if (facing(F, 0) < -0.05) continue;
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(G.pointOf(F, z0 + 1, r + 0.05, (a0 + ((a1 - a0) * i) / 8) * RAD));
      for (let i = 8; i >= 0; i--) pts.push(G.pointOf(F, z0 + 15, r + 0.05, (a0 + ((a1 - a0) * i) / 8) * RAD));
      // the slot runs through the flange: a recess with its two walls
      out.push(`<path class="tp-hole" d="${k.pathOf(pts.map(at), true)}"/>`);
      for (const a of [a0, a1]) out.push(Ln(k.pathOf([G.pointOf(F, z0 + 1, r + 0.05, a * RAD), G.pointOf(F, z0 + 15, r + 0.05, a * RAD)].map(at)), { tone: "lo" }));
    }
    return out.join("");
  }

  // ---- the shell mill: inserts, chip pockets, arbor screw ----------------
  function insertPaths(theta, index) {
    const ins = D.INSERTS[index];
    const F = spin(theta + ins.phi);
    const R = D.CUT.r + ins.dr;
    const zt = D.CUT.tip + ins.dz;
    // the insert lies in the plane of its rake face and trails it by its thickness
    const back = G.mul3(G.tangentOf(F, 0), -1);
    const IF = G.frameOf([0, 0, 0], back, F.u, [0, 0, 1]);
    // How much of the plate shows: all of it while its pocket faces the viewer,
    // shrinking smoothly to the part that stands proud of the body as the insert
    // turns toward the silhouette, so it never pops when it passes behind.
    const face = facing(F, 0);
    const t = Math.min(1, Math.max(0, face / 0.45));
    const open = t * t * (3 - 2 * t);
    const inner = D.CUT.body - 0.3 + (R - 9 - (D.CUT.body - 0.3)) * open;
    const poly = [[inner, zt - 16], [R, zt - 16], [R, zt - 0.6], [R - 0.6, zt], [inner, zt]];
    const paths = G.prismOf(IF, poly, 0, D.CUT.thick, P);
    const screw = G.pointOf(IF, -0.05, R - 4.6, 0);
    const mid = [screw[0], screw[1], zt - 8];
    return { d: depth(G.pointOf(F, zt - 5, R, 0)), face, open, paths, screw: [mid[0] - back[0] * 0.05, mid[1] - back[1] * 0.05, mid[2]] };
  }

  function pocket(theta, index) {
    const ins = D.INSERTS[index];
    const F = spin(theta + ins.phi);
    const r = D.CUT.r - 1.0;
    const z1 = D.CUT.top;
    const z0 = z1 - 21;
    const a0 = 0;
    const a1 = 34;
    const side = [];
    const steps = 10;
    // visible part of the gash on the body side
    const ok = (deg) => facing(F, deg) > 0.02;
    const span = [];
    for (let i = 0; i <= steps; i++) span.push(a0 + ((a1 - a0) * i) / steps);
    const seen = span.filter(ok);
    let svg = "";
    if (seen.length >= 2) {
      for (const deg of seen) side.push(G.pointOf(F, z0 + (deg / a1) * 9, r + 0.06, deg * RAD));
      for (const deg of [...seen].reverse()) side.push(G.pointOf(F, z1, r + 0.06, deg * RAD));
      svg += `<path class="tp-hole" d="${k.pathOf(side.map(at), true)}"/>`;
    }
    // the gash cut into the top face
    const top = [];
    for (let i = 0; i <= steps; i++) top.push(G.pointOf(F, z1 + 0.02, r + 0.06, (a0 + ((a1 - a0) * i) / steps) * RAD));
    top.push(G.pointOf(F, z1 + 0.02, r - 5, a1 * 0.45 * RAD));
    top.push(G.pointOf(F, z1 + 0.02, r - 5, a0 * RAD));
    svg += `<path class="tp-hole" d="${k.pathOf(top.map(at), true)}"/>`;
    return svg;
  }

  function cutterLive(theta) {
    const back = [];
    const front = [];
    let pockets = "";
    for (let i = 0; i < D.INSERTS.length; i++) {
      const it = insertPaths(theta, i);
      const svg = S(it.paths, { tone: "hi", lit: true, crease: "lo" }) + (it.open > 0.6 ? Dots([at(it.screw)], { size: 0.55, tone: "lo" }) : "");
      // behind the body when it faces away from the viewer
      (it.face < 0 ? back : front).push({ d: it.d, svg });
      // every pocket is drawn: it keeps only the part of its gash that faces the viewer
      pockets += pocket(theta, i);
    }
    back.sort((a, b) => a.d - b.d);
    front.sort((a, b) => a.d - b.d);
    return {
      back: back.map((p) => p.svg).join(""),
      front: pockets + front.map((p) => p.svg).join(""),
    };
  }

  function arborScrew(theta) {
    const z = D.CUT.top;
    const F = spin(theta, z);
    const hex = [];
    for (let i = 0; i < 6; i++) hex.push(G.pointOf(F, 0.05, 3.4, (i * 60 + 15) * RAD));
    return S(k.cylinder(0, 0, 8.2, z, 0.05, P, 40), { tone: "mid", crease: "none" }) + `<path class="tp-hole" d="${k.pathOf(hex.map(at), true)}"/>` + Ln(k.pathOf(hex.map(at), true), { tone: "lo" });
  }

  // ---- handwheels: spokes and handle turn --------------------------------
  function wheel(W, turn) {
    // W: { o, a } — the wheel sits on a face, axis a pointing out of it
    const F = G.frameAlong(W.o, W.a);
    const a0 = turn * 360;
    const parts = [];
    parts.push(S(G.ringBand(W.s + 3.2, W.s + 6.4, W.r - 3, W.r, F, P), { tone: "mid" }));
    for (let i = 0; i < 3; i++) {
      const deg = a0 + i * 120;
      const SF = G.frameOf(G.pointOf(F, W.s + 4.8, 0, 0), F.a, radial(F, deg), G.tangentOf(F, deg * RAD));
      parts.push(S(G.prismOf(G.frameOf(G.pointOf(F, 0, 0, 0), F.a, radial(F, deg), G.tangentOf(F, deg * RAD)), [[4.5, -1.1], [W.r - 2.6, -0.9], [W.r - 2.6, 0.9], [4.5, 1.1]], W.s + 3.8, W.s + 5.8, P), { tone: "mid" }));
      void SF;
    }
    parts.push(S(G.disc(W.s, W.s + 7, 5.2, F, P), { tone: "mid" }));
    parts.push(Ln(G.circleOf(F, W.s + 7, 2.2, P), { tone: "lo" }));
    const hp = G.pointOf(F, W.s + 6.4, W.r - 1.6, a0 * RAD);
    const HF = G.frameAlong(hp, F.a);
    parts.push(S(G.disc(0, 9, 2.1, HF, P), { tone: "hi" }));
    parts.push(S(G.sphereOf(G.pointOf(HF, 10.4, 0, 0), 2.6, P, { steps: 28 }), { tone: "hi" }));
    return parts.join("");
  }

  // ---- screen content, in the screen's own plane ---------------------------
  // field coordinates: u (mm) outward from the spindle axis, w (mm) up from the
  // gauge plane; shown with the tool on the left and its tip at the bottom.
  function fieldPath(corners, head, size, half) {
    // the union of the inserts' shadows, as a polygon in screen-box units
    const [hx, hz] = Array.isArray(half) ? half : [half, half];
    const toX = (u) => ((u - head.X + hx) / (2 * hx)) * size[0];
    const toY = (w) => ((head.Z + hz - w) / (2 * hz)) * size[1];
    const nose = D.NOSE_R;
    const shapes = [];
    for (const c of corners) {
      const pts = [];
      pts.push([toX(head.X - hx - 2), toY(head.Z - hz - 2)]);
      pts.push([toX(c.reach), toY(head.Z - hz - 2)]);
      for (let i = 0; i <= 6; i++) {
        const t = (i / 6) * (Math.PI / 2);
        pts.push([toX(c.reach - nose + nose * Math.cos(t)), toY(c.tip - nose + nose * Math.sin(t))]);
      }
      pts.push([toX(head.X - hx - 2), toY(c.tip)]);
      shapes.push(pts);
    }
    return shapes.map((pts) => "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z").join("");
  }

  return { spin, ringTicks, ringKnob, knobDepth, noseKeys, flangeSlots, cutterLive, arborScrew, wheel, fieldPath };
}

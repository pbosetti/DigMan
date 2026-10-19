
const DATA = __DATA__;
const { P, D } = DATA;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, fadedSvg, radialTicks, cylinder, knurl };
const PT = makeParts(K, G, P, D);
const stage = document.querySelector(".tp-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (sel) => document.querySelector(sel);
const dyn = Object.fromEntries([...document.querySelectorAll("[data-dyn]")].map((el) => [el.dataset.dyn, el]));
const move = Object.fromEntries([...svg.querySelectorAll("[data-move]")].map((el) => [el.dataset.move, el]));
const facts = Object.fromEntries([...document.querySelectorAll("[data-fact]")].map((el) => [el.dataset.fact, el]));
const swapButton = document.querySelector('[data-action="swap"]');

const H0 = DATA.HEAD0;
const ss = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const vec = (m) => [DATA.EX[0] * m[0] + DATA.EY[0] * m[1] + DATA.EZ[0] * m[2], DATA.EX[1] * m[0] + DATA.EY[1] * m[1] + DATA.EZ[1] * m[2]];

// ---- state ------------------------------------------------------------
const S = {
  theta: 0, // spindle angle, degrees (unbounded)
  thetaT: 0,
  hold: 0, // holder angle while it sits in the rack
  X: H0.X, Z: H0.Z, // coarse slides, as the scales read them
  h: 0, hT: 0, // holder path: 0 in the spindle, 1 in the rack
  wantMount: true,
  spin: null, // { to, rate } while turning a revolution
  peak: null,
  needReset: false,
  shown: {},
};

function holderAt(h) {
  const [rx, ry, rz] = DATA.HOLDER_IN_RACK;
  const lift = DATA.LIFT;
  if (h <= 0.33) return [0, 0, lift * ss(h / 0.33)];
  if (h <= 0.67) { const t = ss((h - 0.33) / 0.34); return [rx * t, ry * t, lift]; }
  return [rx, ry, lift + (rz - lift) * ss((h - 0.67) / 0.33)];
}

const seated = () => S.h === 0 && S.hT === 0;
const atHead = (T, tol = 1e-4) => Math.abs(S.X - T.X) < tol && Math.abs(S.Z - T.Z) < tol;
const ready = () => seated() && atHead(H0);
const holderTheta = () => (S.h > 0 || !S.wantMount ? S.hold : S.theta);

function resetPeak() {
  S.peak = null;
  S.needReset = false;
}

function trackPeak(from, to) {
  if (!ready()) return;
  const steps = Math.max(1, Math.ceil(Math.abs(to - from)));
  for (let i = 1; i <= steps; i++) S.peak = peakOf(S.peak, from + ((to - from) * i) / steps, H0);
}

// ---- drawing ------------------------------------------------------------
function setT(el, text) {
  if (el && el._t !== text) {
    el._t = text;
    if (text) el.setAttribute("transform", text);
    else el.removeAttribute("transform");
  }
}
function setHTML(name, html) {
  if (S.shown[name] !== html) {
    S.shown[name] = html;
    dyn[name].innerHTML = html;
  }
}
function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
function setFact(name, html) {
  if (facts[name] && S.shown["f" + name] !== html) {
    S.shown["f" + name] = html;
    facts[name].innerHTML = html;
  }
}
const tr = (v) => (Math.abs(v[0]) > 0.004 || Math.abs(v[1]) > 0.004 ? `translate(${v[0].toFixed(2)} ${v[1].toFixed(2)})` : "");

let drawn = { theta: null, hold: null, X: null, Z: null };
function draw() {
  // slides and holder
  setT(move.col, tr(vec([-(S.X - H0.X), 0, 0])));
  setT(move.car, tr(vec([0, 0, S.Z - H0.Z])));
  setT(move.beam, tr(vec([-(S.X - H0.X), 0, S.Z - H0.Z])));
  const beam = move.beam.querySelector(".tp-beamset");
  if (beam) S.h === 0 && atHead(H0, 0.6) ? beam.removeAttribute("data-off") : beam.setAttribute("data-off", "");
  const hp = holderAt(S.h);
  const hv = vec(hp);
  setT(move.holder, tr(hv));
  setT(move.shank, tr(hv));
  holdStill(move.shank, hv);

  // parts that turn
  const th = S.theta;
  if (drawn.theta === null || Math.abs(th - drawn.theta) > 0.05) {
    setHTML("ticks", PT.ringTicks(th));
    setHTML("knob", PT.ringKnob(th));
    const keys = PT.noseKeys(th);
    setHTML("keysBack", keys.back);
    setHTML("keysFront", keys.front);
    drawn.theta = th;
  }
  const ht = holderTheta();
  if (drawn.hold === null || Math.abs(ht - drawn.hold) > 0.05) {
    const cut = PT.cutterLive(ht);
    setHTML("cutBack", cut.back);
    setHTML("cutFront", cut.front);
    setHTML("slots", PT.flangeSlots(ht));
    setHTML("screw", PT.arborScrew(ht));
    drawn.hold = ht;
  }
  if (drawn.X === null || Math.abs(S.X - drawn.X) > 0.01) {
    setHTML("wheelX", PT.wheel(DATA.WHEEL_X, (S.X - H0.X) / 4));
    drawn.X = S.X;
  }
  if (drawn.Z === null || Math.abs(S.Z - drawn.Z) > 0.01) {
    setHTML("wheelZ", PT.wheel(DATA.WHEEL_Z, (S.Z - H0.Z) / 6));
    drawn.Z = S.Z;
  }

  // what the screen shows: the tool's shadow only while it sits in the spindle
  const head = { X: S.X, Z: S.Z };
  const corners = S.h === 0 ? shadowAt(ht, head) : [];
  const peak = S.peak && Number.isFinite(S.peak.R) && Number.isFinite(S.peak.L) ? S.peak : null;
  // screen on the machine (in its own plane: x along the glass, y down)
  const sw = DATA.SCREEN.w;
  const sh = DATA.SCREEN.h;
  const half = 0.5;
  const toX = (u) => ((u - head.X + half) / (2 * half)) * sw;
  const toY = (w) => ((head.Z + (half * sh) / sw - w) / ((2 * half * sh) / sw)) * sh;
  let screen = `<clipPath id="tp-glass-clip"><rect width="${sw}" height="${sh}"/></clipPath><g clip-path="url(#tp-glass-clip)">`;
  screen += `<path class="tp-shade" d="${PT.fieldPath(corners, head, [sw, sh], [half, (half * sh) / sw])}"/>`;
  screen += `<path class="tp-axis" d="M${sw / 2} 0V${sh}M0 ${sh / 2}H${sw}"/>`;
  if (peak) screen += `<path class="tp-cross" d="M${toX(peak.R).toFixed(2)} 0V${sh}M0 ${toY(peak.L).toFixed(2)}H${sw}"/>`;
  screen += `</g>`;
  setHTML("screen", screen);
  // DRO
  const dro = `<text class="tp-digits" x="2.4" y="7.6" font-size="5.6">X ${S.X.toFixed(3).padStart(8, " ")}</text><text class="tp-digits" x="2.4" y="15.4" font-size="5.6">Z ${S.Z.toFixed(3).padStart(8, " ")}</text>`;
  setHTML("dro", dro);

  // side panel screen
  const pX = (u) => ((u - head.X + half) / (2 * half)) * 200;
  const pY = (w) => ((head.Z + half - w) / (2 * half)) * 200;
  const shade = PT.fieldPath(corners, head, [200, 200], [half, half]);
  if (S.shown.panelShadow !== shade) {
    S.shown.panelShadow = shade;
    dyn.panelShadow.setAttribute("d", shade);
  }
  if (peak) {
    dyn.peak.style.display = "";
    const x = pX(peak.R);
    const y = pY(peak.L);
    dyn.peakLines.setAttribute("d", `M${x.toFixed(2)} 0V200M0 ${y.toFixed(2)}H200`);
    dyn.peakDot.setAttribute("cx", x.toFixed(2));
    dyn.peakDot.setAttribute("cy", y.toFixed(2));
  } else dyn.peak.style.display = "none";

  // facts and readout
  const deg = Math.round(((ht % 360) + 360) % 360);
  setFact("R", peak ? `${fmt(peak.R)} mm <small>insert ${peak.rFrom + 1}</small>` : "—");
  setFact("L", peak ? `${fmt(peak.L)} mm <small>insert ${peak.lFrom + 1}</small>` : "—");
  setFact("X", peak && ready() ? `${fmt(S.X)} <small>+ ${fmt(peak.R - S.X)} screen</small>` : fmt(S.X));
  setFact("Z", peak && ready() ? `${fmt(S.Z)} <small>+ ${fmt(peak.L - S.Z)} screen</small>` : fmt(S.Z));
  setFact("T", `ISO 40 · ${deg}°`);
  let text;
  if (S.h > 0 && S.h < 1) text = S.hT > S.h ? "to the rack" : "into the spindle";
  else if (S.h === 1) text = "holder in the rack";
  else if (!atHead(H0)) text = atHead(PARKED) ? "head parked" : "moving the slides";
  else if (peak) text = `R ${fmt(peak.R)} · L ${fmt(peak.L)} · ${deg}°`;
  else text = `turn the holder · ${deg}°`;
  setText(readout, text);
  swapButton.textContent = S.wantMount ? "Unmount holder" : "Mount holder";
}

// ---- motion -------------------------------------------------------------
const PARKED = { X: PARK.X, Z: PARK.Z };
function step(dt, calm) {
  // sequencing: the head clears the tool before the holder moves
  let headT = H0;
  if (!S.wantMount) {
    headT = PARKED;
    if (atHead(PARKED, 0.05)) S.hT = 1;
  } else if (S.h > 0 || S.hT > 0) {
    headT = PARKED;
    if (atHead(PARKED, 0.05)) {
      S.hT = 0;
      S.thetaT = S.theta + ((((S.hold - S.theta) % 360) + 540) % 360) - 180; // line the keys up with the slots
    }
  }
  if (S.hT === 0 && S.h === 0 && S.wantMount && !atHead(H0, 0.05)) S.needReset = true;

  const ease = (x, t, tau) => (calm ? t : x + (t - x) * (1 - Math.exp(-dt / tau)));
  const snap = (x, t, eps) => (Math.abs(t - x) < eps ? t : x);
  S.X = snap(ease(S.X, headT.X, 0.42), headT.X, 2e-4);
  S.Z = snap(ease(S.Z, headT.Z, 0.42), headT.Z, 2e-4);
  if (S.h !== S.hT) {
    const rate = 0.34;
    S.h = calm ? S.hT : S.h < S.hT ? Math.min(S.hT, S.h + rate * dt) : Math.max(S.hT, S.h - rate * dt);
  }
  if (S.h === 0 && S.wantMount) S.hold = S.theta;

  if (S.spin) {
    S.thetaT = Math.min(S.spin.to, S.thetaT + S.spin.rate * dt);
    if (calm) S.thetaT = S.spin.to;
    if (S.thetaT >= S.spin.to && Math.abs(S.theta - S.spin.to) < 0.02) S.spin = null;
  }
  const before = S.theta;
  S.theta = snap(ease(S.theta, S.thetaT, 0.12), S.thetaT, 0.01);
  if (S.needReset && ready()) resetPeak();
  if (ready()) {
    if (S.peak === null) S.peak = peakOf(null, S.theta, H0);
    trackPeak(before, S.theta);
  }
  return S.theta !== S.thetaT || S.h !== S.hT || !atHead(headT, 0) || S.spin !== null;
}

// ---- tour -----------------------------------------------------------------
let touring = !still.matches;
let tourStep = 0;
let tourClock = 0;
const TOUR = [
  { until: () => ready() },
  { start: () => resetPeak(), until: () => true },
  { start: () => turnOnce(40), until: () => S.spin === null },
  { wait: 2.6 },
  { start: () => request(false), until: () => S.h === 1 },
  { wait: 1.6 },
  { start: () => request(true), until: () => ready() },
  { wait: 0.6 },
];
function tour(dt) {
  const s = TOUR[tourStep];
  if (!s.begun) {
    s.begun = true;
    tourClock = 0;
    if (s.start) s.start();
  }
  tourClock += dt;
  const done = s.wait ? tourClock >= s.wait : s.until();
  if (done) {
    s.begun = false;
    tourStep = (tourStep + 1) % TOUR.length;
    if (tourStep === 0) tourStep = 1;
  }
}

function request(mount) {
  S.wantMount = mount;
  if (!mount) S.spin = null;
}
function turnOnce(rate = 60) {
  if (!S.wantMount || S.h > 0) return;
  S.thetaT = S.theta;
  S.spin = { to: S.theta + 360, rate };
}

// ---- loop -----------------------------------------------------------------
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tour(dt);
  const moving = step(dt, calm);
  draw();
  frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
function hand() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    TOUR.forEach((s) => (s.begun = false));
    tourStep = 0;
    run();
  }, 3600);
  run();
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  const want = share * 360;
  S.spin = null;
  S.thetaT = want + 360 * Math.round((S.theta - want) / 360);
  hand();
});
stage.addEventListener("click", () => {
  request(!S.wantMount);
  hand();
});
stage.addEventListener("keydown", (event) => {
  let delta = 0;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = event.shiftKey ? 45 : 5;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = event.shiftKey ? -45 : -5;
  if (delta) {
    event.preventDefault();
    S.spin = null;
    S.thetaT += delta;
    hand();
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    request(!S.wantMount);
    hand();
  }
});
document.querySelector(".sl-controls").addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "swap") request(!S.wantMount);
  if (action === "turn") turnOnce(60);
  if (action === "reset") resetPeak();
  hand();
});
if (still.matches) touring = false;
draw();

// Ondo 温度 pitch deck generator (pptxgenjs, structured deck).
// Run:  NODE_PATH=<dir with pptxgenjs, react, react-dom, react-icons, sharp> node deck/build_deck.js
// Then: python3 deck/add_motion.py deck/Ondo-Pitch.pptx   (transitions + entrance animations)
// Optional: LIVE_URL=https://<app>.emergent.host prints the live host on slide 10 and adds a QR code.
const path = require("path");
// Resolve dependencies from NODE_PATH first, so a stray node_modules above this folder cannot mix versions.
const NP = (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean);
const req = (m) => require(require.resolve(m, { paths: NP.length ? NP : [__dirname] }));
const pptxgen = req("pptxgenjs");
const React = req("react");
const RDS = req("react-dom/server");
const sharp = req("sharp");
const fa = req("react-icons/fa6");

const SKILL =
  process.env.PPTX_SKILL ||
  "/Users/moorthy/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/ee30dabd-ebd4-49d4-8f55-de0bb31f1cc7/91f3a213-1cb6-4602-88f2-558f8735f4c4/skills/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const OUT = path.join(__dirname, "Ondo-Pitch.pptx");
const LIVE_URL = (process.env.LIVE_URL || "https://heat-safe-onsen.emergent.host").trim();

// QR code PNG for the live URL (python3 "qrcode" package; the slide simply omits the QR if it is missing).
function qrPng(url) {
  try {
    const py = "import sys,io,base64,qrcode\nq=qrcode.QRCode(border=1,box_size=12)\nq.add_data(sys.argv[1])\nq.make(fit=True)\nb=io.BytesIO()\nq.make_image(fill_color='#0B0B0A',back_color='white').save(b,format='PNG')\nprint(base64.b64encode(b.getvalue()).decode())";
    const out = require("child_process").execFileSync("python3", ["-c", py, url], { encoding: "utf8" }).trim();
    return "image/png;base64," + out;
  } catch (e) { console.warn("QR skipped:", e.message); return null; }
}

// ---------- Brand: near-black canvas, ember-orange horizon glow, warm-white type ----------
const HEX = {
  bg: "0B0B0A", black: "000000", surf: "141412", surf2: "1B1A17", line: "2A2723",
  fg: "F5F2EC", muted: "A39E95",
  ember: "FF7A1A", emberHot: "FF5A1F", emberLight: "FFB067", emberDeep: "B5441A", glowDark: "2A1A12", glowMid: "E0712D",
  safe: "3DDC97", caution: "FFB020", danger: "FF4D3D", // risk semantics only (dials, chips, flags)
  barDim: "4A453F", white: "FFFFFF",
};
const THEME = {
  name: "Ondo Ember",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: HEX.bg, lt1: HEX.fg, dk2: HEX.surf2, lt2: HEX.muted,
    accent1: HEX.ember, accent2: HEX.caution, accent3: HEX.danger,
    accent4: HEX.safe, accent5: HEX.surf, accent6: HEX.line,
    hlink: HEX.ember, folHlink: HEX.emberLight,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Ondo: the AI that makes heat safe for every body";
pres.author = "Team V9";
pres.company = "Team V9";
pres.subject = "Speech to Ship hackathon pitch, Emergent HQ San Francisco, Nov 20 2026";

const C = pres.SchemeColor;
const K = {
  bg: C.text1, fg: C.background1, surf2: C.text2, muted: C.background2,
  ember: C.accent1, caution: C.accent2, danger: C.accent3, safe: C.accent4, surf: C.accent5, line: C.accent6,
};
const HEAD = "+mj-lt"; // theme heading font
const W = 13.333;

// ---------- helpers ----------
const shadow = (op = 0.35) => ({ type: "outer", color: HEX.black, opacity: op, blur: 12, offset: 3, angle: 90 });
const border = () => ({ color: K.line, width: 1 });

const ICON_CACHE = {};
async function iconPng(name, hexColor, size = 256) {
  const key = name + ":" + hexColor;
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const Comp = fa[name];
  if (!Comp) throw new Error("missing icon " + name);
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { size, color: "#" + hexColor }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return (ICON_CACHE[key] = "image/png;base64," + buf.toString("base64"));
}
const icon = (name, hex) => {
  const v = ICON_CACHE[name + ":" + hex];
  if (!v) throw new Error("icon not preloaded " + name + ":" + hex);
  return v;
};

async function svgPng(svg, width) {
  const buf = await sharp(Buffer.from(svg), { density: 144 }).resize({ width }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function mix(h1, h2, t) {
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16);
  const c = [0, 2, 4].map((i) => lerp(p(h1, i), p(h2, i), t).toString(16).padStart(2, "0"));
  return "#" + c.join("");
}
function emberAt(t) { // ember gradient: pale ember -> ember -> hot ember
  return t < 0.5 ? mix(HEX.emberLight, HEX.ember, t / 0.5) : mix(HEX.ember, HEX.emberHot, (t - 0.5) / 0.5);
}
function riskAt(t) { // risk semantics: safe -> caution -> danger
  return t < 0.5 ? mix(HEX.safe, HEX.caution, t / 0.5) : mix(HEX.caution, HEX.danger, (t - 0.5) / 0.5);
}
function polar(cx, cy, r, deg) { const a = (deg * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function arcSegments(cx, cy, r, a0, a1, sw, n, grad) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1.15)) / n;
    const [x0, y0] = polar(cx, cy, r, t0), [x1, y1] = polar(cx, cy, r, Math.min(t1, a1));
    s += `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}" stroke="${grad(i / (n - 1))}" stroke-width="${sw}" fill="none"/>`;
  }
  const [sx, sy] = polar(cx, cy, r, a0), [ex, ey] = polar(cx, cy, r, a1);
  s += `<circle cx="${sx}" cy="${sy}" r="${sw / 2}" fill="${grad(0)}"/><circle cx="${ex}" cy="${ey}" r="${sw / 2}" fill="${grad(1)}"/>`;
  return s;
}

// Horizon glow: black sky fading through dark ember to an orange horizon (slide backgrounds).
function horizonSvg(cx, cy, rx, ry, strength) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1125" viewBox="0 0 2000 1125">
  <defs><radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" gradientTransform="translate(${cx} ${cy}) scale(1 ${ry / rx}) translate(${-cx} ${-cy})">
    <stop offset="0" stop-color="#${HEX.glowMid}" stop-opacity="${strength}"/>
    <stop offset="0.28" stop-color="#${HEX.emberDeep}" stop-opacity="${strength * 0.75}"/>
    <stop offset="0.6" stop-color="#${HEX.glowDark}" stop-opacity="${strength * 0.85}"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="2000" height="1125" fill="#000000"/>
  <rect width="2000" height="1125" fill="url(#h)"/></svg>`;
}

// Hero arc: a 240° thermostat dial with ticks and rising steam, in the ember gradient.
function heroArcSvg() {
  const cx = 800, cy = 800, r = 600;
  let ticks = "";
  for (let i = 0; i <= 48; i++) {
    const a = 150 + (240 * i) / 48;
    const [x0, y0] = polar(cx, cy, r + 92, a), [x1, y1] = polar(cx, cy, r + (i % 6 === 0 ? 140 : 115), a);
    ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#${HEX.fg}" stroke-opacity="${i % 6 === 0 ? 0.55 : 0.2}" stroke-width="${i % 6 === 0 ? 7 : 4}" stroke-linecap="round"/>`;
  }
  const steam = [-110, 0, 110].map((dx, k) => {
    const x = cx + dx, y0 = 520, h = 210;
    return `<path d="M${x},${y0} C${x - 45},${y0 - h * 0.33} ${x + 45},${y0 - h * 0.66} ${x},${y0 - h}" stroke="#${HEX.fg}" stroke-opacity="${0.32 - k * 0.04}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600">
  <defs><radialGradient id="core" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#${HEX.glowMid}" stop-opacity="0.42"/>
    <stop offset="0.55" stop-color="#${HEX.glowDark}" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#${HEX.glowDark}" stop-opacity="0"/>
  </radialGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${r - 60}" fill="url(#core)"/>
  ${arcSegments(cx, cy, r, 150, 390, 64, 160, emberAt)}
  <g opacity="0.22">${arcSegments(cx, cy, r, 150, 390, 160, 160, emberAt)}</g>
  ${ticks}${steam}</svg>`;
}

// Risk dial for the phone mock: 180° gauge with a needle at score 80/100 (risk colours on a dark screen).
function dialSvg(score) {
  const cx = 500, cy = 470, r = 380;
  const a = 180 + (180 * score) / 100;
  const [nx, ny] = polar(cx, cy, r - 70, a);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="540" viewBox="0 0 1000 540">
  <path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" stroke="#${HEX.line}" stroke-width="96" fill="none"/>
  ${arcSegments(cx, cy, r, 180, 360, 90, 120, riskAt)}
  <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#${HEX.fg}" stroke-width="22" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="38" fill="#${HEX.fg}"/><circle cx="${cx}" cy="${cy}" r="14" fill="#${HEX.danger}"/></svg>`;
}

function text(slide, t, o) { slide.addText(t, Object.assign({ isTextBox: true, margin: 0, valign: "top" }, o)); }

// Motif: a dark ember-tinted disc with a thin ring and a glyph in the same colour.
const TONE = {
  ember: [K.ember, HEX.ember], light: [K.ember, HEX.emberLight], hot: [K.ember, HEX.emberHot],
  danger: [K.danger, HEX.danger], muted: [K.muted, HEX.muted],
};
function iconCircle(slide, name, x, y, d, tone, iconName, pad = 0.26) {
  const hex = TONE[tone][1];
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: hex, transparency: 82 }, line: { color: hex, width: 1.25 }, objectName: name + "-circle" });
  slide.addImage({ data: icon(iconName, hex), x: x + d * pad, y: y + d * pad, w: d * (1 - 2 * pad), h: d * (1 - 2 * pad), objectName: name + "-icon", altText: "" });
}

function pill(slide, name, t, x, y, w, h, o = {}) {
  slide.addText(t, Object.assign({
    isTextBox: true, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: h / 2, x, y, w, h,
    align: "center", valign: "middle", margin: 0, fontSize: 14, objectName: name,
  }, o));
}

function arrow(slide, name, x, y, w, h, color, o = {}) {
  slide.addShape(pres.shapes.LINE, Object.assign({
    x, y, w, h, line: { color, width: 2.25, endArrowType: "triangle" }, objectName: name,
  }, o));
}

// ---------- layouts ----------
const footer = (color) => ({ text: { text: "ONDO 温度  ·  Team V9  ·  Speech to Ship", options: { x: 0.6, y: 7.02, w: 6, h: 0.3, fontSize: 10, color, charSpacing: 1.5, margin: 0, valign: "middle" } } });
const kickerPh = (color) => ({ placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.42, w: 9, h: 0.3, fontSize: 12, bold: true, color, charSpacing: 5, margin: 0, valign: "top" }, text: "" } });
const titlePh = (color) => ({ placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.74, w: 12.13, h: 0.8, fontSize: 36, bold: true, color, margin: 0, valign: "top", align: "left" }, text: "" } });

// ---------- build ----------
(async () => {
  // icons, each in the colours it is used in
  const ICONS = {
    FaTemperatureArrowUp: [HEX.ember], FaPersonCane: [HEX.ember], FaHotTubPerson: [HEX.ember, HEX.emberHot],
    FaShip: [HEX.emberLight], FaSun: [HEX.ember], FaPills: [HEX.ember], FaBandage: [HEX.danger], FaDroplet: [HEX.ember],
    FaMicrophone: [HEX.ember], FaCloudSun: [HEX.ember], FaClipboardList: [HEX.ember], FaQrcode: [HEX.ember],
    FaDisplay: [HEX.ember, HEX.emberLight], FaMobileScreenButton: [HEX.ember], FaReact: [HEX.ember], FaServer: [HEX.ember],
    FaGears: [HEX.ember], FaBrain: [HEX.ember], FaMagnifyingGlass: [HEX.ember], FaDatabase: [HEX.muted],
    FaBolt: [HEX.bg], FaScaleBalanced: [HEX.ember], FaLanguage: [HEX.ember], FaHandsBubbles: [HEX.ember],
    FaSignHanging: [HEX.ember], FaUsers: [HEX.ember], FaRocket: [HEX.ember], FaSpa: [HEX.ember],
  };
  for (const [n, cols] of Object.entries(ICONS)) for (const c of cols) await iconPng(n, c);
  const hero = await svgPng(heroArcSvg(), 1400);
  const dial = await svgPng(dialSvg(80), 900);
  const horizonTitle = await svgPng(horizonSvg(1450, 1260, 1500, 760, 1), 2000);
  const horizonSoft = await svgPng(horizonSvg(1000, 1330, 1350, 520, 0.8), 2000);

  pres.defineSlideMaster({
    title: "Ondo Title",
    background: { data: horizonTitle },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.75, w: 6.6, h: 1.35, fontSize: 66, bold: true, color: K.fg, margin: 0, valign: "bottom", align: "left" }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: 0.6, y: 3.25, w: 6.3, h: 1.05, fontSize: 28, color: K.fg, margin: 0, valign: "top" }, text: "" } },
    ],
  });
  for (const [title, bg] of [
    ["Ondo Dark", { color: K.bg }],
    ["Ondo Glow", { data: horizonSoft }],
  ]) {
    pres.defineSlideMaster({
      title,
      background: bg,
      objects: [kickerPh(K.ember), titlePh(K.fg), footer(K.muted)],
      slideNumber: { x: 12.23, y: 7.02, w: 0.5, h: 0.3, fontSize: 10, color: K.muted, align: "right", valign: "middle", margin: 0 },
    });
  }

  function contentSlide(master, section, kicker, title) {
    const s = pres.addSlide({ masterName: master, sectionTitle: section });
    s.addText(kicker, { placeholder: "kicker" });
    s.addText(title, { placeholder: "title" });
    return s;
  }

  // ===== 1. Title =====
  pres.addSection({ title: "Opening" });
  {
    const s = pres.addSlide({ masterName: "Ondo Title", sectionTitle: "Opening" });
    // hero arc (square image, arc centre = image centre)
    const hx = 6.95, hy = 0.6, hw = 6.1;
    s.addImage({ data: hero, x: hx, y: hy, w: hw, h: hw, objectName: "hero-arc", altText: "Temperature dial glowing from pale ember to hot ember-orange" });
    const cx = hx + hw / 2, cy = hy + hw / 2;
    text(s, "温度", { x: cx - 1.6, y: cy - 0.55, w: 3.2, h: 1.2, fontSize: 80, color: K.fg, align: "center", valign: "middle", objectName: "hero-kanji" });
    text(s, "on·do  =  temperature", { x: cx - 1.6, y: cy + 0.72, w: 3.2, h: 0.35, fontSize: 14, color: K.muted, align: "center", charSpacing: 1, objectName: "hero-gloss" });
    // arc end labels (arc spans 150° -> 390°, radius 600/1600 of width)
    const R = (hw * 760) / 1600;
    const lab = (deg, t, hex, dx, dy) => {
      const [x, y] = polar(cx, cy, R, deg);
      text(s, t, { x: x - 0.55 + dx, y: y - 0.2 + dy, w: 1.1, h: 0.4, fontSize: 16, bold: true, color: hex, align: "center", fontFace: HEAD, objectName: "hero-lab-" + t });
    };
    lab(150, "22°C", HEX.emberLight, 0.05, 0.25);
    lab(270, "34°C", HEX.ember, 0, -0.05);
    lab(30, "41°C", HEX.emberHot, -0.05, 0.25);

    s.addText([
      { text: "ONDO", options: { charSpacing: 20 } },
      { text: "  温度", options: { fontSize: 26, bold: false, color: K.ember, charSpacing: 2 } },
    ], { placeholder: "title" });
    s.addText([{ text: "The AI that makes heat safe", options: { breakLine: true } }, { text: "for every body" }], { placeholder: "subtitle" });
    text(s, "Yu Pinang Onsen · Penang", { x: 0.6, y: 4.5, w: 6.2, h: 0.45, fontSize: 20, bold: true, color: K.ember, objectName: "venue" });
    text(s, "Built on Emergent · by voice with Willow · grounded by You.com", { x: 0.6, y: 5.05, w: 6.3, h: 0.4, fontSize: 16, color: K.muted, objectName: "sponsors" });
    pill(s, "team", "Team V9", 0.6, 6.2, 1.35, 0.42, { fontSize: 14, bold: true, color: K.fg, fill: { color: K.surf2 }, line: { color: K.ember, width: 1 }, charSpacing: 1 });
    text(s, "Speech to Ship · Emergent HQ San Francisco · Nov 20 2026", { x: 2.15, y: 6.2, w: 5, h: 0.42, fontSize: 12, color: K.fg, valign: "middle" });
    s.addNotes("Hi, we're Team V9. This is Ondo, which means temperature in Japanese. Ondo is the AI that makes heat safe for every body. Our first venue is Yu Pinang Onsen in Penang, for cruise passengers with one day in port. We built it on Emergent, by voice with Willow, grounded by You.com. (about 18 seconds)");
  }

  // ===== 2. Problem stats =====
  pres.addSection({ title: "Problem" });
  {
    const s = contentSlide("Ondo Dark", "Problem", "THE PROBLEM", "Heat is a silent, growing killer");
    const stats = [
      ["546,000", "heat-related deaths a year over the last decade", "Lancet Countdown 2025, via PIK Potsdam", "FaTemperatureArrowUp"],
      ["+167%", "heat deaths among people over 65 in 2023 vs the 1990s", "Lancet Countdown 2024", "FaPersonCane"],
      ["~19,000", "bathing-related deaths a year in Japan, mostly people over 65", "Consumer Affairs Agency, via nippon.com", "FaHotTubPerson"],
    ];
    stats.forEach(([n, l, src, ic], i) => {
      const x = 0.6 + i * 4.14, y = 1.95, w = 3.85, h = 4.2, g = `g${i + 1}u-stat${i}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.16, fill: { color: K.surf }, line: border(), objectName: g + "-card" });
      iconCircle(s, g, x + 0.4, y + 0.4, 0.95, "ember", ic);
      text(s, n, { x: x + 0.4, y: y + 1.6, w: w - 0.7, h: 1.05, fontSize: 56, bold: true, color: K.ember, fontFace: HEAD, valign: "middle", objectName: g + "-num" });
      text(s, l, { x: x + 0.4, y: y + 2.75, w: w - 0.7, h: 0.85, fontSize: 17, color: K.fg, objectName: g + "-label" });
      text(s, src, { x: x + 0.4, y: y + 3.68, w: w - 0.7, h: 0.3, fontSize: 10, color: K.muted, objectName: g + "-src" });
    });
    text(s, "Japan's official advice: keep bath water under 41°C and soaks to 10 minutes at most.", { x: 0.6, y: 6.38, w: 12.1, h: 0.4, fontSize: 16, italic: true, color: K.muted, objectName: "g4f-advice" });
    s.addNotes("Heat is a silent, growing killer. About 546,000 people die from heat every year. Heat deaths among people over 65 are up 167% since the 1990s. And Japan estimates around 19,000 bathing-related deaths a year, mostly older people. A hot bath is exactly where heat turns dangerous. (about 18 seconds)");
  }

  // ===== 3. Temperature journey =====
  {
    const s = contentSlide("Ondo Dark", "Problem", "WHY CRUISE GUESTS", "Cruise passengers are the highest-risk guests");
    const stops = [ // cool -> hot along the ember gradient
      ["22°C", "On the ship", "air-conditioned decks", HEX.emberLight, "FaShip", 86],
      ["34°C", "Ashore in Penang", "humid George Town", HEX.ember, "FaSun", 78],
      ["41°C", "Into the bath", "a hot onsen pool", HEX.emberHot, "FaHotTubPerson", 66],
    ];
    const cxs = [2.15, 6.67, 11.18], d = 2.05, cy = 3.05;
    stops.forEach(([t, h, sub, hex, ic, tr], i) => {
      const g = `g${i * 2 + 1}u-stop${i}`, x = cxs[i] - d / 2;
      s.addShape(pres.shapes.OVAL, { x, y: cy - d / 2, w: d, h: d, fill: { color: hex, transparency: tr }, line: { color: hex, width: 2.5 }, shadow: shadow(0.4), objectName: g + "-circle" });
      s.addImage({ data: icon(ic, hex), x: cxs[i] - 0.25, y: cy - d / 2 + 0.3, w: 0.5, h: 0.5, objectName: g + "-icon", altText: "" });
      text(s, t, { x, y: cy - 0.2, w: d, h: 0.75, fontSize: 44, bold: true, color: K.fg, align: "center", valign: "middle", fontFace: HEAD, objectName: g + "-t" });
      text(s, h, { x: cxs[i] - 1.5, y: cy + d / 2 + 0.18, w: 3, h: 0.4, fontSize: 20, bold: true, color: K.fg, align: "center", objectName: g + "-h" });
      text(s, sub, { x: cxs[i] - 1.5, y: cy + d / 2 + 0.58, w: 3, h: 0.35, fontSize: 14, color: K.muted, align: "center", objectName: g + "-sub" });
    });
    [["+12°C", 0], ["+7°C", 1]].forEach(([t, i]) => {
      const x0 = cxs[i] + d / 2 + 0.25, x1 = cxs[i + 1] - d / 2 - 0.25, g = `g${i * 2 + 2}w-arrow${i}`;
      arrow(s, g + "-line", x0, cy, x1 - x0, 0, K.muted, { line: { color: K.muted, width: 3, endArrowType: "triangle" } });
      pill(s, g + "-pill", t, (x0 + x1) / 2 - 0.6, cy - 0.68, 1.2, 0.42, { fontSize: 15, bold: true, color: K.ember, fill: { color: K.surf2 }, line: border() });
    });
    const risks = [
      ["Older guests", "often retired travellers", "FaPersonCane", "ember"],
      ["Heart and BP pills", "beta-blockers, diuretics", "FaPills", "ember"],
      ["Seasickness patch", "scopolamine stops sweating", "FaBandage", "danger"],
      ["Dehydrated", "days at sea, drinks packages", "FaDroplet", "ember"],
    ];
    risks.forEach(([h, b, ic, tone], i) => {
      const x = 0.6 + i * 3.11, y = 5.4, w = 2.81, hh = 1.3, g = `g7u-risk${i}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: hh, rectRadius: 0.12, fill: { color: K.surf }, line: i === 2 ? { color: K.danger, width: 1.5 } : border(), objectName: g + "-card" });
      iconCircle(s, g, x + 0.2, y + 0.3, 0.65, tone, ic);
      text(s, h, { x: x + 1.0, y: y + 0.22, w: w - 1.1, h: 0.36, fontSize: 16, bold: true, color: i === 2 ? K.danger : K.fg, objectName: g + "-h" });
      text(s, b, { x: x + 1.0, y: y + 0.6, w: w - 1.1, h: 0.6, fontSize: 14, color: K.muted, objectName: g + "-b" });
    });
    s.addNotes("Now think about cruise passengers. They're often older, on blood-pressure pills, beta-blockers or diuretics. Many wear a scopolamine seasickness patch, which stops sweating. They're dehydrated after days at sea. And in one day they go from a 22-degree ship, to 34-degree humid Penang, to a 41-degree bath. (about 20 seconds)");
  }

  // ===== 4. Margaret + staff =====
  {
    const s = contentSlide("Ondo Dark", "Problem", "TWO SIDES, NO SIGNAL", "One guest at risk, one team in the dark");
    // Margaret card
    const lx = 0.6, y = 1.9, w = 5.85, h = 4.85;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y, w, h, rectRadius: 0.16, fill: { color: K.surf }, line: border(), objectName: "g1u-m-card" });
    s.addShape(pres.shapes.OVAL, { x: lx + 0.4, y: y + 0.4, w: 1.05, h: 1.05, fill: { color: HEX.emberDeep }, line: { color: K.ember, width: 1.25 }, objectName: "g1u-m-avatar" });
    text(s, "M", { x: lx + 0.4, y: y + 0.4, w: 1.05, h: 1.05, fontSize: 40, bold: true, color: K.fg, align: "center", valign: "middle", fontFace: HEAD, objectName: "g1u-m-init" });
    text(s, "Margaret, 71", { x: lx + 1.7, y: y + 0.45, w: 3.9, h: 0.5, fontSize: 26, bold: true, color: K.fg, fontFace: HEAD, objectName: "g1u-m-name" });
    text(s, "Sydney · Navigator of the Seas · one day in port", { x: lx + 1.7, y: y + 0.98, w: 4.0, h: 0.35, fontSize: 14, color: K.muted, objectName: "g1u-m-sub" });
    text(s, "“I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak.”",
      { x: lx + 0.4, y: y + 1.75, w: w - 0.8, h: 1.25, fontSize: 18, italic: true, color: K.fg, objectName: "g2f-m-quote" });
    const mp = [["metoprolol · beta-blocker", K.caution], ["scopolamine patch · stops sweating", K.danger], ["wants a long 41°C soak", K.danger]];
    mp.forEach(([t, col], i) => {
      pill(s, `g3u-m-pill${i}`, t, lx + 0.4, y + 3.15 + i * 0.52, [3.0, 3.9, 2.9][i], 0.42, { fontSize: 14, bold: true, color: col, fill: { color: col, transparency: 84 }, line: { color: col, width: 0.75 } });
    });
    // Staff card
    const rx = 6.88;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y, w, h, rectRadius: 0.16, fill: { color: K.surf2 }, line: border(), objectName: "g4u-s-card" });
    iconCircle(s, "g4u-s", rx + 0.4, y + 0.4, 1.05, "ember", "FaUsers");
    text(s, "The onsen staff", { x: rx + 1.7, y: y + 0.45, w: 3.9, h: 0.5, fontSize: 26, bold: true, color: K.fg, fontFace: HEAD, objectName: "g4u-s-name" });
    text(s, "Yu Pinang Onsen · Penang", { x: rx + 1.7, y: y + 0.98, w: 3.9, h: 0.35, fontSize: 14, color: K.muted, objectName: "g4u-s-sub" });
    const hello = ["Hello", "こんにちは", "你好", "Hola", "Bonjour", "안녕하세요", "Selamat", "Hallo", "Ciao", "Olá", "Привет", "Merhaba"];
    hello.forEach((t, i) => {
      const c = i % 4, r = Math.floor(i / 4);
      pill(s, `g5f-s-hello${i}`, t, rx + 0.4 + c * 1.29, y + 1.72 + r * 0.52, 1.17, 0.4, { fontSize: 14, color: K.fg, fill: { color: K.bg }, line: border() });
    });
    const facts = [["FaLanguage", "20 languages at the door"], ["FaHandsBubbles", "Wet hands, no time to type"], ["FaSignHanging", "Today's safety plan: a sign"]];
    facts.forEach(([ic, t], i) => {
      const fy = y + 3.4 + i * 0.47;
      s.addImage({ data: icon(ic, HEX.ember), x: rx + 0.45, y: fy + 0.04, w: 0.3, h: 0.3, objectName: `g6u-s-fi${i}`, altText: "" });
      text(s, t, { x: rx + 0.95, y: fy, w: 4.5, h: 0.38, fontSize: 16, color: K.fg, valign: "middle", objectName: `g6u-s-ft${i}` });
    });
    s.addNotes("Meet Margaret. She's 71, from Sydney, takes metoprolol, and put on a seasickness patch this morning. She wants a long hot soak and has no idea that's risky. The onsen can't know either: twenty languages at the door, wet hands, and a laminated sign. (about 17 seconds)");
  }

  // ===== 5. Product flow =====
  pres.addSection({ title: "Product" });
  {
    const s = contentSlide("Ondo Dark", "Product", "THE PRODUCT", "From one spoken sentence to a safe soak");
    const steps = [
      ["Just talk", "Willow voice", "Hold fn and speak, in any language. Ondo turns it into editable profile chips.", "FaMicrophone", "ember"],
      ["Live heat", "You.com Search", "George Town's live temperature, humidity and heat index.", "FaCloudSun", "ember"],
      ["Soak Prescription", "Rules engine", "Bath, max °C, minutes, rounds and water. Red flags carry cited evidence.", "FaClipboardList", "ember"],
      ["Soak Pass", "Guided soak", "QR pass, a timer with spoken check-ins, and an “I feel unwell” button.", "FaQrcode", "ember"],
      ["Staff Safety Console", "Every guest, live", "Everyone in the water against their personal limit, with alerts.", "FaDisplay", "light"],
    ];
    const cw = 2.2, gap = (12.13 - 5 * cw) / 4, d = 1.3, cy = 3.0;
    steps.forEach(([h, tag, desc, ic, tone], i) => {
      const x = 0.6 + i * (cw + gap), cx = x + cw / 2, g = `g${i + 1}u-step${i}`;
      const hex = TONE[tone][1];
      if (i > 0) {
        const px = 0.6 + (i - 1) * (cw + gap) + cw / 2 + d / 2 + 0.12;
        arrow(s, g + "-arrow", px, cy, cx - d / 2 - 0.12 - px, 0, K.muted);
      }
      iconCircle(s, g, cx - d / 2, cy - d / 2, d, tone, ic, 0.27);
      pill(s, g + "-num", String(i + 1), cx - d / 2 - 0.08, cy - d / 2 - 0.08, 0.44, 0.44, { fontSize: 14, bold: true, color: K.bg, fill: { color: hex } });
      text(s, h, { x, y: 3.9, w: cw, h: 0.42, fontSize: 18, bold: true, color: K.fg, align: "center", objectName: g + "-h" });
      pill(s, g + "-tag", tag, cx - 0.85, 4.37, 1.7, 0.36, { fontSize: 12, bold: true, color: hex, fill: { color: hex, transparency: 85 }, line: { color: hex, width: 0.75 } });
      text(s, desc, { x: x + 0.05, y: 4.9, w: cw - 0.1, h: 1.1, fontSize: 14, color: K.muted, align: "center", objectName: g + "-d" });
    });
    // side labels
    const gx0 = 0.6, gx1 = 0.6 + 3 * (cw + gap) + cw, sx0 = 0.6 + 4 * (cw + gap);
    s.addShape(pres.shapes.LINE, { x: gx0 + 0.2, y: 6.15, w: gx1 - gx0 - 0.4, h: 0, line: { color: K.ember, width: 1.5 }, objectName: "g6f-guest-line" });
    text(s, "On the guest's phone", { x: gx0, y: 6.25, w: gx1 - gx0, h: 0.35, fontSize: 14, bold: true, color: K.ember, align: "center", charSpacing: 1, objectName: "g6f-guest-lab" });
    s.addShape(pres.shapes.LINE, { x: sx0 + 0.2, y: 6.15, w: cw - 0.4, h: 0, line: { color: HEX.emberLight, width: 1.5 }, objectName: "g6f-staff-line" });
    text(s, "At the onsen desk", { x: sx0, y: 6.25, w: cw, h: 0.35, fontSize: 14, bold: true, color: HEX.emberLight, align: "center", charSpacing: 1, objectName: "g6f-staff-lab" });
    s.addNotes("Ondo fixes both sides. The guest just talks, in any language, with Willow. Ondo checks Penang's live heat on You.com. A deterministic rules engine writes a personal Soak Prescription. The guest gets a Soak Pass with a guided, spoken timer. And staff see every guest on one console. (about 18 seconds)");
  }

  // ===== 6. The wow =====
  {
    const s = contentSlide("Ondo Glow", "Product", "THE WOW MOMENT", "20 seconds of speech, one heat stroke prevented");
    // phone (dark app UI)
    const px = 0.75, py = 1.75, pw = 3.45, ph = 5.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: py, w: pw, h: ph, rectRadius: 0.38, fill: { color: K.surf2 }, line: { color: K.line, width: 1.5 }, shadow: shadow(0.5), objectName: "g1f-phone-frame" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px + 0.14, y: py + 0.16, w: pw - 0.28, h: ph - 0.32, rectRadius: 0.26, fill: { color: K.bg }, objectName: "g1f-phone-screen" });
    const sx = px + 0.32, sw = pw - 0.64;
    text(s, "Margaret · 71 · Sydney", { x: sx, y: py + 0.34, w: sw, h: 0.3, fontSize: 12, bold: true, color: K.fg, objectName: "g1f-phone-head" });
    text(s, "Live · You.com  ·  Penang 34°C", { x: sx, y: py + 0.62, w: sw, h: 0.25, fontSize: 10, color: K.muted, objectName: "g1f-phone-live" });
    s.addImage({ data: dial, x: sx + 0.2, y: py + 0.95, w: sw - 0.4, h: (sw - 0.4) * 0.54, objectName: "g2f-dial", altText: "Risk dial pointing to red, score 70" });
    text(s, "80 · HIGH RISK", { x: sx, y: py + 2.3, w: sw, h: 0.42, fontSize: 22, bold: true, color: K.danger, align: "center", fontFace: HEAD, charSpacing: 1, objectName: "g2f-score" });
    // red flag card
    const fy = py + 2.8;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx - 0.05, y: fy, w: sw + 0.1, h: 1.3, rectRadius: 0.1, fill: { color: K.danger, transparency: 86 }, line: { color: K.danger, width: 1.25 }, objectName: "g3u-flag-card" });
    text(s, "RED FLAG · SCOPOLAMINE PATCH", { x: sx + 0.07, y: fy + 0.08, w: sw - 0.1, h: 0.22, fontSize: 10, bold: true, color: K.danger, charSpacing: 1, objectName: "g3u-flag-h" });
    text(s, "Your patch stops you sweating. In a 41°C bath on a 34°C day, that can cause heat stroke in minutes.", { x: sx + 0.07, y: fy + 0.32, w: sw - 0.14, h: 0.7, fontSize: 11, color: K.fg, objectName: "g3u-flag-t" });
    pill(s, "g3u-cite1", "You.com [1]", sx + 0.07, fy + 0.97, 0.95, 0.26, { fontSize: 10, bold: true, color: K.ember, fill: { color: K.ember, transparency: 84 } });
    pill(s, "g3u-cite2", "You.com [2]", sx + 1.1, fy + 0.97, 0.95, 0.26, { fontSize: 10, bold: true, color: K.ember, fill: { color: K.ember, transparency: 84 } });
    // prescription (safe)
    const ry = fy + 1.4;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx - 0.05, y: ry, w: sw + 0.1, h: 0.62, rectRadius: 0.1, fill: { color: K.safe, transparency: 86 }, line: { color: K.safe, width: 1 }, objectName: "g4u-rx-card" });
    text(s, "Jade bath · 38°C · 6 min × 2", { x: sx + 0.07, y: ry + 0.06, w: sw - 0.1, h: 0.3, fontSize: 13, bold: true, color: K.safe, objectName: "g4u-rx-t" });
    text(s, "Not medical advice · staff will check on you", { x: sx + 0.07, y: ry + 0.36, w: sw - 0.1, h: 0.24, fontSize: 10, color: K.muted, objectName: "g4u-rx-n" });

    // arrow phone -> console
    arrow(s, "g5w-link", px + pw + 0.12, 3.62, 0.72, 0, K.ember, { line: { color: K.ember, width: 3, endArrowType: "triangle" } });
    text(s, "live", { x: px + pw + 0.1, y: 3.22, w: 0.76, h: 0.3, fontSize: 12, bold: true, color: K.ember, align: "center", charSpacing: 2, objectName: "g5w-link-lab" });

    // console
    const cx = 5.15, cy = 1.75, cw = 7.58, ch = 4.15;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.16, fill: { color: K.surf }, line: border(), shadow: shadow(0.5), objectName: "g5u-con-frame" });
    text(s, "Staff Safety Console · Yu Pinang Onsen", { x: cx + 0.3, y: cy + 0.22, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: K.fg, objectName: "g5u-con-h" });
    pill(s, "g5u-con-heat", "Penang 34°C · Live · You.com", cx + cw - 2.85, cy + 0.2, 2.55, 0.36, { fontSize: 11, bold: true, color: K.bg, fill: { color: K.ember } });
    const cols = [["GUEST", 0.3], ["BATH", 2.25], ["TIME VS LIMIT", 3.85], ["FLAGS", 5.35]];
    cols.forEach(([t, ox]) => text(s, t, { x: cx + ox + (t === "GUEST" ? 0.28 : 0), y: cy + 0.75, w: 2.0, h: 0.22, fontSize: 10, bold: true, color: K.muted, charSpacing: 2, objectName: "g5u-con-col-" + t.slice(0, 4) }));
    const rows = [
      ["Margaret, 71", "Jade 38°C", 0.34, "2:00 / 6:00", ["patch", "β-blocker"], K.danger, true],
      ["Mr. Tanaka, 68", "Rotenburo 40°C", 0.7, "5:40 / 8:00", ["warfarin"], K.caution, false],
      ["Chen family", "Family 38°C", 0.6, "3:00 / 5:00", ["child 6"], K.safe, false],
      ["David, 52", "Foot bath only", 0.2, "no hot bath", ["3 beers"], K.danger, false],
    ];
    rows.forEach(([n, b, frac, tl, flags, col, hot], i) => {
      const y = cy + 1.08 + i * 0.68, g = hot ? "g6u-row" + i : "g5u-row" + i;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx + 0.18, y, w: cw - 0.36, h: 0.58, rectRadius: 0.08,
        fill: { color: hot ? K.danger : K.surf2, transparency: hot ? 80 : 0 }, line: hot ? { color: K.danger, width: 1.5 } : undefined, objectName: g + "-bg" });
      s.addShape(pres.shapes.OVAL, { x: cx + 0.33, y: y + 0.19, w: 0.2, h: 0.2, fill: { color: col }, objectName: g + "-dot" });
      text(s, n, { x: cx + 0.62, y, w: 1.7, h: 0.58, fontSize: 13, bold: true, color: K.fg, valign: "middle", objectName: g + "-n" });
      text(s, b, { x: cx + 2.25, y, w: 1.55, h: 0.58, fontSize: 12, color: K.fg, valign: "middle", objectName: g + "-b" });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx + 3.85, y: y + 0.16, w: 1.15, h: 0.13, rectRadius: 0.06, fill: { color: K.line }, objectName: g + "-barbg" });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx + 3.85, y: y + 0.16, w: Math.max(0.13, 1.15 * frac), h: 0.13, rectRadius: 0.06, fill: { color: col }, objectName: g + "-bar" });
      text(s, tl, { x: cx + 3.85, y: y + 0.31, w: 1.4, h: 0.22, fontSize: 10, color: K.muted, objectName: g + "-tl" });
      let fx = cx + 5.35;
      flags.forEach((f, j) => {
        const fw = 0.22 + f.length * 0.085;
        pill(s, `${g}-flag${j}`, f, fx, y + 0.15, fw, 0.28, { fontSize: 10, bold: true, color: col, fill: { color: col, transparency: 82 } });
        fx += fw + 0.08;
      });
    });
    // heat spike callout
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: 6.1, w: cw, h: 0.75, rectRadius: 0.12, fill: { color: K.ember }, objectName: "g7u-spike-card" });
    s.addImage({ data: icon("FaBolt", HEX.bg), x: cx + 0.28, y: 6.29, w: 0.37, h: 0.37, objectName: "g7u-spike-icon", altText: "" });
    text(s, [{ text: "Then the heat index spikes to 46°C: ", options: { bold: true } }, { text: "every guest's limit tightens, live." }],
      { x: cx + 0.85, y: 6.1, w: cw - 1.1, h: 0.75, fontSize: 16, color: K.bg, valign: "middle", objectName: "g7u-spike-t" });
    s.addNotes("Here's the moment. Margaret talks for twenty seconds and the dial swings to red. Her patch stops her sweating; in a 41-degree bath on a 34-degree day, that can mean heat stroke in minutes. Ondo moves her to the 38-degree Jade bath for two short six-minute rounds, with You.com sources, and her name lights up on the staff console. Then the heat index spikes to 46 and every limit tightens live. (about 25 seconds)");
  }

  // ===== 7. Architecture =====
  pres.addSection({ title: "Technology" });
  {
    const s = contentSlide("Ondo Dark", "Technology", "HOW IT'S BUILT", "Rules decide, the LLM explains");
    const box = (g, x, y, w, h, ic, tone, head, sub) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: K.surf }, line: border(), objectName: g + "-box" });
      iconCircle(s, g, x + 0.2, y + (h - 0.62) / 2 > 0.25 && h > 1.6 ? y + 0.25 : y + (h - 0.62) / 2, 0.62, tone, ic);
      const tall = h > 1.6;
      const tx = tall ? x + 0.2 : x + 0.98, ty = tall ? y + 1.02 : y + (h - 0.62) / 2 - 0.02, tw = tall ? w - 0.4 : w - 1.1;
      text(s, head, { x: tx, y: ty, w: tw, h: 0.32, fontSize: 15, bold: true, color: K.fg, objectName: g + "-h" });
      text(s, sub, { x: tx, y: ty + 0.33, w: tw, h: tall ? 1.4 : 0.36, fontSize: 12, color: K.muted, objectName: g + "-s" });
    };
    // container
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.45, y: 1.72, w: 5.75, h: 3.95, rectRadius: 0.16, fill: { color: K.ember, transparency: 94 }, line: { color: K.ember, width: 1.25, dashType: "dash" }, objectName: "g2f-host" });
    text(s, "Deployed on emergent.host", { x: 3.7, y: 1.82, w: 4, h: 0.3, fontSize: 12, bold: true, color: K.ember, charSpacing: 1, objectName: "g2f-host-lab" });
    box("g1u-guest", 0.6, 2.25, 2.5, 1.1, "FaMobileScreenButton", "ember", "Guest phone", "talks with Willow");
    box("g1u-staff", 0.6, 4.25, 2.5, 1.1, "FaDisplay", "light", "Staff console", "tablet at the desk");
    box("g2u-react", 3.75, 2.25, 2.3, 3.1, "FaReact", "ember", "React app", "Just talk intake, Soak Prescription, Soak Pass and guided timer, Staff Safety Console");
    box("g3u-api", 6.6, 2.25, 2.3, 3.1, "FaServer", "ember", "FastAPI", "Intake, prescription, bookings and alerts. API keys stay server-side.");
    arrow(s, "g2w-a1", 3.12, 2.8, 0.6, 0, K.muted);
    arrow(s, "g2w-a2", 3.12, 4.8, 0.6, 0, K.muted);
    arrow(s, "g3w-a3", 6.07, 3.8, 0.5, 0, K.muted);
    const right = [
      ["g4u-rules", "FaGears", "ember", "Rules engine", "deterministic, unit-tested"],
      ["g5u-llm", "FaBrain", "ember", "Emergent LLM", "Claude Sonnet 5.5"],
      ["g6u-you", "FaMagnifyingGlass", "ember", "You.com", "Search (knowledge) + Answer"],
      ["g7u-db", "FaDatabase", "muted", "MongoDB", "profiles, bookings, cache"],
    ];
    right.forEach(([g, ic, tone, h, sub], i) => {
      const y = 1.9 + i * 0.95;
      box(g, 9.6, y, 3.13, 0.82, ic, tone, h, sub);
      const ty = y + 0.41;
      s.addShape(pres.shapes.LINE, { x: 8.92, y: Math.min(3.8, ty), w: 0.66, h: Math.abs(ty - 3.8), flipV: ty < 3.8, line: { color: K.muted, width: 1.75, endArrowType: "triangle" }, objectName: g + "-arrow" });
    });
    // callout
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.95, w: 12.13, h: 0.82, rectRadius: 0.12, fill: { color: K.ember, transparency: 86 }, line: { color: K.ember, width: 1 }, objectName: "g8u-call-card" });
    s.addImage({ data: icon("FaScaleBalanced", HEX.ember), x: 0.88, y: 6.17, w: 0.38, h: 0.38, objectName: "g8u-call-icon", altText: "" });
    text(s, [{ text: "Rules decide, the LLM explains. ", options: { bold: true, color: K.ember } }, { text: "Every safety number comes from tested code; the LLM reads speech and explains it in the guest's language." }],
      { x: 1.45, y: 5.95, w: 11.1, h: 0.82, fontSize: 16, color: K.fg, valign: "middle", objectName: "g8u-call-t" });
    s.addNotes("Under the hood: React and FastAPI with MongoDB, deployed on emergent.host. The key choice: rules decide, the LLM explains. Every safety number comes from a unit-tested rules engine. Claude Sonnet 5.5, through Emergent's Universal key, reads speech and explains in the guest's language. You.com supplies live heat and cited evidence. Ondo gives safety guidance, not medical advice. (about 20 seconds)");
  }

  // ===== 8. Business model =====
  pres.addSection({ title: "Business" });
  {
    const s = contentSlide("Ondo Dark", "Business", "BUSINESS MODEL", "Four revenue layers, one safety engine");
    const layers = [ // bottom -> top: bright horizon fading to dark sky
      ["Venues · per-guest SaaS", "Onsen, spas, saunas and thermal baths", { color: K.ember }, undefined, K.bg, "NOW"],
      ["Insurers · premium sharing", "Lower premiums for venues on Ondo; we share the saving", { color: HEX.glowMid }, undefined, K.bg, ""],
      ["Cruise lines · licensing", "Ship spas, medical centres and shore excursions", { color: HEX.emberDeep }, undefined, K.fg, ""],
      ["Consumers and employers", "Heat-safety plans for over-65s; outdoor-worker compliance", { color: HEX.glowDark }, { color: HEX.emberDeep, width: 1.25 }, K.fg, "NEXT"],
    ];
    layers.forEach(([h, b, fill, line, tc, tag], i) => {
      const w = 4.55 + i * 0.6, hh = 1.0, y = 5.72 - i * (hh + 0.14), g = `g${i + 1}u-layer${i}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w, h: hh, rectRadius: 0.12, fill, line, shadow: shadow(0.4), objectName: g + "-bar" });
      text(s, h, { x: 0.9, y: y + 0.14, w: w - 1.5, h: 0.36, fontSize: 18, bold: true, color: tc, objectName: g + "-h" });
      text(s, b, { x: 0.9, y: y + 0.52, w: w - 0.5, h: 0.36, fontSize: 14, color: tc, objectName: g + "-b" });
      if (tag) pill(s, g + "-tag", tag, 0.6 + w - 1.0, y + 0.14, 0.8, 0.32, { fontSize: 11, bold: true, color: K.ember, fill: { color: K.bg }, charSpacing: 2 });
    });
    // price callout card
    const x = 7.95, y = 2.3, w = 4.78, h = 4.42;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.16, fill: { color: K.surf }, line: border(), objectName: "g5u-price-card" });
    iconCircle(s, "g5u-price", x + 0.4, y + 0.4, 0.8, "ember", "FaSpa");
    text(s, "US$0.50–1", { x: x + 0.4, y: y + 1.4, w: w - 0.8, h: 0.95, fontSize: 50, bold: true, color: K.ember, fontFace: HEAD, valign: "middle", objectName: "g5u-price-n" });
    text(s, "per guest, or a monthly venue plan", { x: x + 0.4, y: y + 2.4, w: w - 0.8, h: 0.4, fontSize: 18, bold: true, color: K.fg, objectName: "g5u-price-l" });
    text(s, "It replaces a laminated sign and a liability gap with a personal limit for every guest, and an audit trail insurers can price.", { x: x + 0.4, y: y + 2.95, w: w - 0.8, h: 1.2, fontSize: 15, color: K.muted, objectName: "g5u-price-d" });
    s.addNotes("The business: venues pay per guest, about fifty cents to a dollar, or a monthly plan, replacing a laminated sign and a liability gap. Insurers lower premiums for venues on Ondo, and we share that saving. Cruise lines license it for ship spas and medical centres. Next come consumers and employers. (about 18 seconds)");
  }

  // ===== 9. Trillion-dollar path =====
  {
    const s = contentSlide("Ondo Glow", "Business", "THE TRILLION-DOLLAR PATH", "From one onsen to a climate-health category");
    const cx = 3.35, bottom = 6.88;
    const rings = [ // inner -> outer: a hot core cooling to a deep-ember horizon
      [0.62, HEX.emberLight, 0, "Wedge: one Penang onsen", "Prove cruise guests soak more safely, stay longer and spend more"],
      [1.22, HEX.ember, 82, "Thermal venues worldwide", "Japan's ~27,000 onsen facilities, plus saunas, spas, thermal baths and cruise spas"],
      [1.84, HEX.emberHot, 88, "Personal heat safety", "One engine for older adults, outdoor workers, athletes and travellers: billions face dangerous heat"],
      [2.45, HEX.emberDeep, 80, "The health layer of climate adaptation", "Where the ~US$6T+ wellness economy meets health insurance and climate resilience"],
    ];
    // draw outer first so inner sits on top
    [...rings].reverse().forEach(([r, col, tr], k) => {
      const i = 3 - k, g = `g${i + 1}f-ring${i}`;
      s.addShape(pres.shapes.OVAL, { x: cx - r, y: bottom - 2 * r, w: 2 * r, h: 2 * r, fill: { color: col, transparency: tr }, line: { color: col, width: 2.25 }, objectName: g + "-o" });
    });
    rings.forEach(([r, col, tr, h, b], i) => {
      const top = bottom - 2 * r, g = `g${i + 1}f-ring${i}`, ly = top;
      pill(s, g + "-num", String(i + 1), cx - 0.21, top - 0.02, 0.42, 0.42, { fontSize: 14, bold: true, color: K.bg, fill: { color: K.fg } });
      s.addShape(pres.shapes.LINE, { x: cx + 0.28, y: ly + 0.19, w: 6.55 - cx - 0.28 - 0.15, h: 0, line: { color: K.muted, width: 1, dashType: "sysDot" }, objectName: g + "-lead" });
      text(s, h, { x: 6.55, y: ly - 0.04, w: 6.2, h: 0.4, fontSize: 20, bold: true, color: i === 3 ? K.ember : K.fg, objectName: g + "-h" });
      text(s, b, { x: 6.55, y: ly + 0.36, w: 6.2, h: 0.62, fontSize: 14, color: K.muted, objectName: g + "-b" });
    });
    s.addNotes("And this scales. One Penang onsen is the wedge. Then thermal venues worldwide, starting with Japan's roughly 27,000 onsen facilities, plus saunas, spas and cruise spas. Then personal heat safety for anyone. The category is the health layer of climate adaptation, next to a six-trillion-dollar wellness economy. (about 18 seconds)");
  }

  // ===== 10. Validation + close =====
  pres.addSection({ title: "Close" });
  {
    const s = contentSlide("Ondo Dark", "Close", "VALIDATION", "Pressure-tested before we built it");
    text(s, "~70 simulated judges, modelled on this panel", { x: 0.6, y: 1.72, w: 6.2, h: 0.4, fontSize: 18, bold: true, color: K.ember, objectName: "g1f-agents" });
    const flow = [["30 ideas", 1.45], ["4 pods", 1.2], ["10 finalists", 1.6]];
    let fx = 0.6;
    flow.forEach(([t, w], i) => {
      pill(s, "g1f-flow" + i, t, fx, 2.2, w, 0.42, { fontSize: 14, bold: true, color: K.fg, fill: { color: K.surf2 }, line: border() });
      fx += w;
      if (i < 2) { arrow(s, "g1f-flowa" + i, fx + 0.08, 2.41, 0.36, 0, K.muted); fx += 0.52; }
    });
    s.addChart(pres.charts.BAR, [{ name: "Finals average (out of 5)", labels: ["LastCall", "SoakClock", "SoakRx → Ondo", "YuTurn", "ShipDrop"], values: [4.39, 4.15, 3.89, 3.83, 3.72] }], {
      x: 0.45, y: 2.8, w: 6.35, h: 2.65, barDir: "bar", catAxisOrientation: "maxMin", barGapWidthPct: 45,
      chartColors: [HEX.barDim, HEX.barDim, HEX.ember, HEX.barDim, HEX.barDim],
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", dataLabelColor: K.fg, dataLabelFontSize: 12, dataLabelFontFace: "+mn-lt", dataLabelFontBold: true,
      showTitle: true, title: "Finals top 5 · simulated judge average out of 5", titleColor: K.muted, titleFontSize: 12, titleFontFace: "+mn-lt",
      catAxisLabelColor: K.fg, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", catAxisLineShow: false,
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 5, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: false, objectName: "g2f-chart",
    });
    text(s, "SoakRx finished #3, with the joint-highest “works live” score. Its critique shaped Ondo.", { x: 0.6, y: 5.45, w: 6.2, h: 0.35, fontSize: 12, color: K.muted, objectName: "g2f-caption" });
    const proofs = [
      ["FaRocket", "Emergent", "Built the whole two-sided app from our prompts and spec"],
      ["FaMagnifyingGlass", "You.com", "Live Penang heat index and cited evidence for every red flag"],
      ["FaMicrophone", "Willow", "Voice is the interface, for guests in 100+ languages and wet-handed staff"],
    ];
    proofs.forEach(([ic, h, b], i) => {
      const x = 7.2, y = 1.72 + i * 1.25, w = 5.53, hh = 1.1, g = `g${i + 3}u-proof${i}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: hh, rectRadius: 0.12, fill: { color: K.surf }, line: border(), objectName: g + "-card" });
      iconCircle(s, g, x + 0.25, y + 0.22, 0.66, "ember", ic);
      text(s, h, { x: x + 1.12, y: y + 0.14, w: w - 1.3, h: 0.34, fontSize: 17, bold: true, color: K.fg, objectName: g + "-h" });
      text(s, b, { x: x + 1.12, y: y + 0.49, w: w - 1.3, h: 0.5, fontSize: 14, color: K.muted, objectName: g + "-b" });
    });
    text(s, "Make heat safe for every body.", { x: 0.6, y: 6.0, w: 6.6, h: 0.65, fontSize: 30, bold: true, color: K.fg, fontFace: HEAD, valign: "middle", objectName: "g6u-close" });
    // Live link: build with LIVE_URL=https://... to print the real host and add a scannable QR code.
    const liveHost = LIVE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const qr = LIVE_URL.startsWith("http") ? qrPng(LIVE_URL) : null;
    const pw = qr ? 4.1 : 5.53;
    const liveLabel = "Try it live · " + liveHost;
    const liveFs = Math.max(9, Math.min(14, Math.floor((pw - 0.3) / (liveLabel.length * 0.0062))));
    pill(s, "g6u-live", liveLabel, 7.2, 5.6, pw, 0.48, { fontSize: liveFs, bold: true, color: K.bg, fill: { color: K.ember } });
    pill(s, "g6u-gh", "github.com/vnmoorthy/ondo", 7.2, 6.18, pw, 0.48, { fontSize: 14, bold: true, color: K.fg, fill: { color: K.surf2 }, line: border() });
    if (qr) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.47, y: 5.55, w: 1.26, h: 1.26, rectRadius: 0.08, fill: { color: HEX.white }, line: { color: K.ember, width: 1.25 }, objectName: "g7f-qr-bg" });
      s.addImage({ data: qr, x: 11.52, y: 5.6, w: 1.16, h: 1.16, objectName: "g7f-qr", altText: "QR code to the live Ondo app: " + LIVE_URL });
    }
    s.addNotes("We didn't guess. About 70 simulated judges, modelled on this panel, scored 30 ideas; SoakRx finished third, and its critique shaped Ondo. Emergent built the whole app, You.com grounds every red flag, and Willow makes voice the interface. Try it live now. Let's make heat safe for every body. (about 18 seconds)");
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });

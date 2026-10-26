/* Cinematic birthday cake scene. Layered SVG art + one small canvas (flames, glow, gust, smoke, crumbs)
   driven by a single state machine. No libraries, no network requests, no audio.
   Exposes window.BirthdayCake.create(options). script.js decides when to call it. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg", XL = "http://www.w3.org/1999/xlink";
  var VW = 420, VH = 360;                       /* scene units: the SVG viewBox and the canvas share them */
  var CX = 210, CY = 128, RX = 128, RY = 34, CH = 100;  /* cake: top-ellipse centre, radii, height */
  var A1 = 58 * Math.PI / 180, A2 = 122 * Math.PI / 180; /* the slice is the wedge between these angles */
  var BLADE_H = 98, BLADE_S = 0.425;           /* knife blade height, and slope of the cut line on screen */
  var DOWN = 0.95, HOLD = 0.1, UP = 0.55;       /* knife timings (seconds) */
  var KNIFE_START = [0.45, 2.0], SLICE_START = 3.5, SLICE_DUR = 1.5, CUT_DONE = 4.85;

  /* ---------- small helpers ---------- */
  function S(tag, a, kids) {
    var n = document.createElementNS(NS, tag);
    if (a) Object.keys(a).forEach(function (k) { n.setAttribute(k, a[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function D(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eOut(t) { return 1 - Math.pow(1 - t, 3); }
  function eIn(t) { return t * t * t; }
  function eSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0; var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function pt(t, dy, k) { k = k == null ? 1 : k; return [CX + RX * k * Math.cos(t), CY + RY * k * Math.sin(t) + (dy || 0)]; }
  function pts(a) { return a.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" "); }
  function lg(id, x1, y1, x2, y2, stops) {
    return S("linearGradient", { id: id, x1: x1, y1: y1, x2: x2, y2: y2 }, stops.map(function (s) {
      return S("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] }); }));
  }
  function rg(id, cx, cy, r, stops) {
    return S("radialGradient", { id: id, cx: cx, cy: cy, r: r }, stops.map(function (s) {
      return S("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] }); }));
  }
  function sprite(size, stops) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var x = c.getContext("2d"), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }

  /* ---------- geometry of the cut ---------- */
  var C0 = [CX, CY], P1 = pt(A1), P2 = pt(A2), P1b = pt(A1, CH), P2b = pt(A2, CH), Cb = [CX, CY + CH];
  var REGION = (function () {                    /* screen shape of the removed wedge, extruded over the cake height */
    var r = [C0, P1, P1b], a;
    for (a = A1 + 0.12; a < A2; a += 0.12) r.push(pt(a, CH));
    r.push(P2b, P2);
    return r;
  })();

  /* ---------- the cake artwork (drawn once, reused for the cake and for the slice) ---------- */
  function buildArt() {
    var g = S("g", { id: "ck-art" }), i, t, p, r = rnd(7);
    var LX = CX - RX, RXp = CX + RX;
    g.appendChild(S("path", { d: "M" + LX + "," + CY + " L" + LX + "," + (CY + CH) + " A" + RX + "," + RY + " 0 0 0 " + RXp + "," + (CY + CH) +
      " L" + RXp + "," + CY + " A" + RX + "," + RY + " 0 0 1 " + LX + "," + CY + " Z", fill: "url(#ck-wall)" }));
    /* palette-knife strokes on the frosting */
    for (i = 0; i < 16; i++) {
      var x = LX + 8 + i * ((RX * 2 - 16) / 15), u = (x - CX) / RX, tf = CY + RY * Math.sqrt(1 - u * u);
      g.appendChild(S("path", { d: "M" + f1(x) + "," + f1(tf + 10 + r() * 6) + " Q" + f1(x + (r() - 0.5) * 6) + "," + f1(tf + CH * 0.5) + " " + f1(x + (r() - 0.5) * 3) + "," + f1(tf + CH - 12 - r() * 8),
        stroke: i % 2 ? "rgba(255,255,255,.22)" : "rgba(120,70,50,.10)", "stroke-width": 2 + r() * 2, fill: "none", "stroke-linecap": "round" }));
    }
    /* rose-gold pearls along the base */
    for (t = 0.05; t < Math.PI; t += 0.14) {
      p = pt(t, CH - 2.5);
      g.appendChild(S("circle", { cx: f1(p[0]), cy: f1(p[1]), r: 3.1, fill: "url(#ck-pearl)" }));
    }
    g.appendChild(S("ellipse", { cx: CX, cy: CY, rx: RX, ry: RY, fill: "url(#ck-top)" }));
    g.appendChild(S("ellipse", { cx: CX, cy: CY + 1, rx: RX * 0.8, ry: RY * 0.8, fill: "none", stroke: "rgba(124,28,52,.55)", "stroke-width": 3.2, "stroke-dasharray": "34 6 18 5 46 7", "stroke-linecap": "round" }));
    g.appendChild(S("ellipse", { cx: CX, cy: CY, rx: RX - 1, ry: RY - 0.5, fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 1.2 }));
    /* soft drips over the front rim */
    for (t = 0.12; t < Math.PI - 0.1; t += 0.17) {
      p = pt(t, 0);
      var len = 10 + r() * 20;
      g.appendChild(S("rect", { x: f1(p[0] - 3.4), y: f1(p[1] - 1), width: 6.8, height: f1(len), rx: 3.4, fill: "url(#ck-ros)", opacity: 0.96 }));
      g.appendChild(S("rect", { x: f1(p[0] - 1.6), y: f1(p[1] + 2), width: 1.4, height: f1(len - 8), rx: 0.7, fill: "rgba(255,255,255,.5)" }));
    }
    /* piped rosettes around the rim */
    for (t = 0.02; t < 6.28; t += 0.2) {
      p = pt(t, 0, 0.93);
      g.appendChild(S("circle", { cx: f1(p[0]), cy: f1(p[1]), r: 6.2, fill: "url(#ck-ros)", stroke: "rgba(150,100,80,.35)", "stroke-width": 0.7 }));
      g.appendChild(S("circle", { cx: f1(p[0]), cy: f1(p[1]), r: 3.6, fill: "none", stroke: "rgba(150,100,80,.28)", "stroke-width": 0.8 }));
      g.appendChild(S("circle", { cx: f1(p[0] - 1.3), cy: f1(p[1] - 1.4), r: 1.3, fill: "rgba(255,255,255,.7)" }));
    }
    /* raspberries, kept outside the slice wedge */
    [[148 * Math.PI / 180, 0.6], [32 * Math.PI / 180, 0.6]].forEach(function (c) {
      var o = pt(c[0], 0, c[1]);
      [[0, 0], [-7, 3], [7, 3], [0, 7]].forEach(function (d) {
        var bx = o[0] + d[0], by = o[1] + d[1] - 4;
        g.appendChild(S("circle", { cx: f1(bx), cy: f1(by), r: 6.4, fill: "url(#ck-berry)" }));
        [[-2.5, -1.5], [2.2, -2], [0, 2], [-3, 2.6], [3, 2.4]].forEach(function (q) {
          g.appendChild(S("circle", { cx: f1(bx + q[0]), cy: f1(by + q[1]), r: 1.7, fill: "rgba(255,150,170,.28)" }));
        });
        g.appendChild(S("ellipse", { cx: f1(bx - 2), cy: f1(by - 3), rx: 1.8, ry: 1, fill: "rgba(255,255,255,.7)" }));
      });
    });
    /* gold leaf flecks */
    for (i = 0; i < 14; i++) {
      var tt = r() * 6.28, kk = 0.3 + r() * 0.55, q = pt(tt, 0, kk);
      if (tt > A1 && tt < A2) continue;
      g.appendChild(S("rect", { x: f1(q[0]), y: f1(q[1]), width: 2.4, height: 1.5, fill: "#f0c987", opacity: 0.9, transform: "rotate(" + Math.round(r() * 90) + " " + f1(q[0]) + " " + f1(q[1]) + ")" }));
    }
    return g;
  }

  /* inside of the cake, seen on the two cut planes: red velvet and cream layers */
  function buildFace(outer, shade) {
    var g = S("g"), r = rnd(outer[0] > CX ? 3 : 11);
    var bands = [[0, 8, "#f6e7d6"], [8, 30, "#7d1a30"], [30, 36, "#f6e7d6"], [36, 58, "#721629"], [58, 64, "#f6e7d6"], [64, 86, "#7d1a30"], [86, 100, "#5f1022"]];
    function quad(y0, y1) { return [[CX, CY + y0], [outer[0], outer[1] + y0], [outer[0], outer[1] + y1], [CX, CY + y1]]; }
    bands.forEach(function (b) { g.appendChild(S("polygon", { points: pts(quad(b[0], b[1])), fill: b[2] })); });
    for (var i = 0; i < 70; i++) {
      var b = bands[1 + Math.floor(r() * 6)]; if (b[2] === "#f6e7d6") continue;
      var u = r(), y = b[0] + 1.5 + r() * (b[1] - b[0] - 3);
      g.appendChild(S("circle", { cx: f1(CX + (outer[0] - CX) * u), cy: f1(CY + (outer[1] - CY) * u + y), r: 0.5 + r() * 0.9, fill: r() > 0.5 ? "rgba(30,0,8,.35)" : "rgba(255,150,150,.22)" }));
    }
    g.appendChild(S("polygon", { points: pts(quad(0, 100)), fill: "#000", opacity: shade }));
    g.appendChild(S("line", { x1: CX, y1: CY, x2: outer[0], y2: outer[1], stroke: "rgba(255,255,255,.45)", "stroke-width": 1 }));
    return g;
  }

  function buildKnife() {
    var Lb = Math.abs(P1[0] - C0[0]) * 0.8, sy = Lb * BLADE_S;
    var g = S("g", { opacity: 0 });
    g.appendChild(S("polygon", { points: "0,0 " + f1(-Lb) + "," + f1(-sy) + " " + f1(-Lb + 4) + "," + f1(-sy - BLADE_H * 0.3) + " " + f1(-Lb + 26) + "," + f1(-sy - BLADE_H * 0.92) + " 0," + (-BLADE_H), fill: "url(#ck-steel)", stroke: "rgba(40,40,52,.7)", "stroke-width": 0.7 }));
    g.appendChild(S("polygon", { points: "0,-4 " + f1(-Lb + 3) + "," + f1(-sy - 4) + " " + f1(-Lb + 3) + "," + f1(-sy - BLADE_H * 0.28) + " " + f1(-Lb * 0.55) + "," + f1(-sy - BLADE_H * 0.62) + " 0," + f1(-BLADE_H * 0.5), fill: "rgba(20,24,40,.16)" }));
    g.appendChild(S("line", { x1: -2, y1: -BLADE_H + 5, x2: f1(-Lb + 18), y2: f1(-sy - BLADE_H + 5), stroke: "rgba(255,255,255,.7)", "stroke-width": 1.2 }));
    g.appendChild(S("line", { x1: -2, y1: -3, x2: f1(-Lb + 2), y2: f1(-sy - 3), stroke: "rgba(255,255,255,.55)", "stroke-width": 0.9 }));
    g.appendChild(S("rect", { x: -12, y: -BLADE_H - 8, width: 16, height: 9, rx: 2, fill: "url(#ck-gold)" }));
    g.appendChild(S("rect", { x: -11, y: -BLADE_H - 50, width: 14, height: 44, rx: 6, fill: "url(#ck-handle)" }));
    g.appendChild(S("circle", { cx: -4, cy: -BLADE_H - 36, r: 1.5, fill: "#f6e3bf" }));
    g.appendChild(S("circle", { cx: -4, cy: -BLADE_H - 20, r: 1.5, fill: "#f6e3bf" }));
    return g;
  }

  /* ---------- the scene ---------- */
  function create(opts) {
    opts = opts || {};
    var n = clamp(opts.candles | 0 || 5, 1, 12);
    var reduce = !!opts.reduceMotion, lowEnd = !!opts.lowEnd, fine = !!opts.finePointer;
    var cb = function (name, a, b) { try { if (opts[name]) opts[name](a, b); } catch (e) { if (window.console) console.warn(e); } };

    /* DOM */
    var stage = D("div", "cake-stage", { role: "group", "aria-label": "Birthday cake" });
    var bokeh = D("div", "cake-bokeh", { "aria-hidden": "true" });
    for (var bi = 0; bi < 5; bi++) { var bk = D("i"); bk.style.setProperty("--n", bi); bokeh.appendChild(bk); }
    var cam = D("div", "cake-cam");
    var svg = S("svg", { viewBox: "0 0 " + VW + " " + VH, "aria-hidden": "true", focusable: "false", "class": "cake-svg" });
    var fx = D("canvas", "cake-fx", { "aria-hidden": "true" });
    var dark = D("div", "cake-dark", { "aria-hidden": "true" });
    var hits = D("div", "cake-hits");
    cam.appendChild(svg); cam.appendChild(fx); cam.appendChild(dark); cam.appendChild(hits);
    stage.appendChild(bokeh); stage.appendChild(cam);

    /* SVG defs */
    var defs = S("defs");
    [lg("ck-wall", 0, 0, 1, 0, [[0, "#cfae98"], [0.18, "#f1dfcb"], [0.45, "#fff6ea"], [0.78, "#ead0b8"], [1, "#bf9a82"]]),
     rg("ck-top", 0.5, 0.42, 0.65, [[0, "#fffbf4"], [0.7, "#f6e6d3"], [1, "#e8cfb6"]]),
     lg("ck-plate", 0, 0, 1, 0, [[0, "#a8745c"], [0.5, "#f4d9bf"], [1, "#a8745c"]]),
     rg("ck-plate-in", 0.5, 0.45, 0.6, [[0, "#fbefe0"], [1, "#d9b99e"]]),
     rg("ck-shadow", 0.5, 0.5, 0.5, [[0, "#0a0206", 0.6], [0.6, "#0a0206", 0.25], [1, "#0a0206", 0]]),
     rg("ck-ros", 0.4, 0.35, 0.65, [[0, "#fffaf2"], [1, "#ecd2b8"]]),
     rg("ck-berry", 0.35, 0.3, 0.75, [[0, "#e0506a"], [0.55, "#a3203d"], [1, "#5e0f24"]]),
     rg("ck-pearl", 0.35, 0.3, 0.7, [[0, "#fff0e0"], [0.6, "#e3b08f"], [1, "#9a6149"]]),
     lg("ck-candle", 0, 0, 1, 0, [[0, "#d9bfa8"], [0.4, "#fff3e2"], [1, "#c9a58c"]]),
     lg("ck-steel", 0, 0, 1, 0.5, [[0, "#ffffff"], [0.18, "#d4d7e0"], [0.32, "#f4f5f9"], [0.6, "#a9adba"], [1, "#e6e8ef"]]),
     lg("ck-handle", 0, 0, 1, 0, [[0, "#4a2219"], [0.5, "#a8684e"], [1, "#4a2219"]]),
     lg("ck-gold", 0, 0, 1, 1, [[0, "#f6e3bf"], [1, "#c9906f"]])
    ].forEach(function (x) { defs.appendChild(x); });
    defs.appendChild(buildArt());
    defs.appendChild(S("clipPath", { id: "ck-clip" }, [S("polygon", { points: pts(REGION) })]));
    defs.appendChild(S("mask", { id: "ck-notch", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: VW, height: VH }, [
      S("rect", { x: 0, y: 0, width: VW, height: VH, fill: "#fff" }), S("polygon", { points: pts(REGION), fill: "#000" })]));
    svg.appendChild(defs);

    function use(extra) {
      var u = S("use", extra || {}); u.setAttribute("href", "#ck-art"); u.setAttributeNS(XL, "xlink:href", "#ck-art"); return u;
    }
    svg.appendChild(S("ellipse", { cx: 210, cy: 238, rx: 176, ry: 56, fill: "url(#ck-plate)" }));
    svg.appendChild(S("ellipse", { cx: 210, cy: 240, rx: 158, ry: 47, fill: "url(#ck-plate-in)" }));
    svg.appendChild(S("ellipse", { cx: 210, cy: 244, rx: 150, ry: 36, fill: "url(#ck-shadow)" }));
    var sliceShadow = S("ellipse", { cx: 210, cy: 262, rx: 40, ry: 10, fill: "url(#ck-shadow)", opacity: 0 });
    svg.appendChild(sliceShadow);
    var faces = S("g", { display: "none" }, [buildFace(P2, 0.3), buildFace(P1, 0.1)]);
    svg.appendChild(faces);
    var base = use();
    svg.appendChild(base);

    /* candles (SVG body; the flame is drawn on the canvas above) */
    var flames = [], candleG = S("g"), rr = rnd(21), list = [];
    for (var i = 0; i < n; i++) {
      var t = (200 + 140 * (n === 1 ? 0.5 : i / (n - 1))) * Math.PI / 180, o = pt(t, 0, 0.74), ch = 42 + Math.floor(rr() * 4) * 2;
      list.push({ i: i, x: o[0], y: o[1], ch: ch });
    }
    list.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (c) {
      var g = S("g");
      g.appendChild(S("ellipse", { cx: f1(c.x), cy: f1(c.y + 0.5), rx: 5.4, ry: 1.9, fill: "rgba(60,20,30,.35)" }));
      g.appendChild(S("rect", { x: f1(c.x - 3.3), y: f1(c.y - c.ch), width: 6.6, height: c.ch, rx: 1.3, fill: "url(#ck-candle)" }));
      for (var s = 0; s < 4; s++) {
        var yy = c.y - c.ch + 6 + s * (c.ch - 10) / 4;
        g.appendChild(S("line", { x1: f1(c.x - 3.3), y1: f1(yy + 3), x2: f1(c.x + 3.3), y2: f1(yy - 3), stroke: "rgba(227,150,130,.75)", "stroke-width": 1.3 }));
      }
      g.appendChild(S("ellipse", { cx: f1(c.x), cy: f1(c.y - c.ch), rx: 3.3, ry: 1.1, fill: "#fbefd8" }));
      g.appendChild(S("line", { x1: f1(c.x), y1: f1(c.y - c.ch), x2: f1(c.x + 0.3), y2: f1(c.y - c.ch - 3.6), stroke: "#2b1a14", "stroke-width": 0.9, "stroke-linecap": "round" }));
      candleG.appendChild(g);
    });
    svg.appendChild(candleG);

    var sliceG = S("g", {}, [use({ "clip-path": "url(#ck-clip)" })]);
    svg.appendChild(sliceG);
    var seams = S("g");
    var seamDefs = [[C0, P1], [P1, P1b], [C0, P2], [P2, P2b]].map(function (s) {
      var len = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
      var d = "M" + f1(s[0][0]) + "," + f1(s[0][1]) + " L" + f1(s[1][0]) + "," + f1(s[1][1]);
      var dk = S("path", { d: d, stroke: "#2a0b14", "stroke-width": 1.7, fill: "none", "stroke-linecap": "round", "stroke-dasharray": len, "stroke-dashoffset": len });
      var hi = S("path", { d: d, transform: "translate(1.1 .8)", stroke: "rgba(255,244,230,.6)", "stroke-width": 0.8, fill: "none", "stroke-dasharray": len, "stroke-dashoffset": len });
      seams.appendChild(dk); seams.appendChild(hi);
      return { dk: dk, hi: hi, len: len };
    });
    svg.appendChild(seams);
    var knives = [buildKnife(), buildKnife()];
    knives.forEach(function (k) { svg.appendChild(k); });

    /* ---------- model ---------- */
    var state = "entering", time = 0, active = false, running = false, raf = 0, last = 0;
    var gust = { t0: -99 }, streaks = [], puffs = [], crumbs = [], dust = [];
    var L = 1, cut = { t0: 0 }, seamP = [0, 0, 0, 0], maskOn = false, crumbAcc = [0, 0], slideAcc = 0;
    var camS = 1, camX = 0, camY = 0, tS = 1.03, ptrX = 0, ptrY = 0, lastLight = -1, lastDark = -1;
    var timers = [], readyTimer = 0;
    var ranks = list.slice().sort(function (a, b) { return a.x - b.x; });

    var buttons = [];
    list.forEach(function (c) {
      var f = { i: c.i, x: c.x, wy: c.y - c.ch - 3.6, base: c.y, ch: c.ch, ph: rr() * 6.28, sp1: 0.9 + rr() * 0.5, sp2: 2.3 + rr() * 1.1,
        delay: 0, outAt: null, out: false, outT: 0, a: 1, hs: 1, g: 0, localT0: -99, emitUntil: 0, emitAcc: 0, ember: 0 };
      flames.push(f);
      var b = D("button", "candle", { type: "button", "aria-label": "Candle " + (c.i + 1) + " of " + n + ", lit. Press to blow out." });
      b.style.left = f1(c.x / VW * 100) + "%";
      b.style.top = f1((c.y - c.ch - 22) / VH * 100) + "%";
      b.style.height = f1((c.ch + 26) / VH * 100) + "%";
      b.addEventListener("click", function () { blowCandle(c.i); });
      hits.appendChild(b); buttons.push(b);
    });
    for (var di = 0; di < (lowEnd ? 8 : 16); di++) dust.push({ x: Math.random() * VW, y: Math.random() * VH, r: 0.8 + Math.random() * 1.4, vy: -(2 + Math.random() * 5), vx: (Math.random() - 0.5) * 3, ph: Math.random() * 6.28 });

    var sGlow = sprite(64, [[0, "rgba(255,190,110,1)"], [0.25, "rgba(255,150,60,.55)"], [0.6, "rgba(255,110,30,.14)"], [1, "rgba(255,90,20,0)"]]);
    var sSmoke = sprite(64, [[0, "rgba(222,210,202,.9)"], [0.5, "rgba(204,192,186,.4)"], [1, "rgba(190,180,176,0)"]]);
    var sEmber = sprite(32, [[0, "rgba(255,130,60,1)"], [0.5, "rgba(255,60,20,.4)"], [1, "rgba(255,40,10,0)"]]);
    var sDust = sprite(32, [[0, "rgba(255,232,185,1)"], [1, "rgba(246,200,140,0)"]]);
    var ctx = fx.getContext && fx.getContext("2d"), pxK = 1;

    function setState(s) { if (state === s) return; state = s; cb("onState", s); }
    function later(fn, ms) { var id = setTimeout(function () { var k = timers.indexOf(id); if (k > -1) timers.splice(k, 1); fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; clearTimeout(readyTimer); readyTimer = 0; }

    function resize() {
      if (!ctx) return;
      var w = stage.offsetWidth || VW, h = stage.offsetHeight || VH, dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2);
      fx.width = Math.round(w * dpr); fx.height = Math.round(h * dpr);
      pxK = w / VW;
      ctx.setTransform(dpr * pxK, 0, 0, dpr * pxK, 0, 0);
    }

    /* ---------- blow-out ---------- */
    function env(u) {
      if (!(u >= 0)) return 0;
      if (u < 0.3) return eSine(u / 0.3);
      if (u < 0.85) return 1;
      if (u < 1.4) return 1 - eSine((u - 0.85) / 0.55);
      return 0;
    }
    function markOut(f) {
      if (f.out) return;
      f.out = true; f.outT = time; f.emitUntil = time + 1.6; f.emitAcc = 0;
      var b = buttons[f.i]; b.classList.add("out"); b.setAttribute("aria-label", "Candle, blown out"); b.disabled = true;
      cb("onCandleOut", f.i);
    }
    function addStreaks() {
      var y0 = Math.min.apply(null, flames.map(function (f) { return f.wy; })) - 10, y1 = Math.max.apply(null, flames.map(function (f) { return f.wy; })) + 26;
      streaks = [];
      for (var i = 0; i < (lowEnd ? 6 : 10); i++)
        streaks.push({ y: lerp(y0, y1, Math.random()), x0: -50 - Math.random() * 40, sp: 330 + Math.random() * 170, len: 50 + Math.random() * 70, amp: 1.5 + Math.random() * 3, born: time + Math.random() * 0.3, life: 1.3 + Math.random() * 0.4, seed: Math.random() * 6 });
    }
    function blowAll() {
      if (state !== "lit") return false;
      setState("blowing"); cb("onBlowStart");
      tS = 1.07;
     if (reduce) {
  reduce = false;
}
      gust.t0 = time; addStreaks();
      var lit = ranks.map(function (c) { return flames[c.i]; }).filter(function (f) { return !f.out; });
      lit.forEach(function (f, k) {
        f.delay = (lit.length > 1 ? k / (lit.length - 1) : 0) * 0.85 + Math.random() * 0.12;
        f.outAt = gust.t0 + f.delay + 0.5 + Math.random() * 0.2;
      });
      later(function () { if (state === "blowing" || state === "lit") instantBlow(); }, 9000);   /* watchdog */
      kick();
      return true;
    }
    function blowCandle(i) {
      var f = flames[i];
      if (!f || f.out || f.outAt != null && state !== "lit") return;
      if (state !== "lit" && state !== "blowing") return;
      if (reduce) { markOut(f); checkAllOut(true); return; }
      f.localT0 = time; f.outAt = time + 0.4;
      if (!gust.t0 || gust.t0 < 0) gust.t0 = time;
      kick();
    }
    function instantBlow() {
      flames.forEach(function (f) { markOut(f); f.a = 0; f.hs = 0; });
      L = 0; puffs = []; streaks = [];
      tS = 1.07;
      finishBlow();
      draw();
    }
    function finishBlow() {
      if (state === "out" || state === "cutting" || state === "cut") return;
      setState("out"); cb("onBlowDone");
    }
    function checkAllOut(immediate) {
      if (state !== "lit" && state !== "blowing") return;
      if (!flames.every(function (f) { return f.out; })) return;
      var lastOut = Math.max.apply(null, flames.map(function (f) { return f.outT; }));
      if (immediate || time - lastOut > 1.5) { tS = 1.07; finishBlow(); }
      else if (state === "lit") { setState("blowing"); cb("onBlowStart"); }
    }

    /* ---------- cutting ---------- */
    function applyCutState(finalPose) {
      faces.setAttribute("display", "inline");
      if (!maskOn) { base.setAttribute("mask", "url(#ck-notch)"); maskOn = true; }
      if (finalPose) {
        sliceG.setAttribute("transform", slicePose(1));
        placeShadow(1);
      }
    }
    function slicePose(e) { return "translate(" + f1(e * 10) + " " + f1(e * 40) + ") rotate(" + f1(-6 * e) + " " + CX + " " + (CY + CH) + ")"; }
    function placeShadow(e) {
      sliceShadow.setAttribute("cx", f1(CX + e * 12)); sliceShadow.setAttribute("cy", f1(CY + CH + 30 + e * 22));
      sliceShadow.setAttribute("rx", f1(lerp(36, 74, e))); sliceShadow.setAttribute("ry", f1(lerp(9, 17, e)));
      sliceShadow.setAttribute("opacity", f1(0.2 + 0.8 * e));
    }
    function cutCake() {
      if (state !== "out") return false;
      setState("cutting"); cb("onCutStart");
      tS = 1.1;
      if (reduce) { instantCut(); return true; }
      cut.t0 = time;
      later(function () { if (state === "cutting") instantCut(); }, 14000);   /* watchdog */
      kick();
      return true;
    }
    function instantCut() {
      seamP = [1, 1, 1, 1]; knives.forEach(function (k) { k.setAttribute("opacity", 0); });
      applyCutState(true); seams.setAttribute("opacity", 0);
      tS = 1.1;
      finishCut(); draw();
    }
    function finishCut() {
      if (state === "cut") return;
      setState("cut"); cb("onCutDone");
    }
    function knifeAt(u, side) {
      var P = side === 0 ? P1 : P2, yTop = P[1] - 40, yBot = P[1] + CH, y, op;
      if (u < 0) return { y: yTop, op: 0, d: -99 };
      var q = clamp((u - DOWN - HOLD) / UP, 0, 1);
      if (u < DOWN) y = lerp(yTop, yBot, eSine(u / DOWN));
      else if (u < DOWN + HOLD) y = yBot;
      else y = lerp(yBot, yTop - 30, eIn(q));
      op = Math.min(1, u / 0.25) * (1 - clamp((q - 0.55) / 0.45, 0, 1));
      return { y: y, op: op, d: y - P[1], x: P[0] };
    }
    function spawnCrumb(x, y, big) {
      if (crumbs.length > 110) return;
      var pal = ["#fff3e4", "#f1dcc6", "#9a2a44", "#e7c9a9"];
      crumbs.push({ x: x, y: y, vx: (Math.random() - 0.3) * 12, vy: -Math.random() * 6 + 2, size: 0.6 + Math.random() * (big ? 1.5 : 1), age: 0, life: 1 + Math.random() * 0.9, c: pal[Math.floor(Math.random() * 4)] });
    }
    function updateCut(dt) {
      var el = time - cut.t0, k;
      for (k = 0; k < 2; k++) {
        var kn = knifeAt(el - KNIFE_START[k], k), P = k === 0 ? P1 : P2;
        knives[k].setAttribute("opacity", f1(clamp(kn.op, 0, 1)));
        knives[k].setAttribute("transform", "translate(" + f1(P[0]) + " " + f1(kn.y) + ")" + (k === 1 ? " scale(-1 1)" : ""));
        var u = el - KNIFE_START[k];
        if (kn.d > 0) {
          seamP[k * 2] = Math.max(seamP[k * 2], clamp(kn.d / 10, 0, 1));
          seamP[k * 2 + 1] = Math.max(seamP[k * 2 + 1], clamp(kn.d / CH, 0, 1));
          if (u < DOWN) { crumbAcc[k] += dt * 24; while (crumbAcc[k] > 1) { crumbAcc[k]--; spawnCrumb(P[0] + (Math.random() * 3 - 1), P[1] + kn.d * (0.3 + Math.random() * 0.7), false); } }
        }
      }
      seamDefs.forEach(function (s, j) {
        var off = s.len * (1 - seamP[j]);
        s.dk.setAttribute("stroke-dashoffset", f1(off)); s.hi.setAttribute("stroke-dashoffset", f1(off));
      });
      var su = el - SLICE_START;
      if (su >= 0) {
        if (!maskOn) applyCutState(false);
        seams.setAttribute("opacity", f1(clamp(1 - su / 0.4, 0, 1)));
        var v = clamp((su - 0.12) / SLICE_DUR, 0, 1), e = eInOut(v);
        sliceG.setAttribute("transform", slicePose(e)); placeShadow(e);
        if (v > 0 && v < 0.7) { slideAcc += dt * 20; while (slideAcc > 1) { slideAcc--; spawnCrumb(lerp(P2[0], P1[0], Math.random()), CY + CH + 18 + e * 36, true); } }
      }
      if (el >= CUT_DONE) { clearTimers(); finishCut(); }
    }

    /* ---------- per-frame update and drawing ---------- */
    function update(dt) {
      time += dt;
      var lightSum = 0;
      flames.forEach(function (f) {
        var g = Math.max(env(time - gust.t0 - f.delay), env(time - f.localT0));
        f.g = g;
        if (!f.out) {
          if (f.outAt != null && time >= f.outAt) markOut(f);
          else { f.hs = 1 - 0.4 * g; f.a = 1 - 0.22 * g; }
        }
        if (f.out) {
          var s = clamp((time - f.outT) / 0.5, 0, 1);
          f.hs = Math.pow(1 - s, 1.3) * (1 - 0.4 * g); f.a = 1 - eSine(s);
          f.ember = clamp(1 - (time - f.outT) / 1.8, 0, 1) * (s > 0.5 ? 1 : s * 2);
          if (time < f.emitUntil && s > 0.35) {
            f.emitAcc += dt * (lowEnd ? 22 : 38);
            while (f.emitAcc > 1) { f.emitAcc--; if (puffs.length < 420) puffs.push({ x: f.x, y: f.wy - 1, vx: 3 + Math.random() * 4, vy: -(11 + Math.random() * 7), age: 0, life: 3.2 + Math.random() * 1.4, size: 2.4 + Math.random() * 1.4, seed: Math.random() * 6.28, amp: 4 + Math.random() * 5 }); }
          }
        }
        lightSum += f.a;
      });
      var target = lightSum / flames.length;
      L += (target - L) * (1 - Math.exp(-dt * (target < L ? 2.2 : 6)));
      puffs = puffs.filter(function (p) { p.age += dt; p.y += p.vy * dt * (1 - p.age / p.life * 0.5); p.x += p.vx * dt; p.vx *= 1 - dt * 0.9; return p.age < p.life; });
      crumbs = crumbs.filter(function (c) { c.age += dt; c.vy += 120 * dt; c.x += c.vx * dt; c.y += c.vy * dt; return c.age < c.life; });
      dust.forEach(function (d) { d.y += d.vy * dt; d.x += d.vx * dt + Math.sin(time * 0.6 + d.ph) * 0.12; if (d.y < -6) { d.y = VH + 6; d.x = Math.random() * VW; } });
      if (state === "cutting") updateCut(dt);
      if (state === "lit" || state === "blowing") checkAllOut(false);
      /* camera */
      var kk = 1 - Math.exp(-dt * 1.6);
      camS += (tS - camS) * kk;
      camX += (ptrX * 7 - camX) * kk; camY += (ptrY * 5 + Math.sin(time * 0.35) * 1.6 - camY) * kk;
    }
    function flameShape(c, f, hs, wMul, bend, y0) {
      var h = 15 * hs, w = 3.5 * wMul, x = f.x, y = f.wy + (y0 || 0), tx = x + bend, ty = y - h;
      c.beginPath(); c.moveTo(x, y + 1);
      c.bezierCurveTo(x - w * 1.25, y - h * 0.15, x - w * 0.9 + bend * 0.25, y - h * 0.72, tx, ty);
      c.bezierCurveTo(x + w * 0.9 + bend * 0.25, y - h * 0.72, x + w * 1.25, y - h * 0.15, x, y + 1);
      c.fill();
      return [tx, ty];
    }
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, VW, VH);
      ctx.globalCompositeOperation = "lighter";
      dust.forEach(function (d) {
        ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(time * 1.3 + d.ph));
        ctx.drawImage(sDust, d.x - d.r * 2, d.y - d.r * 2, d.r * 4, d.r * 4);
      });
      var fl = 0.9 + 0.1 * Math.sin(time * 9.1);
      if (L > 0.01) {
        ctx.save(); ctx.translate(CX, CY + 20); ctx.scale(1, 0.62);
        ctx.globalAlpha = 0.34 * L * fl; ctx.drawImage(sGlow, -230, -230, 460, 460);
        ctx.restore();
        ctx.save(); ctx.translate(CX, CY + 60); ctx.scale(1, 0.5);
        ctx.globalAlpha = 0.13 * L; ctx.drawImage(sGlow, -200, -200, 400, 400);
        ctx.restore();
      }
      flames.forEach(function (f) {
        if (f.a > 0.01) {
          var q = 0.85 + 0.15 * Math.sin(time * f.sp2 * 1.7 + f.ph);
          ctx.globalAlpha = 0.85 * f.a * q; ctx.drawImage(sGlow, f.x - 36, f.wy - 40, 72, 72);
          ctx.globalAlpha = 0.5 * f.a * q; ctx.drawImage(sGlow, f.x - 13, f.wy - 3, 26, 26);
        }
        if (f.ember > 0.02) { ctx.globalAlpha = f.ember * 0.9; ctx.drawImage(sEmber, f.x - 3, f.wy - 3, 6, 6); }
      });
      ctx.globalCompositeOperation = "source-over";
      streaks.forEach(function (s) {
        var age = time - s.born; if (age < 0 || age > s.life) return;
        var head = s.x0 + s.sp * age;
        ctx.globalAlpha = 0.34 * Math.sin(Math.PI * age / s.life); ctx.strokeStyle = "#fff4e6"; ctx.lineWidth = 1.1; ctx.beginPath();
        for (var j = 0; j <= 10; j++) { var xx = head - j / 10 * s.len; var yy = s.y + Math.sin(xx * 0.045 + s.seed) * s.amp; if (j) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
        ctx.stroke();
      });
      flames.forEach(function (f) {
        if (f.a <= 0.01 || f.hs <= 0.02) return;
        var s1 = Math.sin(time * f.sp1 + f.ph) * 0.5 + Math.sin(time * f.sp2 + f.ph * 1.7) * 0.3 + Math.sin(time * f.sp2 * 2.3 + f.ph * 0.6) * 0.2;
        var s2 = Math.sin(time * f.sp2 * 1.9 + f.ph * 2.1);
        var hs = f.hs * (1 + s1 * 0.12 + s2 * 0.06), wm = (1 + s2 * 0.08) * (0.55 + 0.45 * f.hs);
        var bend = f.g * 12 + s1 * 1.6 * (1 - Math.min(1, f.g));
        ctx.globalAlpha = clamp(f.a, 0, 1);
        ctx.fillStyle = "rgba(110,150,255,.5)"; ctx.beginPath(); ctx.ellipse(f.x, f.wy - 0.4, 1.5 * wm, 2.3 * hs, 0, 0, 6.2832); ctx.fill();
        var tip = [f.x + bend, f.wy - 15 * hs], g = ctx.createLinearGradient(f.x, f.wy, tip[0], tip[1]);
        g.addColorStop(0, "#ffd070"); g.addColorStop(0.5, "#ff9a2e"); g.addColorStop(1, "rgba(255,90,10,0)");
        ctx.fillStyle = g; flameShape(ctx, f, hs, wm, bend);
        var g2 = ctx.createLinearGradient(f.x, f.wy, f.x + bend * 0.4, f.wy - 8 * hs);
        g2.addColorStop(0, "#fffbe0"); g2.addColorStop(1, "rgba(255,230,150,0)");
        ctx.fillStyle = g2;
        var core = { x: f.x, wy: f.wy };
        flameShape(ctx, core, hs * 0.55, wm * 0.55, bend * 0.4);
      });
      puffs.forEach(function (p) {
        var a = 0.34 * Math.pow(1 - p.age / p.life, 1.2) * Math.min(1, p.age * 3), s = p.size * (1 + p.age * 0.9);
        if (a < 0.004) return;
        ctx.globalAlpha = a;
        var x = p.x + Math.sin(p.age * 2.6 + p.seed) * p.amp * Math.min(1, p.age * 0.8);
        ctx.drawImage(sSmoke, x - s, p.y - s, s * 2, s * 2);
      });
      crumbs.forEach(function (c) { ctx.globalAlpha = clamp(1.3 - c.age / c.life, 0, 1); ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, c.size, c.size); });
      ctx.globalAlpha = 1;
      var dk = clamp((1 - L) * 0.42, 0, 0.42);
      if (Math.abs(dk - lastDark) > 0.01) { dark.style.opacity = dk.toFixed(2); lastDark = dk; }
      cam.style.transform = "translate3d(" + camX.toFixed(2) + "px," + camY.toFixed(2) + "px,0) scale(" + camS.toFixed(4) + ")";
    }

    /* ---------- loop control ---------- */
    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (lowEnd && now - last < 32) return;
      var dt = clamp((now - last) / 1000, 0, 0.05); last = now;
      try { update(dt); draw(); }
      catch (err) {
        if (window.console) console.warn("Cake animation problem; finishing this step.", err);
        stop();
        if (state === "cutting") { instantCut(); cb("onError", "cut"); }
        else if (state === "lit" || state === "blowing") { instantBlow(); cb("onError", "blow"); }
      }
    }
    function start() { if (running || reduce || !active) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function kick() { start(); }
    function onVis() { if (document.hidden) stop(); else start(); }
    function onPtr(e) { ptrX = e.clientX / window.innerWidth * 2 - 1; ptrY = e.clientY / window.innerHeight * 2 - 1; }
    var ro = null;

    function reset() {
      clearTimers(); stop();
      state = "entering"; time = 0; gust.t0 = -99; streaks = []; puffs = []; crumbs = []; L = 1; seamP = [0, 0, 0, 0]; maskOn = false;
      camS = 1; tS = 1.03; lastDark = -1;
      flames.forEach(function (f, i) {
        f.outAt = null; f.out = false; f.outT = 0; f.a = 1; f.hs = 1; f.g = 0; f.localT0 = -99; f.emitUntil = 0; f.ember = 0;
        var b = buttons[i]; b.classList.remove("out"); b.disabled = false; b.setAttribute("aria-label", "Candle " + (i + 1) + " of " + n + ", lit. Press to blow out.");
      });
      base.removeAttribute("mask"); faces.setAttribute("display", "none"); sliceG.removeAttribute("transform");
      sliceShadow.setAttribute("opacity", 0); seams.setAttribute("opacity", 1);
      knives.forEach(function (k) { k.setAttribute("opacity", 0); });
      seamDefs.forEach(function (s) { s.dk.setAttribute("stroke-dashoffset", s.len); s.hi.setAttribute("stroke-dashoffset", s.len); });
      stage.classList.remove("enter"); void stage.offsetWidth;
    }
    function enter() {
      if (active) return;
      active = true;
      if (state === "cut" || state === "out" && false) reset();
      resize();
      stage.classList.add("enter");
      window.addEventListener("resize", resize);
      if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(stage); }
      document.addEventListener("visibilitychange", onVis);
      if (fine && !reduce) window.addEventListener("pointermove", onPtr, { passive: true });
      if (state === "entering") readyTimer = setTimeout(function () { if (state === "entering") setState("lit"); }, reduce ? 0 : 1500);
      if (reduce) draw(); else start();
    }
    function exit() {
      active = false; stop(); clearTimers();
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onPtr);
      document.removeEventListener("visibilitychange", onVis);
      if (ro) { ro.disconnect(); ro = null; }
      if (state === "blowing" || state === "cutting") { /* leaving mid-animation: settle the step so nothing is left half-done */
        if (state === "blowing") instantBlow(); else instantCut();
      }
    }

    return {
      root: stage, buttons: buttons, enter: enter, exit: exit, reset: reset,
      blowAll: blowAll, cut: cutCake, state: function () { return state; },
      needsReset: function () { return state === "cut" || state === "out" || state === "blowing" || state === "cutting" || flames.some(function (f) { return f.out; }); }
    };
  }
  window.BirthdayCake = { create: create };
})();

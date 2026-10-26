/* Birthday Website Empire: reusable engine, cinematic edition. Reads window.SITE_CONFIG (config.js).
   All customer text is inserted with textContent, never innerHTML, so unusual
   names or messages cannot break the page. No network requests are made. */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG;
  var stage = document.getElementById("stage");
  if (!cfg) {
    stage.textContent = "This page is missing its configuration (config.js).";
    return;
  }
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  var reduceMotion = mq("(prefers-reduced-motion: reduce)");
  var finePointer = mq("(hover: hover) and (pointer: fine)");
  var lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700;
  var body = document.body;
  var root = document.documentElement;

  /* ---------- helpers ---------- */
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    props = props || {};
    if (props.cls) n.className = props.cls;
    if (props.text != null) n.textContent = props.text;
    if (props.attrs) Object.keys(props.attrs).forEach(function (k) { n.setAttribute(k, props.attrs[k]); });
    if (props.on) Object.keys(props.on).forEach(function (k) { n.addEventListener(k, props.on[k]); });
    (kids || []).forEach(function (k) { if (k) n.appendChild(k); });
    return n;
  }
  function on(c, k) { return c && c.modules && c.modules[k] === true; }
  function name() {
    var r = cfg.recipient || {};
    return r.nickname || r.name || "you";
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- theme ---------- */
  var theme = (cfg.theme && cfg.theme.resolved) || {};
  ["bg", "surface", "text", "muted", "accent", "accent2", "line", "onAccent"].forEach(function (k) {
    if (theme.colors && theme.colors[k]) root.style.setProperty("--" + k, theme.colors[k]);
  });
  ["heading", "body", "script"].forEach(function (k) {
    if (theme.fonts && theme.fonts[k]) root.style.setProperty("--font-" + k, theme.fonts[k]);
  });
  root.setAttribute("data-motion", theme.motion || "gentle");
  /* Optional privacy switch: keep the recipient's name off the opening screen. */
  var hideName = !!(cfg.privacy && cfg.privacy.hideNameUntilUnlock === true);
  document.title = cfg.pageTitle || (hideName ? "A surprise for you" : "A surprise for " + name());

  /* ---------- ambient background (canvas) ---------- */
  var amb = document.getElementById("ambient");
  var actx = amb && amb.getContext ? amb.getContext("2d") : null;
  var items = [], par = { x: 0, y: 0, cx: 0, cy: 0 };
  var warm = 0, warmTarget = 0, aRaf = 0, lastT = 0;
  var GOLD = "227,176,143", CHAMP = "246,227,191", ROSE = "196,70,98", DEEP = "150,36,66";

  function seedAmbient() {
    var W = window.innerWidth, H = window.innerHeight;
    var area = (W * H) / (1280 * 720), sc = lowEnd ? 0.5 : 1;
    function n(base) { return Math.max(3, Math.round(base * area * sc)); }
    var i;
    items = [];
    for (i = 0; i < n(46); i++) items.push({ k: "star", x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.3), d: 0.15, t: rand(0, 6), sp: rand(0.5, 1.6), vx: 0, vy: 0 });
    for (i = 0; i < n(36); i++) items.push({ k: "dust", x: rand(0, W), y: rand(0, H), r: rand(0.7, 1.9), d: 0.5, t: rand(0, 6), sp: rand(0.6, 1.6), vx: rand(-0.12, 0.12), vy: rand(-0.35, -0.08), sway: 0.1 });
    for (i = 0; i < n(8); i++) items.push({ k: "bokeh", x: rand(0, W), y: rand(0, H), r: rand(16, 48), d: 0.8, t: rand(0, 6), sp: rand(0.3, 0.8), vx: rand(-0.05, 0.05), vy: rand(-0.14, -0.04), a: rand(0.05, 0.1), c: i % 2 ? GOLD : ROSE });
    for (i = 0; i < n(3); i++) items.push({ k: "bokeh", x: rand(0, W), y: rand(0, H), r: rand(90, 190), d: 0.3, t: rand(0, 6), sp: 0.3, vx: rand(-0.06, 0.06), vy: rand(-0.05, 0.03), a: rand(0.05, 0.09), c: i % 2 ? GOLD : DEEP });
    for (i = 0; i < n(8); i++) items.push({ k: "petal", x: rand(0, W), y: rand(-H, H), r: rand(6, 12), d: 1, t: rand(0, 6), sp: rand(0.8, 1.6), vx: rand(-0.1, 0.1), vy: rand(0.25, 0.6), sway: 0.45, rot: rand(0, 6.28), vr: rand(-0.02, 0.02), c: i % 2 ? ROSE : DEEP });
    for (i = 0; i < Math.max(2, Math.round(2 * area * sc)); i++) items.push({ k: "heart", x: rand(0, W), y: rand(0, H), r: rand(5, 8), d: 0.9, t: rand(0, 6), sp: 1, vx: 0, vy: rand(-0.3, -0.15), sway: 0.25 });
  }
  function heartPath(c, s) {
    c.beginPath(); c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s, -s * 0.3, -s * 0.55, -s, 0, -s * 0.45);
    c.bezierCurveTo(s * 0.55, -s, s, -s * 0.3, 0, s * 0.35); c.fill();
  }
  function drawAmbient(dt) {
    var W = window.innerWidth, H = window.innerHeight;
    actx.clearRect(0, 0, W, H);
    par.cx += (par.x - par.cx) * 0.04 * dt; par.cy += (par.y - par.cy) * 0.04 * dt;
    var boost = 1 + warm * 0.45;
    items.forEach(function (p) {
      var ox = par.cx * p.d * 22, oy = par.cy * p.d * 22, m = p.r * 2 + 24;
      p.t += dt * p.sp * 0.02;
      if (!reduceMotion) {
        p.x += (p.vx + (p.sway ? Math.sin(p.t * 3 + p.d * 7) * p.sway : 0)) * dt;
        p.y += p.vy * dt;
        if (p.rot != null) p.rot += p.vr * dt;
        if (p.y < -m) p.y = H + m; else if (p.y > H + m) p.y = -m;
        if (p.x < -m) p.x = W + m; else if (p.x > W + m) p.x = -m;
      }
      var x = p.x + ox, y = p.y + oy, a, g;
      if (p.k === "star") {
        a = (0.2 + 0.6 * Math.abs(Math.sin(p.t * 6))) * Math.min(1, boost);
        actx.fillStyle = "rgba(" + CHAMP + "," + a.toFixed(3) + ")";
        actx.beginPath(); actx.arc(x, y, p.r, 0, 6.2832); actx.fill();
      } else if (p.k === "dust") {
        a = (0.3 + 0.4 * Math.abs(Math.sin(p.t * 5))) * boost;
        actx.fillStyle = "rgba(" + GOLD + "," + Math.min(1, a).toFixed(3) + ")";
        actx.beginPath(); actx.arc(x, y, p.r, 0, 6.2832); actx.fill();
      } else if (p.k === "bokeh") {
        a = p.a * boost * (0.75 + 0.25 * Math.sin(p.t * 4));
        g = actx.createRadialGradient(x, y, 0, x, y, p.r);
        g.addColorStop(0, "rgba(" + p.c + "," + (a * 1.5).toFixed(3) + ")");
        g.addColorStop(0.7, "rgba(" + p.c + "," + a.toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + p.c + ",0)");
        actx.fillStyle = g; actx.beginPath(); actx.arc(x, y, p.r, 0, 6.2832); actx.fill();
      } else if (p.k === "petal") {
        actx.save(); actx.translate(x, y); actx.rotate(p.rot || 0); actx.scale(1, Math.cos(p.t * 5 + p.d));
        actx.fillStyle = "rgba(" + p.c + ",0.55)";
        actx.beginPath(); actx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.2832); actx.fill();
        actx.restore();
      } else if (p.k === "heart") {
        actx.save(); actx.translate(x, y);
        actx.fillStyle = "rgba(" + ROSE + ",0.3)"; heartPath(actx, p.r);
        actx.restore();
      }
    });
  }
  function ambLoop(now) {
    aRaf = requestAnimationFrame(ambLoop);
    if (lowEnd && now - lastT < 32) return; /* about 30 frames a second on lower-end devices */
    var dt = clamp((now - lastT) / 16.67 || 1, 0.2, 3);
    lastT = now;
    warm += (warmTarget - warm) * 0.02 * dt;
    drawAmbient(dt);
  }
  function startAmbient() { if (!actx || reduceMotion || aRaf) return; lastT = performance.now(); aRaf = requestAnimationFrame(ambLoop); }
  function stopAmbient() { if (aRaf) { cancelAnimationFrame(aRaf); aRaf = 0; } }
  function setWarm(v) {
    warmTarget = v;
    if (reduceMotion) { warm = v; if (actx) drawAmbient(0); }
  }
  function sizeAmbient() {
    if (!actx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5);
    amb.width = Math.round(window.innerWidth * dpr);
    amb.height = Math.round(window.innerHeight * dpr);
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedAmbient();
    if (reduceMotion) drawAmbient(0);
  }
  var resizeT = 0;
  document.addEventListener("visibilitychange", function () { if (document.hidden) stopAmbient(); else startAmbient(); });

  /* gentle parallax: pointer devices only; touch devices keep the slow automatic drift */
  if (finePointer && !reduceMotion) {
    var decorEl = document.getElementById("decor"), pend = false, lx = 0, ly = 0;
    window.addEventListener("pointermove", function (e) {
      lx = e.clientX / window.innerWidth * 2 - 1; ly = e.clientY / window.innerHeight * 2 - 1;
      par.x = lx; par.y = ly;
      if (pend) return;
      pend = true;
      requestAnimationFrame(function () {
        pend = false;
        decorEl.style.setProperty("--px", lx.toFixed(3));
        decorEl.style.setProperty("--py", ly.toFixed(3));
      });
    }, { passive: true });
    /* subtle 3D tilt on cards */
    stage.addEventListener("pointermove", function (e) {
      var t = e.target.closest && e.target.closest(".tilt");
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2) + "deg");
      t.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(2) + "deg");
    });
    stage.addEventListener("pointerout", function (e) {
      var t = e.target.closest && e.target.closest(".tilt");
      if (t && !t.contains(e.relatedTarget)) { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); }
    });
  }

  /* ---------- confetti and golden sparkles ---------- */
  var canvas = document.getElementById("confetti");
  var ctx = canvas.getContext && canvas.getContext("2d");
  var parts = [];
  var raf = 0;
  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", function () {
    sizeCanvas();
    clearTimeout(resizeT);
    resizeT = setTimeout(sizeAmbient, 150);
  });
  sizeCanvas();
  function burst(count) {
    document.body.setAttribute("data-confetti-fired", "1"); /* lets tests detect the effect even in reduced motion */
    if (reduceMotion || !ctx) return;
    var colors = theme.confetti || ["#e3b08f", "#f6e3bf", "#c44662"];
    for (var i = 0; i < (count || 100); i++) {
      parts.push({
        t: "c", x: window.innerWidth / 2, y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 12 - 3,
        g: 0.3, size: 5 + Math.random() * 5, rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, color: colors[i % colors.length], life: 140 + Math.random() * 60, max: 200
      });
    }
    document.body.setAttribute("data-confetti", "1");
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function sparkle(x, y, count) {
    if (reduceMotion || !ctx) return;
    var colors = ["#f6e3bf", "#e3b08f", "#fff1d0"];
    for (var i = 0; i < (count || 40); i++) {
      var a = Math.random() * 6.2832, s = 1 + Math.random() * 4.5;
      parts.push({ t: "s", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: 0.05, size: 1.4 + Math.random() * 2.4,
        rot: 0, vr: 0, color: colors[i % 3], life: 60 + Math.random() * 50, max: 110 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < window.innerHeight + 20; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.rot += p.vr; p.life--;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.t === "s") {
        ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.2832); ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    if (parts.length) { raf = requestAnimationFrame(tick); }
    else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); document.body.removeAttribute("data-confetti"); }
  }

  /* ---------- optional sound (opt-in, never autoplays, needs audio.file in config.js) ---------- */
  (function sound() {
    var A = cfg.audio || {};
    var btn = document.getElementById("sound");
    if (!A.file || !btn) return;
    var audio = null, playing = false;
    function render() {
      btn.textContent = playing ? (A.onLabel || "Sound on") : (A.offLabel || "Sound off");
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    btn.hidden = false; render();
    btn.addEventListener("click", function () {
      if (!audio) {
        audio = new Audio(); audio.loop = true; audio.volume = 0.5; audio.preload = "none";
        audio.addEventListener("error", function () { playing = false; btn.hidden = true; });
        audio.src = A.file;
      }
      if (playing) { audio.pause(); playing = false; }
      else {
        playing = true;
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () { playing = false; render(); });
      }
      render();
    });
  })();

  /* ---------- screens ---------- */
  var screens = [];
  var idx = 0;
  var timer = null;
  var busy = false;

  function nextBtn(label) {
    return el("button", { text: label || "Continue", on: { click: function () { go(idx + 1); } } });
  }
  /* Headings reveal word by word. Words are separated by real spaces, so copy/paste and
     screen readers (aria-label) still get the full sentence. */
  function heading(tag, text) {
    var h = el(tag, { attrs: { tabindex: "-1", "data-focus": "1" } });
    var words = String(text == null ? "" : text).split(/\s+/).filter(Boolean);
    if (words.length) h.setAttribute("aria-label", words.join(" "));
    words.forEach(function (w, i) {
      if (i) h.appendChild(document.createTextNode(" "));
      var s = el("span", { cls: "w", text: w, attrs: { "aria-hidden": "true" } });
      s.style.setProperty("--i", Math.min(i, 12));
      h.appendChild(s);
    });
    return h;
  }

  function welcomeScreen() {
    var w = cfg.welcome || {};
    var cont = nextBtn(w.buttonLabel || "Continue");
    cont.className = "pop";
    cont.hidden = true;
    var heart = el("span", { cls: "env-heart", text: "\u2665", attrs: { "aria-hidden": "true" } });
    var env = el("button", { cls: "envelope", attrs: { type: "button", "aria-label": "Open the envelope", "aria-expanded": "false" } }, [
      el("span", { cls: "env-body" }),
      el("span", { cls: "env-card", text: hideName ? "Ab" : name(), attrs: { "aria-hidden": "true" } }),
      el("span", { cls: "env-front" }),
      el("span", { cls: "env-flap" }),
      heart
    ]);
        env.addEventListener("click", function () {
      env.classList.add("open");
      env.setAttribute("aria-expanded", "true");
      env.disabled = true;
      var r = env.getBoundingClientRect();
      sparkle(r.left + r.width / 2, r.top + r.height * 0.45, 55);
      cont.hidden = false;
      cont.focus({ preventScroll: true });
    });
    var headline = hideName ? (cfg.pageTitle || "A surprise for you") : (w.headline || "A surprise for " + name());
    var sec = el("section", { cls: "screen intro" }, [
      heading("h1", headline),
      el("p", { cls: "subline", text: w.subline || "Tap the envelope." }),
      env,
      el("div", { cls: "actions" }, [cont])
    ]);
    return sec;
  }

  function norm(s, cs) {
    s = String(s).replace(/\s+/g, " ").trim();
    return cs ? s : s.toLowerCase();
  }
  function passcodeScreen() {
    var p = cfg.passcode || {};
    var answers = (p.answers || []).filter(Boolean);
    if (!answers.length) { return null; }
    var cs = p.caseSensitive === true;
    var input = el("input", { attrs: { type: "text", id: "pc", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "go", "aria-describedby": "pcstatus" } });
    var status = el("div", { cls: "status", attrs: { id: "pcstatus", role: "status", "aria-live": "polite" } });
    var hint = el("p", { cls: "muted", text: "Hint: " + (p.hint || ""), attrs: { hidden: "" } });
    var hintBtn = el("button", { cls: "ghost", text: "Need a hint?", attrs: { type: "button" }, on: { click: function () { hint.hidden = false; hintBtn.hidden = true; } } });
    if (!p.hint) hintBtn.hidden = true;
    var form = el("form", { cls: "passcode card tilt", attrs: { novalidate: "" } }, [
      el("label", { text: p.prompt || "Enter the secret word", attrs: { for: "pc" } }),
      el("div", { cls: "actions" }, [input]),
      status, hint,
      el("div", { cls: "actions" }, [el("button", { text: "Unlock", attrs: { type: "submit" } }), hintBtn])
    ]);
    var unlocked = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (unlocked) return;
      var v = norm(input.value, cs);
      var ok = answers.some(function (a) { return norm(a, cs) === v; });
      if (ok) {
        unlocked = true;
        status.className = "status ok";
        status.textContent = "Unlocked.";
        form.classList.remove("shake"); form.classList.add("ok");
        var r = form.getBoundingClientRect();
        sparkle(r.left + r.width / 2, r.top + r.height / 2, 70);
        setTimeout(function () { go(idx + 1); }, reduceMotion ? 0 : 800);
      } else {
        status.className = "status err";
        status.textContent = "Not quite. Try again.";
        form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
        input.select();
      }
    });
    var sec = el("section", { cls: "screen" }, [heading("h2", "A little secret first"), form]);
    sec._enter = function () { /* "Start over" returns here: reset the gate */
      unlocked = false; input.value = ""; status.className = "status"; status.textContent = "";
      form.classList.remove("ok"); form.classList.remove("shake");
    };
    return sec;
  }

  function letterScreen() {
    var L = cfg.letter || {};
    var paras = (L.paragraphs || []).map(function (t, i) {
      var p = el("p", { text: t });
      p.style.animationDelay = reduceMotion ? "0s" : (0.5 + i * 0.3) + "s";
      return p;
    });
    var card = el("div", { cls: "card letter tilt" }, [heading("h2", L.title || "Dear " + name() + ",")].concat(paras));
    if (L.signoff) {
      var so = el("p", { cls: "signoff", text: L.signoff + (L.signature ? " " + L.signature : "") });
      so.style.animationDelay = reduceMotion ? "0s" : (0.5 + paras.length * 0.3) + "s";
      card.appendChild(so);
    }
    return el("section", { cls: "screen" }, [card, el("div", { cls: "actions" }, [nextBtn()])]);
  }

  function cakeScreen() {
    var C = cfg.cake || {};
    var n = clamp(parseInt(C.candles, 10) || 5, 1, 12);
    var status = el("p", { cls: "status", attrs: { role: "status", "aria-live": "polite" } });
    var blow = el("button", { text: C.blowLabel || "Blow out the candles", attrs: { disabled: "" } });
    var cut = el("button", { text: C.cutLabel || "Cut the cake", attrs: { disabled: "" } });
    var nxt = nextBtn(); nxt.hidden = true; nxt.className = "pop";
    var scene = null;
    function say(t, cls) { status.className = "status" + (cls ? " " + cls : ""); status.textContent = t; }
    function showMessage() {
      say(C.afterCutMessage || "Enjoy the cake!", "cake-msg");
      burst(90);
      nxt.hidden = false; nxt.focus({ preventScroll: true });
    }
    function outStep() {
      blow.disabled = true; cut.disabled = false;
      say("All candles are out. Your wish is on its way.");
      cut.focus({ preventScroll: true });
    }
    try {
      if (!window.BirthdayCake) throw new Error("cake.js is missing");
      scene = window.BirthdayCake.create({
        candles: n, reduceMotion: reduceMotion, lowEnd: lowEnd, finePointer: finePointer,
        onState: function (st) { if (st === "lit") blow.disabled = false; },
        onBlowStart: function () { blow.disabled = true; say("The candles are going out\u2026"); },
        onBlowDone: outStep,
        onCutStart: function () { cut.disabled = true; say("Cutting the cake\u2026"); },
        onCutDone: showMessage,
        onError: function () { /* the scene already finished the step; make sure the visitor can continue */
          if (nxt.hidden && cut.disabled && blow.disabled && status.className.indexOf("cake-msg") < 0) { /* nothing to do */ }
        }
      });
    } catch (err) {
      if (window.console) console.warn("Cake scene unavailable; using the simple version.", err);
      scene = null;
    }
    var sceneBox = scene ? scene.root : el("div", { cls: "cake-fallback", attrs: { "aria-hidden": "true" }, text: "\uD83C\uDF82" });
    if (!scene) blow.disabled = false;
    blow.addEventListener("click", function () {
      if (scene) { scene.blowAll(); return; }
      blow.disabled = true; outStep();
    });
    cut.addEventListener("click", function () {
      if (scene) { scene.cut(); return; }
      cut.disabled = true; showMessage();
    });
    var sec = el("section", { cls: "screen" }, [
      heading("h2", C.wishPrompt || "Make a wish"), sceneBox, status,
      el("div", { cls: "actions" }, [blow, cut, nxt])
    ]);
    sec._enter = function () {
      if (!scene) return;
      if (scene.needsReset()) { scene.reset(); blow.disabled = true; cut.disabled = true; nxt.hidden = true; say(""); }
      scene.enter();
    };
    sec._exit = function () { if (scene) scene.exit(); };
    return sec;
  }

  /* swipe left/right on touch screens */
  function swipe(node, cb) {
    var sx = null;
    node.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    node.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) cb(dx > 0 ? -1 : 1);
    }, { passive: true });
  }

  /* photo viewer overlay */
  var lb = null;
  function lbRender() {
    var ph = lb.photos[lb.i];
    lb.cap.textContent = ph.caption || "";
    lb.count.textContent = (lb.i + 1) + " / " + lb.photos.length;
    lb.img.alt = ph.alt || ph.caption || "Photo " + (lb.i + 1);
    lb.img.style.animation = "none"; void lb.img.offsetWidth; lb.img.style.animation = "";
    lb.img.src = ph.file;
    lb.prev.hidden = lb.next.hidden = lb.photos.length < 2;
  }
  function lbStep(d) {
    lb.i = (lb.i + d + lb.photos.length) % lb.photos.length;
    lbRender();
    if (lb.sync) lb.sync(lb.i);
  }
  function closeLightbox() {
    if (!lb || lb.box.hidden) return;
    lb.box.hidden = true; body.classList.remove("lb-open");
    if (lb.opener && document.contains(lb.opener)) lb.opener.focus({ preventScroll: true });
  }
  function openLightbox(photos, i, sync, opener) {
    if (!lb) {
      var img = el("img", { cls: "lb-img", attrs: { alt: "" } });
      var cap = el("p", { cls: "lb-cap" });
      var count = el("p", { cls: "lb-count muted" });
      var close = el("button", { cls: "ghost lb-close", text: "Close", attrs: { type: "button", "aria-label": "Close photo viewer" }, on: { click: closeLightbox } });
      var prev = el("button", { cls: "ghost", text: "\u2190 Previous", attrs: { type: "button", "aria-label": "Previous photo" }, on: { click: function () { lbStep(-1); } } });
      var next = el("button", { cls: "ghost", text: "Next \u2192", attrs: { type: "button", "aria-label": "Next photo" }, on: { click: function () { lbStep(1); } } });
      var box = el("div", { attrs: { id: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Photo viewer", hidden: "" } },
        [close, img, cap, count, el("div", { cls: "actions" }, [prev, next])]);
      img.addEventListener("error", function () { cap.textContent = "This photo couldn't be loaded."; });
      box.addEventListener("click", function (e) { if (e.target === box) closeLightbox(); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
        else if (e.key === "ArrowLeft") { lbStep(-1); }
        else if (e.key === "ArrowRight") { lbStep(1); }
        else if (e.key === "Tab") { /* keep focus inside the dialog */
          var f = [close, prev, next].filter(function (b) { return !b.hidden; });
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      swipe(box, function (d) { lbStep(d); });
      document.body.appendChild(box);
      lb = { box: box, img: img, cap: cap, count: count, close: close, prev: prev, next: next, photos: [], i: 0, sync: null, opener: null };
    }
    lb.photos = photos; lb.i = i; lb.sync = sync; lb.opener = opener;
    lb.box.hidden = false; body.classList.add("lb-open");
    lbRender();
    lb.close.focus({ preventScroll: true });
  }

  function galleryScreen() {
    var G = cfg.gallery || {};
    var photos = G.photos || [];
    if (!photos.length) return null;
    var i = 0;
    var box;
    var frame = el("div", { cls: "photo-frame" });
    var cap = el("p", { cls: "caption", attrs: { "aria-live": "polite" } });
    var counter = el("p", { cls: "counter" });
    
function show(animate) {
  var ph = photos[i];
  var holder = el("div", { cls: "ph" });
  var img = el("img", {
    attrs: {
      alt: ph.alt || ph.caption || "Photo " + (i + 1),
      decoding: "async"
    }
  });

  // Keep the current frame visible while the next image loads.
  img.style.opacity = "0";

  img.addEventListener("load", function () {
    // Ignore an image that is no longer the selected photo.
    if (i !== currentIndex) return;

    holder.classList.add("loaded");
    img.style.opacity = "1";
    frame.style.minHeight = holder.offsetHeight + "px";

    // Release the temporary height after the image is displayed.
    requestAnimationFrame(function () {
      frame.style.minHeight = "";
    });
  });

  img.addEventListener("error", function () {
    if (i !== currentIndex) return;
    frame.textContent = "";
    frame.appendChild(
      el("div", {
        cls: "photo-fallback",
        text: "This photo couldn't be loaded."
      })
    );
  });

  var currentIndex = i;
  img.src = ph.file;

  holder.appendChild(img);

  var photoButton = el("button", {
    cls: "plain",
    attrs: {
      type: "button",
      "aria-label": "View this photo larger"
    },
    on: {
      click: function () {
        openLightbox(
          photos,
          i,
          function (n) {
            i = n;
            show(false);
          },
          box
        );
      }
    }
  }, [holder]);

  // Update the frame only after the new photo has loaded.
  function displayPhoto() {
    frame.textContent = "";
    frame.appendChild(photoButton);
    holder.classList.add("loaded");
    img.style.opacity = "1";
  }

  img.addEventListener("load", displayPhoto, { once: true });

  if (img.complete && img.naturalWidth) {
    displayPhoto();
  } else {
    // Preload first, then replace the previous photo.
    var preload = new Image();
    preload.onload = function () {
      if (i !== currentIndex) return;
      img.src = ph.file;
    };
    preload.onerror = function () {
      if (i !== currentIndex) return;
      frame.textContent = "";
      frame.appendChild(
        el("div", {
          cls: "photo-fallback",
          text: "This photo couldn't be loaded."
        })
      );
    };
    preload.src = ph.file;
  }

  cap.textContent = ph.caption || "";
  counter.textContent = (i + 1) + " / " + photos.length;

  if (animate !== false && !reduceMotion) {
    frame.classList.remove("swap");
    void frame.offsetWidth;
    frame.classList.add("swap");
  }
}

    function step(d) { i = (i + d + photos.length) % photos.length; show(); }
    var prev = el("button", { cls: "ghost", text: "\u2190 Previous", attrs: { "aria-label": "Previous photo" }, on: { click: function () { step(-1); } } });
    var next = el("button", { cls: "ghost", text: "Next \u2192", attrs: { "aria-label": "Next photo" }, on: { click: function () { step(1); } } });
    if (photos.length < 2) { prev.hidden = true; next.hidden = true; }
    box = el("div", { cls: "gallery", attrs: { role: "group", "aria-roledescription": "carousel", "aria-label": "Photo gallery", tabindex: "0" } }, [frame, cap, counter, el("div", { cls: "actions" }, [prev, next])]);
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { step(-1); } else if (e.key === "ArrowRight") { step(1); }
    });
    swipe(frame, step);
    show(false);
    return el("section", { cls: "screen" }, [heading("h2", G.title || "Memories"), box, el("div", { cls: "actions" }, [nextBtn()])]);
  }

  function timelineScreen() {
    var T = cfg.timeline || {};
    var ev = T.events || [];
    if (!ev.length) return null;
    var ol = el("ol", { cls: "timeline" });
    ev.forEach(function (e, k) {
      var li = el("li", {}, [
        el("div", { cls: "date", text: e.date || "" }),
        el("h3", { text: e.title || "" }),
        el("p", { text: e.text || "" })
      ]);
      li.style.animationDelay = reduceMotion ? "0s" : (0.3 + k * 0.2) + "s";
      ol.appendChild(li);
    });
    return el("section", { cls: "screen" }, [heading("h2", T.title || "Moments"), ol, el("div", { cls: "actions" }, [nextBtn()])]);
  }

  function countdownScreen() {
    var D = cfg.countdown || {};
    var target = new Date(D.targetDate);
    if (isNaN(target.getTime())) return null;
    var cells = {};
    var grid = el("div", { cls: "count-grid" });
    ["days", "hours", "minutes", "seconds"].forEach(function (u) {
      var b = el("b", { text: "0" });
      cells[u] = b;
      grid.appendChild(el("div", {}, [b, el("span", { text: u })]));
    });
    var msg = el("p", { cls: "status", attrs: { role: "status" } });
    function update() {
      var ms = target.getTime() - Date.now();
      if (ms <= 0) { Object.keys(cells).forEach(function (k) { cells[k].textContent = "0"; }); msg.textContent = "The day has arrived!"; return; }
      var s = Math.floor(ms / 1000);
      cells.days.textContent = Math.floor(s / 86400);
      cells.hours.textContent = Math.floor(s % 86400 / 3600);
      cells.minutes.textContent = Math.floor(s % 3600 / 60);
      cells.seconds.textContent = s % 60;
    }
    var sec = el("section", { cls: "screen" }, [heading("h2", D.label || "Counting down"), grid, msg, el("div", { cls: "actions" }, [nextBtn()])]);
    sec._enter = function () { update(); timer = setInterval(update, 1000); };
    return sec;
  }

  function finalScreen() {
    var F = cfg.final || {};
    var reveal = el("div", { cls: "reveal", text: F.revealText || "", attrs: { hidden: "", role: "status" } });
    var btn = el("button", { cls: "glow", text: F.revealLabel || "One last surprise" });
    if (!F.revealText) btn.hidden = true;
    function finale() {
      burst(100);
      sparkle(window.innerWidth / 2, window.innerHeight * 0.4, 70);
      setTimeout(function () { sparkle(window.innerWidth / 2, window.innerHeight * 0.4, 40); }, 700);
    }
    btn.addEventListener("click", function () { reveal.hidden = false; btn.disabled = true; finale(); });
    var again = el("button", { cls: F.revealText ? "ghost" : "glow", text: "Start over", on: { click: function () { go(0); } } });
    var sec = el("section", { cls: "screen" }, [
      el("div", { cls: "card final-card tilt" }, [heading("h2", F.headline || "Happy Birthday, " + name()), el("p", { text: F.message || "" })]),
      reveal, el("div", { cls: "actions" }, [btn, again])
    ]);
    /* With no revealText there is no button, so the celebration plays when this screen appears. */
    if (!F.revealText) sec._enter = function () { setTimeout(finale, 900); };
    return sec;
  }

  var builders = [
    ["welcome", welcomeScreen], ["passcode", passcodeScreen], ["letter", letterScreen], ["cake", cakeScreen],
    ["gallery", galleryScreen], ["timeline", timelineScreen], ["countdown", countdownScreen], ["final", finalScreen]
  ];
  builders.forEach(function (b) {
    if (!on(cfg, b[0])) return;
    var node = b[1]();
    if (node) { node._name = b[0]; screens.push(node); }
    else if (window.console) console.warn("Module '" + b[0] + "' is enabled but has no usable content; skipped.");
  });
  if (!screens.length) { stage.textContent = "Nothing to show yet."; return; }

  var progress = document.getElementById("progress");
  function swap(i) {
    var prev = screens[idx];
    if (prev && prev !== screens[i] && prev._exit) prev._exit();
    idx = i;
    stage.textContent = "";
    var s = screens[idx];
    s.classList.remove("leave");
    stage.appendChild(s);
    progress.textContent = "";
    screens.forEach(function (_, k) { progress.appendChild(el("i", { cls: k === idx ? "on" : "" })); });
    var inner = s._name !== "welcome" && s._name !== "passcode";
    body.classList.toggle("is-warm", inner);
    body.classList.toggle("is-final", s._name === "final");
    setWarm(inner ? 1 : 0);
    var h = s.querySelector("[data-focus]");
    if (h) h.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    if (s._enter) s._enter();
  }
  function go(i) {
    if (busy) return;
    if (timer) { clearInterval(timer); timer = null; }
    closeLightbox();
    var target = clamp(i, 0, screens.length - 1);
    var cur = stage.firstElementChild;
    if (cur && !reduceMotion) {
      busy = true;
      cur.classList.add("leave");
      setTimeout(function () { busy = false; swap(target); }, 420);
    } else {
      swap(target);
    }
  }

  try { sizeAmbient(); startAmbient(); }
  catch (err) { if (window.console) console.warn("Ambient background unavailable; using the plain background.", err); }
  go(0);
})();

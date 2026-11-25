/* Kushal Mundra · bento control room */
(function () {
'use strict';
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const reduced = root.classList.contains('reduced');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
let lenis = null;

/* ---------------- basics that work without GSAP ---------------- */
function basics() {
  $$('.copy-btn').forEach((btn) => btn.addEventListener('click', async () => {
    const label = btn.querySelector('span');
    try { await navigator.clipboard.writeText(btn.dataset.email); label.textContent = 'Copied'; }
    catch { label.textContent = btn.dataset.email; }
    setTimeout(() => { label.textContent = 'Copy email'; }, 2000);
  }));
  const form = $('#message-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = d.get('subject') || `Hello from ${d.get('name')}`;
    const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
    window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  const clock = $('.clock');
  const tick = () => { if (clock) clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 30000);

  // spotlight that follows the cursor on every tile
  if (finePointer) document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('.tile');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

/* ---------------- small canvases ---------------- */
function fitCanvas(c) {
  const dpr = Math.min(devicePixelRatio, 2);
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: r.height };
}
function whenVisible(el, cb) {
  let on = false;
  new IntersectionObserver((en) => { on = en[0].isIntersecting; }, { rootMargin: '80px' }).observe(el);
  return () => on && !document.hidden;
}

// audio waveform for the SB Infowaves tile; the active language moves along
function initWave() {
  const c = $('.wave'); if (!c) return;
  let s = fitCanvas(c); new ResizeObserver(() => { s = fitCanvas(c); }).observe(c);
  const vis = whenVisible(c, () => {});
  const labels = $$('.t-now .langs span');
  let lane = 0, t = 0;
  if (!reduced) setInterval(() => { lane = (lane + 1) % 4; labels.forEach((l, i) => { l.style.color = i === lane ? 'var(--acc)' : ''; }); }, 1600);
  (function draw() {
    requestAnimationFrame(draw);
    if (!vis()) return;
    t += reduced ? 0 : 0.016;
    const { g, w, h } = s; g.clearRect(0, 0, w, h);
    const bars = Math.floor(w / 6), mid = h / 2;
    for (let i = 0; i < bars; i++) {
      const seg = Math.floor((i / bars) * 4);
      const a = Math.abs(Math.sin(i * 0.35 + t * 3.1) * Math.sin(i * 0.11 - t * 1.7) + Math.sin(i * 0.9 + t * 5) * 0.25);
      const amp = (0.12 + a * (seg === lane ? 0.85 : 0.35)) * mid;
      g.fillStyle = seg === lane ? 'rgba(200,255,62,.9)' : 'rgba(255,255,255,.16)';
      g.fillRect(i * 6, mid - amp, 3, amp * 2);
    }
  })();
}

// Kira orb: rings that wobble harder while Kira is speaking
const orbs = [];
function initOrbs() {
  $$('.orb').forEach((c) => {
    let s = fitCanvas(c); new ResizeObserver(() => { s = fitCanvas(c); }).observe(c);
    const vis = whenVisible(c);
    const o = { talk: 0, target: 0.15 }; orbs.push(o);
    let t = 0;
    (function draw() {
      requestAnimationFrame(draw);
      if (!vis()) return;
      t += reduced ? 0 : 0.016;
      o.talk += (o.target - o.talk) * 0.06;
      const { g, w, h } = s; g.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        for (let a = 0; a <= 120; a++) {
          const th = (a / 120) * Math.PI * 2;
          const n = Math.sin(th * 3 + t * (1.4 + k * 0.3)) * 0.5 + Math.sin(th * 5 - t * 2.1 + k) * 0.5;
          const r = R * (0.55 + k * 0.13) + n * R * (0.04 + o.talk * 0.16);
          const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
          a ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.strokeStyle = k === 0 ? 'rgba(200,255,62,.95)' : `rgba(200,255,62,${0.34 - k * 0.055})`;
        g.lineWidth = k === 0 ? 2 : 1;
        g.stroke();
      }
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      grd.addColorStop(0, `rgba(200,255,62,${0.18 + o.talk * 0.25})`); grd.addColorStop(1, 'rgba(200,255,62,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, Math.PI * 2); g.fill();
    })();
  });
}

// knowledge graph for PersonaGraph: one persona lights up its neighbourhood
function initGraph() {
  const svg = $('.graph-svg'); if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const nodes = Array.from({ length: 46 }, () => ({ x: 30 + rnd() * 340, y: 24 + rnd() * 230 }));
  const edges = [];
  nodes.forEach((a, i) => {
    nodes.map((b, k) => [Math.hypot(a.x - b.x, a.y - b.y), k]).filter(([, k]) => k !== i).sort((p, q) => p[0] - q[0]).slice(0, 2)
      .forEach(([, k]) => { if (!edges.some((e) => (e[0] === k && e[1] === i))) edges.push([i, k]); });
  });
  const lineEls = edges.map(([a, b]) => { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', nodes[a].x); l.setAttribute('y1', nodes[a].y); l.setAttribute('x2', nodes[b].x); l.setAttribute('y2', nodes[b].y); svg.appendChild(l); return l; });
  const dotEls = nodes.map((n, i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', i % 9 === 0 ? 5 : 3); svg.appendChild(c); return c; });
  function light(center) {
    const hot = new Set([center]);
    edges.forEach(([a, b]) => { if (a === center) hot.add(b); if (b === center) hot.add(a); });
    const ring1 = new Set(hot);
    edges.forEach(([a, b]) => { if (ring1.has(a)) hot.add(b); if (ring1.has(b)) hot.add(a); });
    dotEls.forEach((d, i) => d.classList.toggle('hot', hot.has(i)));
    lineEls.forEach((l, i) => l.classList.toggle('hot', hot.has(edges[i][0]) && hot.has(edges[i][1])));
    dotEls[center].setAttribute('r', 7);
    if (window.gsap && !reduced) gsap.fromTo(dotEls.filter((d, i) => hot.has(i)), { scale: 0.2, transformOrigin: 'center', transformBox: 'fill-box' }, { scale: 1, duration: 0.7, stagger: 0.03, ease: 'back.out(3)' });
  }
  let cur = 0; light(cur);
  if (!reduced) setInterval(() => { dotEls[cur].setAttribute('r', cur % 9 === 0 ? 5 : 3); cur = (cur + 9) % nodes.length; light(cur); }, 2400);
}

// skills cylinder made of tags
function initCylinder() {
  const cyl = $('.cyl'); if (!cyl) return;
  const words = ['LLMs', 'RAG', 'GraphRAG', 'Knowledge Graphs', 'AI Agents', 'Tool Calling', 'Claude API', 'Ollama', 'PyTorch', 'Hugging Face', 'RoBERTa', 'scikit-learn', 'ResNet-18', 'BiLSTM', 'SHAP', 'Whisper', 'IndicConformer', 'Silero VAD', 'Deepgram', 'NLP', 'Python', 'C++', 'SQL', 'JavaScript', 'Go', 'Haskell', 'NetworkX', 'PySpark', 'Flask', 'SLURM', 'LiveKit', 'ffmpeg', 'Unity', 'Blender', 'Figma', 'BERTScore'];
  const hot = new Set(['LLMs', 'GraphRAG', 'AI Agents', 'Whisper', 'Python', 'PyTorch']);
  const per = 9;
  const els = words.map((w, i) => { const s = document.createElement('span'); s.textContent = w; if (hot.has(w)) s.className = 'hot'; cyl.appendChild(s); return { s, i }; });
  const host = cyl.parentElement;
  let rot = 0, vel = 0.18, drag = false, lx = 0;
  function layout() {
    const R = Math.min(host.clientWidth * 0.36, 230);
    const rows = Math.ceil(words.length / per), gapY = Math.min(40, (host.clientHeight - 90) / rows);
    els.forEach(({ s, i }) => {
      const row = Math.floor(i / per), a = (i % per) * (360 / per) + row * 20;
      s.style.transform = `translate(-50%, -50%) translateY(${(row - (rows - 1) / 2) * gapY}px) rotateY(${a}deg) translateZ(${R}px)`;
    });
  }
  layout(); new ResizeObserver(layout).observe(host);
  host.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => { if (!drag) return; vel = (e.clientX - lx) * 0.35; lx = e.clientX; });
  host.addEventListener('pointerup', () => { drag = false; });
  const vis = whenVisible(host);
  (function spin() {
    requestAnimationFrame(spin);
    if (!vis()) return;
    if (!drag) vel += ((reduced ? 0 : 0.18) - vel) * 0.03;
    rot += vel;
    cyl.style.transform = `rotateX(-10deg) rotateY(${rot}deg)`;
  })();
}

/* ---------------- detail sheets ---------------- */
function initSheets() {
  const sheet = $('#sheet'), panel = $('.sheet-panel'), bg = $('.sheet-bg'), content = $('.sheet-content'), scroller = $('.sheet-scroll');
  let from = null, lastFocus = null, busy = false;
  const rectOf = (el) => el.getBoundingClientRect();
  function open(id, src) {
    const tpl = $('#d-' + id); if (!tpl || busy) return;
    busy = true; from = src; lastFocus = document.activeElement;
    content.innerHTML = ''; content.appendChild(tpl.content.cloneNode(true));
    scroller.scrollTop = 0;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    lenis?.stop(); root.style.overflow = 'hidden';
    if (!window.gsap || reduced) { gsapless(); return; }
    const f = rectOf(panel), r = rectOf(src);
    gsap.set(panel, { x: r.left - f.left, y: r.top - f.top, scaleX: r.width / f.width, scaleY: r.height / f.height, opacity: 1 });
    gsap.set(content.children, { opacity: 0, y: 40 });
    const tl = gsap.timeline({ onComplete: () => { busy = false; $('.sheet-close').focus({ preventScroll: true }); } });
    tl.to(bg, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      .to(panel, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.85, ease: 'expo.inOut' }, 0)
      .to(content.children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, 0.55);
    function gsapless() { bg.style.opacity = 1; busy = false; }
  }
  function close() {
    if (!sheet.classList.contains('open') || busy) return;
    busy = true;
    const done = () => {
      sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
      lenis?.start(); root.style.overflow = ''; busy = false;
      if (window.gsap) gsap.set(panel, { clearProps: 'transform,opacity' });
      lastFocus?.focus?.({ preventScroll: true });
    };
    if (!window.gsap || reduced) { bg.style.opacity = 0; done(); return; }
    const f = rectOf(panel), r = from ? rectOf(from) : null;
    const onScreen = r && r.bottom > 0 && r.top < innerHeight;
    const tl = gsap.timeline({ onComplete: done });
    tl.to(content.children, { opacity: 0, duration: 0.25 }, 0);
    if (onScreen) tl.to(panel, { x: r.left - f.left, y: r.top - f.top, scaleX: r.width / f.width, scaleY: r.height / f.height, duration: 0.75, ease: 'expo.inOut' }, 0.1);
    else tl.to(panel, { opacity: 0, scale: 0.94, duration: 0.5, ease: 'power3.in' }, 0.1);
    tl.to(bg, { opacity: 0, duration: 0.5 }, 0.3);
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); open(o.dataset.open, o.closest('.tile') || o); return; }
    if (e.target.closest('.sheet-close') || e.target === bg) close();
    const c = e.target.closest('[data-close]');
    if (c) { e.preventDefault(); close(); setTimeout(() => go(c.getAttribute('href')), 900); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.tile[role="button"]')) { e.preventDefault(); e.target.click(); }
    if (e.key === 'Tab' && sheet.classList.contains('open')) { // keep focus inside
      const f = $$('button, a[href], input, textarea', panel); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
}

function go(hash) {
  const el = hash === '#top' ? 0 : $(hash);
  if (el === null) return;
  if (lenis) lenis.scrollTo(el, { offset: hash === '#top' ? 0 : -64, duration: 1.6 });
  else if (el === 0) scrollTo({ top: 0, behavior: 'smooth' });
  else el.scrollIntoView({ behavior: 'smooth' });
}

/* ================================================================
   Full motion
   ================================================================ */
async function start() {
  const { ScrollTrigger, SplitText, ScrambleTextPlugin, Flip } = window;
  gsap.registerPlugin(...[ScrollTrigger, SplitText, ScrambleTextPlugin, Flip].filter(Boolean));
  gsap.defaults({ ease: 'expo.out', duration: 1 });
  history.scrollRestoration = 'manual';

  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-close')) return;
    e.preventDefault(); go(a.getAttribute('href'));
  });
  $$('.tile[data-go]').forEach((t) => t.addEventListener('click', () => go(t.dataset.go)));

  // 3D cores (hero + contact)
  // the 3D cores load in the background; nothing waits on the network
  const mobile = innerWidth < 700;
  const proxy = () => { let real = null, sc = 0; return { set(c) { real = c; c.setScatter(sc); }, kick: (v) => real?.kick(v), setScatter: (v) => { sc = v; real?.setScatter(v); } }; };
  const core = proxy(), core2 = proxy();
  if (window.createCore) {
    window.createCore($('.core3d'), { nodes: mobile ? 170 : 260, pulses: mobile ? 40 : 70, offsetX: 0.29 }).then((c) => { core.set(c); gsap.from($('.core3d'), { opacity: 0, scale: 0.9, duration: 1.6 }); }).catch((e) => console.warn('3D unavailable', e));
    window.createCore($('.contact-3d'), { nodes: mobile ? 120 : 200, pulses: 50, offsetX: 0.3, rings: false, radius: 1.7 }).then((c) => core2.set(c)).catch(() => {});
  }

  await Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

  if (reduced) { staticState(); initSheets(); return; }
  initSheets();
  await intro(core);
  initTilt();
  initMagnetic();
  initBoardExit(core);
  initManifesto();
  initDeck();
  initProjects();
  initExperience();
  initProof();
  initPapers();
  initSkills();
  initEdu();
  initContact(core2);
  initChrome(); // created last so its triggers account for every pin above
  ScrollTrigger.refresh();
  // links from the old pages (for example /projects.html) arrive with a section hash
  if (location.hash.length > 1 && $(location.hash)) go(location.hash);
}

function staticState() {
  $$('.ring, .gauge').forEach((g) => g.style.setProperty('--p', (+g.dataset.value || +g.closest('[data-value]')?.dataset.value || 0) / 100));
  $('.t-tcs .ring')?.style.setProperty('--p', 0.942);
  $$('.rank-num').forEach((r) => { r.textContent = '2,932'; });
}

/* ---------------- intro: loader, then tiles fly in from depth ---------------- */
function intro(core) {
  return new Promise((resolve) => {
    const count = $('.loader-count'), cells = $$('.loader-grid i'), o = { v: 0 };
    const tiles = $$('.board > .tile');
    const tl = gsap.timeline({ onComplete: resolve });
    tl.from(cells, { scale: 0, rotate: -90, stagger: 0.06, duration: 0.6, ease: 'back.out(2)' })
      .to(o, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(o.v)).padStart(3, '0'); } }, 0)
      .to(cells, { scale: 6, opacity: 0, stagger: { each: 0.04, from: 'center' }, duration: 0.7, ease: 'expo.in' }, '+=.05')
      .to('.loader', { opacity: 0, duration: 0.5, onComplete: () => $('.loader').remove() }, '-=.3');

    // tiles: each starts deep in space, tilted, and lands in the grid
    const vw = innerWidth, vh = innerHeight;
    tl.addLabel('tiles', '-=0.45');
    tiles.forEach((t) => {
      const r = t.getBoundingClientRect();
      const dx = (r.left + r.width / 2 - vw / 2) / vw, dy = (r.top + r.height / 2 - vh / 2) / vh;
      tl.fromTo(t, { opacity: 0, x: dx * 260, y: dy * 220 + 60, z: -900, rotateX: -dy * 50 + 20, rotateY: dx * 50, transformPerspective: 1400 },
        { opacity: 1, x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, 'tiles+=' + (Math.hypot(dx, dy) * 0.5).toFixed(3));
    });
    tl.set(tiles, { opacity: 1 });

    // name rises letter by letter
    const split = new SplitText('.hn', { type: 'chars' });
    tl.from(split.chars, { yPercent: 115, rotateX: -90, opacity: 0, stagger: 0.035, duration: 1.2, transformPerspective: 600, transformOrigin: '50% 100%',
      onComplete: () => $$('.hn').forEach((h) => { h.style.overflow = 'visible'; }) }, 'tiles+=0.35');
    tl.from('.t-hero .label, .hero-role, .hero-lead', { y: 20, opacity: 0, stagger: 0.08, duration: 1 }, 'tiles+=0.7');
    if (core) tl.add(() => core.kick(1.2), 'tiles+=0.2');

    // live numbers on the board
    tl.add(() => {
      const r = $('.t-rank .count'), v = { n: 251755 };
      gsap.to(v, { n: 2932, duration: 2.4, ease: 'expo.out', onUpdate: () => { r.textContent = fmt(v.n); } });
      gsap.fromTo('.t-tcs .ring', { '--p': 0 }, { '--p': 0.942, duration: 2, ease: 'expo.out' });
      const tc = $('.t-tcs .count'), w = { n: 0 };
      gsap.to(w, { n: 94.2, duration: 2, ease: 'expo.out', onUpdate: () => { tc.textContent = fmt(w.n, 1); } });
      gsap.fromTo('.pg-bars i', { '--s': 0 }, { '--s': 1, duration: 1.6, stagger: 0.2, ease: 'expo.out' });
      gsap.from('.mini-chat .b', { y: 20, opacity: 0, scale: 0.9, stagger: 0.5, duration: 0.8, ease: 'back.out(2)', onStart: () => setTimeout(() => orbs[0] && (orbs[0].target = 0.9), 500) });
      setTimeout(() => orbs[0] && (orbs[0].target = 0.2), 2600);
    }, 'tiles+=0.4');

    // role line scrambles through the four roles
    const roleEl = $('.role-text'), roles = JSON.parse(roleEl.dataset.roles);
    let ri = 0;
    setInterval(() => { ri = (ri + 1) % roles.length; gsap.to(roleEl, { duration: 1, scrambleText: { text: roles[ri], chars: '01/_#{}*', speed: 0.5 } }); }, 3000);
  });
}

/* ---------------- top bar, dock, progress ---------------- */
function initChrome() {
  const topbar = $('.topbar');
  ScrollTrigger.create({ start: 80, onToggle: (s) => topbar.classList.toggle('solid', s.isActive) });
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  const links = $$('.dock a'), pill = $('.dock-pill');
  const movePill = (a) => {
    links.forEach((l) => l.classList.toggle('active', l === a));
    if (pill && getComputedStyle(pill).display !== 'none') gsap.to(pill, { x: a.offsetLeft - 6, width: a.offsetWidth, duration: 0.6, ease: 'expo.out' });
  };
  gsap.set(pill, { left: 6, x: links[0].offsetLeft - 6, width: links[0].offsetWidth });
  links.forEach((a) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? $('.board-wrap') : $(id);
    if (!el) return;
    ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && movePill(a) });
  });
  // dock slides in after the intro
  gsap.from('.dock', { y: 100, opacity: 0, duration: 1.2, delay: 0.2 });
  gsap.from('.topbar > *', { y: -30, opacity: 0, stagger: 0.08, duration: 1 });
}

/* ---------------- 3D tilt on tiles ---------------- */
function initTilt() {
  if (!finePointer) return;
  $$('.board > .tile, .pcard, .proof-board > .tile, .sk, .edu-board > .tile, .paper').forEach((el) => {
    const amt = el.offsetWidth > 600 ? 4 : 9;
    const rx = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 1000 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * amt);
      rx(-((e.clientY - r.top) / r.height - 0.5) * amt);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
  // photo parallax inside its tile
  const img = $('.t-photo img'), ph = $('.t-photo');
  ph?.addEventListener('pointermove', (e) => {
    const r = ph.getBoundingClientRect();
    gsap.to(img, { x: ((e.clientX - r.left) / r.width - 0.5) * -18, y: ((e.clientY - r.top) / r.height - 0.5) * -18 - 20, scale: 1.06, duration: 0.8, ease: 'power3.out' });
  });
  ph?.addEventListener('pointerleave', () => gsap.to(img, { x: 0, y: -20, scale: 1, duration: 1 }));
  gsap.set(img, { y: -20 });
}

function initMagnetic() {
  if (!finePointer) return;
  $$('.magnetic, .chip-btn, .btn').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.3); });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

/* ---------------- board breaks apart into depth as you scroll ---------------- */
function initBoardExit(core) {
  if (core) ScrollTrigger.create({ trigger: '.board-wrap', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => core.setScatter(s.progress * 1.2) });
  // the tiles only break apart where the whole board fits on one screen
  if (!matchMedia('(min-width: 1100px) and (min-height: 680px)').matches) return;
  const board = $('#board'), tiles = $$('.board > .tile');
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.board-wrap', start: 'top top', end: 'bottom top', scrub: 0.6 } });
  tl.to(board, { rotateX: 24, y: 120, scale: 0.84, ease: 'none' }, 0);
  const vw = innerWidth, vh = innerHeight;
  tiles.forEach((t, i) => {
    const r = t.getBoundingClientRect();
    const dx = (r.left + r.width / 2 - vw / 2) / vw, dy = (r.top + r.height / 2 - vh / 2) / vh;
    tl.to(t, { x: dx * 380, y: dy * 260, z: 140 + (i % 4) * 110, rotationZ: dx * 8, opacity: 0, ease: 'power1.in' }, 0);
  });
}

/* ---------------- manifesto: words light up as you scroll ---------------- */
function initManifesto() {
  const p = $('.manifesto-text');
  const split = new SplitText(p, { type: 'words', wordsClass: 'w' });
  const words = split.words;
  words.forEach((w) => { if (/^(Kira|PersonaGraph|9\.5%|71%)/.test(w.textContent)) w.classList.add('hl'); });
  const stats = $$('.manifesto-stats > div');
  const mm = gsap.matchMedia();
  const light = (pr) => { const n = Math.round(pr * words.length); words.forEach((w, i) => w.classList.toggle('lit', i < n)); };
  let counted = false;
  const countUp = () => {
    if (counted) return; counted = true;
    $$('.manifesto-stats .count').forEach((c) => { const to = +c.dataset.to, d = +(c.dataset.dec || 0), o = { n: 0 }; gsap.to(o, { n: to, duration: 1.8, ease: 'expo.out', onUpdate: () => { c.textContent = fmt(o.n, d); } }); });
  };
  mm.add('(min-width: 1100px) and (min-height: 680px)', () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=160%', pin: '.manifesto-pin', scrub: 0.5,
      onUpdate: (s) => { light(Math.min(1, s.progress / 0.62)); if (s.progress > 0.68) countUp(); } } });
    tl.fromTo(p, { scale: 1.04 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
      .fromTo(stats, { y: 120, rotateX: -60, z: -200, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%' }, { y: 0, rotateX: 0, z: 0, opacity: 1, stagger: 0.06, duration: 0.25, ease: 'power3.out' }, 0.66)
      .to({}, { duration: 0.12 });
  });
  mm.add('(max-width: 1099px), (max-height: 679px)', () => {
    ScrollTrigger.create({ trigger: p, start: 'top 85%', end: 'bottom 45%', scrub: true, onUpdate: (s) => light(s.progress) });
    gsap.from(stats, { y: 60, rotateX: -40, opacity: 0, stagger: 0.1, duration: 1.2, transformPerspective: 900, scrollTrigger: { trigger: '.manifesto-stats', start: 'top 85%', once: true, onEnter: countUp } });
  });
}

/* ---------------- featured work: cards flip up and stack in 3D ---------------- */
function initDeck() {
  const cards = $$('.deck-card');
  const mm = gsap.matchMedia();
  gsap.from('.work .sec-title', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '.work', start: 'top 80%', once: true } });
  const reveal = () => cards.forEach((c) => gsap.from(c, { y: 100, rotateX: -25, opacity: 0, duration: 1.4, transformPerspective: 1400, scrollTrigger: { trigger: c, start: 'top 88%', once: true } }));
  mm.add('(min-width: 1100px) and (min-height: 680px)', () => {
    // only stack when a whole card fits under the top bar, otherwise its bottom could never be read
    if (!cards.every((c) => c.offsetHeight + 84 + 16 <= innerHeight)) { reveal(); return; }
    cards.forEach((c) => { c.style.position = 'sticky'; c.style.top = '84px'; });
    cards.forEach((c, i) => {
      gsap.fromTo(c, { rotateX: -38, y: 160, scale: 0.92, transformPerspective: 1800 }, { rotateX: 0, y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 84px', scrub: 0.6 } });
      const next = cards[i + 1];
      if (next) gsap.to(c, { scale: 0.94, rotateX: 6, ease: 'none', immediateRender: false, scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 84px', scrub: 0.6 } });
    });
    return () => cards.forEach((c) => { c.style.position = ''; c.style.top = ''; });
  });
  mm.add('(max-width: 1099px), (max-height: 679px)', reveal);
  // Kira chat plays when its card is on screen
  const chat = $$('.dc-kira .chat .b');
  const loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 });
  chat.forEach((b, i) => loop.fromTo(b, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(2)', onStart: () => { if (orbs[1]) orbs[1].target = i === 3 ? 1 : 0.15; } }, i * 1.1));
  loop.to(chat, { opacity: 0, duration: 0.5, delay: 2.4, onStart: () => { if (orbs[1]) orbs[1].target = 0.15; } });
  ScrollTrigger.create({ trigger: '.dc-kira', start: 'top 70%', end: 'bottom 10%', onToggle: (s) => (s.isActive ? loop.play() : loop.pause()) });
  // flow steps light in sequence
  $$('.deck .flow').forEach((f) => gsap.from(f.children, { y: 30, opacity: 0, stagger: 0.12, duration: 0.9, scrollTrigger: { trigger: f, start: 'top 85%', once: true } }));
  $$('.deck .metrics > div').forEach((m, i) => gsap.from(m, { y: 30, opacity: 0, delay: i * 0.1, duration: 0.9, scrollTrigger: { trigger: m, start: 'top 90%', once: true } }));
}

/* ---------------- projects: filter with Flip, cards flip in ---------------- */
function initProjects() {
  const cards = $$('.pcard');
  gsap.set(cards, { opacity: 0 });
  ScrollTrigger.batch(cards, { start: 'top 90%', once: true, onEnter: (b) => gsap.fromTo(b, { opacity: 0, y: 90, z: -240, rotateX: -55, transformPerspective: 1200, transformOrigin: '50% 0%' }, { opacity: 1, y: 0, z: 0, rotateX: 0, stagger: 0.08, duration: 1.3, overwrite: 'auto' }) });
  gsap.from('#projects .sec-title', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '#projects', start: 'top 80%', once: true } });
  const btns = $$('.filter');
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    const f = b.dataset.filter;
    const state = Flip.getState(cards);
    cards.forEach((c) => c.classList.toggle('hide', f !== 'all' && !c.dataset.cat.split(' ').includes(f)));
    Flip.from(state, { duration: 0.8, ease: 'expo.inOut', scale: true, absolute: true, stagger: 0.02,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.6, rotateY: -60 }, { opacity: 1, scale: 1, rotateY: 0, duration: 0.8 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.6, rotateY: 60, duration: 0.5 }),
      onComplete: () => ScrollTrigger.refresh() });
  }));
}

/* ---------------- experience: sticky cards that sink behind each other ---------------- */
function initExperience() {
  const jobs = $$('.job');
  gsap.from('#experience .sec-title', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '#experience', start: 'top 80%', once: true } });
  jobs.forEach((j) => gsap.from(j.querySelectorAll('h3, .job-org, li, .tags'), { y: 30, opacity: 0, stagger: 0.06, duration: 1, scrollTrigger: { trigger: j, start: 'top 80%', once: true } }));
  // cards stack only where every card fits on screen, so nothing is ever hidden under the next one
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1100px) and (min-height: 680px)', () => {
    const fits = jobs.every((j, i) => j.offsetHeight + 96 + i * 18 + 24 <= innerHeight);
    if (!fits) return;
    jobs.forEach((j) => j.classList.add('stick'));
    jobs.forEach((j, i) => {
      const next = jobs[i + 1];
      if (next) gsap.to(j, { scale: 0.95, rotateX: 4, transformPerspective: 1400, ease: 'none', scrollTrigger: { trigger: next, start: 'top 60%', end: `top ${96 + (i + 1) * 18}px`, scrub: true } });
    });
    return () => jobs.forEach((j) => j.classList.remove('stick'));
  });
}

/* ---------------- proof board assembles out of 3D space ---------------- */
function initProof() {
  const tiles = $$('.proof-board > .tile');
  let done = false;
  const reveal = () => {
    if (done) return; done = true;
    const r = $('.rank-num'), v = { n: 251755 };
    gsap.to(v, { n: 2932, duration: 2.6, ease: 'expo.out', onUpdate: () => { r.textContent = fmt(v.n); } });
    gsap.fromTo('.rank-track i', { '--s': 0 }, { '--s': 1, duration: 2.4, ease: 'expo.out' });
    $$('.gauge').forEach((g) => gsap.fromTo(g, { '--p': 0 }, { '--p': +g.dataset.value / 100, duration: 2, ease: 'expo.out' }));
    $$('.gauge .count').forEach((c) => { const o = { n: 0 }; gsap.to(o, { n: +c.dataset.to, duration: 2, ease: 'expo.out', onUpdate: () => { c.textContent = fmt(o.n, 1); } }); });
  };
  $$('.gauge').forEach((g) => g.style.setProperty('--p', 0));
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1100px) and (min-height: 700px)', () => {
    // pin only when the whole board fits on screen; otherwise its bottom row would be unreachable
    if ($('.proof-pin').scrollHeight > innerHeight) { simple(); return; }
    let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    const pin = ScrollTrigger.create({ trigger: '.proof', start: 'top top', end: '+=100%', pin: '.proof-pin' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.proof', start: 'top 75%', end: () => pin.end - innerHeight * 0.3, scrub: 0.8, invalidateOnRefresh: true, onUpdate: (s) => s.progress > 0.8 && reveal() } });
    tl.from('.proof-head', { y: 80, opacity: 0, duration: 0.3 }, 0);
    tiles.forEach((t, i) => tl.from(t, { x: rnd() * innerWidth * 0.9, y: rnd() * innerHeight * 0.9 + 200, z: -1400 + rnd() * 600, rotateX: rnd() * 160, rotateY: rnd() * 160, rotateZ: rnd() * 60, opacity: 0, duration: 0.75, ease: 'power3.out' }, 0.05 + i * 0.03));
    tl.to({}, { duration: 0.2 });
  });
  function simple() { gsap.from(tiles, { y: 80, rotateX: -40, opacity: 0, stagger: 0.1, duration: 1.2, transformPerspective: 1000, scrollTrigger: { trigger: '.proof-board', start: 'top 85%', once: true, onEnter: reveal } }); }
  mm.add('(max-width: 1099px), (max-height: 699px)', simple);
}

function initPapers() {
  gsap.from('#research .sec-title, #research .sec-sub', { y: 60, opacity: 0, stagger: 0.1, duration: 1.4, scrollTrigger: { trigger: '#research', start: 'top 80%', once: true } });
  $$('.paper').forEach((p, i) => gsap.from(p, { x: i % 2 ? -140 : 140, rotateY: i % 2 ? 30 : -30, opacity: 0, duration: 1.5, transformPerspective: 1400, scrollTrigger: { trigger: p, start: 'top 88%', once: true } }));
}

function initSkills() {
  gsap.from('#skills .sec-title', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '#skills', start: 'top 80%', once: true } });
  // marquee leans with scroll speed
  const track = $('.marquee-track');
  const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
  ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: (s) => skew(gsap.utils.clamp(-12, 12, s.getVelocity() / -250)) });
  gsap.from('.skills > .tile', { opacity: 0, rotateY: -70, x: -60, transformOrigin: '0% 50%', transformPerspective: 1200, stagger: 0.07, duration: 1.3, scrollTrigger: { trigger: '.skills', start: 'top 85%', once: true } });
}

function initEdu() {
  gsap.from('#education .sec-title', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '#education', start: 'top 80%', once: true } });
  const tiles = $$('.edu-board > .tile');
  gsap.set(tiles, { opacity: 0 });
  ScrollTrigger.batch(tiles, { start: 'top 90%', once: true, onEnter: (b) => gsap.fromTo(b, { opacity: 0, rotateX: 70, y: 60, transformOrigin: '50% 100%', transformPerspective: 1000 }, { opacity: 1, rotateX: 0, y: 0, stagger: 0.09, duration: 1.3, overwrite: 'auto' }) });
}

function initContact(core2) {
  const split = new SplitText('.contact-title .ct', { type: 'chars' });
  gsap.from(split.chars, { yPercent: 100, rotateX: -100, opacity: 0, stagger: 0.05, duration: 1.4, transformPerspective: 700, transformOrigin: '50% 100%',
    scrollTrigger: { trigger: '.contact', start: 'top 75%', once: true, onEnter: () => core2?.kick(1.4) } });
  gsap.from('.contact-sub, .contact-actions > *, .socials a', { y: 30, opacity: 0, stagger: 0.06, duration: 1, scrollTrigger: { trigger: '.contact', start: 'top 70%', once: true } });
  gsap.from('.message-form', { rotateY: -40, x: 80, opacity: 0, duration: 1.5, transformPerspective: 1400, scrollTrigger: { trigger: '.message-form', start: 'top 85%', once: true } });
  if (core2) ScrollTrigger.create({ trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true, onUpdate: (s) => core2.setScatter((1 - s.progress) * 1.5) });
  gsap.fromTo('.foot-name', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

/* ---------------- boot ---------------- */
basics();
initWave();
initOrbs();
initGraph();
initCylinder();
function boot() {
  if (window.gsap && window.ScrollTrigger && window.SplitText && window.Flip) {
    start().catch((e) => { console.error(e); root.classList.add('reduced'); $('.loader')?.remove(); staticState(); gsap.set('.board > .tile', { opacity: 1 }); });
  } else { root.classList.add('reduced'); $('.loader')?.remove(); staticState(); initSheets(); }
}
if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();

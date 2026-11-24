// Plain script (not a module) so the site also works when index.html is opened straight from disk.
(() => {

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const narrow = () => window.innerWidth < 1000;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
basics();

const gsap = window.gsap;
if (!gsap) {
  $('.loader')?.remove();
} else {
  start();
}

/* ============================================================
   Things that must work even if GSAP or WebGL fail
   ============================================================ */
function basics() {
  // mobile menu
  const toggle = $('.nav-toggle');
  const menu = $('#menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

  // copy email
  $$('.copy-btn').forEach((btn) => btn.addEventListener('click', async () => {
    const label = btn.querySelector('span');
    try { await navigator.clipboard.writeText(btn.dataset.email); label.textContent = 'Copied'; }
    catch { label.textContent = btn.dataset.email; }
    setTimeout(() => { label.textContent = 'Copy email'; }, 2000);
  }));

  // mailto form
  const form = $('#message-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = d.get('subject') || `Hello from ${d.get('name')}`;
    const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
    window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  // footer
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  const clock = $('.clock');
  const tick = () => { if (clock) clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 30000);
}

/* ============================================================
   Full experience
   ============================================================ */
async function start() {
  const { ScrollTrigger, SplitText, ScrambleTextPlugin, Flip } = window;
  gsap.registerPlugin(...[ScrollTrigger, SplitText, ScrambleTextPlugin, Flip].filter(Boolean));
  gsap.defaults({ ease: 'expo.out', duration: 1 });

  // 3D scene
  let scene = null;
  try {
    scene = await window.createScene($('#scene'), { count: window.innerWidth < 760 ? 900 : 1700, mobile: window.innerWidth < 760 });
  } catch (e) { console.warn('3D scene unavailable', e); }

  // smooth scroll
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -20, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  // wait for fonts so text splits land on the right lines
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))]);

  const sceneApply = (el) => {
    if (!scene) return;
    let dim = parseFloat(el.dataset.sceneDim || '1');
    if (narrow() && el.classList.contains('hero')) dim *= 0.55;
    scene.setShape(el.dataset.scene, { x: parseFloat(el.dataset.sceneX || '0'), y: parseFloat(el.dataset.sceneY || '0'), dim, duration: reduced ? 0.01 : 1.9 });
    if (el.dataset.scene === 'core') scene.burst();
    if (el.dataset.chapter !== 'Intro') gsap.to(scene.state, { scatter: 0, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
  };

  // ---- The horizontal pin goes first so later triggers measure after its spacer ----
  initWork(sceneApply, lenis);

  initSceneTriggers(sceneApply);
  initChrome(scene);
  initCursor();
  initMagnetic();
  initSplits();
  initReveals();
  initCounters();
  initStatement();
  initAbout();
  initNow();
  initProjects();
  initTimeline();
  initPapers();
  initSkills();
  initAchievements();
  initContact();
  init3D();

  if (scene) {
    window.addEventListener('pointermove', (e) => scene.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2), { passive: true });
  }

  await runLoader(lenis);
  heroIntro(scene, sceneApply);
  ScrollTrigger.refresh();
}

/* ---------------- Loader ---------------- */
function runLoader(lenis) {
  return new Promise((resolve) => {
    const loader = $('.loader');
    if (!loader || reduced || getComputedStyle(loader).display === 'none') { loader?.remove(); resolve(); return; }
    lenis?.stop();
    window.scrollTo(0, 0);
    const n = { v: 0 };
    const countEl = $('.loader-count');
    gsap.timeline({ onComplete: () => { loader.remove(); lenis?.start(); resolve(); } })
      .from('.loader-mark span', { yPercent: 110, opacity: 0, stagger: 0.1, duration: 0.9 })
      .to(n, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { countEl.textContent = Math.round(n.v); } }, 0.15)
      .to('.loader-line i', { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0.15)
      .to('.loader-mark span', { yPercent: -110, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'power3.in' }, '+=0.1')
      .to('.loader-line, .loader-row', { opacity: 0, duration: 0.4 }, '<')
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.15');
  });
}

/* ---------------- Hero ---------------- */
function heroIntro(scene, sceneApply) {
  const hero = $('.hero');
  if (scene) {
    scene.fadeIn(reduced ? 0.01 : 2.4);
    const mid = window.innerHeight / 2;
    const here = $$('[data-scene]').filter((el) => !el.classList.contains('panel')).find((el) => { const r = el.getBoundingClientRect(); return r.top < mid && r.bottom > mid; });
    sceneApply(here || hero);
  }
  if (reduced) return;

  const lines = $$('.hero-line');
  const chars = [];
  lines.forEach((line) => {
    const target = line.querySelector('.serif') || line;
    const split = SplitText.create(target, { type: 'chars', charsClass: 'char' });
    if (target !== line) {
      target.style.background = 'none';
      target.style.webkitTextFillColor = 'initial';
      const c1 = gsap.utils.interpolate('#ffc76b', '#ff8a3d');
      const c2 = gsap.utils.interpolate('#ff8a3d', '#5ee6ff');
      split.chars.forEach((c, i, arr) => {
        const p = i / Math.max(1, arr.length - 1);
        c.style.color = p < 0.4 ? c1(p / 0.4) : c2((p - 0.4) / 0.6);
      });
    }
    chars.push(...split.chars);
  });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.nav', { yPercent: -120, duration: 1.2 }, 0)
    .from('.hero-badge', { y: 20, opacity: 0, duration: 1 }, 0.1)
    .from(chars, { yPercent: 120, rotateX: -90, transformOrigin: '50% 100%', opacity: 0, stagger: 0.035, duration: 1.4 }, 0.15)
    .from('.hero-role', { opacity: 0, y: 20, duration: 1 }, 0.6)
    .from('.hero-lead', { opacity: 0, y: 24, duration: 1.1 }, 0.7)
    .from('.hero-actions > *', { opacity: 0, y: 24, stagger: 0.08, duration: 1 }, 0.8)
    .from('.hero-meta > *', { opacity: 0, y: 14, stagger: 0.06, duration: 0.9 }, 0.95)
    .from('.hero-hint', { opacity: 0, duration: 1 }, 1.2);

  // hero content drifts and fades as you leave it
  gsap.to('.hero-hint', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '25% top', scrub: true } });
  // the sphere breaks apart as you scroll away from the hero
  if (scene) ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => scene.setScatter(s.progress * 0.6) });
  gsap.to('.hero-inner', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // role scramble
  const role = $('.role-text');
  if (role && window.ScrambleTextPlugin) {
    const roles = JSON.parse(role.dataset.roles);
    let i = 0;
    const next = () => {
      i = (i + 1) % roles.length;
      gsap.to(role, { duration: 1.2, scrambleText: { text: roles[i], chars: '01/_#{}*', speed: 0.6 }, ease: 'none' });
    };
    setInterval(next, 3200);
  }
}

/* ---------------- Scene triggers ---------------- */
function initSceneTriggers(apply) {
  $$('[data-scene]').forEach((el) => {
    if (el.classList.contains('panel')) return; // handled by initWork
    ScrollTrigger.create({
      trigger: el, start: el.dataset.sceneStart || 'top 55%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) apply(el); }
    });
  });
}

/* ---------------- Nav, progress, HUD ---------------- */
function initChrome(scene) {
  const nav = $('.nav');
  const hud = $('.hud');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('scrolled', y > 40);
      hud.classList.toggle('show', y > window.innerHeight * 0.6);
      if (!$('#menu').classList.contains('open')) nav.classList.toggle('hidden', self.direction === 1 && y > 500);
      if (scene) scene.kick(self.getVelocity() / 9000);
    }
  });
  gsap.to('.progress i, .hud-bar i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // chapter HUD
  const num = $('.hud-num'), name = $('.hud-name');
  $$('[data-chapter]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive) return;
        const n = el.dataset.num || '00';
        if (name.textContent === el.dataset.chapter) return;
        gsap.to(name, { duration: 0.6, scrambleText: { text: el.dataset.chapter, chars: 'upperCase', speed: 1 } });
        num.textContent = n;
      }
    });
  });

  // nav active pill
  const links = $$('.nav-links a');
  const pill = document.createElement('span');
  pill.className = 'nav-pill';
  $('.nav-links').appendChild(pill);
  const movePill = (a) => {
    if (!a) { pill.style.opacity = 0; links.forEach((l) => l.classList.remove('active')); return; }
    links.forEach((l) => l.classList.toggle('active', l === a));
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const navFor = { about: 'about', now: 'now', work: 'work', projects: 'work', experience: 'experience', research: 'research', skills: 'skills', achievements: null, education: null, leadership: null, contact: 'contact' };
  Object.entries(navFor).forEach(([id, target]) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => { if (self.isActive) movePill(target ? links.find((l) => l.getAttribute('href') === '#' + target) : null); }
    });
  });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 50%', onToggle: (s) => s.isActive && movePill(null) });
}

/* ---------------- Cursor ---------------- */
function initCursor() {
  if (!finePointer || reduced) return;
  document.documentElement.classList.add('has-cursor');
  const dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('.cursor-label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, input, textarea, .tag-sphere');
    ring.classList.remove('hover', 'label');
    if (!t) return;
    if (t.dataset.cursor) { label.textContent = t.dataset.cursor; ring.classList.add('label'); }
    else if (t.classList.contains('tag-sphere')) { label.textContent = 'Drag'; ring.classList.add('label'); }
    else ring.classList.add('hover');
  });
  document.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
  document.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.4 }));
}

function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------------- Text ---------------- */
function initSplits() {
  if (reduced) return;
  $$('.split').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'line-mask' });
    gsap.from(split.words, {
      yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
  $$('.eyebrow').forEach((el) => gsap.from(el, { opacity: 0, x: -24, duration: 1, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
}

function initReveals() {
  if (reduced) return;
  const groups = [
    { sel: '.rise, .fact, .stat, .section-sub, .hobbies .chip, .contact-sub, .contact-actions, .socials, .message-form', from: { y: 50, opacity: 0 } },
    { sel: '.now-card, .lead, .skill-group, .achieve', from: { y: 80, opacity: 0, rotateX: -10, transformPerspective: 1000, transformOrigin: '50% 0%' } }
  ];
  groups.forEach(({ sel, from }) => {
    const els = $$(sel).filter((el) => !el.closest('.work'));
    gsap.set(els, from);
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateX: 0, stagger: 0.09, duration: 1.2, overwrite: true })
    });
  });
}

function initCounters() {
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if (reduced) { el.textContent = end.toFixed(dec); return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => { el.textContent = o.v.toFixed(dec); }
    });
  });
}

function initStatement() {
  const p = $('.statement');
  if (!p) return;
  const keys = ['Kira', 'PersonaGraph', '9.5%', '71%', 'actually', 'work.'];
  p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="w${keys.includes(w) ? ' k' : ''}">${w}</span>`).join(' ');
  p.classList.add('ready');
  const words = $$('.w', p);
  if (reduced) { words.forEach((w) => w.classList.add('on')); return; }
  ScrollTrigger.create({
    trigger: p, start: 'top 80%', end: 'bottom 35%', scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
  });
}

/* ---------------- About ---------------- */
function initAbout() {
  if (reduced) return;
  gsap.fromTo('.portrait', { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.6, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.portrait-wrap', start: 'top 80%', once: true }
  });
  gsap.fromTo('.portrait img', { yPercent: -12, scale: 1.15 }, { yPercent: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.portrait-wrap', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.portrait-corner', { scale: 0, opacity: 0, duration: 1, stagger: 0.15, delay: 0.8, scrollTrigger: { trigger: '.portrait-wrap', start: 'top 80%', once: true } });
  gsap.from('.portrait-tag', { y: 20, opacity: 0, duration: 1, delay: 1, scrollTrigger: { trigger: '.portrait-wrap', start: 'top 80%', once: true } });
}

/* ---------------- Now: four language lanes ---------------- */
function initNow() {
  const canvas = $('.lanes-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = ['#ffb547', '#5ee6ff', '#ff8a3d', '#f3efe6'];
  let w = 0, h = 0, on = false, t = 0, raf = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
    w = r.width; h = r.height; canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  size(); window.addEventListener('resize', size);
  const draw = () => {
    if (!on) return;
    raf = requestAnimationFrame(draw);
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const scan = ((t * 0.18) % 1.15) * w;
    for (let l = 0; l < 4; l++) {
      const cy = (l + 0.5) * (h / 4);
      const talk = 0.5 + 0.5 * Math.sin(t * 0.8 + l * 2.1);
      ctx.beginPath();
      for (let x = 110; x <= w; x += 3) {
        const env = Math.sin(((x - 110) / (w - 110)) * Math.PI);
        const burst = 0.3 + 0.7 * Math.max(0, Math.sin(x * 0.012 + l * 1.7 + t * 0.6));
        const a = (h / 7.5) * env * (0.35 + 0.65 * talk) * burst * (0.6 + 0.4 * Math.sin(x * 0.21 + t * 7 + l));
        const y = cy + Math.sin(x * 0.09 + t * 5 + l) * a;
        x === 110 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const s = Math.min(1, Math.max(0, scan / w));
      g.addColorStop(0, colors[l]); g.addColorStop(s, colors[l]); g.addColorStop(Math.min(1, s + 0.001), 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,181,71,0.9)';
    ctx.fillRect(Math.min(scan, w - 2), 6, 1.5, h - 12);
  };
  ScrollTrigger.create({ trigger: '.now-card', start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; cancelAnimationFrame(raf); if (on) draw(); } });

  // pipeline steps light up in order
  const steps = $$('.pipe-step');
  const tl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 });
  steps.forEach((s, i) => tl.call(() => steps.forEach((x, k) => x.classList.toggle('on', k <= i)), null, i * 0.55));
  tl.call(() => steps.forEach((x) => x.classList.remove('on')), null, steps.length * 0.55 + 0.8);
  ScrollTrigger.create({ trigger: '.now-card', start: 'top 80%', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
}

/* ---------------- Featured work ---------------- */
function initWork(apply) {
  const panels = $$('.work .panel');
  const track = $('.work-track');
  const kira = initKira();
  const bars = () => {
    $$('.bar i[data-bar]').forEach((b, i) => gsap.to(b, { width: b.dataset.bar + '%', duration: 1.8, delay: i * 0.25, ease: 'power3.out' }));
    $$('[data-bar-num]').forEach((n, i) => { const o = { v: 0 }; gsap.to(o, { v: parseFloat(n.dataset.barNum), duration: 1.8, delay: i * 0.25, ease: 'power3.out', onUpdate: () => { n.textContent = o.v.toFixed(n.dataset.barNum.includes('.') ? 1 : 0); } }); });
  };
  let barsDone = false;
  const runBars = () => { if (!barsDone) { barsDone = true; bars(); } };

  const mm = gsap.matchMedia();
  mm.add({
    wide: '(min-width: 1100px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)',
    small: '(max-width: 1099px), (max-height: 679px), (prefers-reduced-motion: reduce)'
  }, (ctx) => {
    if (ctx.conditions.wide) {
      const dist = () => track.scrollWidth - window.innerWidth;
      let live = false, current = null;
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.work-pin', pin: true, scrub: 1, start: 'top top', end: () => '+=' + dist(), invalidateOnRefresh: true, anticipatePin: 1,
          onToggle: (s) => { live = s.isActive; if (live) current = null; else kira(false); }
        }
      });
      const parts = panels.map((p) => ({ p, vis: p.querySelector('.feature-visual > *'), body: p.querySelector('.feature-body') ? [...p.querySelector('.feature-body').children] : [] }));
      const update = () => {
        if (!live) return;
        const tx = gsap.getProperty(track, 'x');
        const vw = window.innerWidth;
        parts.forEach(({ p, vis, body }) => {
          const left = p.offsetLeft + tx, w = p.offsetWidth;
          const prog = gsap.utils.clamp(0, 1, (vw - left) / (vw + w));
          if (vis) gsap.set(vis, { xPercent: 16 - prog * 24, rotateY: -16 + prog * 26, transformPerspective: 1200 });
          const e = gsap.utils.clamp(0, 1, (vw * 0.95 - left) / (vw * 0.5));
          body.forEach((c, i) => {
            const ei = gsap.utils.clamp(0, 1, e * 1.4 - i * 0.07);
            c.style.transform = `translateX(${(1 - ei) * 140}px)`;
            c.style.opacity = ei;
          });
        });
        const mid = vw * 0.5;
        const active = panels.find((p) => p.offsetLeft + tx <= mid && p.offsetLeft + tx + p.offsetWidth + vw * 0.06 >= mid) || panels[0];
        if (active !== current) {
          current = active;
          apply(active);
          kira(active.classList.contains('feature-kira'));
          if (active.classList.contains('feature-pg')) runBars();
        }
      };
      gsap.ticker.add(update);
      gsap.from('.panel-intro > *', { y: 60, opacity: 0, stagger: 0.1, duration: 1.2, scrollTrigger: { trigger: '.work', start: 'top 70%', once: true } });
      return () => {
        gsap.ticker.remove(update);
        parts.forEach(({ body }) => body.forEach((c) => { c.style.transform = ''; c.style.opacity = ''; }));
      };
    } else {
      panels.forEach((p) => {
        ScrollTrigger.create({ trigger: p, start: 'top 55%', end: 'bottom 45%', onToggle: (s) => { if (s.isActive) apply(p); } });
        if (!reduced && p.classList.contains('feature')) gsap.from(p, { y: 80, opacity: 0, duration: 1.2, scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
      });
      ScrollTrigger.create({ trigger: '.feature-kira', start: 'top 80%', end: 'bottom top', onToggle: (s) => kira(s.isActive) });
      ScrollTrigger.create({ trigger: '.feature-pg', start: 'top 75%', onEnter: runBars });
    }
  });
}

function initKira() {
  const canvas = $('.kira-orb');
  const stages = $$('.feature-kira .stage');
  const bubbles = $$('.feature-kira .bubble');
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, on = false, raf = 0, t = 0;
  const level = { v: 0.15 };
  const size = () => { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); w = r.width; h = r.height; canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  size(); window.addEventListener('resize', size);
  const draw = () => {
    if (!on) return;
    raf = requestAnimationFrame(draw);
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, base = Math.min(w, h) * 0.26, bars = 96;
    const glow = ctx.createRadialGradient(cx, cy, base * 0.2, cx, cy, base * 1.9);
    glow.addColorStop(0, `rgba(255,181,71,${0.18 + level.v * 0.25})`); glow.addColorStop(1, 'rgba(255,181,71,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2 + t * 0.15;
      const n = 0.5 + 0.5 * Math.sin(i * 0.7 + t * 6) * Math.sin(i * 0.23 - t * 3.3);
      const len = 6 + n * base * 0.75 * level.v + 3;
      const r1 = base, r2 = base + len;
      ctx.strokeStyle = i % 2 ? 'rgba(255,181,71,0.85)' : 'rgba(94,230,255,0.7)';
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, base - 8, 0, Math.PI * 2); ctx.stroke();
  };
  const setStage = (i, lv) => () => { stages.forEach((s, k) => s.classList.toggle('on', k === i)); gsap.to(level, { v: lv, duration: 0.5, ease: 'power2.out' }); };
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, paused: true });
  tl.set(bubbles, { opacity: 0, y: 12 })
    .call(setStage(0, 0.55))
    .to(bubbles[0], { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, '+=0.4')
    .call(setStage(1, 0.15), null, '+=0.9')
    .to(bubbles[1], { opacity: 1, y: 0, duration: 0.5 }, '+=0.2')
    .call(setStage(0, 0.55), null, '+=1')
    .to(bubbles[2], { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, '+=0.4')
    .call(setStage(1, 0.3), null, '+=0.8')
    .call(setStage(2, 0.35), null, '+=0.6')
    .call(setStage(3, 1), null, '+=1.1')
    .to(bubbles[3], { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, '+=0.15')
    .call(setStage(-1, 0.15), null, '+=2.4')
    .to(bubbles, { opacity: 0, y: -8, stagger: 0.05, duration: 0.4 }, '+=0.6');
  if (reduced) { gsap.set(bubbles, { opacity: 1 }); }
  return (active) => {
    on = active;
    cancelAnimationFrame(raf);
    if (active) { draw(); if (!reduced) tl.play(); } else tl.pause();
  };
}

/* ---------------- Projects ---------------- */
function initProjects() {
  const cards = $$('.grid .card');
  if (!reduced) {
    gsap.set(cards, { y: 70, opacity: 0, rotateX: -14, transformPerspective: 1000 });
    ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, rotateX: 0, stagger: 0.08, duration: 1.2, overwrite: true }) });
  }
  // spotlight + tilt
  cards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      if (finePointer && !reduced) gsap.to(card, { rotateY: (x / r.width - 0.5) * 8, rotateX: -(y / r.height - 0.5) * 8, transformPerspective: 900, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    });
    card.addEventListener('pointerleave', () => { if (finePointer && !reduced) gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }); });
  });
  // filters with Flip
  const buttons = $$('.filter');
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    buttons.forEach((b) => { const a = b === btn; b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a)); });
    const state = window.Flip && !reduced ? Flip.getState(cards, { props: 'opacity' }) : null;
    cards.forEach((c) => c.classList.toggle('hidden', !(f === 'all' || c.dataset.cat.split(' ').includes(f))));
    if (state) {
      Flip.from(state, {
        duration: 0.75, ease: 'power3.inOut', stagger: 0.03, absolute: true, scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, rotateX: 0, y: 0, duration: 0.6, delay: 0.2 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
        onComplete: () => ScrollTrigger.refresh()
      });
    } else ScrollTrigger.refresh();
  }));
}

/* ---------------- Timeline ---------------- */
function initTimeline() {
  if (reduced) { gsap.set('.timeline-line i', { scaleY: 1 }); $$('.job').forEach((j) => j.classList.add('lit')); return; }
  gsap.to('.timeline-line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 60%', scrub: true } });
  $$('.job').forEach((job) => {
    ScrollTrigger.create({ trigger: job, start: 'top 62%', onEnter: () => job.classList.add('lit'), onLeaveBack: () => job.classList.remove('lit') });
    gsap.from(job.querySelector('.job-card'), { x: 80, opacity: 0, duration: 1.2, scrollTrigger: { trigger: job, start: 'top 85%', once: true } });
    gsap.from(job.querySelector('.job-date'), { x: -30, opacity: 0, duration: 1, scrollTrigger: { trigger: job, start: 'top 85%', once: true } });
  });
}

function initPapers() {
  if (reduced) return;
  $$('.paper').forEach((p, i) => gsap.from(p, {
    x: i % 2 ? -120 : 120, rotateY: i % 2 ? 10 : -10, opacity: 0, transformPerspective: 1200, duration: 1.4,
    scrollTrigger: { trigger: p, start: 'top 90%', once: true }
  }));
}

/* ---------------- Skills ---------------- */
function initSkills() {
  // marquee, speeds up and leans with scroll velocity
  const track = $('.marquee-track');
  if (track) {
    track.innerHTML += track.innerHTML;
    if (!reduced) {
      const loop = gsap.to(track, { xPercent: -50, repeat: -1, duration: 34, ease: 'none' });
      const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const v = self.getVelocity();
          skew(gsap.utils.clamp(-12, 12, v / -250));
          gsap.to(loop, { timeScale: 1 + Math.min(4, Math.abs(v) / 600), duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.2 });
        }
      });
    }
  }

  // 3D tag sphere
  const host = $('.tag-sphere');
  if (!host) return;
  const words = [
    ['Python', 'hot'], ['LLMs', 'hot'], ['RAG', 'hot'], ['GraphRAG', 'hot'], ['AI Agents', 'hot'], ['Speech-to-Text', 'hot'], ['Tool Calling', 'hot'], ['PyTorch', 'hot'],
    ['C++', 'cool'], ['Knowledge Graphs', 'cool'], ['Whisper', 'cool'], ['IndicConformer', 'cool'], ['Claude API', 'cool'], ['Hugging Face', 'cool'], ['NLP', 'cool'], ['LiveKit / WebRTC', 'cool'],
    ['SQL'], ['JavaScript'], ['C'], ['Go'], ['Ollama'], ['Prompt Engineering'], ['BERTScore'], ['NLI'], ['RoBERTa'], ['scikit-learn'], ['ResNet-18'], ['BiLSTM'], ['SHAP'], ['Transfer Learning'],
    ['Silero VAD'], ['Language ID'], ['Deepgram'], ['Pandas'], ['NumPy'], ['NetworkX'], ['PySpark'], ['Flask'], ['REST APIs'], ['Git'], ['Linux'], ['SLURM'], ['ffmpeg'], ['Statistical Testing']
  ];
  const els = words.map(([w, c]) => { const s = document.createElement('span'); s.textContent = w; if (c) s.className = c; host.appendChild(s); return s; });
  const n = els.length, golden = Math.PI * (3 - Math.sqrt(5));
  const pts = els.map((_, i) => { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i; return [Math.cos(th) * r, y, Math.sin(th) * r]; });
  let ax = 0.3, ay = 0, vx = 0.0015, vy = 0.004, R = 200, on = false, raf = 0, dragging = false, lx = 0, ly = 0;
  const size = () => { R = host.clientWidth * (host.clientWidth < 480 ? 0.31 : 0.4); };
  size(); window.addEventListener('resize', size);
  const render = () => {
    if (!on) return;
    raf = requestAnimationFrame(render);
    if (!dragging) { vx += (0.0012 - vx) * 0.02; vy += (0.0035 - vy) * 0.02; }
    ax += vx; ay += vy;
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    for (let i = 0; i < n; i++) {
      let [x, y, z] = pts[i];
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const s = (z2 + 2.2) / 3.2;
      els[i].style.transform = `translate(-50%, -50%) translate3d(${x1 * R}px, ${y2 * R}px, 0) scale(${0.55 + s * 0.6})`;
      els[i].style.opacity = (0.15 + s * 0.85).toFixed(2);
      els[i].style.zIndex = Math.round(s * 100);
    }
  };
  host.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => { if (!dragging) return; vy = (e.clientX - lx) * 0.0009; vx = -(e.clientY - ly) * 0.0009; lx = e.clientX; ly = e.clientY; });
  const up = () => { dragging = false; };
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  if (reduced) { vx = 0; vy = 0; on = true; render(); on = false; return; }
  ScrollTrigger.create({ trigger: '.sphere-wrap', start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; cancelAnimationFrame(raf); if (on) render(); } });
  gsap.from(els, { opacity: 0, scale: 0, duration: 1.2, stagger: 0.015, scrollTrigger: { trigger: '.sphere-wrap', start: 'top 80%', once: true } });
}

/* ---------------- Achievements ---------------- */
function initAchievements() {
  const rank = $('.rank-num');
  if (rank) {
    const from = +rank.dataset.from, to = +rank.dataset.to;
    if (reduced) rank.textContent = to.toLocaleString('en-US');
    else {
      const o = { v: from };
      gsap.to(o, { v: to, duration: 3, ease: 'expo.out', scrollTrigger: { trigger: '.achieve.big', start: 'top 75%', once: true }, onUpdate: () => { rank.textContent = Math.round(o.v).toLocaleString('en-US'); } });
    }
  }
  gsap.to('.rank-fill', { scaleX: 1, duration: reduced ? 0 : 2.6, ease: 'expo.out', scrollTrigger: { trigger: '.achieve.big', start: 'top 75%', once: true } });
  $$('.gauge').forEach((g) => {
    const c = 326.73, v = parseFloat(g.dataset.value);
    gsap.to(g.querySelector('.g-fg'), { strokeDashoffset: c * (1 - v / 100), duration: reduced ? 0 : 2.2, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 88%', once: true } });
  });
}

/* ---------------- Contact ---------------- */
function initContact() {
  if (reduced) return;
  gsap.from('.ct-line', {
    rotateX: -100, yPercent: 30, opacity: 0, transformOrigin: '50% 100%', transformPerspective: 900, stagger: 0.18, duration: 1.8,
    scrollTrigger: { trigger: '.contact-title', start: 'top 85%', once: true }
  });
  gsap.fromTo('.footer-name', { xPercent: 8 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

/* ---------------- Extra 3D: tilt, depth, flips ---------------- */
function init3D() {
  // tilt + spotlight on glass cards
  $('.stats-grid')?.classList.add('tilt');
  const tiltEls = $$('.achieve, .edu, .lead, .skill-group, .paper, .now-card, .fact, .job-card');
  tiltEls.forEach((el) => {
    el.classList.add('tilt');
    if (!finePointer || reduced) return;
    const amt = el.offsetWidth > 700 ? 3 : 7;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
      gsap.to(el, { rotateY: (x / r.width - 0.5) * amt, rotateX: -(y / r.height - 0.5) * amt, transformPerspective: 1000, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }));
  });

  if (reduced) return;

  // whole groups swing up from a tilted plane as they scroll in
  $$('.grid, .edu-grid, .lead-grid, .achieve-grid, .papers, .skill-groups, .timeline').forEach((el) => {
    gsap.fromTo(el, { rotateX: 7, z: -60, transformPerspective: 1600, transformOrigin: '50% 0%' }, {
      rotateX: 0, z: 0, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: true }
    });
  });

  // education cards flip in like pages
  $$('.edu').forEach((el, i) => gsap.from(el, {
    rotateY: i % 2 ? 75 : -75, opacity: 0, transformPerspective: 1200, transformOrigin: i % 2 ? '100% 50%' : '0% 50%', duration: 1.6,
    scrollTrigger: { trigger: el, start: 'top 88%', once: true }
  }));

  // portrait floats in 3D with layered depth
  const wrap = $('.portrait-wrap');
  if (wrap && finePointer) {
    wrap.style.transformStyle = 'preserve-3d';
    gsap.set('.portrait-corner', { z: 70 });
    gsap.set('.portrait-tag', { z: 45 });
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      gsap.to(wrap, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 16, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 16, transformPerspective: 900, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    });
    wrap.addEventListener('pointerleave', () => gsap.to(wrap, { rotateY: 0, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }));
  }

  // stats panel rises out of the page in 3D
  gsap.fromTo('.stats-grid', { rotateX: 28, y: 80, transformPerspective: 1200, transformOrigin: '50% 100%' }, {
    rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'top 40%', scrub: true }
  });
}
})();

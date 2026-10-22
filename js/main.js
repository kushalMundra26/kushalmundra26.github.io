const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ===== Nav: scrolled state, mobile menu, active section =====
function initNav() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = [...document.querySelectorAll('.nav-links a')];

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  links.forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

// ===== Scroll progress bar + timeline line =====
function initScrollEffects() {
  const bar = document.querySelector('.progress');
  const timeline = document.querySelector('.timeline');
  const fill = document.querySelector('.timeline-line i');
  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    if (timeline && fill) {
      const r = timeline.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      fill.style.height = (p * 100) + '%';
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

// ===== Reveal on scroll, with stagger inside groups =====
function initReveal() {
  const items = document.querySelectorAll('.reveal, .job, [data-animate]');
  if (reduceMotion) { items.forEach(el => el.classList.add('in')); return; }

  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((child, i) => {
      child.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
    });
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
}

// ===== Count-up numbers =====
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  const run = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const fmt = v => decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const start = performance.now(), dur = 1600;
    const step = now => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  els.forEach(el => io.observe(el));
}

// ===== Typing roles in the hero =====
function initTyping() {
  const el = document.querySelector('.typed');
  if (!el) return;
  const roles = JSON.parse(el.dataset.roles);
  if (reduceMotion) { el.textContent = roles[0]; return; }
  let r = 0, i = 0, deleting = false;
  const tick = () => {
    const word = roles[r];
    i += deleting ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = deleting ? 35 : 70;
    if (!deleting && i === word.length) { delay = 1900; deleting = true; }
    else if (deleting && i === 0) { deleting = false; r = (r + 1) % roles.length; delay = 350; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 900);
}

// ===== Cursor glow =====
function initCursorGlow() {
  const glow = document.querySelector('.cursor-glow');
  if (!glow || !finePointer || reduceMotion) { if (glow) glow.remove(); return; }
  let x = innerWidth / 2, y = innerHeight / 2, gx = x, gy = y;
  window.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
  const loop = () => {
    gx += (x - gx) * 0.12; gy += (y - gy) * 0.12;
    glow.style.transform = `translate(${gx - 210}px, ${gy - 210}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

// ===== Magnetic buttons =====
function initMagnetic() {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// ===== Card tilt + spotlight =====
function initCards() {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

// ===== Project filters =====
function initFilters() {
  const buttons = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.grid .card');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
    const f = btn.dataset.filter;
    cards.forEach(c => {
      const show = f === 'all' || c.dataset.cat.split(' ').includes(f);
      c.classList.toggle('hide', !show);
      if (show && !reduceMotion) {
        c.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 450, easing: 'cubic-bezier(0.22,1,0.36,1)' });
      }
    });
  }));
}

// ===== Voice waveform bars (Kira visual) =====
function initWave() {
  const wave = document.querySelector('.wave');
  if (!wave) return;
  for (let i = 0; i < 38; i++) {
    const bar = document.createElement('i');
    bar.style.animationDelay = `${(Math.sin(i * 0.7) * 0.5 + 0.5) * -1.2}s`;
    bar.style.animationDuration = `${0.9 + (i % 5) * 0.12}s`;
    wave.appendChild(bar);
  }
}

// ===== Hero: interactive network canvas =====
function initGraph(canvas, opts = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const labels = opts.labels || [];
  const colors = opts.colors || ['124,92,255', '34,211,238', '163,230,53'];
  let w, h, dpr, nodes = [], mouse = { x: -9999, y: -9999 }, visible = true, raf;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(opts.max || 90, (w * h) / (opts.density || 14000)));
    nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * (opts.speed || 0.25), vy: (Math.random() - 0.5) * (opts.speed || 0.25),
      r: Math.random() * 1.6 + 1, c: colors[i % colors.length],
      label: i < labels.length ? labels[i] : null
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const link = opts.link || 130;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!reduceMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        const mdx = mouse.x - a.x, mdy = mouse.y - a.y, md = Math.hypot(mdx, mdy);
        if (md < 180) { a.x -= mdx * 0.006; a.y -= mdy * 0.006; }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          const near = Math.hypot(mouse.x - (a.x + b.x) / 2, mouse.y - (a.y + b.y) / 2) < 160;
          ctx.strokeStyle = `rgba(${near ? '34,211,238' : '160,160,200'},${(1 - d / link) * (near ? 0.55 : 0.16)})`;
          ctx.lineWidth = near ? 1.1 : 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const near = Math.hypot(mouse.x - n.x, mouse.y - n.y) < 160;
      ctx.fillStyle = `rgba(${n.c},${near ? 1 : 0.75})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 1.2 : n.r, 0, Math.PI * 2); ctx.fill();
      if (n.label) {
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(200,205,225,${near ? 0.95 : 0.4})`;
        ctx.fillText(n.label, n.x + 7, n.y + 4);
      }
    }
    if (visible && !reduceMotion) raf = requestAnimationFrame(draw);
  };

  const host = opts.host || canvas.parentElement;
  host.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }, { passive: true });
  host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) draw();
  }).observe(canvas);

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150); });
  resize();
  draw();
}

// ===== Knowledge graph (PersonaGraph visual) =====
function initKnowledgeGraph() {
  const canvas = document.getElementById('kg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const types = [
    { c: '124,92,255', n: 4 }, { c: '34,211,238', n: 8 }, { c: '163,230,53', n: 7 },
    { c: '244,114,182', n: 6 }, { c: '251,191,36', n: 6 }, { c: '148,163,184', n: 8 }
  ];
  let w, h, dpr, nodes = [], edges = [], t = 0, visible = false, raf, pulse = 0;

  const build = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = []; edges = [];
    const cx = w * 0.42, cy = h * 0.5;
    types.forEach((ty, ti) => {
      for (let k = 0; k < ty.n; k++) {
        const ring = ti === 0 ? 0.12 : 0.22 + (ti % 3) * 0.1;
        const ang = (k / ty.n) * Math.PI * 2 + ti;
        nodes.push({ type: ti, c: ty.c, bx: cx + Math.cos(ang) * w * ring, by: cy + Math.sin(ang) * h * ring * 0.95, ph: Math.random() * 6.28, r: ti === 0 ? 5 : 3 });
      }
    });
    const hubs = nodes.filter(n => n.type === 0);
    nodes.forEach((n, i) => {
      if (n.type === 0) return;
      edges.push([i, nodes.indexOf(hubs[i % hubs.length])]);
      if (Math.random() < 0.45) edges.push([i, Math.floor(Math.random() * nodes.length)]);
    });
  };

  const draw = () => {
    t += 0.012; pulse = (pulse + 0.006) % 1;
    ctx.clearRect(0, 0, w, h);
    nodes.forEach(n => { n.x = n.bx + Math.sin(t + n.ph) * 6; n.y = n.by + Math.cos(t * 0.8 + n.ph) * 6; });
    const active = Math.floor(pulse * 4);
    edges.forEach(([a, b], k) => {
      const A = nodes[a], B = nodes[b];
      const hot = nodes[a].type !== 0 && (a % 4) === active;
      ctx.strokeStyle = hot ? 'rgba(34,211,238,0.55)' : 'rgba(170,175,210,0.13)';
      ctx.lineWidth = hot ? 1.2 : 0.8;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      if (hot) {
        const p = (t * 1.6 + k * 0.13) % 1;
        ctx.fillStyle = 'rgba(34,211,238,0.95)';
        ctx.beginPath(); ctx.arc(A.x + (B.x - A.x) * p, A.y + (B.y - A.y) * p, 1.8, 0, 6.28); ctx.fill();
      }
    });
    nodes.forEach(n => {
      ctx.fillStyle = `rgba(${n.c},0.18)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.6, 0, 6.28); ctx.fill();
      ctx.fillStyle = `rgba(${n.c},0.95)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.28); ctx.fill();
    });
    if (visible && !reduceMotion) raf = requestAnimationFrame(draw);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) draw();
  }).observe(canvas);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(); }, 150); });
  build(); draw();
}

// ===== Contact: copy email + mailto message form =====
function initContact() {
  const copy = document.querySelector('.copy-btn');
  if (copy) copy.addEventListener('click', async () => {
    const email = copy.dataset.email;
    try { await navigator.clipboard.writeText(email); } catch (e) { window.location.href = 'mailto:' + email; return; }
    const label = copy.querySelector('span');
    const old = label.textContent;
    copy.classList.add('copied'); label.textContent = 'Email copied';
    setTimeout(() => { copy.classList.remove('copied'); label.textContent = old; }, 2200);
  });

  const form = document.getElementById('message-form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = d.get('subject') || `Hello from ${d.get('name')}`;
    const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
    window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// ===== Smooth scrolling (Lenis) =====
let lenis = null;
function initSmoothScroll() {
  if (reduceMotion || !finePointer || typeof window.Lenis !== 'function') return;
  lenis = new window.Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -84 });
    history.replaceState(null, '', id);
  }));
}

// ===== Custom cursor: dot + trailing ring =====
function initCursor() {
  const dot = document.querySelector('.cursor-dot'), ring = document.querySelector('.cursor-ring');
  if (!dot || !finePointer || reduceMotion) { dot && dot.remove(); ring && ring.remove(); return; }
  let x = -100, y = -100, rx = x, ry = y;
  window.addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    document.body.classList.add('cursor-on');
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.body.classList.remove('cursor-on'));
  window.addEventListener('pointerdown', () => ring.classList.add('down'));
  window.addEventListener('pointerup', () => ring.classList.remove('down'));
  document.querySelectorAll('a, button, .card, .filter, input, textarea').forEach(el => {
    el.addEventListener('pointerenter', () => ring.classList.add('hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('hover'));
  });
  const loop = () => {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

// ===== Split headings into words that rise in on reveal =====
function initSplitHeadings() {
  if (reduceMotion) return;
  document.querySelectorAll('.section-title, .contact-title').forEach(el => {
    let i = 0;
    const walk = (node, gradParent) => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi' + (gradParent ? ' grad' : '');
            wi.style.setProperty('--i', i++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          const isGrad = child.classList.contains('grad');
          if (isGrad) child.classList.remove('grad');
          walk(child, gradParent || isGrad);
        }
      });
    };
    walk(el, false);
    el.classList.remove('reveal');
    el.classList.add('split');
    el.setAttribute('data-animate', '');
  });
}

// ===== Scroll-driven effects: hero parallax, statement scrub, feature cards, marquee skew =====
function initScrollScenes() {
  if (reduceMotion) {
    document.querySelectorAll('.statement .sw').forEach(w => w.style.opacity = 1);
    return;
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Statement: wrap words so they light up as you scroll past
  const statement = document.querySelector('[data-scrub]');
  let words = [];
  if (statement) {
    const highlight = new Set(['Kira', 'PersonaGraph', '9.5%', '71%']);
    statement.innerHTML = statement.textContent.trim().split(/\s+/)
      .map(w => `<span class="sw${highlight.has(w.replace(/[.,]$/, '')) ? ' hl' : ''}">${w}</span>`).join(' ');
    words = [...statement.querySelectorAll('.sw')];
  }

  const heroInner = document.querySelector('.hero .container');
  const heroCanvas = document.getElementById('graph');
  const hero = document.querySelector('.hero');
  const features = [...document.querySelectorAll('.feature')];
  features.forEach(f => { f.classList.remove('reveal'); f.classList.add('scrub'); });
  const marquees = [...document.querySelectorAll('.marquee')];
  const contactTitle = document.querySelector('.contact-title');

  let lastY = window.scrollY, skew = 0;

  const frame = () => {
    const vh = window.innerHeight, y = window.scrollY;

    // Hero: content drifts up and fades, network zooms in
    if (hero) {
      const p = clamp(y / hero.offsetHeight);
      heroInner.style.transform = `translateY(${p * -120}px) scale(${1 - p * 0.06})`;
      heroInner.style.opacity = 1 - p * 1.3;
      heroCanvas.style.transform = `scale(${1 + p * 0.35})`;
      heroCanvas.style.opacity = 1 - p * 0.9;
    }

    // Statement words
    if (words.length) {
      const r = statement.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.35));
      const lit = p * words.length;
      words.forEach((w, i) => { w.style.opacity = 0.14 + 0.86 * clamp(lit - i); });
    }

    // Featured projects: scale up as they enter, visuals parallax inside
    features.forEach(f => {
      const r = f.getBoundingClientRect();
      const enter = clamp((vh - r.top) / (vh * 0.6));
      f.style.transform = `scale(${0.9 + 0.1 * enter}) translateY(${(1 - enter) * 60}px)`;
      f.style.opacity = 0.25 + 0.75 * enter;
      if (enter > 0.5) f.classList.add('in');
      const inner = f.querySelector('.feature-visual > .pipeline, .feature-visual > #kg');
      if (inner) {
        const p = clamp((vh - r.top) / (vh + r.height));
        inner.style.transform = `translateY(${(p - 0.5) * -50}px)`;
      }
    });

    // Skills marquee leans with scroll speed
    const v = y - lastY; lastY = y;
    skew += (clamp(v * 0.35, -9, 9) - skew) * 0.12;
    marquees.forEach((m, i) => { m.style.transform = `skewX(${(i ? -skew : skew).toFixed(2)}deg)`; });

    // Contact title grows into place
    if (contactTitle) {
      const r = contactTitle.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.7));
      contactTitle.style.transform = `scale(${0.82 + 0.18 * p})`;
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNav();
  initScrollEffects();
  initSplitHeadings();
  initScrollScenes();
  initReveal();
  initCounters();
  initTyping();
  initCursorGlow();
  initCursor();
  initMagnetic();
  initCards();
  initFilters();
  initWave();
  initGraph(document.getElementById('graph'), {
    host: document.querySelector('.hero'),
    labels: ['LLMs', 'RAG', 'PyTorch', 'Claude', 'Agents', 'NLP', 'GraphRAG', 'Python', 'C++', 'LiveKit', 'Transformers', 'Eval']
  });
  initKnowledgeGraph();
  initContact();
  document.getElementById('year').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('loaded'));
});

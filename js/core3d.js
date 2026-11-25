/* Neural core: a 3D node graph with signals travelling along its edges.
   Classic script with a dynamic import, so it also works from file://. */
(function () {
'use strict';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

window.createCore = async function (canvas, opts = {}) {
  const THREE = await import(THREE_URL);
  const o = Object.assign({ nodes: 260, pulses: 70, offsetX: 0.22, radius: 1.55, rings: true, color: 0xc8ff3e }, opts);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const root = new THREE.Group();
  const core = new THREE.Group();
  root.add(core);
  scene.add(root);

  // round sprite for points
  const sprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // nodes on a fibonacci sphere with a little jitter
  const N = o.nodes, R = o.radius;
  const base = new Float32Array(N * 3), dir = new Float32Array(N * 3);
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    const j = 1 + (rand() - 0.5) * 0.12;
    base[i * 3] = Math.cos(th) * r * R * j; base[i * 3 + 1] = y * R * j; base[i * 3 + 2] = Math.sin(th) * r * R * j;
    dir[i * 3] = Math.cos(th) * r; dir[i * 3 + 1] = y; dir[i * 3 + 2] = Math.sin(th) * r;
  }
  const pos = new Float32Array(base);
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const nodeMat = new THREE.PointsMaterial({ size: 0.07, map: sprite, transparent: true, depthWrite: false, color: 0xe9e9ee, opacity: 0.9 });
  core.add(new THREE.Points(nodeGeo, nodeMat));

  // edges to the 3 nearest neighbours
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const d = [];
    for (let k = 0; k < N; k++) if (k !== i) {
      const dx = base[i * 3] - base[k * 3], dy = base[i * 3 + 1] - base[k * 3 + 1], dz = base[i * 3 + 2] - base[k * 3 + 2];
      d.push([dx * dx + dy * dy + dz * dz, k]);
    }
    d.sort((a, b) => a[0] - b[0]);
    for (let n = 0; n < 3; n++) {
      const k = d[n][1], key = i < k ? i + '-' + k : k + '-' + i;
      if (!seen.has(key)) { seen.add(key); edges.push([i, k]); }
    }
  }
  const linePos = new Float32Array(edges.length * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.11, depthWrite: false });
  core.add(new THREE.LineSegments(lineGeo, lineMat));

  // signals that run along edges
  const P = o.pulses;
  const pulsePos = new Float32Array(P * 3);
  const adj = Array.from({ length: N }, () => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const pulses = Array.from({ length: P }, () => { const a = Math.floor(rand() * N); return { a, b: adj[a][0], t: rand(), v: 0.6 + rand() * 1.2 }; });
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ size: 0.13, map: sprite, transparent: true, depthWrite: false, color: o.color, blending: THREE.AdditiveBlending });
  core.add(new THREE.Points(pulseGeo, pulseMat));

  // inner glowing nucleus
  const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: o.color, wireframe: true, transparent: true, opacity: 0.55 }));
  core.add(nucleus);

  // orbit rings with satellites
  const rings = [];
  if (o.rings) {
    [[2.25, 1.15, 0.3], [2.6, -0.5, 1.2]].forEach(([rad, tx, tz], idx) => {
      const g = new THREE.Group();
      const pts = []; for (let a = 0; a <= 128; a++) { const t = (a / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * rad, 0, Math.sin(t) * rad)); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 })));
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), new THREE.MeshBasicMaterial({ color: idx ? 0xffffff : o.color }));
      g.add(sat);
      g.rotation.set(tx, 0, tz);
      root.add(g);
      rings.push({ g, sat, rad, speed: idx ? -0.35 : 0.5 });
    });
  }

  // state
  const state = { scatter: 0, spin: 1, energy: 0, px: 0, py: 0, tx: 0, ty: 0 };
  let w = 1, h = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const visW = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
    const narrow = w < 640;
    root.position.x = narrow ? 0 : visW * o.offsetX;
    root.position.y = narrow ? 0.9 : 0.15;
    const s = narrow ? 0.78 : Math.min(1.15, Math.max(0.75, h / 520));
    root.scale.setScalar(s);
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);

  window.addEventListener('pointermove', (e) => {
    state.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    state.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    t += dt * state.spin;
    state.px += (state.tx - state.px) * 0.05; state.py += (state.ty - state.py) * 0.05;
    state.energy *= 0.96;

    const sc = state.scatter, breathe = 1 + Math.sin(t * 1.3) * 0.015;
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      const wob = Math.sin(t * 1.7 + i) * 0.03 * (1 + state.energy * 4);
      const out = sc * (1.4 + (i % 7) * 0.35) + wob;
      pos[k] = base[k] * breathe + dir[k] * out;
      pos[k + 1] = base[k + 1] * breathe + dir[k + 1] * out;
      pos[k + 2] = base[k + 2] * breathe + dir[k + 2] * out;
    }
    nodeGeo.attributes.position.needsUpdate = true;
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e], k = e * 6;
      linePos[k] = pos[a * 3]; linePos[k + 1] = pos[a * 3 + 1]; linePos[k + 2] = pos[a * 3 + 2];
      linePos[k + 3] = pos[b * 3]; linePos[k + 4] = pos[b * 3 + 1]; linePos[k + 5] = pos[b * 3 + 2];
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.11 * (1 - sc * 0.7) + state.energy * 0.15;

    for (let p = 0; p < P; p++) {
      const s = pulses[p];
      s.t += dt * s.v * (1 + state.energy * 3);
      if (s.t >= 1) { const nb = adj[s.b]; const prev = s.a; s.a = s.b; s.b = nb[Math.floor(rand() * nb.length)]; if (s.b === prev && nb.length > 1) s.b = nb[(nb.indexOf(prev) + 1) % nb.length]; s.t = 0; }
      const a = s.a, b = s.b;
      pulsePos[p * 3] = pos[a * 3] + (pos[b * 3] - pos[a * 3]) * s.t;
      pulsePos[p * 3 + 1] = pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * s.t;
      pulsePos[p * 3 + 2] = pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * s.t;
    }
    pulseGeo.attributes.position.needsUpdate = true;
    pulseMat.size = 0.13 + state.energy * 0.12;

    nucleus.rotation.x = t * 0.6; nucleus.rotation.y = t * 0.8;
    nucleus.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06 + state.energy * 0.5 + sc * 0.8);

    core.rotation.y = t * 0.18 + state.px * 0.5;
    core.rotation.x = Math.sin(t * 0.2) * 0.15 + state.py * 0.35;
    root.rotation.z = -state.px * 0.06;
    rings.forEach((r) => { const a = t * r.speed; r.sat.position.set(Math.cos(a) * r.rad, 0, Math.sin(a) * r.rad); r.g.rotation.y = t * 0.05 + state.px * 0.3; });

    renderer.render(scene, camera);
  }
  frame();

  return {
    state,
    setScatter(v) { state.scatter = v; },
    kick(v = 1) { state.energy = Math.min(1.5, state.energy + v); },
  };
};
})();

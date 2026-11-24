// One particle graph that lives behind the whole page and changes shape per section.
// Plain script (not a module) so the site also works when index.html is opened straight from disk.
(() => {
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

async function createScene(canvas, { count = 1600, mobile = false } = {}) {
  const THREE = await import(THREE_URL);
  const AMBER = new THREE.Color('#ffb547');
  const ORANGE = new THREE.Color('#ff8a3d');
  const CYAN = new THREE.Color('#5ee6ff');
  const WHITE = new THREE.Color('#f3efe6');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const group = new THREE.Group();
  scene.add(group);

  const N = count;
  const R = 2.5;
  const rand = mulberry32(26);

  // ---------- Base data ----------
  const sphere = new Float32Array(N * 3);
  const graph = new Float32Array(N * 3);
  const field = new Float32Array(N * 3);
  const core = new Float32Array(N * 3);
  const cluster = new Uint8Array(N);
  const seed = new Float32Array(N);
  const seed2 = new Float32Array(N);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const centers = [[-3.4, 1.3, 0.2], [-0.2, 2.1, -1.2], [3.3, 1.2, 0.4], [-2.6, -1.7, 0.8], [0.6, -1.9, -0.3], [3.2, -1.5, -1]];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const jitter = 1 + (rand() - 0.5) * 0.08;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    sphere[i * 3] = x * R * jitter; sphere[i * 3 + 1] = y * R * jitter; sphere[i * 3 + 2] = z * R * jitter;
    let best = 0, bd = -2;
    for (let d = 0; d < 6; d++) { const dot = x * dirs[d][0] + y * dirs[d][1] + z * dirs[d][2]; if (dot > bd) { bd = dot; best = d; } }
    cluster[i] = best;
    seed[i] = rand(); seed2[i] = rand();

    // graph: keep the local patch of the sphere, move it to its cluster centre
    const c = centers[best], dd = dirs[best];
    const lx = x * R - dd[0] * R, ly = y * R - dd[1] * R, lz = z * R - dd[2] * R;
    graph[i * 3] = c[0] + lx * 0.62 + (rand() - 0.5) * 0.25;
    graph[i * 3 + 1] = c[1] + ly * 0.62 + (rand() - 0.5) * 0.25;
    graph[i * 3 + 2] = c[2] + lz * 0.62 + (rand() - 0.5) * 0.25;

    field[i * 3] = (rand() - 0.5) * 22;
    field[i * 3 + 1] = (rand() - 0.5) * 13;
    field[i * 3 + 2] = -7 + rand() * 8;

    if (rand() < 0.72) {
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, rr = 0.55 * Math.cbrt(rand()), s = Math.sqrt(1 - u * u);
      core[i * 3] = Math.cos(a) * s * rr; core[i * 3 + 1] = u * rr; core[i * 3 + 2] = Math.sin(a) * s * rr;
    } else {
      const a = rand() * Math.PI * 2, rr = 1.6 + rand() * 1.6;
      core[i * 3] = Math.cos(a) * rr; core[i * 3 + 1] = (rand() - 0.5) * 0.12; core[i * 3 + 2] = Math.sin(a) * rr;
    }
  }

  // Edges: nearest neighbours on the sphere (inside the same cluster, so the graph view reads as clusters)
  const K = mobile ? 2 : 3;
  const edgeSet = new Set();
  const edges = [];
  for (let i = 0; i < N; i++) {
    const best = [];
    const ix = sphere[i * 3], iy = sphere[i * 3 + 1], iz = sphere[i * 3 + 2];
    for (let j = 0; j < N; j++) {
      if (j === i || cluster[j] !== cluster[i]) continue;
      const dx = sphere[j * 3] - ix, dy = sphere[j * 3 + 1] - iy, dz = sphere[j * 3 + 2] - iz;
      const d = dx * dx + dy * dy + dz * dz;
      if (best.length < K) { best.push([d, j]); best.sort((a, b) => a[0] - b[0]); }
      else if (d < best[K - 1][0]) { best[K - 1] = [d, j]; best.sort((a, b) => a[0] - b[0]); }
    }
    for (const [, j] of best) {
      const key = i < j ? i * N + j : j * N + i;
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push(i, j); }
    }
  }
  // a few long links between clusters, like relations between entity types
  for (let k = 0; k < 40; k++) {
    const a = Math.floor(rand() * N), b = Math.floor(rand() * N);
    if (cluster[a] !== cluster[b]) edges.push(a, b);
  }
  const E = edges.length / 2;

  // ---------- Geometry ----------
  const positions = new Float32Array(N * 3);
  positions.set(field);
  const from = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const c = cluster[i];
    const base = c % 3 === 0 ? AMBER : c % 3 === 1 ? CYAN : ORANGE;
    tmp.copy(base).lerp(WHITE, seed2[i] < 0.18 ? 0.7 : 0.08);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    sizes[i] = seed[i] < 0.06 ? 2.6 : 0.7 + seed2[i] * 0.9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const pointMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uOpacity: { value: 0 }, uSize: { value: mobile ? 36 : 44 }, uPR: { value: dpr }, uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize; varying vec3 vColor; varying float vFade;
      uniform float uSize; uniform float uPR; uniform float uTime;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 3.0 + position.y * 2.0);
        gl_PointSize = uSize * aSize * uPR * tw / -mv.z;
        vFade = smoothstep(-16.0, -6.0, mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vFade; uniform float uOpacity;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.16, 0.0, d);
        vec3 col = vColor * a + vec3(1.0) * core * 0.55;
        gl_FragColor = vec4(col, a * uOpacity * (0.35 + 0.65 * vFade));
      }`
  });
  const points = new THREE.Points(geo, pointMat);
  group.add(points);

  const linePos = new Float32Array(E * 2 * 3);
  const lineCol = new Float32Array(E * 2 * 3);
  for (let e = 0; e < E; e++) {
    const a = edges[e * 2], b = edges[e * 2 + 1];
    lineCol.set(colors.subarray(a * 3, a * 3 + 3), e * 6);
    lineCol.set(colors.subarray(b * 3, b * 3 + 3), e * 6 + 3);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  // ---------- Shapes ----------
  const LINE_OPACITY = { sphere: 0.13, wave: 0.0, ring: 0.05, graph: 0.34, field: 0.07, core: 0.0, helix: 0.1, constellation: 0.1, papers: 0.2, orbits: 0.0, funnel: 0.04, pair: 0.14, roles: 0.16 };
  const SPIN = { sphere: 1, wave: 0, ring: 0, graph: 0.25, field: 0.15, core: 1.6, helix: 1, constellation: 0, papers: 0.3, orbits: 0.5, funnel: 1, pair: 0.25, roles: 0.3 };
  const state = { scatter: 0, lineBase: 0, shape: 'field', t: 1, time: 0, opacity: 0, dim: 1, x: 0, y: 0, scale: 1, rotY: 0, spinV: 0, mx: 0, my: 0, tmx: 0, tmy: 0, burst: 0 };

  // ---------- Data for the section shapes ----------
  // Points are split into k groups by their longitude on the sphere, so the neighbour lines stay inside a group.
  const sectors = {};
  for (const k of [2, 3, 4, 14]) {
    const arr = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const th = Math.atan2(sphere[i * 3 + 2], sphere[i * 3]);
      arr[i] = Math.min(k - 1, Math.floor(((th + Math.PI) / (Math.PI * 2)) * k));
    }
    sectors[k] = arr;
  }
  const ball = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.cbrt(rand()), q = Math.sqrt(1 - u * u);
    ball[i * 3] = Math.cos(a) * q * r; ball[i * 3 + 1] = u * r; ball[i * 3 + 2] = Math.sin(a) * q * r;
  }
  const ringTilt = Array.from({ length: 6 }, (_, r) => [0.35 + r * 0.42, r * 1.05]);

  function inCluster(cx, cy, cz, radius, c, i, t, out) {
    const a = t * 0.35 + c * 1.3, ca = Math.cos(a), sa = Math.sin(a);
    const bx = ball[i * 3], by = ball[i * 3 + 1], bz = ball[i * 3 + 2];
    out[0] = cx + (bx * ca - bz * sa) * radius;
    out[1] = cy + by * radius;
    out[2] = cz + (bx * sa + bz * ca) * radius;
  }

  function target(shape, i, t, out) {
    const k = i * 3;
    switch (shape) {
      case 'sphere': {
        const b = 1 + 0.025 * Math.sin(t * 1.2 + seed[i] * 12) + (state.burst + state.scatter) * (0.6 + seed[i] * 1.4);
        out[0] = sphere[k] * b; out[1] = sphere[k + 1] * b; out[2] = sphere[k + 2] * b; return;
      }
      case 'graph': {
        const w = 0.06 * Math.sin(t * 1.1 + seed[i] * 20);
        out[0] = graph[k] + w; out[1] = graph[k + 1] + w * 0.8; out[2] = graph[k + 2]; return;
      }
      case 'field': {
        out[0] = field[k] + Math.sin(t * 0.25 + seed[i] * 30) * 0.3;
        out[1] = field[k + 1] + Math.cos(t * 0.22 + seed2[i] * 30) * 0.3;
        out[2] = field[k + 2]; return;
      }
      case 'core': {
        const a = t * (0.4 + seed[i] * 0.6);
        const x = core[k], z = core[k + 2];
        const ca = Math.cos(a * (seed2[i] < 0.5 ? 1 : -1) * 0.5), sa = Math.sin(a * 0.5);
        const pulse = 1 + 0.08 * Math.sin(t * 3 + seed[i] * 6);
        out[0] = (x * ca - z * sa) * pulse; out[1] = core[k + 1] * pulse; out[2] = (x * sa + z * ca) * pulse; return;
      }
      case 'wave': {
        const lane = i % 4, u = Math.floor(i / 4) / (N / 4);
        const x = (u - 0.5) * 15;
        const env = Math.sin(u * Math.PI);
        const talk = 0.55 + 0.45 * Math.sin(t * 0.9 + lane * 1.9);
        const amp = 0.42 * env * talk;
        const y = (1.5 - lane) * 1.05 + amp * Math.sin(x * 2.1 + t * 2.6 + lane * 1.3) * (0.7 + 0.3 * Math.sin(x * 5.3 - t * 3.1));
        out[0] = x; out[1] = y + (seed[i] - 0.5) * 0.06; out[2] = (seed2[i] - 0.5) * 0.5; return;
      }
      case 'ring': {
        const a = (i / N) * Math.PI * 2 * 3 + seed[i] * 0.02;
        const voice = 0.24 * Math.sin(a * 7 + t * 2.4) * (0.5 + 0.5 * Math.sin(t * 1.6)) + 0.12 * Math.sin(a * 13 - t * 3.3);
        const r = 2.3 + voice + (seed2[i] - 0.5) * 0.4 + (i % 3) * 0.08;
        out[0] = Math.cos(a) * r; out[1] = Math.sin(a) * r; out[2] = (seed[i] - 0.5) * 0.7; return;
      }
      case 'constellation': { // 14 projects on a turning ring
        const c = sectors[14][i];
        const a = (c / 14) * Math.PI * 2 + t * 0.12;
        inCluster(Math.cos(a) * 4.2, Math.sin(a) * 1.25, Math.sin(a) * 2.2 - 1, 0.42, c, i, t, out);
        return;
      }
      case 'papers': { // three published papers
        const c = sectors[3][i];
        const a = (c / 3) * Math.PI * 2 + Math.PI / 2;
        inCluster(Math.cos(a) * 2.7, Math.sin(a) * 2.1 - 0.3, 0, 1.0 + 0.04 * Math.sin(t * 1.4 + c), c, i, t, out);
        return;
      }
      case 'roles': { // four leadership and volunteering roles
        const c = sectors[4][i];
        const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
        inCluster(Math.cos(a) * 3, Math.sin(a) * 1.9, c % 2 ? 0.7 : -0.7, 0.85, c, i, t, out);
        return;
      }
      case 'pair': { // FLAME University to Warwick, joined by a bridge
        if (seed2[i] < 0.14) {
          const u = seed[i];
          out[0] = -1.55 + u * 3.1;
          out[1] = Math.sin(u * 9 - t * 2.2) * 0.14;
          out[2] = Math.cos(u * 9 - t * 2.2) * 0.14;
          return;
        }
        const c = sectors[2][i];
        inCluster(c ? 2.75 : -2.75, 0, 0, c ? 1.35 : 1.15, c, i, t, out);
        return;
      }
      case 'funnel': { // a ranking that narrows to the top
        const u = i / N;
        const ang = u * Math.PI * 34 + t * 0.5;
        const r = 0.1 + 3.4 * Math.pow(u, 2.2) + (seed[i] - 0.5) * 0.1;
        out[0] = Math.cos(ang) * r; out[1] = (u - 0.5) * 7.4; out[2] = Math.sin(ang) * r;
        return;
      }
      case 'orbits': { // six skill groups as tilted orbits
        const ring = i % 6, [tx, tz] = ringTilt[ring];
        const a = (Math.floor(i / 6) / (N / 6)) * Math.PI * 2 + t * (0.25 + ring * 0.05) * (ring % 2 ? 1 : -1);
        const R = 2.6 + (seed[i] - 0.5) * 0.1;
        const x = Math.cos(a) * R, z = Math.sin(a) * R;
        const y1 = -z * Math.sin(tx), z1 = z * Math.cos(tx);
        out[0] = x * Math.cos(tz) - y1 * Math.sin(tz);
        out[1] = x * Math.sin(tz) + y1 * Math.cos(tz);
        out[2] = z1;
        return;
      }
      case 'helix': {
        const strand = i % 2, u = i / N;
        const ang = u * Math.PI * 10 + strand * Math.PI + t * 0.35;
        const rung = seed[i] < 0.22;
        const rr = rung ? (seed2[i] * 2 - 1) * 1.3 : 1.3 + (seed2[i] - 0.5) * 0.12;
        out[0] = Math.cos(ang) * rr; out[1] = (u - 0.5) * 11; out[2] = Math.sin(ang) * rr; return;
      }
    }
  }

  // ---------- Public API ----------
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let tween = null;
  function setShape(shape, opts = {}) {
    const dim = opts.dim ?? 1, x = opts.x ?? 0, y = opts.y ?? 0, duration = opts.duration ?? 1.8;
    const gs = window.gsap;
    if (gs) {
      gs.to(state, { dim, x, y, duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' });
      gs.to(state, { lineBase: LINE_OPACITY[shape] ?? 0.1, duration: 1.4, ease: 'power2.inOut', overwrite: 'auto' });
    } else { state.dim = dim; state.x = x; state.y = y; state.lineBase = LINE_OPACITY[shape] ?? 0.1; }
    if (shape === state.shape) return;
    from.set(positions);
    state.shape = shape;
    state.t = 0;
    if (tween) tween.kill();
    if (gs) tween = gs.to(state, { t: 1, duration, ease: 'none' });
    else state.t = 1;
  }
  function fadeIn(duration = 2) {
    if (window.gsap) window.gsap.to(state, { opacity: 1, duration, ease: 'power2.out' });
    else state.opacity = 1;
  }
  function setPointer(nx, ny) { state.tmx = nx; state.tmy = ny; }
  function kick(v) { state.spinV = Math.max(-3, Math.min(3, state.spinV + v)); }
  function setScatter(v) { state.scatter = v; }
  function burst() { if (window.gsap) window.gsap.fromTo(state, { burst: 0.35 }, { burst: 0, duration: 1.6, ease: 'expo.out' }); }

  // ---------- Loop ----------
  const out = [0, 0, 0];
  let w = 0, h = 0;
  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 700 ? 13.5 : w < 1100 ? 11.5 : 10;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    state.time += dt;
    const t = state.time;

    // morph with a per-point stagger so shapes flow into each other
    const p = state.t;
    const shape = state.shape;
    if (p >= 1) {
      for (let i = 0; i < N; i++) { target(shape, i, t, out); positions[i * 3] = out[0]; positions[i * 3 + 1] = out[1]; positions[i * 3 + 2] = out[2]; }
    } else {
      for (let i = 0; i < N; i++) {
        target(shape, i, t, out);
        let e = (p * 1.45 - seed[i] * 0.45);
        e = ease(e < 0 ? 0 : e > 1 ? 1 : e);
        const k = i * 3;
        positions[k] = from[k] + (out[0] - from[k]) * e;
        positions[k + 1] = from[k + 1] + (out[1] - from[k + 1]) * e;
        positions[k + 2] = from[k + 2] + (out[2] - from[k + 2]) * e;
      }
    }
    geo.attributes.position.needsUpdate = true;

    lineMat.opacity = state.lineBase * state.opacity * state.dim;
    if (lineMat.opacity > 0.001) {
      for (let e = 0; e < E; e++) {
        const a = edges[e * 2] * 3, b = edges[e * 2 + 1] * 3, o = e * 6;
        linePos[o] = positions[a]; linePos[o + 1] = positions[a + 1]; linePos[o + 2] = positions[a + 2];
        linePos[o + 3] = positions[b]; linePos[o + 4] = positions[b + 1]; linePos[o + 5] = positions[b + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;
      lines.visible = true;
    } else lines.visible = false;

    // pointer and spin
    state.mx += (state.tmx - state.mx) * 0.05;
    state.my += (state.tmy - state.my) * 0.05;
    state.spinV *= 0.94;
    state.rotY += dt * (0.08 * (SPIN[shape] ?? 0.5) + state.spinV * 0.5);
    if (!SPIN[shape]) { const home = Math.round(state.rotY / (Math.PI * 2)) * Math.PI * 2; state.rotY += (home - state.rotY) * 0.04; }
    group.rotation.y = state.rotY + state.mx * 0.45;
    group.rotation.x = state.my * 0.3 + (shape === 'helix' ? 0.25 : 0);
    group.rotation.z = shape === 'helix' ? -0.35 : 0;
    const xShift = w < 1000 ? 0 : state.x;
    group.position.x += (xShift - group.position.x) * 0.06;
    group.position.y += (state.y - group.position.y) * 0.06;

    pointMat.uniforms.uOpacity.value = state.opacity * state.dim;

    renderer.render(scene, camera);
  }
  loop();

  return { setShape, setScatter, setPointer, fadeIn, kick, burst, state };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

window.createScene = createScene;
})();

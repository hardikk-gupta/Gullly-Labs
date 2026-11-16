// 3D layer (Three.js). Loaded on demand, only where WebGL exists and motion is welcome.
// Every effect is an enhancement over content that already works without it.

import { reducedMotion, clamp } from './lib.js';

let lib;
const three = () => (lib ||= import('./vendor/three.module.min.js'));

export const can3d = (() => {
  if (reducedMotion) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
})();

/** Renderer + camera bound to a canvas. Renders only while on screen and the tab is visible. */
async function stage(canvas, { fov = 32, z = 8, alpha = true } = {}) {
  const T = await three();
  const renderer = new T.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.z = z;

  let frame = () => {};
  let visible = false, raf = 0, last = 0, dead = false;
  const size = { w: 1, h: 1 };
  const resize = () => {
    size.w = canvas.clientWidth || 1; size.h = canvas.clientHeight || 1;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    onResize?.(size);
  };
  let onResize;
  const loop = (now) => {
    raf = 0;
    if (dead || !visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (frame(dt, now / 1000) !== false) renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && visible && !dead) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '100px' });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  document.addEventListener('visibilitychange', kick);
  resize();

  return {
    T, renderer, scene, camera, size,
    onFrame(fn) { frame = fn; kick(); },
    onResize(fn) { onResize = fn; fn(size); },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', kick);
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
      });
      renderer.dispose();
    },
  };
}

function loadTexture(T, url) {
  return new Promise((resolve, reject) => {
    const loader = new T.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex) => { tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; resolve(tex); }, undefined, reject);
  });
}

/** Soft studio lighting baked into an environment map, so glossy materials have something to reflect. */
function studio(T, renderer) {
  const env = new T.Scene();
  env.background = new T.Color(0x9aa3b5);
  const panel = (color, intensity, x, y, z, w, h) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(0xffffff, 6, 0, 6, 0, 8, 8);
  panel(0xffffff, 3, -6, 1, 3, 5, 6);
  panel(0x9fc0ff, 3, 6, 0, -2, 5, 6);
  panel(0xffffff, 1.5, 0, -1, 7, 8, 3);
  const pmrem = new T.PMREMGenerator(renderer);
  const map = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  env.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return map;
}

/* ------------------------------------------------------------------ */
/* 1. Hero: the campaign image becomes a surface that ripples under the pointer */

export async function heroLiquid(host, img) {
  if (!can3d) return () => {};
  if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
  if (!img.naturalWidth || !host.isConnected) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__gl';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const s = await stage(canvas, { alpha: false });
  const { T } = s;
  let tex;
  try { tex = await loadTexture(T, img.currentSrc || img.src); } catch { s.dispose(); canvas.remove(); return () => {}; }
  tex.colorSpace = T.NoColorSpace; // the shader passes pixels straight through, so skip the linear round trip

  const uniforms = {
    uTex: { value: tex }, uMouse: { value: new T.Vector2(0.5, 0.5) }, uPower: { value: 0 }, uTime: { value: 0 },
    uAspect: { value: 1 }, uImage: { value: tex.image.width / tex.image.height },
  };
  const mesh = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      precision highp float;
      uniform sampler2D uTex; uniform vec2 uMouse; uniform float uPower, uTime, uAspect, uImage; varying vec2 vUv;
      void main(){
        // cover-fit with the same slight overscan the static image has
        vec2 uv = vUv - .5; float r = uAspect / uImage;
        uv *= r > 1. ? vec2(1., 1. / r) : vec2(r, 1.);
        uv = uv / 1.05 + .5;
        vec2 d = vUv - uMouse; d.x *= uAspect;
        float dist = length(d);
        float fall = smoothstep(.55, 0., dist);
        float wave = sin(dist * 34. - uTime * 5.) * fall * uPower;
        vec2 push = normalize(d + 1e-5) * wave * .018;
        float split = fall * uPower * .006;
        vec3 c = vec3(texture2D(uTex, uv + push + vec2(split, 0.)).r, texture2D(uTex, uv + push).g, texture2D(uTex, uv + push - vec2(split, 0.)).b);
        c += wave * .05;
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest: false,
  }));
  mesh.frustumCulled = false;
  s.scene.add(mesh);
  s.onResize(({ w, h }) => (uniforms.uAspect.value = w / h));

  const target = new T.Vector2(0.5, 0.5);
  let energy = 0;
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    energy = clamp(energy + Math.hypot(x - target.x, y - target.y) * 5, 0, 1);
    target.set(x, y);
  };
  host.addEventListener('pointermove', onMove, { passive: true });

  energy = 0.9; // one ripple as it arrives
  s.onFrame((dt, t) => {
    uniforms.uMouse.value.lerp(target, 1 - Math.exp(-dt * 8));
    energy *= Math.exp(-dt * 1.6);
    uniforms.uPower.value += (energy - uniforms.uPower.value) * (1 - Math.exp(-dt * 6));
    uniforms.uTime.value = t;
    return uniforms.uPower.value > 0.002 || !canvas.classList.contains('is-on');
  });
  requestAnimationFrame(() => { canvas.classList.add('is-on'); host.classList.add('has-gl'); });

  return () => { host.removeEventListener('pointermove', onMove); s.dispose(); };
}

/* ------------------------------------------------------------------ */
/* 2. A chunky extruded sneaker that turns with scroll and leans toward the pointer */

function sneakerGroup(T, envMap) {
  const body = new T.Shape();
  body.moveTo(3, -19.5); body.lineTo(3, -11);
  body.bezierCurveTo(3, -9.4, 3.6, -7.8, 4.6, -6.6);
  body.lineTo(6, -5); body.lineTo(9.4, -7.2);
  body.bezierCurveTo(11, -8.2, 13.1, -8, 14.4, -6.7);
  body.lineTo(17, -4); body.lineTo(19.6, -4.4);
  body.bezierCurveTo(21.1, -7.8, 25.2, -10.7, 30.3, -12);
  body.lineTo(41.3, -14.7);
  body.bezierCurveTo(45.5, -15.7, 48, -17.4, 48, -19.5);
  body.closePath();

  const sole = new T.Shape();
  const r = 1.4, x0 = 2, x1 = 49.5, y0 = -23, y1 = -19.6;
  sole.moveTo(x0 + r, y0); sole.lineTo(x1 - r * 2, y0);
  sole.quadraticCurveTo(x1, y0, x1, y0 + r * 1.6); sole.lineTo(x1, y1); sole.lineTo(x0, y1); sole.lineTo(x0, y0 + r);
  sole.quadraticCurveTo(x0, y0, x0 + r, y0);

  const stripe = new T.Shape();
  stripe.moveTo(20, -19.5); stripe.lineTo(25.5, -10.6); stripe.lineTo(28.5, -11.5); stripe.lineTo(24, -19.5); stripe.closePath();

  const extrude = (shape, depth, bevel) => {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 24 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  const mat = (color, rough, metal = 0) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMap, envMapIntensity: 0.55 });

  const group = new T.Group();
  const upper = new T.Mesh(extrude(body, 13, 1.6), mat(0x0038c8, 0.42, 0.0));
  const outsole = new T.Mesh(extrude(sole, 15.5, 0.9), mat(0xf4f1ea, 0.55));
  const band = new T.Mesh(extrude(stripe, 16.6, 0.2), mat(0xffffff, 0.4));
  group.add(upper, outsole, band);

  // laces: short white bars across the throat
  const laceMat = mat(0xffffff, 0.5);
  [[19.2, -7.6], [22.2, -9.6], [25.4, -11.2]].forEach(([x, y]) => {
    const lace = new T.Mesh(new T.CapsuleGeometry(0.62, 16.4, 4, 10), laceMat);
    lace.rotation.x = Math.PI / 2; lace.position.set(x, y + 1.7, 0);
    group.add(lace);
  });

  group.children.forEach((m) => m.position.x -= 26);
  group.children.forEach((m) => m.position.y += 13.5);
  group.scale.setScalar(0.07);
  return group;
}

export async function sneakerToken(canvas) {
  if (!can3d) return () => {};
  const s = await stage(canvas, { fov: 28, z: 9 });
  const { T } = s;
  const env = studio(T, s.renderer);
  s.scene.add(new T.AmbientLight(0xffffff, 0.25));
  const key = new T.DirectionalLight(0xffffff, 2.4); key.position.set(-4, 6, 5); s.scene.add(key);
  const rim = new T.DirectionalLight(0x9fc0ff, 1.4); rim.position.set(5, 2, -6); s.scene.add(rim);

  const shoe = sneakerGroup(T, env);
  const pivot = new T.Group();
  pivot.add(shoe);
  s.scene.add(pivot);

  s.onResize(({ w, h }) => { pivot.scale.setScalar(clamp(w / h, 0.55, 1.5) / 1.5 * 1.15 + 0.15); });

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    tilt.tx = clamp((e.clientX - r.left) / r.width - 0.5, -0.6, 0.6);
    tilt.ty = clamp((e.clientY - r.top) / r.height - 0.5, -0.6, 0.6);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let spin = -0.7, dragVel = 0, down = false, lastX = 0;
  const onDown = (e) => { down = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing'); };
  const onDrag = (e) => { if (!down) return; dragVel = (e.clientX - lastX) * 0.012; spin += dragVel; lastX = e.clientX; };
  const onUp = () => { down = false; canvas.classList.remove('is-grabbing'); };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onDrag);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  canvas.classList.add('is-on');
  s.onFrame((dt, t) => {
    if (!down) { spin += dragVel; dragVel *= Math.exp(-dt * 3); spin += dt * 0.35; }
    const r = canvas.getBoundingClientRect();
    const scroll = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 4));
    tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 4));
    pivot.rotation.y = spin + scroll * 1.6 + tilt.x * 0.5;
    pivot.rotation.x = 0.22 + tilt.y * 0.35;
    pivot.rotation.z = -0.08 + Math.sin(t * 0.8) * 0.03;
    pivot.position.y = Math.sin(t * 1.1) * 0.08;
  });

  return () => {
    window.removeEventListener('pointermove', onMove);
    env.dispose();
    s.dispose();
  };
}

/* ------------------------------------------------------------------ */
/* 3. Ring of product tiles: drag to spin, it settles on one; tap the front tile to open it */

export async function productRing(canvas, items, { onFront, onOpen }) {
  if (!can3d) return () => {};
  const s = await stage(canvas, { fov: 30, z: 7.3 });
  const { T } = s;
  const n = items.length;
  const step = (Math.PI * 2) / n;
  const radius = 3.1;
  const ring = new T.Group();
  s.scene.add(ring);
  s.camera.position.set(0, 0.35, 7.3);
  s.camera.lookAt(0, 0, 0);
  s.scene.fog = new T.Fog(0xf3f3f1, 5.8, 11);

  // one curved tile, bent to the ring's radius
  const tileW = Math.min(1.75, radius * step * 0.92);
  const geo = new T.PlaneGeometry(tileW, tileW, 20, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i) / radius;
    pos.setXYZ(i, Math.sin(a) * radius, pos.getY(i), Math.cos(a) * radius - radius);
  }
  geo.computeVertexNormals();

  const tiles = items.map((item, i) => {
    const mat = new T.MeshBasicMaterial({ color: 0xe6e6e3, side: T.DoubleSide });
    const mesh = new T.Mesh(geo, mat);
    const holder = new T.Group();
    mesh.position.z = radius;
    holder.rotation.y = i * step;
    holder.add(mesh);
    ring.add(holder);
    mesh.userData.index = i;
    loadTexture(T, item.image).then((tex) => { mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; }).catch(() => {});
    return mesh;
  });

  s.onResize(({ w, h }) => {
    const a = w / h;
    s.camera.fov = a < 1.3 ? 40 : 30;
    s.camera.updateProjectionMatrix();
  });

  let angle = 0, vel = 0, down = false, moved = 0, lastX = 0, target = null, front = -1, idle = 0;
  const frontIndex = () => ((Math.round(-angle / step) % n) + n) % n;
  const ray = new T.Raycaster();
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), s.camera);
    return ray.intersectObjects(tiles)[0]?.object.userData.index;
  };
  const goTo = (i) => {
    let delta = -i * step - angle;
    delta = ((delta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    target = angle + delta;
  };
  const onDown = (e) => { down = true; moved = 0; lastX = e.clientX; target = null; idle = 0; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing'); };
  const onMove = (e) => {
    if (!down) { canvas.style.cursor = hit(e) === undefined ? '' : hit(e) === frontIndex() ? 'pointer' : 'grab'; return; }
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    vel = dx * 0.0052; angle += vel;
  };
  const onUp = (e) => {
    if (!down) return;
    down = false; canvas.classList.remove('is-grabbing');
    if (moved < 6) {
      const i = hit(e);
      if (i === undefined) return;
      if (i === frontIndex()) onOpen?.(items[i]); else goTo(i);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { down = false; canvas.classList.remove('is-grabbing'); });

  canvas.classList.add('is-on');
  s.onFrame((dt) => {
    if (!down) {
      if (target !== null) {
        angle += (target - angle) * (1 - Math.exp(-dt * 6));
        if (Math.abs(target - angle) < 0.001) { angle = target; target = null; }
      } else if (Math.abs(vel) > 0.0008) {
        angle += vel; vel *= Math.exp(-dt * 2.6);
      } else {
        vel = 0; idle += dt;
        const snap = Math.round(angle / step) * step;
        angle += (snap - angle) * (1 - Math.exp(-dt * 5));
        if (idle > 3.5) { idle = 0; goTo((frontIndex() + 1) % n); }
      }
    }
    ring.rotation.y = angle;
    const f = frontIndex();
    tiles.forEach((m, i) => {
      const want = i === f ? 1.12 : 1;
      m.scale.setScalar(m.scale.x + (want - m.scale.x) * (1 - Math.exp(-dt * 8)));
    });
    if (f !== front) { front = f; onFront?.(items[f], f); }
  });

  return { next: () => { idle = 0; goTo((frontIndex() + 1) % n); }, prev: () => { idle = 0; goTo((frontIndex() - 1 + n) % n); }, dispose: () => s.dispose() };
}

/* ------------------------------------------------------------------ */
/* 4. Product photos wrapped on a box you can turn in your hand */

export async function photoBox(canvas, images) {
  if (!can3d) return () => {};
  const s = await stage(canvas, { fov: 30, z: 6.4 });
  const { T } = s;
  const faces = Array.from({ length: 6 }, (_, i) => images[i % images.length]);
  const mats = faces.map((url) => {
    const m = new T.MeshBasicMaterial({ color: 0xe9e9e6 });
    loadTexture(T, url).then((tex) => { m.map = tex; m.color.set(0xffffff); m.needsUpdate = true; }).catch(() => {});
    return m;
  });
  // order the faces so neighbouring photos land on neighbouring sides: +x, -x, +y, -y, +z, -z
  const order = [1, 3, 4, 5, 0, 2].map((i) => mats[i]);
  const box = new T.Mesh(new T.BoxGeometry(2.2, 2.2, 2.2), order);
  const edges = new T.LineSegments(new T.EdgesGeometry(box.geometry), new T.LineBasicMaterial({ color: 0x0b0b0c, transparent: true, opacity: 0.18 }));
  box.add(edges);
  s.scene.add(box);
  s.onResize(({ w, h }) => box.scale.setScalar(w < h ? 0.72 : 1));

  let rx = -0.35, ry = 0.6, vx = 0, vy = 0.004, down = false, lx = 0, ly = 0;
  const onDown = (e) => { down = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing'); };
  const onMove = (e) => {
    if (!down) return;
    vy = (e.clientX - lx) * 0.008; vx = (e.clientY - ly) * 0.008;
    ry += vy; rx = clamp(rx + vx, -1.4, 1.4); lx = e.clientX; ly = e.clientY;
  };
  const onUp = () => { down = false; canvas.classList.remove('is-grabbing'); };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  canvas.classList.add('is-on');
  s.onFrame((dt) => {
    if (!down) {
      ry += vy; rx = clamp(rx + vx, -1.4, 1.4);
      vx *= Math.exp(-dt * 3);
      vy += (0.004 - vy) * (1 - Math.exp(-dt * 1.5));
    }
    box.rotation.set(rx, ry, 0);
  });
  return () => s.dispose();
}

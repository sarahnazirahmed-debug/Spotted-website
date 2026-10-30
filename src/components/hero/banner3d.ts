// The 3D cloth banner (Three.js). Our own artwork: a red bookmark with a V-notch, a white pin,
// the launch words, and a purple / lilac / red holographic sheen.
//
// How the cloth works, in plain words:
//  - The cloth is a grid of points joined by invisible springs (a "Verlet" cloth).
//  - The top row hangs from a thin rod. The rod flies in from the top-left and lands in the middle.
//  - Gravity and a little wind move the points; the springs pull them back together.
//  - A visitor can grab a small patch of points with a mouse or finger and drag it around.
//    On release the cloth swings and settles by itself.
import * as THREE from "three";

export type BannerOptions = {
  label: string; // e.g. "COMING SOON"
  date: string; // e.g. "01.01.2027"
  skipSlowCheck: boolean; // true when testing with ?force3d
  onReady: () => void; // the first frame is on screen
  onSlow: () => void; // this phone is too slow: switch to the still picture
};

// ---- Size of the cloth (in world units) and how many points it has ----
const NX = 15; // points across
const NY = 24; // points down
const W = 2.2;
const H = 3.4;
const NOTCH = 0.13; // depth of the V-notch, as a share of the height
const DX = W / (NX - 1);
const DY = H / (NY - 1);
const COUNT = NX * NY;

const TEX_W = 1024;
const TEX_H = 1584;

// ---- The printed artwork (drawn once into a picture, then wrapped onto the cloth) ----
function drawArtwork(label: string, date: string, family: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;
  const notchY = TEX_H - NOTCH * TEX_H;

  // The bookmark shape (everything outside it stays see-through).
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(TEX_W, 0);
  g.lineTo(TEX_W, TEX_H);
  g.lineTo(TEX_W / 2, notchY);
  g.lineTo(0, TEX_H);
  g.closePath();
  g.fillStyle = "#E5383B";
  g.fill();
  const shade = g.createLinearGradient(0, 0, 0, TEX_H);
  shade.addColorStop(0, "rgba(60,9,108,0)");
  shade.addColorStop(1, "rgba(60,9,108,0.28)");
  g.fillStyle = shade;
  g.fill();

  // Stitched hem.
  g.save();
  g.setLineDash([16, 14]);
  g.lineWidth = 6;
  g.strokeStyle = "rgba(201,162,255,0.6)";
  g.beginPath();
  g.moveTo(40, 40);
  g.lineTo(TEX_W - 40, 40);
  g.lineTo(TEX_W - 40, TEX_H - 62);
  g.lineTo(TEX_W / 2, notchY - 46);
  g.lineTo(40, TEX_H - 62);
  g.closePath();
  g.stroke();
  g.restore();

  // White location pin with a soft lilac glow.
  const pin = () => {
    g.beginPath();
    g.moveTo(512, 640);
    g.bezierCurveTo(322, 440, 382, 300, 512, 300);
    g.bezierCurveTo(642, 300, 702, 440, 512, 640);
    g.closePath();
  };
  g.save();
  g.shadowColor = "#C9A2FF";
  g.shadowBlur = 50;
  g.fillStyle = "#FFFFFF";
  pin();
  g.fill();
  g.restore();
  g.fillStyle = "#FFFFFF";
  pin();
  g.fill();
  g.fillStyle = "#E5383B";
  g.beginPath();
  g.arc(512, 410, 46, 0, Math.PI * 2);
  g.fill();

  // Words. Shrink them if they would not fit.
  const fit = (text: string, weight: number, size: number, maxW: number, spacing = 0) => {
    let s = size;
    const set = () => {
      g.font = `${weight} ${s}px ${family}`;
      (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`;
    };
    set();
    while (g.measureText(text).width > maxW && s > 20) {
      s -= 2;
      set();
    }
  };
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#FFFFFF";
  fit(label, 800, 78, TEX_W - 160, 8);
  g.fillText(label, TEX_W / 2 + 4, 880);
  // Second line (the date, or "Restaurants"), with a yellow highlight bar as wide as the words.
  g.fillStyle = "#FFFFFF";
  fit(date, 800, 108, TEX_W - 200, 0);
  const lineW = g.measureText(date).width;
  g.fillText(date, TEX_W / 2, 1010);
  g.fillStyle = "#FFD23F";
  g.beginPath();
  g.roundRect(TEX_W / 2 - lineW / 2 - 8, 1040, lineW + 16, 22, 11);
  g.fill();
  return c;
}

// ---- The shiny holographic cloth look ----
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime;
  uniform vec3 cPurple;
  uniform vec3 cLilac;
  uniform vec3 cRed;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 tex = texture2D(map, vUv);
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
    float diff = 0.62 + 0.38 * max(dot(n, L), 0.0);

    // The back of the cloth is plain red.
    vec3 base = gl_FrontFacing ? tex.rgb : cRed;

    // Holographic sheen: bands of purple, lilac and red that slide as the cloth moves.
    float fres = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 2.2);
    float band = n.x * 1.6 + n.y * 0.9 + vUv.y * 1.4 + vUv.x * 0.6 + uTime * 0.08;
    float a = 0.5 + 0.5 * sin(band * 6.2832);
    float b = 0.5 + 0.5 * sin(band * 4.4 + 2.0);
    vec3 holo = mix(mix(cPurple, cLilac, a), cRed, b * 0.55);
    vec3 col = base * diff + holo * (0.07 + 0.42 * fres) * 0.8;

    // A soft shiny highlight.
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 36.0);
    col += cLilac * spec * 0.4;

    gl_FragColor = vec4(col, tex.a);
    #include <colorspace_fragment>
  }
`;

const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);

export async function createBanner(host: HTMLElement, opts: BannerOptions): Promise<{ dispose: () => void }> {
  // The words are printed with Poppins, so wait for the font first.
  const family = getComputedStyle(document.body).fontFamily;
  try {
    await document.fonts.load(`800 78px ${family}`);
  } catch {
    // If the font check fails we still draw, just with the fallback font.
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  // ---- The cloth mesh ----
  const px = new Float32Array(COUNT);
  const py = new Float32Array(COUNT);
  const pz = new Float32Array(COUNT);
  const ox = new Float32Array(COUNT);
  const oy = new Float32Array(COUNT);
  const oz = new Float32Array(COUNT);
  const grabbed = new Uint8Array(COUNT);
  const id = (i: number, j: number) => j * NX + i;

  const positions = new Float32Array(COUNT * 3);
  const uvs = new Float32Array(COUNT * 2);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const k = id(i, j);
      uvs[k * 2] = i / (NX - 1);
      uvs[k * 2 + 1] = 1 - j / (NY - 1);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < NY - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const a = id(i, j);
      const b = id(i + 1, j);
      const c = id(i, j + 1);
      const d = id(i + 1, j + 1);
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);

  const texture = new THREE.CanvasTexture(drawArtwork(opts.label, opts.date, family));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      map: { value: texture },
      uTime: { value: 0 },
      cPurple: { value: new THREE.Color("#6A1FB0") },
      cLilac: { value: new THREE.Color("#C9A2FF") },
      cRed: { value: new THREE.Color("#E5383B") },
    },
  });
  const cloth = new THREE.Mesh(geometry, material);
  cloth.frustumCulled = false;
  scene.add(cloth);

  // ---- The rod the cloth hangs from ----
  const rodMat = new THREE.MeshBasicMaterial({ color: "#C9A2FF" });
  const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, W + 0.3, 12);
  rodGeo.rotateZ(Math.PI / 2);
  const capGeo = new THREE.SphereGeometry(0.085, 14, 10);
  const rod = new THREE.Group();
  rod.add(new THREE.Mesh(rodGeo, rodMat));
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, rodMat);
    cap.position.x = (s * (W + 0.3)) / 2;
    rod.add(cap);
  }
  scene.add(rod);

  // ---- Springs between points ----
  const A: number[] = [];
  const B: number[] = [];
  const R: number[] = [];
  const S: number[] = [];
  const link = (a: number, b: number, rest: number, stiff: number) => {
    A.push(a);
    B.push(b);
    R.push(rest);
    S.push(stiff);
  };
  const diag = Math.hypot(DX, DY);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      if (i < NX - 1) link(id(i, j), id(i + 1, j), DX, 1);
      if (j < NY - 1) link(id(i, j), id(i, j + 1), DY, 1);
      if (i < NX - 1 && j < NY - 1) {
        link(id(i, j), id(i + 1, j + 1), diag, 0.6);
        link(id(i + 1, j), id(i, j + 1), diag, 0.6);
      }
      if (i < NX - 2) link(id(i, j), id(i + 2, j), DX * 2, 0.25);
      if (j < NY - 2) link(id(i, j), id(i, j + 2), DY * 2, 0.25);
    }
  }
  const LINKS = A.length;

  // ---- Where the rod starts, where it lands (changes with screen size) ----
  const rodNow = { x: 0, y: 0, z: 0, rot: 0 };
  const target = { x: 0, y: 0 };
  const start = { x: 0, y: 0 };
  let visH = 6;
  let visW = 6;
  let landed = false;
  const FLY_DELAY = 0.2;
  const FLY_TIME = 2.1;
  let t0 = performance.now() / 1000;

  function layout() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    // Keep the banner at least ~60% of the screen width on tall phone screens.
    const dist = Math.max(8, 3.6 / (2 * tan * aspect));
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    visH = 2 * dist * tan;
    visW = visH * aspect;
    target.x = 0;
    target.y = visH * 0.5 - visH * 0.11; // banner top sits 11% below the top of the screen
    start.x = -(visW * 0.5 + W * 0.5 + 1.2);
    start.y = visH * 0.5 + 1.6;
  }
  layout();

  function setRod(time: number) {
    if (landed) {
      rodNow.x = target.x;
      rodNow.y = target.y;
      rodNow.z = 0;
      rodNow.rot = 0;
      return;
    }
    const u = Math.min(1, Math.max(0, (time - t0 - FLY_DELAY) / FLY_TIME));
    const e = easeOutCubic(u);
    rodNow.x = start.x + (target.x - start.x) * e;
    rodNow.y = start.y + (target.y - start.y) * e + Math.sin(Math.PI * u) * 0.8;
    rodNow.z = 0.5 * (1 - e);
    rodNow.rot = -0.8 * (1 - e);
    if (u >= 1) landed = true;
  }

  function pinTop() {
    const c = Math.cos(rodNow.rot);
    const s = Math.sin(rodNow.rot);
    for (let i = 0; i < NX; i++) {
      const rx = (i / (NX - 1) - 0.5) * W;
      const k = id(i, 0);
      px[k] = rodNow.x + rx * c;
      py[k] = rodNow.y + rx * s;
      pz[k] = rodNow.z;
    }
  }

  // Start with the cloth hanging from the rod at its starting place.
  setRod(t0);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const k = id(i, j);
      const rx = (i / (NX - 1) - 0.5) * W;
      const c = Math.cos(rodNow.rot);
      const s = Math.sin(rodNow.rot);
      // hang straight down from the rod
      px[k] = rodNow.x + rx * c;
      py[k] = rodNow.y + rx * s - j * DY;
      pz[k] = rodNow.z;
      ox[k] = px[k];
      oy[k] = py[k];
      oz[k] = pz[k];
    }
  }

  // ---- Grabbing with mouse or finger ----
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let cluster: { k: number; dx: number; dy: number }[] = [];
  const dragTo = { x: 0, y: 0 };
  let dragging = false;

  function worldAt(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }
  function nearest(x: number, y: number) {
    let best = -1;
    let bd = 1e9;
    for (let k = NX; k < COUNT; k++) {
      const d = Math.hypot(px[k] - x, py[k] - y);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return { best, bd };
  }

  function onDown(e: PointerEvent) {
    const p = worldAt(e.clientX, e.clientY);
    if (!p) return;
    const { best, bd } = nearest(p.x, p.y);
    if (best < 0 || bd > 0.5) return;
    // Grab the small patch of cloth around that point.
    cluster = [];
    for (let k = NX; k < COUNT; k++) {
      if (Math.hypot(px[k] - px[best], py[k] - py[best]) < 0.34) {
        cluster.push({ k, dx: px[k] - p.x, dy: py[k] - p.y });
        grabbed[k] = 1;
      }
    }
    dragTo.x = p.x;
    dragTo.y = p.y;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  }
  function onMove(e: PointerEvent) {
    const p = worldAt(e.clientX, e.clientY);
    if (!p) return;
    if (dragging) {
      dragTo.x = p.x;
      dragTo.y = p.y;
      e.preventDefault();
    } else if (e.pointerType === "mouse") {
      canvas.style.cursor = nearest(p.x, p.y).bd < 0.5 ? "grab" : "default";
    }
  }
  function release() {
    if (!dragging) return;
    dragging = false;
    for (const c of cluster) grabbed[c.k] = 0;
    cluster = [];
    canvas.style.cursor = "default";
  }
  // While a finger drags the cloth, the page must not scroll.
  const stopScroll = (e: TouchEvent) => {
    if (dragging) e.preventDefault();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("touchstart", stopScroll, { passive: false });
  canvas.addEventListener("touchmove", stopScroll, { passive: false });

  // ---- One physics step (1/60 of a second) ----
  const DT = 1 / 60;
  const DAMP = 0.985;
  const MAXV = 0.3;
  function step(time: number) {
    setRod(time);
    pinTop();
    for (let k = NX; k < COUNT; k++) {
      if (grabbed[k]) continue;
      let vx = (px[k] - ox[k]) * DAMP;
      let vy = (py[k] - oy[k]) * DAMP;
      let vz = (pz[k] - oz[k]) * DAMP;
      const sp = Math.hypot(vx, vy, vz);
      if (sp > MAXV) {
        const f = MAXV / sp;
        vx *= f;
        vy *= f;
        vz *= f;
      }
      // gentle wind: sways sideways and pushes the cloth toward and away from the screen
      const wx = Math.sin(time * 0.8 + py[k] * 1.1) * 0.5;
      const wz = (Math.sin(time * 0.6 + px[k] * 1.3 + py[k] * 0.7) * 0.5 + 0.5) * 1.4 - 0.2;
      ox[k] = px[k];
      oy[k] = py[k];
      oz[k] = pz[k];
      px[k] += vx + wx * DT * DT;
      py[k] += vy - 7.5 * DT * DT;
      pz[k] += vz + wz * DT * DT;
    }
    // The grabbed patch follows the pointer (kept within reach of the rod).
    if (dragging) {
      let tx = dragTo.x;
      let ty = dragTo.y;
      const rx = tx - rodNow.x;
      const ry = ty - rodNow.y;
      const reach = H * 1.05;
      const len = Math.hypot(rx, ry);
      if (len > reach) {
        tx = rodNow.x + (rx / len) * reach;
        ty = rodNow.y + (ry / len) * reach;
      }
      for (const c of cluster) {
        ox[c.k] = px[c.k];
        oy[c.k] = py[c.k];
        oz[c.k] = pz[c.k];
        px[c.k] = tx + c.dx;
        py[c.k] = ty + c.dy;
        pz[c.k] += (0.35 - pz[c.k]) * 0.15;
      }
    }
    // Pull the springs back to their length.
    for (let it = 0; it < 12; it++) {
      for (let l = 0; l < LINKS; l++) {
        const a = A[l];
        const b = B[l];
        const wa = a < NX || grabbed[a] ? 0 : 1;
        const wb = b < NX || grabbed[b] ? 0 : 1;
        const sum = wa + wb;
        if (sum === 0) continue;
        const dx = px[b] - px[a];
        const dy = py[b] - py[a];
        const dz = pz[b] - pz[a];
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const f = ((d - R[l]) / d) * S[l];
        px[a] += (dx * f * wa) / sum;
        py[a] += (dy * f * wa) / sum;
        pz[a] += (dz * f * wa) / sum;
        px[b] -= (dx * f * wb) / sum;
        py[b] -= (dy * f * wb) / sum;
        pz[b] -= (dz * f * wb) / sum;
      }
    }
  }

  function draw(time: number) {
    for (let k = 0; k < COUNT; k++) {
      positions[k * 3] = px[k];
      positions[k * 3 + 1] = py[k];
      positions[k * 3 + 2] = pz[k];
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    rod.position.set(rodNow.x, rodNow.y, rodNow.z);
    rod.rotation.z = rodNow.rot;
    material.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  // ---- The loop: runs only while the banner is on screen ----
  let raf = 0;
  let last = performance.now() / 1000;
  let acc = 0;
  let onScreen = true;
  let first = true;
  let slowFrames = 0;
  let slowTotal = 0;
  let disposed = false;

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!onScreen || document.hidden) {
      last = performance.now() / 1000;
      return;
    }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - last);
    const raw = now - last;
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 3) {
      step(now);
      acc -= DT;
      n++;
    }
    if (n === 3) acc = 0;
    draw(now);
    if (first) {
      first = false;
      opts.onReady();
    }
    // Slow-phone check: after the first moments, if frames take too long, use the still picture.
    if (!opts.skipSlowCheck && now - t0 > 0.8 && raw < 0.25) {
      slowFrames++;
      slowTotal += raw;
      if (slowFrames === 60) {
        if (slowTotal / 60 > 0.042) opts.onSlow();
        slowFrames = 0;
        slowTotal = 0;
      }
    }
  }
  t0 = performance.now() / 1000;
  raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(layout);
  ro.observe(host);
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
  });
  io.observe(host);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      canvas.removeEventListener("touchstart", stopScroll);
      canvas.removeEventListener("touchmove", stopScroll);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      rodGeo.dispose();
      capGeo.dispose();
      rodMat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

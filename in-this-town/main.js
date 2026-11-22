// "In this town" — 15s vertical toon animation. Deterministic: renderFrame(t) draws time t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

await document.fonts.load('80px "Luckiest Guy"');
await document.fonts.load('900 50px "Heebo"', 'אבג');
const W = 1080, H = 1920;
const BPS = 2; // 120 BPM

// ---------- helpers ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeBack = (k) => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.localClippingEnabled = true;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a0f4a, 35, 120);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 900);

const gm = new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1);
gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gm, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { thick: { value: 0.028 } },
  vertexShader: `uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.02, 0.0, 0.04, 1.0); }`,
  side: THREE.BackSide,
});

function part(geo, mat, parent, outline = true) {
  const m = new THREE.Mesh(geo, mat);
  if (outline) { const o = new THREE.Mesh(geo, outlineMat); o.userData.outline = true; m.add(o); }
  if (parent) parent.add(m);
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- sky ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y * 2.2, 0.0, 1.0);
    vec3 c = mix(vec3(0.42, 0.04, 0.32), vec3(0.015, 0.005, 0.06), pow(h, 0.7)); gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);
{
  const pts = []; for (let i = 0; i < 500; i++) { const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.2; pts.push(Math.cos(a) * Math.cos(e) * 450, Math.sin(e) * 450, Math.sin(a) * Math.cos(e) * 450); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), basic(0xfff1c9, { fog: false }));
  moon.position.set(-38, 70, -160); moon.material.color.multiplyScalar(1.6); scene.add(moon);
}

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0x8a6bff, 0x40104a, 1.6));
const moonLight = new THREE.DirectionalLight(0xb8a8ff, 1.4); moonLight.position.set(-10, 20, 15); scene.add(moonLight);
const pinkL = new THREE.PointLight(0xff2fb0, 60, 30, 1.6); pinkL.position.set(-5, 5, -6); scene.add(pinkL);
const cyanL = new THREE.PointLight(0x2fe8ff, 60, 30, 1.6); cyanL.position.set(5, 5, -18); scene.add(cyanL);
const purpL = new THREE.PointLight(0xa040ff, 70, 30, 1.6); purpL.position.set(0, 6, -30); scene.add(purpL);

// ---------- street ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 200), toon(0x2a2240)); ground.rotation.x = -Math.PI / 2; ground.position.z = -40; scene.add(ground);
for (const s of [-1, 1]) {
  const walk = part(new THREE.BoxGeometry(3, 0.25, 200), toon(0x5b4a80), scene, false); walk.position.set(s * 7.5, 0.125, -40);
  const curb = part(new THREE.BoxGeometry(0.25, 0.3, 200), toon(0xff5fc8), scene, false); curb.position.set(s * 6.05, 0.15, -40);
}
for (let z = 12; z > -38; z -= 4) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 2), basic(0xffd84a)); d.position.set(0, 0.01, z); scene.add(d); }
for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 2.6), basic(0xeeeaff)); c.position.set(-5 + i * 1.65, 0.012, -36.5); scene.add(c); }

// neon sign texture
function neonTex(text, color, w = 512, h = 192, font = 120) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = 'rgba(20,4,30,0.85)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 8; g.shadowColor = color; g.shadowBlur = 25; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = `${font}px "Luckiest Guy"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { g.shadowBlur = 30; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 8); }
    g.shadowBlur = 6; g.fillStyle = '#ffffff'; g.fillText(text, w / 2, h / 2 + 8);
  });
}
const signs = [];
function addSign(text, color, pos, rotY, w = 3.2) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375), basic(0xffffff, { map: neonTex(text, color), transparent: true }));
  m.material.color.setScalar(1.5); m.position.copy(pos); m.rotation.y = rotY; scene.add(m); signs.push(m); return m;
}

// side buildings
const WALLS = ['#3b1d6e', '#5a1a5e', '#1d2a6e', '#6b1f4a', '#2b1650', '#43206f'];
const LIT = ['#ffd27a', '#ff8ae0', '#86f2ff', '#ffe9a8', '#ffd27a', '#c39bff'];
function windowsTex(wpx, hpx, wall, cols, rows) {
  return canvasTex(wpx, hpx, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2);
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
      const lit = rnd() < 0.55; g.fillStyle = lit ? LIT[Math.floor(rnd() * LIT.length)] : '#140a26';
      g.fillRect(c * cw + cw * 0.22, r * rh + rh * 0.25, cw * 0.56, rh * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.75, cw * 0.64, rh * 0.06);
    }
  });
}
const signTexts = [['CLUB', '#ff3ad0'], ['BAR', '#3ae8ff'], ['DISCO', '#c26bff'], ['PIZZA', '#ffb43a'], ['OPEN 24/7', '#ff3a7a'], ['LOUNGE', '#3aff9c'], ['KARAOKE', '#ff3ad0'], ['DANCE', '#3ae8ff']];
let si = 0;
for (const s of [-1, 1]) {
  let z = 14;
  while (z > -40) {
    const len = Math.min(5 + rnd() * 5, z + 40), h = 9 + rnd() * 15;
    const cz = z - len / 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(8, h, len), toon(0x1c1036)); box.position.set(s * 13, h / 2, cz); scene.add(box);
    const wall = WALLS[Math.floor(rnd() * WALLS.length)];
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len, h), basic(0xffffff, { map: windowsTex(256, Math.round(256 * h / len), wall, Math.max(2, Math.round(len / 2)), Math.max(3, Math.round(h / 2.2))) }));
    face.position.set(s * 8.98, h / 2, cz); face.rotation.y = -s * Math.PI / 2; scene.add(face);
    const roof = part(new THREE.BoxGeometry(8.4, 0.4, len + 0.2), toon(0xff4fb8), scene, false); roof.position.set(s * 13, h + 0.2, cz);
    const [txt, col] = signTexts[si++ % signTexts.length];
    addSign(txt, col, v3(s * 8.85, 3.6 + rnd() * 1.2, cz), -s * Math.PI / 2, Math.min(len * 0.7, 3.6));
    // awning
    const aw = part(new THREE.BoxGeometry(1.2, 0.15, len * 0.6), toon(rnd() < 0.5 ? 0xff3a7a : 0x3ad8ff), scene, false); aw.position.set(s * 8.4, 2.6, cz); aw.rotation.z = s * 0.35;
    z -= len + 0.05;
  }
}

// street lamps
const bulbs = [];
for (const s of [-1, 1]) for (let z = 8; z > -36; z -= 11) {
  const g = new THREE.Group(); g.position.set(s * 6.6, 0, z + (s > 0 ? 5 : 0)); scene.add(g);
  part(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), toon(0x24183a), g).position.y = 2.6;
  const arm = part(new THREE.BoxGeometry(1.1, 0.1, 0.1), toon(0x24183a), g); arm.position.set(-s * 0.5, 5.15, 0);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), basic(0xfff0a0)); b.position.set(-s * 1.0, 4.95, 0); g.add(b);
  const shade = part(new THREE.ConeGeometry(0.42, 0.35, 12, 1, true), toon(0x24183a, { side: THREE.DoubleSide }), g); shade.position.set(-s * 1.0, 5.2, 0);
  bulbs.push({ m: b, phase: bulbs.length % 2 });
}

// ---------- characters ----------
function makePerson(o) {
  const P = {};
  const root = P.root = new THREE.Group();
  const hips = P.hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
  const torso = P.torso = new THREE.Group(); hips.add(torso);
  const shirt = toon(o.shirt, o.shirtMap ? { map: o.shirtMap } : {});
  const pants = toon(o.pants, o.pantsMap ? { map: o.pantsMap } : {});
  const skin = toon(o.skin);
  part(new THREE.CapsuleGeometry(0.34, 0.42, 6, 14), shirt, torso).position.y = 0.45;
  if (o.dress) { const d = part(new THREE.CylinderGeometry(0.3, 0.62, 0.95, 16), toon(o.dress), hips); d.position.y = -0.2; }
  else { const pel = part(new THREE.SphereGeometry(0.33, 14, 10), pants, hips); pel.scale.y = 0.62; pel.position.y = 0.06; }
  const neck = P.neck = new THREE.Group(); neck.position.y = 0.95; torso.add(neck);
  const head = P.head = new THREE.Group(); head.position.y = 0.33; neck.add(head);
  part(new THREE.SphereGeometry(0.4, 20, 16), skin, head);
  // ears + nose
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.09, 10, 8), skin, head).position.set(s * 0.39, 0, 0);
  part(new THREE.SphereGeometry(0.075, 10, 8), skin, head).position.set(0, -0.04, 0.4);
  // eyes
  P.eyes = []; P.pupils = []; P.lids = []; P.brows = [];
  for (const s of [-1, 1]) {
    const eye = part(new THREE.SphereGeometry(0.105, 14, 10), basic(0xffffff), head); eye.position.set(s * 0.15, 0.08, 0.32); eye.scale.z = 0.7;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), basic(0x120818)); pupil.position.set(0, 0, 0.085); eye.add(pupil);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.rotation.x = -0.6; eye.add(lid);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.04), basic(o.hairColor || 0x2a1608)); brow.position.set(s * 0.15, 0.24, 0.36); head.add(brow);
    P.eyes.push(eye); P.pupils.push(pupil); P.lids.push(lid); P.brows.push(brow);
  }
  // mouth
  P.smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14, Math.PI), basic(0x3a0a14)); P.smile.rotation.z = Math.PI; P.smile.position.set(0, -0.14, 0.375); head.add(P.smile);
  P.flat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), basic(0x3a0a14)); P.flat.position.set(0, -0.19, 0.37); head.add(P.flat); P.flat.visible = false;
  P.frown = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 14, Math.PI), basic(0x3a0a14)); P.frown.position.set(0, -0.22, 0.365); head.add(P.frown); P.frown.visible = false;
  // hair / hats
  const hairMat = toon(o.hairColor || 0x2a1608);
  if (o.hair === 'afro') { part(new THREE.SphereGeometry(0.55, 16, 12), hairMat, head).position.set(0, 0.25, -0.12); }
  if (o.hair === 'bun') { const h = part(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, head); h.position.y = 0.04; h.rotation.x = -0.25; part(new THREE.SphereGeometry(0.2, 12, 10), hairMat, head).position.set(0, 0.42, -0.18); }
  if (o.hair === 'messy') { for (let i = 0; i < 9; i++) { const sp = part(new THREE.ConeGeometry(0.12, 0.34, 8), hairMat, head); const a = (i / 9) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.2, 0.38, Math.sin(a) * 0.2 - 0.05); sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); } part(new THREE.SphereGeometry(0.41, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat, head).rotation.x = -0.3; }
  if (o.hair === 'pony') { const h = part(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, head); h.rotation.x = -0.3; const p = part(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), hairMat, head); p.position.set(0, 0.1, -0.45); p.rotation.x = 0.5; P.pony = p; }
  if (o.hat === 'cap') { const c = part(new THREE.CylinderGeometry(0.36, 0.42, 0.25, 16), toon(o.hatColor), head); c.position.y = 0.34; const br = part(new THREE.BoxGeometry(0.5, 0.05, 0.35), toon(0x111122), head); br.position.set(0, 0.24, 0.38); const badge = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), basic(0xffd84a)); badge.position.set(0, 0.36, 0.415); head.add(badge); }
  if (o.hat === 'beanie') { const c = part(new THREE.SphereGeometry(0.43, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), toon(o.hatColor), head); c.position.y = 0.05; part(new THREE.SphereGeometry(0.1, 8, 8), toon(0xffffff), head).position.y = 0.5; }
  if (o.glasses) { for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), basic(0x050208)); l.rotation.x = Math.PI / 2; l.position.set(s * 0.15, 0.08, 0.41); head.add(l); } const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), basic(0x050208)); br.position.set(0, 0.1, 0.42); head.add(br); P.eyes.forEach(e => e.visible = false); }
  // arms
  const mkArm = (s) => {
    const a = new THREE.Group(); a.position.set(s * 0.42, 0.72, 0); torso.add(a);
    part(new THREE.CapsuleGeometry(0.105, 0.52, 4, 10), shirt, a).position.y = -0.34;
    const hand = part(new THREE.SphereGeometry(0.125, 12, 10), skin, a); hand.position.y = -0.76;
    a.userData.hand = hand; return a;
  };
  P.armL = mkArm(1); P.armR = mkArm(-1);
  const mkLeg = (s) => {
    const l = new THREE.Group(); l.position.set(s * 0.17, 0, 0); hips.add(l);
    if (!o.dress || true) part(new THREE.CapsuleGeometry(0.13, 0.5, 4, 10), o.dress ? skin : pants, l).position.y = -0.4;
    const shoe = part(new THREE.SphereGeometry(0.16, 12, 8), toon(o.shoe || 0x15121e), l); shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0, -0.83, 0.07);
    l.userData.shoe = shoe; return l;
  };
  P.legL = mkLeg(1); P.legR = mkLeg(-1);
  root.scale.setScalar(o.scale || 1);
  return P;
}

function resetPose(P) {
  P.hips.position.set(0, 0.9, 0); P.hips.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0);
  P.neck.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  P.armL.rotation.set(0, 0, 0.12); P.armR.rotation.set(0, 0, -0.12);
  P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
}

function dance(P, t, style, ph) {
  const b = t * BPS * Math.PI + ph;
  const bo = Math.abs(Math.sin(b)), s = Math.sin(b), s2 = Math.sin(b * 0.5);
  resetPose(P);
  P.hips.position.y = 0.9 - 0.07 * bo;
  P.head.rotation.x = 0.18 * bo - 0.05;
  if (style === 'bounce') {
    P.torso.rotation.z = 0.15 * s; P.hips.rotation.y = 0.25 * s2;
    P.armL.rotation.z = 0.5 + 2.0 * Math.max(0, s); P.armR.rotation.z = -(0.5 + 2.0 * Math.max(0, -s));
    P.legL.rotation.x = -0.35 * Math.max(0, s); P.legR.rotation.x = -0.35 * Math.max(0, -s);
  } else if (style === 'disco') {
    const up = s2 > 0;
    P.armR.rotation.set(0, 0, up ? -2.6 : -0.6); P.armR.rotation.x = up ? 0 : -0.5;
    P.armL.rotation.z = 0.3 + 0.2 * s; P.armL.rotation.x = -0.6;
    P.hips.position.x = 0.12 * s; P.torso.rotation.z = -0.2 * s; P.head.rotation.z = 0.15 * s;
    P.legL.rotation.z = 0.15 + 0.1 * s; P.legR.rotation.z = -0.15 + 0.1 * s;
  } else if (style === 'wave') {
    P.armL.rotation.z = 2.7 + 0.35 * s; P.armR.rotation.z = -2.7 + 0.35 * s;
    P.torso.rotation.z = 0.22 * s; P.hips.position.x = -0.1 * s; P.root && (P.root.position.y = P.baseY + 0.18 * bo);
  } else if (style === 'robot') {
    const q = Math.floor(t * BPS * 2 + ph) % 4;
    P.armL.rotation.set(-1.57 * (q % 2), 0, q < 2 ? 0.2 : 1.5); P.armR.rotation.set(-1.57 * ((q + 1) % 2), 0, q < 2 ? -1.5 : -0.2);
    P.head.rotation.y = [0.5, 0, -0.5, 0][q]; P.torso.rotation.y = [-0.2, 0, 0.2, 0][q];
  } else if (style === 'run') {
    P.legL.rotation.x = -0.9 * Math.max(0, s); P.legR.rotation.x = -0.9 * Math.max(0, -s);
    P.armL.rotation.x = 0.8 * s; P.armR.rotation.x = -0.8 * s; P.armL.rotation.z = 0.3; P.armR.rotation.z = -0.3;
    P.torso.rotation.x = 0.1;
  }
}

// Shirt textures
const stripes = (a, b, n = 10, vertical = true) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; for (let i = 0; i < n; i++) vertical ? g.fillRect(i * w / n, 0, w / n / 2.4, h) : g.fillRect(0, i * h / n, w, h / n / 2.4); });

const people = [];
function addDancer(o, x, z, style, ph, faceY = 0) {
  const P = makePerson(o); P.root.position.set(x, 0, z); P.baseY = 0; P.root.rotation.y = faceY; scene.add(P.root);
  P.style = style; P.ph = ph; P.faceY = faceY; people.push(P); return P;
}
const SK = [0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac, 0xe0ac69];
addDancer({ skin: SK[0], shirt: 0xff3a8c, pants: 0x1e1b4a, hair: 'pony', hairColor: 0xffd23a }, -4.3, -2, 'bounce', 0.3, 0.3);
addDancer({ skin: SK[2], shirt: 0x3af0ff, pants: 0x2a1a3a, hair: 'afro', hairColor: 0x1a0d05, shoe: 0xffffff }, 4.4, -5, 'disco', 1.1, -0.35);
addDancer({ skin: SK[3], shirt: 0x9cff3a, pants: 0x3a1a5a, hat: 'beanie', hatColor: 0xff3a3a }, -1.6, -21, 'robot', 0.2, 0.1);
addDancer({ skin: SK[1], shirt: 0xffb43a, pants: 0x1a2a5a, hair: 'pony', hairColor: 0x2a1608 }, 3.2, -24, 'run', 2.0, -0.2);
addDancer({ skin: SK[4], shirt: 0xc26bff, pants: 0x101030, hair: 'afro', hairColor: 0x6a2a10 }, 0.6, -17.5, 'bounce', 1.7, 0);
addDancer({ skin: SK[0], shirt: 0xff5f3a, pants: 0x202040, hair: 'messy', hairColor: 0x101010 }, -5.2, -27, 'wave', 0.9, 0.4);
addDancer({ skin: SK[2], shirt: 0x3aff9c, pants: 0x30104a, hat: 'beanie', hatColor: 0x3a6bff }, 5.6, -13, 'robot', 1.3, -0.5);
addDancer({ skin: SK[3], shirt: 0xff3ad0, pants: 0x1a1a2a, hair: 'bun', hairColor: 0x3a1a08 }, 4.6, -31, 'disco', 0.5, -0.2);
addDancer({ skin: SK[1], shirt: 0xffe23a, pants: 0x2a1040, hair: 'messy', hairColor: 0x3a2008 }, -3.2, -33, 'bounce', 2.4, 0.2);

// Grandma with sunglasses
const granny = addDancer({ skin: SK[3], shirt: 0xb05cff, pants: 0x000000, dress: 0x8a3aff, hair: 'bun', hairColor: 0xd8d8e8, glasses: true, shoe: 0xff3a8c }, 1.6, -3.5, 'disco', 0, -0.25);
granny.root.scale.setScalar(0.9);
{ const bag = part(new THREE.BoxGeometry(0.32, 0.26, 0.12), toon(0xff3a8c), granny.armL); bag.position.set(0, -0.98, 0); }

// Bus with dancing driver on roof
const bus = new THREE.Group(); bus.position.set(-3.4, 0, -12); scene.add(bus);
{
  const body = part(new THREE.BoxGeometry(2.6, 2.4, 8.5), toon(0xffb21a), bus); body.position.y = 1.65;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.25, 8.54), toon(0xff3a6a)); stripe.position.y = 1.2; bus.add(stripe);
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 7.2), basic(0x6fe8ff)); win.position.set(s * 1.31, 2.2, -0.2); bus.add(win);
    for (const z of [-2.8, 2.8]) { const wh = part(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), toon(0x121018), bus); wh.rotation.z = Math.PI / 2; wh.position.set(s * 1.2, 0.5, z); }
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.02), basic(0x6fe8ff)); front.position.set(0, 2.2, 4.26); bus.add(front);
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), basic(0xfffbd0)); hl.position.set(s * 0.85, 0.9, 4.26); bus.add(hl); hl.material.color.setScalar(1.8); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), basic(0xffffff, { map: neonTex('PARTY BUS', '#ff3ad0', 512, 128, 80) })); sign.position.set(0, 3.05, 4.27); bus.add(sign);
}
const driver = addDancer({ skin: SK[1], shirt: 0x2a5aff, pants: 0x1a1a3a, hat: 'cap', hatColor: 0x2a5aff, hairColor: 0x1a1008 }, -3.4, -10.5, 'wave', 0.6, 0.15);
driver.baseY = 2.85; driver.root.position.y = 2.85;

// Breakdancing cop
const cop = addDancer({ skin: SK[0], shirt: 0x1f3fb0, pants: 0x101a50, hat: 'cap', hatColor: 0x14205a, hairColor: 0x2a1608 }, 2.4, -9, 'bounce', 0, -0.2);
{ const badge = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), basic(0xffd84a)); badge.position.set(0.15, 0.62, 0.34); cop.torso.add(badge); }
const copSpin = new THREE.Group(); copSpin.position.set(2.4, 0, -9); scene.add(copSpin);

// ---------- hero building ----------
const WX0 = -1.7, WX1 = 1.7, WY0 = 7.9, WY1 = 11.6, FZ = -40;
{
  const fw = 18, fh = 22, ppu = 40;
  const tex = canvasTex(fw * ppu, fh * ppu, (g, w, h) => {
    g.fillStyle = '#2d6e8a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 20) for (let x = (y / 20) % 2 * 20; x < w; x += 40) g.fillRect(x, y, 38, 2);
    const px = (x) => (x + fw / 2) * ppu, py = (y) => (fh - y) * ppu;
    for (let fl = 0; fl < 5; fl++) for (let c = 0; c < 6; c++) {
      const x = -7.5 + c * 3, y = 3.7 + fl * 3.9;
      if (Math.abs(x) < 3 && fl === 1) continue;
      if (fl === 0) continue;
      const lit = rnd() < 0.5;
      g.fillStyle = '#122030'; g.fillRect(px(x - 0.9) - 6, py(y + 2.6) - 6, 1.8 * ppu + 12, 2.6 * ppu + 12);
      g.fillStyle = lit ? LIT[Math.floor(rnd() * 4)] : '#0e0a1e'; g.fillRect(px(x - 0.9), py(y + 2.6), 1.8 * ppu, 2.6 * ppu);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px(x) - 3, py(y + 2.6), 6, 2.6 * ppu);
    }
    // shop front
    g.fillStyle = '#ff9a3a'; g.fillRect(px(-7), py(3.6), 14 * ppu, 3.6 * ppu);
    g.fillStyle = '#ffe9b0'; g.fillRect(px(-6.5), py(3.0), 5 * ppu, 2.6 * ppu); g.fillRect(px(1.5), py(3.0), 5 * ppu, 2.6 * ppu);
    g.fillStyle = '#3a1a2a'; g.fillRect(px(-1), py(3.0), 2 * ppu, 3.0 * ppu);
    g.clearRect(px(WX0), py(WY1), (WX1 - WX0) * ppu, (WY1 - WY0) * ppu);
  });
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), basic(0xffffff, { map: tex, alphaTest: 0.5 }));
  facade.material.color.setScalar(0.85);
  facade.position.set(0, fh / 2, FZ); scene.add(facade);
  addSign('LAUNDRY 24/7', '#3ae8ff', v3(0, 4.3, FZ + 0.1), 0, 4.2);
  addSign('APTS', '#ff3ad0', v3(5.2, 13.6, FZ + 0.1), 0, 2.4);
  // window frame
  const fr = toon(0xfff2e0);
  const mk = (w, h, x, y) => { const b = part(new THREE.BoxGeometry(w, h, 0.5), fr, scene); b.position.set(x, y, FZ + 0.1); };
  mk(WX1 - WX0 + 0.5, 0.25, 0, WY1 + 0.12); mk(0.25, WY1 - WY0 + 0.5, WX0 - 0.12, (WY0 + WY1) / 2); mk(0.25, WY1 - WY0 + 0.5, WX1 + 0.12, (WY0 + WY1) / 2);
  const sill = part(new THREE.BoxGeometry(WX1 - WX0 + 0.9, 0.22, 0.9), fr, scene); sill.position.set(0, WY0 - 0.1, FZ + 0.3);
  const pot = part(new THREE.CylinderGeometry(0.25, 0.18, 0.35, 12), toon(0xd8643a), scene); pot.position.set(1.15, WY0 + 0.18, FZ + 0.45);
  const cactus = part(new THREE.CapsuleGeometry(0.11, 0.35, 4, 8), toon(0x3ac85a), scene); cactus.position.set(1.15, WY0 + 0.6, FZ + 0.45);
  // building sides behind the facade so the corners are closed
  const back = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 12), toon(0x1c1036)); back.position.set(0, 11, FZ - 12.5); scene.add(back);
}
// room interior
const ROOM = { x: 3.2, y0: 7.4, y1: 12.2, z0: FZ - 0.05, z1: FZ - 5 };
const roomLight = new THREE.PointLight(0xffc88a, 5, 9, 1.6); roomLight.position.set(0, 11.2, FZ - 1.8); scene.add(roomLight);
{
  const wallTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3aa89a'; g.fillRect(0, 0, w, h); g.fillStyle = '#48c0b0'; for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 14, h); });
  const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM.x * 2, ROOM.y1 - ROOM.y0, ROOM.z0 - ROOM.z1), [
    toon(0xffffff, { map: wallTex, side: THREE.BackSide }), toon(0xffffff, { map: wallTex, side: THREE.BackSide }),
    toon(0xf0e0c0, { side: THREE.BackSide }), toon(0x8a4a2a, { side: THREE.BackSide }),
    toon(0xffffff, { map: wallTex, side: THREE.BackSide }), toon(0xffffff, { map: wallTex, side: THREE.BackSide })]);
  room.position.set(0, (ROOM.y0 + ROOM.y1) / 2, (ROOM.z0 + ROOM.z1) / 2); scene.add(room);
  const couch = toon(0xe8573c);
  const cz = ROOM.z1 + 0.75;
  part(new THREE.BoxGeometry(3.4, 0.55, 1.2), couch, scene).position.set(0, ROOM.y0 + 0.28, cz + 0.1);
  part(new THREE.BoxGeometry(3.4, 1.3, 0.35), couch, scene).position.set(0, ROOM.y0 + 0.9, cz - 0.42);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.35, 0.85, 1.2), couch, scene).position.set(s * 1.75, ROOM.y0 + 0.5, cz + 0.1);
  const pillow = part(new THREE.BoxGeometry(0.7, 0.6, 0.2), toon(0xffd23a), scene); pillow.position.set(1.15, ROOM.y0 + 0.9, cz - 0.15); pillow.rotation.z = 0.25;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), basic(0xffffff, { map: canvasTex(220, 300, (g, w, h) => { g.fillStyle = '#ffd23a'; g.fillRect(0, 0, w, h); g.fillStyle = '#20102a'; g.font = '62px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('HOME', w / 2, 110); g.fillText('SWEET', w / 2, 180); g.fillText('HOME', w / 2, 250); }) }));
  poster.position.set(-1.9, ROOM.y0 + 2.9, ROOM.z1 + 0.02); scene.add(poster);
  const lamp = new THREE.Group(); lamp.position.set(2.5, ROOM.y0, ROOM.z1 + 0.8); scene.add(lamp);
  part(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), toon(0x222222), lamp).position.y = 1.1;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.45, 14, 1, true), basic(0xffe6a0, { side: THREE.DoubleSide })); shade.position.y = 2.25; lamp.add(shade);
}
// curtains
const curtainMat = toon(0xc0203f, { side: THREE.DoubleSide, emissive: 0x000000 });
function curtainGeo() {
  const g = new THREE.PlaneGeometry(1.95, WY1 - WY0 + 0.3, 40, 1); g.translate(0.975, 0, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.06);
  g.computeVertexNormals(); return g;
}
const curL = new THREE.Mesh(curtainGeo(), curtainMat); curL.position.set(WX0 - 0.1, (WY0 + WY1) / 2, FZ - 0.45); scene.add(curL);
const curR = new THREE.Mesh(curtainGeo(), curtainMat); curR.position.set(WX1 + 0.1, (WY0 + WY1) / 2, FZ - 0.45); curR.rotation.y = Math.PI; scene.add(curR);
curL.renderOrder = curR.renderOrder = 5;
const rod = part(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), toon(0xd0a040), scene); rod.rotation.z = Math.PI / 2; rod.position.set(0, WY1 + 0.1, FZ - 0.4);
const windowSpill = new THREE.PointLight(0xffffff, 0, 14, 1.5); windowSpill.position.set(0, 9.8, FZ + 2.5); scene.add(windowSpill);

// ---------- hero ----------
const pjMap = stripes('#4f7fd8', '#a9c6ff', 8, true);
const hero = makePerson({ skin: SK[0], shirt: 0xffffff, shirtMap: pjMap, pants: 0xffffff, pantsMap: pjMap, hair: 'messy', hairColor: 0x3a2210, shoe: 0xff4060, scale: 1.12 });
scene.add(hero.root);
// socks: make the "shoes" fuzzy socks (one pink, one green — he's that guy)
hero.legL.userData.shoe.material = toon(0xff5f9a); hero.legR.userData.shoe.material = toon(0x6aff6a);
hero.smile.visible = false; hero.flat.visible = true;
// cereal bowl in right hand
const bowl = new THREE.Group(); hero.armR.add(bowl); bowl.position.set(0, -0.82, 0.1);
{
  const b = part(new THREE.SphereGeometry(0.32, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), bowl);
  const milk = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), toon(0xfffbf0)); milk.rotation.x = -Math.PI / 2; milk.position.y = -0.04; bowl.add(milk);
  const cols = [0xff3a3a, 0xffd23a, 0x3aff6a, 0xc26bff, 0xff8a3a, 0x3ad8ff];
  for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 6, 10), toon(cols[i % 6])); const a = rnd() * 6.28, r = rnd() * 0.22; c.position.set(Math.cos(a) * r, -0.02, Math.sin(a) * r); c.rotation.set(Math.PI / 2 + rnd() - 0.5, 0, rnd()); bowl.add(c); }
  const spoon = part(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 6), toon(0xd8d8e8), bowl); spoon.position.set(0.12, 0.12, -0.05); spoon.rotation.z = -0.5;
}
// sweat drop
const sweat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), basic(0x8ad8ff)); sweat.scale.y = 1.5; hero.head.add(sweat); sweat.position.set(0.38, 0.2, 0.15);
// cereal particles for the wild dance
const flakes = [];
{ const cols = [0xff3a3a, 0xffd23a, 0x3aff6a, 0xc26bff]; for (let i = 0; i < 26; i++) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.028, 6, 10), toon(cols[i % 4])); scene.add(f); flakes.push({ m: f, t0: rnd() * 0.9, vx: (rnd() - 0.5) * 3, vy: 2 + rnd() * 2.5, rs: rnd() * 10 }); } }

// silhouette mode
const clipPlanes = [new THREE.Plane(v3(1, 0, 0), -WX0 - 0.02), new THREE.Plane(v3(-1, 0, 0), WX1 - 0.02), new THREE.Plane(v3(0, 1, 0), -WY0 - 0.02), new THREE.Plane(v3(0, -1, 0), WY1 - 0.05)];
const silMat = new THREE.MeshBasicMaterial({ color: 0x08010e, depthTest: false, transparent: true, opacity: 0.97, clippingPlanes: clipPlanes });
const silTargets = [];
hero.root.traverse(m => { if (m.isMesh) silTargets.push(m); });
bowl.traverse(m => { if (m.isMesh && !silTargets.includes(m)) silTargets.push(m); });
flakes.forEach(f => silTargets.push(f.m));
silTargets.forEach(m => { m.userData.mat = m.material; });
function setSilhouette(on) {
  silTargets.forEach(m => {
    if (m.userData.outline) { m.visible = !on; return; }
    m.material = on ? silMat : m.userData.mat; m.renderOrder = on ? 10 : 0;
  });
}

// ---------- composer ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.85, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- timeline ----------
const T_SCENE2 = 4, T_SCENE3 = 8, T_CLOSE = 9.8, T_SCENE4 = 12;
const heroSeat = v3(0, ROOM.y0, ROOM.z1 + 1.05);

function poseHeroSeated(t, mood) {
  resetPose(hero);
  hero.root.position.copy(heroSeat); hero.root.rotation.set(0, 0, 0);
  hero.hips.position.y = 0.62;
  hero.legL.rotation.x = hero.legR.rotation.x = -1.45; hero.legL.rotation.z = 0.08; hero.legR.rotation.z = -0.08;
  hero.torso.rotation.x = -0.08;
  hero.armR.rotation.set(-0.95, 0, -0.25); hero.armL.rotation.set(-0.7, 0, 0.35);
  bowl.rotation.set(0.95, 0, 0.25);
  // breathing / chewing
  hero.torso.rotation.x += 0.02 * Math.sin(t * 2.2);
  hero.head.rotation.x = 0.06 + 0.02 * Math.sin(t * 9) * (mood === 'grumpy' ? 1 : 0);
}

function setFace(P, f) {
  // f: lid (0 open .. 1 closed), px/py pupil, brow (- angry, + worried), mouth: 'flat'|'frown'|'smile'
  P.lids.forEach(l => l.rotation.x = lerp(-0.7, 1.35, f.lid));
  P.pupils.forEach(p => p.position.set(0.035 * (f.px || 0), 0.03 * (f.py || 0), 0.085));
  P.brows.forEach((b, i) => { const s = i === 0 ? -1 : 1; b.rotation.z = s * (f.brow || 0) * 0.5; b.position.y = 0.24 + (f.browY || 0); });
  P.flat.visible = f.mouth === 'flat'; P.frown.visible = f.mouth === 'frown'; P.smile.visible = f.mouth === 'smile';
  if (f.mouthX !== undefined) { P.flat.position.x = f.mouthX; P.flat.rotation.z = f.mouthR || 0; }
}

function updatePeople(t) {
  const frozen = t >= T_SCENE3;
  for (const P of people) {
    P.root.position.y = P.baseY;
    if (!frozen) {
      if (P === cop) continue;
      dance(P, t, P.style, P.ph); P.root.rotation.y = P.faceY;
      setFace(P, { lid: 0.1, mouth: 'smile', brow: 0.3 });
      if (P.pony) P.pony.rotation.x = 0.5 + 0.4 * Math.sin(t * BPS * Math.PI + P.ph);
    } else {
      resetPose(P);
      const turn = easeIO(seg(t, 8.2, 8.55));
      const tgt = v3(0, 9.8, FZ);
      const wp = P.root.position;
      const yaw = Math.atan2(tgt.x - wp.x, tgt.z - wp.z);
      P.root.rotation.y = lerp(P.faceY, yaw, turn);
      const dist = Math.hypot(tgt.x - wp.x, tgt.z - wp.z);
      const elev = Math.atan2(tgt.y - (wp.y + 2.5), dist);
      P.head.rotation.x = -elev * 0.8 * turn;
      const pt = easeBack(seg(t, 8.6, 8.85));
      P.armR.rotation.set(lerp(0, -(Math.PI / 2 + elev + 0.55), pt), 0, lerp(-0.12, -0.45, pt));
      P.armL.rotation.set(0, 0, lerp(0.12, 0.6, pt));
      P.torso.rotation.x = -0.08 * turn;
      setFace(P, { lid: 0, mouth: t > 8.6 ? 'flat' : 'smile', brow: -0.4 * turn, py: 1 * turn });
    }
  }
  // cop: headspin before the freeze, then on his feet pointing
  if (!frozen) {
    if (cop.root.parent !== copSpin) { copSpin.add(cop.root); }
    resetPose(cop);
    cop.root.position.set(0, 2.62, 0); cop.root.rotation.set(0, 0, Math.PI);
    cop.legL.rotation.z = 0.9 + 0.15 * Math.sin(t * 8); cop.legR.rotation.z = -0.9 - 0.15 * Math.sin(t * 8);
    cop.armL.rotation.z = 0.5; cop.armR.rotation.z = -0.5;
    copSpin.rotation.y = t * 11;
    setFace(cop, { lid: 0, mouth: 'smile', brow: 0.4 });
  } else {
    if (cop.root.parent !== scene) { scene.add(cop.root); cop.root.position.set(2.4, 0, -9); cop.root.rotation.set(0, 0, 0); cop.faceY = -0.2; }
  }
}

function updateHero(t) {
  setSilhouette(t >= T_SCENE4 + 0.22);
  sweat.visible = false;
  flakes.forEach(f => f.m.visible = false);
  if (t < T_SCENE4 + 0.22) {
    poseHeroSeated(t, 'grumpy');
    const blink = (t % 3.1) > 2.95 ? 1 : 0;
    if (t < T_CLOSE) {
      setFace(hero, { lid: Math.max(0.55, blink), px: 0, py: 0.3, brow: -0.25, browY: -0.03, mouth: 'flat' });
      if (t > 4 && t < 8) hero.head.rotation.y = 0.04 * Math.sin(t * 1.5);
    } else {
      // hesitation: eyes dart, worried brows, sweat
      const k = t - T_CLOSE;
      const dart = [0, -1, 1, -1, 1, 0.6, -0.6, 0][Math.floor(k * 3.6) % 8];
      const decided = t > 11.45;
      if (t >= T_SCENE4) hero.armL.rotation.set(-2.2, 0, 0.9);
      setFace(hero, {
        lid: decided ? 0.5 : lerp(0.55, 0.05, seg(t, 9.9, 10.2)), px: decided ? 0 : dart, py: 0.2,
        brow: decided ? -0.9 : 0.8, browY: decided ? -0.04 : 0.04, mouth: decided ? 'flat' : 'frown',
      });
      hero.head.rotation.y = decided ? 0 : 0.12 * dart;
      sweat.visible = t > 10.5 && !decided; sweat.position.y = 0.2 - (t - 10.5) * 0.12;
      if (decided) { hero.head.rotation.x = -0.05; hero.flat.rotation.z = 0.15; }
    }
  } else {
    // wild silhouette dance behind the curtain
    resetPose(hero);
    const b = t * BPS * Math.PI * 2; // double time
    hero.root.position.set(Math.sin(t * 3.1) * 0.55, ROOM.y0 + Math.abs(Math.sin(b / 2)) * 0.45, FZ - 0.95);
    hero.root.rotation.set(0, Math.sin(t * 2.3) * 0.4 + (Math.floor(t * 2) % 4 === 3 ? (t * 2 % 1) * Math.PI * 2 : 0), 0);
    hero.torso.rotation.z = 0.35 * Math.sin(b / 2); hero.torso.rotation.x = 0.2 * Math.sin(b);
    hero.head.rotation.x = 0.45 * Math.sin(b); hero.head.rotation.z = 0.3 * Math.sin(b / 2 + 1);
    hero.armL.rotation.set(0.6 * Math.sin(b * 0.75), 0, 1.6 + 1.2 * Math.sin(b + 0.5));
    hero.armR.rotation.set(-0.3, 0, -2.4 - 0.5 * Math.sin(b * 0.5));
    hero.legL.rotation.x = -0.9 * Math.max(0, Math.sin(b / 2)); hero.legR.rotation.x = -0.9 * Math.max(0, -Math.sin(b / 2));
    hero.legL.rotation.z = 0.25; hero.legR.rotation.z = -0.25;
    bowl.rotation.set(0.3, 0, 2.4);
    setFace(hero, { lid: 0, mouth: 'smile', brow: 0.5 });
    // cereal flying out of the bowl
    const bw = new THREE.Vector3(); bowl.getWorldPosition(bw);
    for (const f of flakes) {
      const age = ((t - T_SCENE4 - 0.3 + f.t0) % 0.9);
      if (t < T_SCENE4 + 0.3) continue;
      f.m.visible = true;
      f.m.position.set(bw.x + f.vx * age, bw.y + f.vy * age - 4.9 * age * age, FZ - 0.9);
      f.m.rotation.set(f.rs * age, f.rs * age * 0.7, 0);
    }
  }
}

function updateCurtains(t) {
  const k = easeBack(seg(t, T_SCENE4, T_SCENE4 + 0.38));
  const sx = lerp(0.24, 1.0, k);
  curL.scale.x = curR.scale.x = sx;
  if (t >= T_SCENE4 + 0.2) {
    const cols = [0xff2fb0, 0x2fe8ff, 0xffd23a, 0xff7a2f, 0x3aff7a];
    const c = new THREE.Color(cols[Math.floor(t * BPS * 2) % cols.length]);
    const flash = 0.75 + 0.45 * Math.pow(1 - ((t * BPS * 2) % 1), 2);
    curtainMat.color.set(0x000000);
    curtainMat.emissive.copy(c).lerp(new THREE.Color(0xffffff), 0.1).multiplyScalar(0.42 * flash);
    windowSpill.color.copy(c); windowSpill.intensity = 18 * flash;
  } else {
    curtainMat.color.set(0xc0203f); curtainMat.emissive.set(0x000000); windowSpill.intensity = 0;
  }
}

function updateCity(t) {
  const beat = t * BPS, frac = beat % 1, bi = Math.floor(beat);
  const musicOn = t < T_SCENE3 || t >= T_SCENE4;
  bulbs.forEach((b, i) => {
    const on = musicOn ? ((bi + b.phase) % 2 === 0) : true;
    const v = on ? (musicOn ? 1.2 + 1.2 * (1 - frac) : 1.4) : 0.25;
    b.m.material.color.setRGB(1 * v, 0.92 * v, 0.6 * v);
  });
  const pulse = musicOn ? 1 - frac * 0.6 : 0.5;
  pinkL.intensity = 70 * pulse; cyanL.intensity = 70 * (musicOn ? 0.4 + frac * 0.6 : 0.5); purpL.intensity = 70;
  signs.forEach((s, i) => s.material.color.setScalar(musicOn && ((bi + i) % 3 === 0) ? 1.9 : 1.35));
}

function cameraAt(t) {
  let pos, look, fov = 50;
  if (t < T_SCENE2) {
    const k = easeIO(seg(t, 0, T_SCENE2));
    pos = v3(1.2 * Math.sin(t * 0.9), lerp(3.0, 4.4, k), lerp(15, -9, k));
    look = v3(0, lerp(2.4, 3.6, k), pos.z - 20);
    pos.y += 0.05 * Math.pow(1 - (t * BPS) % 1, 4);
  } else if (t < T_SCENE3) {
    const k = easeIO(seg(t, T_SCENE2, T_SCENE3));
    pos = v3(lerp(1.2 * Math.sin(T_SCENE2 * 0.9), 0, k), lerp(4.4, 9.85, k), lerp(-9, -30.8, k));
    look = v3(0, lerp(3.6, 9.75, easeIO(seg(t, T_SCENE2, T_SCENE3 - 0.6))), lerp(-29, FZ, k));
    fov = lerp(50, 44, k);
  } else if (t < T_CLOSE) {
    const k = seg(t, T_SCENE3, T_CLOSE);
    pos = v3(lerp(2.2, 1.9, k), lerp(10.4, 10.0, k), lerp(-37.2, -36.2, k));
    look = v3(0, 0.8, -16);
    fov = 52;
  } else if (t < T_SCENE4) {
    const k = easeOut(seg(t, T_CLOSE, T_SCENE4));
    const head = new THREE.Vector3(); hero.head.getWorldPosition(head);
    pos = v3(0.15, head.y + 0.2, lerp(-37.6, -38.6, k));
    look = head.clone().add(v3(0, 0.02, 0));
    fov = lerp(26, 19, k);
    if (t > 11.45) { pos.x += 0.03 * Math.sin(t * 90); }
  } else {
    pos = v3(0, 11.0, -27.2); look = v3(0, 11.0, FZ); fov = 44;
  }
  camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
}

// ---------- overlay ----------
const $ = (id) => document.getElementById(id);
const cap1Words = [...$('cap1').children], cap2Words = [...$('cap2').children], hussWords = [...$('huss').children];
function popStyle(el, t0, t, hide) {
  const k = seg(t, t0, t0 + 0.22);
  const vis = t >= t0 && t < hide;
  el.style.opacity = vis ? Math.min(1, k * 3) : 0;
  el.style.transform = `scale(${vis ? easeBack(k) : 0.3})`;
}
const HUSS_COLORS = ['#ff3ad0', '#3ae8ff', '#ffd23a'];
function updateOverlay(t) {
  cap1Words.forEach((w, i) => popStyle(w, 0.35 + i * 0.32, t, 3.95));
  $('he1').style.opacity = t > 0.5 && t < 3.95 ? Math.min(1, (t - 0.5) * 4) : 0;
  cap2Words.forEach((w, i) => popStyle(w, 4.75 + i * 0.55, t, 7.95));
  $('he2').style.opacity = t > 4.9 && t < 7.95 ? Math.min(1, (t - 4.9) * 4) : 0;
  hussWords.forEach((w, i) => {
    const t0 = 12.5 + i * 0.5;
    const k = seg(t, t0, t0 + 0.18);
    const vis = t >= t0;
    const beatK = Math.pow(1 - ((t * BPS) % 1), 3);
    w.style.opacity = vis ? 1 : 0;
    const sc = vis ? easeBack(k) * (1 + 0.12 * beatK) : 0.2;
    const rot = (i % 2 ? 1 : -1) * (4 + 3 * Math.sin(t * 6 + i));
    w.style.transform = `scale(${sc}) rotate(${rot}deg)`;
    const col = HUSS_COLORS[(i + Math.floor(t * BPS * 2)) % 3];
    w.style.color = col; w.style.textShadow = `0 12px 0 #14051f, 0 0 60px ${col}`;
  });
}

// ---------- frame ----------
window.renderFrame = (t) => {
  updateCity(t);
  updatePeople(t);
  updateHero(t);
  updateCurtains(t);
  scene.updateMatrixWorld(true);
  cameraAt(t);
  bloom.strength = t >= T_SCENE4 ? 0.9 : (t >= T_CLOSE && t < T_SCENE4 ? 0.25 : (t >= T_SCENE3 ? 0.6 : 0.85));
  composer.render();
  updateOverlay(t);
};

window.ready = true;
const qt = new URLSearchParams(location.search).get('t');
if (qt !== null) window.renderFrame(parseFloat(qt));

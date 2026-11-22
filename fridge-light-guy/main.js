// "Fridge Light Guy" — 15s vertical toon animation. Deterministic: renderFrame(t) draws time t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

await document.fonts.load('80px "Luckiest Guy"');
const W = 1080, H = 1920, BPS = 2;

// ---------- timeline (seconds) ----------
const T = { open: 1.35, s2: 3.4, s3: 4.8, s4: 8.4, s5: 10.1, s6: 11.0, closeEnd: 11.45, dark: 11.6, drop: 12.5 };

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const easeBack = (k) => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
document.getElementById('stage').prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);

const gm = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1);
gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gm, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const outlineMat = new THREE.ShaderMaterial({
  vertexShader: `void main(){ vec3 p = position + normal * 0.03; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.01, 0.0, 0.03, 1.0); }`, side: THREE.BackSide,
});
function part(geo, mat, parent, outline = true) {
  const m = new THREE.Mesh(geo, mat);
  if (outline) { const o = new THREE.Mesh(geo, outlineMat); m.add(o); }
  if (parent) parent.add(m);
  return m;
}
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x5a6bff, 0x10142a, 0.8); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb0ff, 0.9); moon.position.set(-12, 20, 18); scene.add(moon);
const fridgeLight = new THREE.PointLight(0xfff3dc, 0, 32, 1.3); fridgeLight.position.set(0, 12.6, -2.6); scene.add(fridgeLight);
const fridgeFill = new THREE.PointLight(0xdff0ff, 0, 20, 1.5); fridgeFill.position.set(0, 6, -1); scene.add(fridgeFill);
const party = [0xff2fb0, 0x2fe8ff, 0xffd23a].map((c) => { const l = new THREE.PointLight(c, 0, 22, 1.3); scene.add(l); return l; });

// ---------- kitchen ----------
{
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#e8e0f0' : '#3b2f5c'; g.fillRect(x * 128, y * 128, 128, 128); } }, [12, 12]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon(0xffffff, { map: floorTex })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.6, 20); scene.add(floor);
  const tileTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7fd6c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#5fb3a6'; g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h); }, [20, 10]);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), toon(0xffffff, { map: tileTex })); wall.position.set(0, 19.4, -7); scene.add(wall);
  // counters
  for (const s of [-1, 1]) {
    const c = part(new THREE.BoxGeometry(14, 5.6, 6.4), toon(0xf0a35a), scene); c.position.set(s * 12.4, 2.2, -3.6);
    const top = part(new THREE.BoxGeometry(14.4, 0.5, 6.8), toon(0xf4f0ff), scene); top.position.set(s * 12.4, 5.25, -3.5);
    for (let i = 0; i < 3; i++) { const h = part(new THREE.BoxGeometry(1.2, 0.25, 0.25), toon(0xd8d8e8), scene); h.position.set(s * (7.6 + i * 4.4), 3.8, -0.3); }
    const cab = part(new THREE.BoxGeometry(14, 6, 3.5), toon(0xf0a35a), scene); cab.position.set(s * 12.4, 17, -5.2);
  }
  // window with moon
  const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), basic(0xffffff, { map: canvasTex(256, 220, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1240'); gr.addColorStop(1, '#3a2a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(170, 70, 34, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, rnd() * h * 0.7, 2, 2);
    g.fillStyle = '#e8e0ff'; g.fillRect(w / 2 - 5, 0, 10, h); g.fillRect(0, h / 2 - 5, w, 10);
  }) }));
  win.position.set(-12.4, 10.5, -6.95); scene.add(win);
  // toaster cameo
  const toaster = part(new THREE.BoxGeometry(2.4, 1.8, 1.4), toon(0xd0d4e8), scene); toaster.position.set(-9, 6.4, -4);
}

// ---------- fridge ----------
const FX = 4, FY = 14, FZ = -6; // interior half width, height, back
const shellMat = toon(0x9ff0d8);
{
  const mk = (w, h, d, x, y, z) => { const b = part(new THREE.BoxGeometry(w, h, d), shellMat, scene); b.position.set(x, y, z); };
  mk(0.6, FY + 1.2, 6.6, -FX - 0.3, FY / 2, FZ / 2 - 0.3); mk(0.6, FY + 1.2, 6.6, FX + 0.3, FY / 2, FZ / 2 - 0.3);
  mk(2 * FX + 1.2, 0.6, 6.6, 0, FY + 0.3, FZ / 2 - 0.3); mk(2 * FX + 1.2, 0.6, 6.6, 0, -0.3, FZ / 2 - 0.3);
  mk(2 * FX + 1.2, FY + 1.2, 0.6, 0, FY / 2, FZ - 0.3);
  // interior liner
  const liner = toon(0xeaf6ff, { side: THREE.BackSide });
  const inner = new THREE.Mesh(new THREE.BoxGeometry(2 * FX, FY, -FZ + 0.02), [liner, liner, liner, liner, toon(0x000000, { visible: false }), liner]);
  inner.position.set(0, FY / 2, FZ / 2); scene.add(inner);
  // shelves
  for (const y of [4.5, 9]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2 * FX - 0.05, 0.12, -FZ - 0.4), toon(0xbfe6ff, { transparent: true, opacity: 0.55 })); s.position.set(0, y - 0.06, FZ / 2 - 0.2); scene.add(s);
    const e = part(new THREE.BoxGeometry(2 * FX, 0.22, 0.12), toon(0xffffff), scene, false); e.position.set(0, y - 0.06, -0.45);
  }
  const crisper = part(new THREE.BoxGeometry(2 * FX - 0.3, 0.1, 0.1), toon(0xffffff), scene, false); crisper.position.set(0, 0.05, -0.4);
}
// door (hinged on the right)
const door = new THREE.Group(); door.position.set(FX + 0.6, -0.6, 0); scene.add(door);
{
  const d = part(new THREE.BoxGeometry(2 * FX + 1.2, FY + 1.2, 0.9), shellMat, door); d.position.set(-(FX + 0.6), (FY + 1.2) / 2, 0.45);
  const handle = part(new THREE.BoxGeometry(0.35, 5, 0.35), toon(0xe8ecf8), door); handle.position.set(-(2 * FX + 0.4), 8.5, 1.15);
  const liner = new THREE.Mesh(new THREE.PlaneGeometry(2 * FX, FY), toon(0xf4f8ff)); liner.position.set(-(FX + 0.6), (FY + 1.2) / 2, -0.01); liner.rotation.y = Math.PI; door.add(liner);
  // magnets on the outside
  const mag = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#20183a'; g.font = '44px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('TO DO:', w / 2, 70); g.font = '34px "Luckiest Guy"'; g.fillText('- buy milk', w / 2, 140); g.fillText('- nothing', w / 2, 200); g.fillText('- open fridge', w / 2, 260); });
  const note = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.75), basic(0xffffff, { map: mag })); note.position.set(-3.2, 10.5, 0.92); note.rotation.z = 0.06; door.add(note);
  const m1 = part(new THREE.SphereGeometry(0.3, 10, 8), toon(0xff4060), door); m1.position.set(-3.2, 11.8, 0.95);
}
// bulb + pull handle
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), basic(0xfff3c8)); bulb.position.set(2.2, 13.45, -2.5); scene.add(bulb);
part(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12), toon(0xb8bcd0), scene).position.set(2.2, 13.85, -2.5);
const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), toon(0x888ca0)); scene.add(chain);
const tHandle = part(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 8), toon(0xff5a3a), scene); tHandle.rotation.z = Math.PI / 2;
function setHandle(y) { tHandle.position.set(2.2, y, -2.5); chain.position.set(2.2, (13.3 + y) / 2, -2.5); chain.scale.y = 13.3 - y; }
// "staff only" sign + Gary's bed (matchbox)
{
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), basic(0xffffff, { map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffd23a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#20183a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#20183a'; g.font = '40px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('LIGHT DEPT.', w / 2, 58); g.font = '26px "Luckiest Guy"'; g.fillText('STAFF ONLY', w / 2, 100); }) }));
  sign.position.set(3.3, 11.8, FZ + 0.02); scene.add(sign);
  const box = part(new THREE.BoxGeometry(1.7, 0.45, 2.8), toon(0x3a64d8), scene); box.position.set(-1.6, 9.22, -2.3);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.35), basic(0xff4a3a)); label.position.set(-1.6, 9.22, -0.89); scene.add(label);
  const pillow = part(new THREE.BoxGeometry(1.2, 0.25, 0.6), toon(0xffffff), scene); pillow.position.set(-1.6, 9.55, -3.3);
}

// ---------- characters ----------
function addEyes(parent, x, y, z, r, color, P) {
  P.lids = P.lids || []; P.pupils = P.pupils || [];
  for (const s of [-1, 1]) {
    const eye = part(new THREE.SphereGeometry(r, 14, 10), basic(0xffffff), parent); eye.position.set(x + s * r * 1.3, y, z); eye.scale.z = 0.7;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 10, 8), basic(0x120818)); pupil.position.set(0, 0, r * 0.82); eye.add(pupil);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(color)); lid.rotation.x = -0.7; eye.add(lid);
    P.lids.push(lid); P.pupils.push(pupil);
  }
}
function setEyes(P, lid, px = 0, py = 0) {
  P.lids.forEach((l) => (l.rotation.x = lerp(-0.7, 1.6, lid)));
  P.pupils.forEach((p) => { const r = p.geometry.parameters.radius * 2; p.position.set(px * r * 0.35, py * r * 0.3, r * 0.82); });
}

function makePerson(o) {
  const P = {};
  const root = P.root = new THREE.Group();
  const hips = P.hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
  const torso = P.torso = new THREE.Group(); hips.add(torso);
  const shirt = toon(o.shirt), pants = toon(o.pants), skin = toon(o.skin);
  part(new THREE.CapsuleGeometry(0.34, 0.42, 6, 14), shirt, torso).position.y = 0.45;
  if (o.overalls) { const bib = part(new THREE.BoxGeometry(0.5, 0.45, 0.2), pants, torso); bib.position.set(0, 0.42, 0.26); for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.05), pants); st.position.set(s * 0.2, 0.72, 0.3); torso.add(st); } }
  const pel = part(new THREE.SphereGeometry(0.33, 14, 10), pants, hips); pel.scale.y = 0.62; pel.position.y = 0.06;
  const neck = P.neck = new THREE.Group(); neck.position.y = 0.95; torso.add(neck);
  const head = P.head = new THREE.Group(); head.position.y = 0.33; neck.add(head);
  part(new THREE.SphereGeometry(0.4, 20, 16), skin, head);
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.09, 10, 8), skin, head).position.set(s * 0.39, 0, 0);
  P.nose = part(new THREE.SphereGeometry(0.085, 10, 8), skin, head); P.nose.position.set(0, -0.04, 0.4);
  addEyes(head, 0, 0.09, 0.32, 0.105, o.skin, P);
  P.brows = [];
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.04), basic(o.hairColor)); b.position.set(s * 0.15, 0.26, 0.36); head.add(b); P.brows.push(b); }
  P.smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 14, Math.PI), basic(0x3a0a14)); P.smile.rotation.z = Math.PI; P.smile.position.set(0, -0.15, 0.37); head.add(P.smile);
  P.oMouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 6, 14), basic(0x3a0a14)); P.oMouth.position.set(0, -0.2, 0.37); head.add(P.oMouth); P.oMouth.visible = false;
  P.wavy = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), basic(0x3a0a14)); P.wavy.position.set(0, -0.2, 0.375); head.add(P.wavy); P.wavy.visible = false;
  if (o.mustache) { const m = part(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), toon(o.hairColor), head); m.rotation.z = Math.PI / 2; m.position.set(0, -0.11, 0.39); }
  if (o.hardhat) { const h = part(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffc81a), head); h.position.y = 0.1; const br = part(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 18), toon(0xffc81a), head); br.position.set(0, 0.12, 0.05); }
  if (o.hair === 'messy') { const hm = toon(o.hairColor); for (let i = 0; i < 9; i++) { const sp = part(new THREE.ConeGeometry(0.12, 0.34, 8), hm, head); const a = (i / 9) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.2, 0.38, Math.sin(a) * 0.2 - 0.05); sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); } part(new THREE.SphereGeometry(0.41, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hm, head).rotation.x = -0.3; }
  const mkArm = (s) => { const a = new THREE.Group(); a.position.set(s * 0.42, 0.72, 0); torso.add(a); part(new THREE.CapsuleGeometry(0.105, 0.52, 4, 10), shirt, a).position.y = -0.34; part(new THREE.SphereGeometry(0.125, 12, 10), toon(o.glove || o.skin), a).position.y = -0.76; return a; };
  P.armL = mkArm(1); P.armR = mkArm(-1);
  const mkLeg = (s) => { const l = new THREE.Group(); l.position.set(s * 0.17, 0, 0); hips.add(l); part(new THREE.CapsuleGeometry(0.13, 0.5, 4, 10), pants, l).position.y = -0.4; const sh = part(new THREE.SphereGeometry(0.16, 12, 8), toon(o.shoe || 0x15121e), l); sh.scale.set(1, 0.6, 1.5); sh.position.set(0, -0.83, 0.07); return l; };
  P.legL = mkLeg(1); P.legR = mkLeg(-1);
  return P;
}
function resetPose(P) {
  P.hips.position.set(0, 0.9, 0); P.hips.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0);
  P.neck.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  P.armL.rotation.set(0, 0, 0.12); P.armR.rotation.set(0, 0, -0.12);
  P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
}
function mouth(P, m) { P.smile.visible = m === 'smile'; P.oMouth.visible = m === 'o'; P.wavy.visible = m === 'flat'; }
function brows(P, a, y = 0) { P.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * a * 0.5; b.position.y = 0.26 + y; }); }

// Gary
const gary = makePerson({ skin: 0xf1c27d, shirt: 0xff6a3a, pants: 0x2f5fd0, overalls: true, mustache: true, hardhat: true, hairColor: 0x2a1608, glove: 0xffe14a, shoe: 0x3a2010 });
scene.add(gary.root);
const sweat = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), basic(0x8ad8ff)); sweat.scale.y = 1.5; gary.head.add(sweat); sweat.position.set(0.36, 0.15, 0.2);
const sweat2 = sweat.clone(); gary.head.add(sweat2); sweat2.position.set(-0.37, 0.05, 0.18);
// DJ deck (butter box + bottle caps)
const deck = new THREE.Group(); deck.position.set(2.2, 9, -1.3); scene.add(deck); deck.visible = false;
{
  const b = part(new THREE.BoxGeometry(2.2, 0.8, 0.9), toon(0xffe9a0), deck); b.position.y = 0.4;
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), basic(0xffffff, { map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#ffd23a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a3a10'; g.font = '44px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('BUTTER', w / 2, 50); }) }));
  lbl.position.set(0, 0.42, 0.46); deck.add(lbl);
  deck.userData.caps = [-0.55, 0.55].map((x) => { const c = part(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16), toon(0xff3a3a), deck); c.position.set(x, 0.86, 0); return c; });
}

// the human (giant)
const human = makePerson({ skin: 0xe0ac69, shirt: 0x8a5ad8, pants: 0x3a2a5a, hair: 'messy', hairColor: 0x3a2412 });
human.root.scale.setScalar(13); human.root.position.set(0.4, 6.4 - 2.17 * 13, 12.5); scene.add(human.root);
human.root.visible = false; human.root.rotation.y = Math.PI;

// ---------- food ----------
const foods = [];
function food(build, x, y, z, color, eyeY, eyeZ, eyeR, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  build(body);
  const F = { g, body, base: v3(x, y, z), ph: rnd() * 6, wake: 12.0 + foods.length * 0.05, ...opts };
  addEyes(body, 0, eyeY, eyeZ, eyeR, color, F);
  F.smile = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 1.1, eyeR * 0.25, 6, 14, Math.PI), basic(0x3a0a14)); F.smile.rotation.z = Math.PI; F.smile.position.set(0, eyeY - eyeR * 1.9, eyeZ + 0.02); body.add(F.smile);
  foods.push(F); return F;
}
// milk carton
food((b) => {
  const tex = canvasTex(128, 192, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a8aff'; g.fillRect(0, h * 0.6, w, h * 0.25); g.fillStyle = '#fff'; g.font = '30px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('MILK', w / 2, h * 0.78); });
  part(new THREE.BoxGeometry(1.5, 2.4, 1.5), toon(0xffffff, { map: tex }), b).position.y = 1.2;
  const roof = part(new THREE.CylinderGeometry(0.01, 1.06, 0.8, 4, 1), toon(0xf0f4ff), b); roof.position.y = 2.8; roof.rotation.y = Math.PI / 4;
}, -2.7, 4.5, -3.3, 0xffffff, 1.55, 0.76, 0.17);
// cheese wedge
food((b) => { const c = part(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 3), toon(0xffd23a), b); c.position.y = 0.5; c.rotation.y = -Math.PI / 2; for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.12 + rnd() * 0.08, 10), basic(0xd9a810)); h.position.set(-0.3 + i * 0.35, 0.25 + rnd() * 0.5, 0.61); b.add(h); } }, -0.5, 4.5, -2.6, 0xffd23a, 0.62, 0.62, 0.13);
// eggs
for (let i = 0; i < 3; i++) food((b) => { const e = part(new THREE.SphereGeometry(0.42, 16, 12), toon(0xfff1dc), b); e.scale.y = 1.3; e.position.y = 0.55; }, 1.3 + i * 0.95, 4.5, -2.4, 0xfff1dc, 0.6, 0.33, 0.1);
// broccoli
food((b) => { part(new THREE.CylinderGeometry(0.22, 0.3, 1.0, 8), toon(0x9adf5a), b).position.y = 0.5; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; part(new THREE.SphereGeometry(0.42, 10, 8), toon(0x2fae3a), b).position.set(Math.cos(a) * 0.4, 1.35 + Math.sin(i) * 0.1, Math.sin(a) * 0.3 - 0.1); } part(new THREE.SphereGeometry(0.5, 10, 8), toon(0x2fae3a), b).position.set(0, 1.6, 0); }, 3.1, 4.5, -4.2, 0x9adf5a, 0.65, 0.27, 0.1);
// ketchup
food((b) => { part(new THREE.CylinderGeometry(0.55, 0.6, 2.0, 16), toon(0xe8202a), b).position.y = 1.0; part(new THREE.CylinderGeometry(0.25, 0.45, 0.5, 12), toon(0xe8202a), b).position.y = 2.25; part(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 12), toon(0xffffff), b).position.y = 2.6; }, -3.1, 9, -3.6, 0xe8202a, 1.3, 0.57, 0.14);
// jelly
food((b) => { const j = part(new THREE.BoxGeometry(1.5, 1.2, 1.5), toon(0xff5fae, { transparent: true, opacity: 0.85 }), b); j.position.y = 0.6; }, 0.1, 0, -2.4, 0xff5fae, 0.75, 0.77, 0.15, { wobbly: true });
// soda can
food((b) => { part(new THREE.CylinderGeometry(0.55, 0.55, 1.7, 16), toon(0x2fd0ff), b).position.y = 0.85; part(new THREE.CylinderGeometry(0.45, 0.55, 0.12, 16), toon(0xd8dce8), b).position.y = 1.76; }, -2.6, 0, -2.8, 0x2fd0ff, 1.05, 0.52, 0.13);
// watermelon slice
food((b) => { const w = part(new THREE.CylinderGeometry(1.3, 1.3, 0.5, 20, 1, false, 0, Math.PI), toon(0xff4a6a), b); w.rotation.set(Math.PI / 2, 0, Math.PI / 2); w.position.y = 0.0; w.rotation.order = 'YXZ'; w.rotation.set(Math.PI / 2, 0, -Math.PI / 2); w.position.set(0, 0.05, 0); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), basic(0x1a0a0a)); s.scale.y = 1.6; s.position.set(-0.7 + i * 0.35, 0.4 + (i % 2) * 0.3, 0.27); b.add(s); } }, 2.5, 0, -2.4, 0xff4a6a, 0.75, 0.3, 0.12);

// disco egg + sparkles
const disco = new THREE.Group(); scene.add(disco); disco.visible = false;
{
  const mirror = canvasTex(256, 128, (g, w, h) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) { const v = 150 + Math.floor(rnd() * 105); g.fillStyle = `rgb(${v},${v},${v + 20})`; g.fillRect(x * 8, y * 8, 7, 7); } });
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), toon(0xffffff, { map: mirror, emissive: 0x333344 })); egg.scale.y = 1.25; disco.add(egg); disco.userData.egg = egg;
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 4), basic(0xdddddd)); str.position.y = 2.9; disco.add(str);
  const pts = []; const cols = []; const pal = [[1, 0.2, 0.7], [0.2, 0.9, 1], [1, 0.85, 0.2], [1, 1, 1]];
  for (let i = 0; i < 260; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.28, r = 3.6 + rnd() * 1.5; pts.push(Math.sqrt(1 - u * u) * Math.cos(a) * r, u * r * 1.2, Math.sqrt(1 - u * u) * Math.sin(a) * r); cols.push(...pal[i % 4]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const sp = new THREE.Points(g, new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95 })); disco.add(sp); disco.userData.sp = sp;
}

// ---------- composer ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.7, 0.5, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- state per time ----------
const BED = v3(-1.6, 9.45, -2.6), POST = v3(2.2, 9.0, -2.5);
function montage(t) { const k = t - T.s3; const i = Math.floor(k / 0.6); return { i, p: (k % 0.6) / 0.6 }; }

function lightState(t) {
  // returns fridge light level 0..1 (Gary must be pulling for it to be on) and door opening 0..1
  if (t < T.open) return { light: 0, door: 0 };
  if (t < T.s3) { const d = easeOut(seg(t, T.open, T.open + 0.55)); return { light: t > T.open + 0.12 ? 1 : 0, door: d }; }
  if (t < T.s4) { const { p } = montage(t); return { light: p > 0.42 && p < 0.86 ? 1 : 0, door: p < 0.86 ? 1 : 0 }; }
  if (t < T.s6) { let l = 1; if (t > T.s5) l = hash(Math.floor(t * 20)) > 0.3 ? 1 : 0.35; return { light: l, door: 1 }; }
  if (t < T.closeEnd) { const d = 1 - easeIn(seg(t, T.s6, T.closeEnd)); return { light: d > 0.05 ? 1 : 0, door: d }; }
  return { light: 0, door: 0 };
}

function updateGary(t, L) {
  resetPose(gary);
  gary.root.rotation.set(0, 0, 0);
  sweat.visible = sweat2.visible = false;
  deck.visible = false;
  let pull = 0;
  const pullPose = (amt, shake = 0) => {
    gary.root.position.copy(POST); gary.root.rotation.y = 0;
    gary.armL.rotation.set(0, 0, 2.95 + shake); gary.armR.rotation.set(0, 0, -2.95 + shake);
    gary.hips.position.y = 0.9 - 0.25 * amt; gary.legL.rotation.x = -0.35 * amt; gary.legR.rotation.x = -0.35 * amt; gary.torso.rotation.x = 0.1 * amt;
    gary.head.rotation.x = -0.15;
    pull = amt;
  };
  if (t < T.s3) {
    pullPose(L.light ? 1 : 0.2);
    const strain = 0.04 * Math.sin(t * 40);
    gary.root.position.x += strain * 0.3;
    setEyes(gary, t < T.s2 ? 0.1 : 0.0, 0, 0.6); mouth(gary, 'smile'); brows(gary, 0.6, 0.03);
    if (t > T.s2) { sweat.visible = true; sweat.position.y = 0.15 - ((t - T.s2) % 0.7) * 0.4; }
    if (t > T.s2) gary.head.rotation.x = 0.05; // looks at us
  } else if (t < T.s4) {
    const { i, p } = montage(t);
    const tired = clamp(i / 5);
    if (p < 0.12) { // asleep in bed -> wakes up
      gary.root.position.copy(BED); gary.root.rotation.set(-Math.PI / 2, 0, 0); gary.root.position.y = BED.y + 0.35;
      setEyes(gary, p < 0.06 ? 1 : 0); mouth(gary, 'o'); brows(gary, 0.8);
    } else if (p < 0.42) { // sprint
      const k = easeIO(seg(p, 0.12, 0.42));
      gary.root.position.set(lerp(BED.x, POST.x, k), POST.y + Math.abs(Math.sin(k * Math.PI * 4)) * 0.4, lerp(BED.z, POST.z, k));
      gary.root.rotation.y = Math.PI / 2;
      const b = p * 60; gary.legL.rotation.x = -1.1 * Math.sin(b); gary.legR.rotation.x = 1.1 * Math.sin(b);
      gary.armL.rotation.x = 1.1 * Math.sin(b); gary.armR.rotation.x = -1.1 * Math.sin(b); gary.torso.rotation.x = 0.3;
      setEyes(gary, 0); mouth(gary, 'o'); brows(gary, 0.8);
    } else if (p < 0.86) { pullPose(1, 0.05 * Math.sin(t * 50)); setEyes(gary, 0.3 * tired, 0, 0.5); mouth(gary, 'smile'); brows(gary, 0.7); sweat.visible = tired > 0.2; sweat.position.y = 0.15 - p * 0.3; }
    else { // collapse back to bed
      gary.root.position.copy(BED); gary.root.rotation.set(-Math.PI / 2, 0, 0); gary.root.position.y = BED.y + 0.35;
      setEyes(gary, 1); mouth(gary, 'flat'); brows(gary, 0.2);
    }
  } else if (t < T.dark) {
    const shaking = t > T.s5 ? 0.12 * Math.sin(t * 70) : 0.02 * Math.sin(t * 30);
    pullPose(L.light ? 1 : 0.6, shaking);
    gary.root.position.x += shaking * 0.25;
    const k = t - T.s4;
    setEyes(gary, 0, t > T.s5 ? [1, -1][Math.floor(t * 5) % 2] * 0.6 : 0, 0.8); mouth(gary, t > T.s5 ? 'flat' : 'smile'); brows(gary, 0.9, 0.04);
    sweat.visible = sweat2.visible = t > T.s4 + 0.6; sweat.position.y = 0.15 - (k % 0.8) * 0.4; sweat2.position.y = 0.05 - ((k + 0.4) % 0.8) * 0.4;
    if (t > T.s6) { pullPose(0.3); setEyes(gary, 0.2); mouth(gary, 'flat'); }
  } else if (t < T.drop) {
    // darkness: lets go, grins
    gary.root.position.copy(POST);
    gary.armL.rotation.set(0, 0, 0.3); gary.armR.rotation.set(0, 0, -0.3);
    const k = seg(t, 11.85, 12.0);
    setEyes(gary, lerp(0.6, 0, k), 0, 0); mouth(gary, k > 0.5 ? 'smile' : 'flat'); brows(gary, lerp(0.2, -0.9, k), 0);
    gary.smile.scale.setScalar(1.3);
    if (t > 12.3) { gary.armR.rotation.set(-1.2, 0, -0.4); } // reaching for the hidden switch
  } else {
    // DJ Gary
    deck.visible = true;
    gary.root.position.set(POST.x, POST.y, -2.3); gary.smile.scale.setScalar(1.3);
    const b = t * BPS * Math.PI;
    gary.hips.position.y = 0.9 - 0.12 * Math.abs(Math.sin(b));
    gary.head.rotation.x = 0.3 * Math.abs(Math.sin(b)) - 0.1;
    gary.armR.rotation.set(-1.1 + 0.25 * Math.sin(b * 2), 0, -0.2);
    const hype = Math.floor(t * BPS) % 4 === 3;
    gary.armL.rotation.set(hype ? 0 : -1.1, 0, hype ? 2.9 + 0.2 * Math.sin(b * 2) : 0.2);
    gary.torso.rotation.z = 0.12 * Math.sin(b);
    setEyes(gary, 0); mouth(gary, 'smile'); brows(gary, 0.5);
    deck.userData.caps.forEach((c, i) => (c.rotation.y = t * (8 + i * 3)));
  }
  setHandle(13.3 - 1.25 - 0.55 * pull);
}

function updateFoods(t) {
  const partyOn = t >= T.drop;
  for (const F of foods) {
    F.g.position.copy(F.base); F.body.rotation.set(0, 0, 0); F.body.scale.set(1, 1, 1);
    F.smile.visible = partyOn;
    if (!partyOn) {
      // asleep; wake (eyes pop) in the dark
      const awake = t > F.wake && t < T.drop;
      setEyes(F, awake ? 0 : 1, 0, 0);
      if (t >= T.s4 && t < T.s6) setEyes(F, 0.15, 0, 0.6); // everyone peeks at the giant
    } else {
      const b = t * BPS * Math.PI + F.ph;
      const bo = Math.abs(Math.sin(b));
      F.g.position.y = F.base.y + 0.35 * bo;
      F.body.scale.set(1 + 0.1 * (1 - bo), 1 - 0.12 * (1 - bo), 1 + 0.1 * (1 - bo));
      F.body.rotation.z = 0.22 * Math.sin(b * 0.5);
      F.body.rotation.y = 0.3 * Math.sin(b * 0.5 + 1);
      if (F.wobbly) { F.body.rotation.x = 0.15 * Math.sin(t * 25); F.body.scale.x *= 1 + 0.08 * Math.sin(t * 30); }
      setEyes(F, 0, Math.sin(b * 0.5), 0.3);
    }
  }
}

function updateHuman(t, L) {
  human.root.visible = t >= T.s4 && t < T.closeEnd;
  if (!human.root.visible) return;
  resetPose(human);
  const scan = Math.sin((t - T.s4) * 2.2);
  human.head.rotation.y = 0.25 * scan; human.head.rotation.x = -0.12;
  const sigh = seg(t, T.s6 - 0.25, T.s6);
  setEyes(human, lerp(0.35, 0.75, sigh), -scan, -0.2); mouth(human, 'o'); brows(human, -0.2, -0.02);
  human.oMouth.scale.setScalar(1 + 0.3 * Math.sin(t * 3));
}

function updateLights(t, L) {
  const partyOn = t >= T.drop;
  bulb.material.color.setRGB(1, 0.95, 0.78).multiplyScalar(L.light ? 2.2 : 0.12);
  fridgeLight.intensity = partyOn ? 0 : 11 * L.light;
  fridgeFill.intensity = partyOn ? 0 : 3 * L.light;
  const night = t < T.dark && !(t >= T.s3 && t < T.s4 && L.light);
  hemi.intensity = partyOn ? 0.25 : (t >= T.dark ? 0.03 : 0.55);
  moon.intensity = partyOn ? 0.2 : (t >= T.dark ? 0.0 : 0.7);
  party.forEach((l, i) => {
    l.intensity = partyOn ? 7 * (0.6 + 0.4 * Math.pow(1 - (t * BPS + i / 3) % 1, 2)) : 0;
    const a = t * 2.5 + i * 2.1; l.position.set(Math.cos(a) * 3, 7 + Math.sin(a * 1.3) * 4, -2.5 + Math.sin(a) * 1.5);
  });
  disco.visible = partyOn;
  if (partyOn) {
    const k = easeBack(seg(t, T.drop, T.drop + 0.4));
    disco.position.set(-0.9, lerp(15.5, 12.0, k), -3.4);
    disco.rotation.y = t * 2.2; disco.userData.sp.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 9));
  }
}

function cameraAt(t) {
  let pos, look, fov = 50;
  if (t < T.s2) {
    const k1 = easeIO(seg(t, 0, T.open + 0.3));
    const k2 = easeIn(seg(t, T.open + 0.45, T.s2));
    pos = v3(lerp(-2.5, -0.5, k1), lerp(8, 9, k1), lerp(31, 24, k1));
    look = v3(0, 7.5, 0);
    pos.lerp(v3(0.4, 11.2, 2.4), k2); look.lerp(v3(2.2, 11.0, -2.5), easeOut(seg(t, T.open + 0.3, T.s2)));
    fov = lerp(45, 50, k2);
  } else if (t < T.s3) {
    const k = seg(t, T.s2, T.s3);
    pos = v3(0.3, 11.4, lerp(3.4, 2.9, k)); look = v3(2.2, 11.0, -2.5); fov = 38;
  } else if (t < T.s4) {
    const { p } = montage(t);
    pos = v3(0.3, 11.2, 8.2); look = v3(0.3, 10.4, -2.5); fov = 50;
    const sh = p > 0.42 && p < 0.5 ? 0.08 : 0; pos.x += sh * Math.sin(t * 90); pos.y += sh * Math.cos(t * 80);
  } else if (t < T.s5) {
    const k = seg(t, T.s4, T.s5);
    pos = v3(0.2, 6.7, lerp(-5.7, -5.2, k)); look = v3(0.4, 6.9, 6); fov = lerp(64, 58, k);
  } else if (t < T.s6) {
    const k = seg(t, T.s5, T.s6);
    pos = v3(1.6, 10.9, lerp(1.4, 0.8, k)); look = v3(2.2, 11.0, -2.5); fov = 44;
    pos.x += 0.03 * Math.sin(t * 60);
  } else if (t < T.dark) {
    pos = v3(0.2, 6.7, -5.2); look = v3(0.4, 6.9, 6); fov = 58;
  } else if (t < T.drop) {
    const k = seg(t, T.dark, T.drop);
    pos = v3(0, 7.6, lerp(12.5, 11.5, k)); look = v3(0, 7.4, -3); fov = 56;
  } else {
    const b = Math.pow(1 - (t * BPS) % 1, 3);
    pos = v3(Math.sin(t * 0.9) * 1.2, 7.6, 11.2 - 0.3 * b); look = v3(0, 7.4, -3); fov = 56 - 1.5 * b;
  }
  camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
}

// door visibility: hide it when the camera is "inside" a closed fridge (the camera is the door)
function updateDoor(t, L) {
  door.rotation.y = 1.85 * L.door;
  door.visible = !(t >= T.dark) && !(t >= T.s3 && t < T.s4);
}

// ---------- captions ----------
const CAPS = [
  { t0: 0.15, t1: 3.3, words: 'You think the fridge light turns on by itself?', hl: ['itself?'] },
  { t0: 3.5, t1: 4.75, words: 'Meet Gary.', hl: ['Gary.'], big: true },
  { t0: 4.9, t1: 6.0, words: 'Night shift.' },
  { t0: 6.0, t1: 8.35, words: '47 openings. 0 breaks.', hl: ['47', '0'] },
  { t0: 8.55, t1: 10.95, words: 'And some of them... just stare.', hl: ['stare.'] },
  { t0: 11.0, t1: 12.45, words: 'But when the door closes...' },
];
const capsEl = document.getElementById('caps');
CAPS.forEach((c) => {
  const d = document.createElement('div'); d.className = 'cap'; if (c.big) d.style.fontSize = '130px';
  c.words.split(' ').forEach((w) => { const s = document.createElement('span'); s.textContent = w; if (c.hl && c.hl.includes(w)) s.className = 'hl'; d.appendChild(s); d.appendChild(document.createTextNode(' ')); });
  capsEl.appendChild(d); c.el = d; c.spans = [...d.querySelectorAll('span')];
});
const counter = document.getElementById('counter'), num = counter.querySelector('.num');
const after = document.getElementById('after'), lightsEl = document.getElementById('lights');
const AFTER_COLS = ['#ff3ad0', '#3ae8ff', '#ffd23a'];
function updateOverlay(t) {
  CAPS.forEach((c) => {
    const n = c.spans.length, dur = Math.min(c.t1 - c.t0 - 0.4, n * 0.28);
    c.spans.forEach((s, i) => {
      const t0 = c.t0 + (i / n) * dur, k = seg(t, t0, t0 + 0.2), vis = t >= t0 && t < c.t1;
      s.style.opacity = vis ? Math.min(1, k * 3) : 0; s.style.transform = `scale(${vis ? easeBack(k) : 0.3})`;
    });
  });
  const inMont = t >= T.s3 && t < T.s4;
  counter.style.opacity = inMont ? 1 : 0;
  if (inMont) {
    const { i, p } = montage(t);
    const n = [12, 19, 26, 33, 40, 47][clamp(i, 0, 5)];
    num.textContent = n;
    const k = seg(p, 0.0, 0.12);
    num.style.transform = `scale(${1 + 0.35 * (1 - k)}) rotate(${(i % 2 ? 1 : -1) * 4}deg)`;
  }
  const on = t >= T.drop + 0.05;
  after.style.opacity = on ? 1 : 0;
  if (on) {
    const k = seg(t, T.drop + 0.05, T.drop + 0.3), b = Math.pow(1 - (t * BPS) % 1, 3);
    after.style.transform = `scale(${easeBack(k) * (1 + 0.08 * b)}) rotate(${-4 + 2 * Math.sin(t * 5)}deg)`;
    [...after.children].forEach((s, i) => { const c = AFTER_COLS[(i + Math.floor(t * BPS * 2)) % 3]; s.style.color = c; s.style.textShadow = `0 12px 0 #0b0820, 0 0 60px ${c}`; });
  }
  const lo = t >= 12.65;
  lightsEl.style.opacity = lo ? 1 : 0;
  if (lo) { const k = seg(t, 12.65, 12.85); lightsEl.style.transform = `scale(${easeBack(k) * (1 + 0.1 * Math.pow(1 - (t * BPS) % 1, 3))})`; }
}

window.renderFrame = (t) => {
  const L = lightState(t);
  updateDoor(t, L);
  updateGary(t, L);
  updateFoods(t);
  updateHuman(t, L);
  updateLights(t, L);
  scene.updateMatrixWorld(true);
  cameraAt(t);
  bloom.strength = t >= T.drop ? 0.7 : 0.5;
  composer.render();
  updateOverlay(t);
};
window.ready = true;

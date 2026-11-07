import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* =========================================================================
   ED CASINO — 3D оракул трейдинга для Эда
   ========================================================================= */

const $ = id => document.getElementById(id);
const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const pick = a => a[rnd(a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MOBILE = matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 600;

/* ---------------------------------------------------------------- renderer */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = !MOBILE;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07040c);
scene.fog = new THREE.FogExp2(0x0c0616, 0.052);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 60);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------------------------------------------------------- helpers */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.userData.ctx = g; return t;
}
const glow = (color, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
const std = (color, rough = .5, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
}
function neonSign(text, color, w, h, font = 900) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, H) => {
    g.font = `${font} ${H * .62}px Unbounded, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.lineJoin = 'round';
    for (const [blur, lw, a] of [[40, 14, .5], [18, 7, .9]]) { g.shadowBlur = blur; g.strokeStyle = color; g.globalAlpha = a; g.lineWidth = lw; g.strokeText(text, W / 2, H / 2); }
    g.globalAlpha = 1; g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(2.4, 2.4, 2.4), fog: false }));
  return m;
}

/* ---------------------------------------------------------------- lights */
scene.add(new THREE.HemisphereLight(0x8a5cc0, 0x140818, 0.55));
const keySpot = new THREE.SpotLight(0xffd6a0, 38, 9, 0.55, 0.7, 1.6);
keySpot.position.set(-0.6, 3.9, 1.9); keySpot.target.position.set(-0.75, 1.0, 0.4);
keySpot.castShadow = !MOBILE; keySpot.shadow.mapSize.set(1024, 1024); keySpot.shadow.bias = -0.0004;
scene.add(keySpot, keySpot.target);
const machineSpot = new THREE.SpotLight(0xffe6c0, 22, 7, 0.6, 0.8, 1.6);
machineSpot.position.set(1.4, 3.6, 3.6); machineSpot.target.position.set(0.9, 1, 2.4); scene.add(machineSpot, machineSpot.target);
const stageA = new THREE.SpotLight(0xff3d9a, 60, 10, 0.5, 0.6, 1.4); stageA.position.set(-1.8, 4.3, -1.4);
const stageB = new THREE.SpotLight(0x8b5cff, 60, 10, 0.5, 0.6, 1.4); stageB.position.set(-5.2, 4.3, -1.6);
stageA.target.position.set(-3.6, 0.5, -3.4); stageB.target.position.set(-3.6, 0.5, -3.4);
scene.add(stageA, stageA.target, stageB, stageB.target);
const hallWarm = new THREE.PointLight(0xffb26a, 14, 12, 1.6); hallWarm.position.set(1.5, 3.6, -3.5); scene.add(hallWarm);
const hallCool = new THREE.PointLight(0x5a6bff, 10, 10, 1.6); hallCool.position.set(4.2, 2.6, -1); scene.add(hallCool);
const alarm = new THREE.PointLight(0xff2040, 0, 5, 1.5); scene.add(alarm);

/* ---------------------------------------------------------------- room */
const carpet = canvasTex(512, 512, (g, W) => {
  g.fillStyle = '#1b0a26'; g.fillRect(0, 0, W, W);
  const c = W / 2;
  const ring = (r, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); };
  ring(200, '#4a1838', 18); ring(150, '#a77a2c', 4); ring(120, '#5b1a3e', 22); ring(70, '#c99a3a', 3);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2; g.fillStyle = i % 2 ? '#7a2550' : '#b98a34';
    g.beginPath(); g.ellipse(c + Math.cos(a) * 175, c + Math.sin(a) * 175, 18, 7, a, 0, 7); g.fill();
  }
  for (const [x, y] of [[0, 0], [W, 0], [0, W], [W, W]]) { g.fillStyle = '#a77a2c'; g.beginPath(); g.arc(x, y, 34, 0, 7); g.fill(); g.fillStyle = '#2a0f36'; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); }
  g.fillStyle = '#d8a84a'; g.beginPath(); g.arc(c, c, 16, 0, 7); g.fill();
}, 14);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.62, 0.15, { map: carpet }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const wallMat = std(0x1a0b24, 0.85, 0.1);
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), wallMat); backWall.position.set(0, 3.5, -8.5); scene.add(backWall);
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), wallMat); leftWall.position.set(-7.5, 3.5, 0); leftWall.rotation.y = Math.PI / 2; scene.add(leftWall);
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), wallMat); rightWall.position.set(7, 3.5, 0); rightWall.rotation.y = -Math.PI / 2; scene.add(rightWall);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), std(0x0b0512, 0.9)); ceil.position.y = 4.8; ceil.rotation.x = Math.PI / 2; scene.add(ceil);
// gold ceiling coves
for (let x = -6; x <= 6; x += 3) box(0.06, 0.04, 26, glow(0xffb45a, 1.6), x, 4.72, -2);
// wall panels with gold frames
for (let x = -6; x <= 6; x += 2.4) { box(0.05, 4.2, 0.05, std(0xc9963c, 0.3, 1), x, 2.4, -8.45); }
box(30, 0.08, 0.08, glow(0xff3d9a, 1.4), 0, 0.12, -8.4); box(30, 0.06, 0.06, std(0xc9963c, 0.3, 1), 0, 4.3, -8.42);

// neon signs
const signCasino = neonSign('CASINO', '#ff3d9a', 4.6, 1.15); signCasino.position.set(1.4, 3.35, -8.35); scene.add(signCasino);
const signEd = neonSign('ED ROYALE', '#ffd27a', 3.2, 0.62); signEd.position.set(1.4, 2.45, -8.34); scene.add(signEd);
const signJack = neonSign('JACKPOT', '#3ef2ff', 3, 0.75); signJack.position.set(6.95, 3.2, -2.5); signJack.rotation.y = -Math.PI / 2; scene.add(signJack);
const signBar = neonSign('BAR ♥', '#9b5cff', 1.8, 0.6); signBar.position.set(-7.45, 3.3, 1.2); signBar.rotation.y = Math.PI / 2; scene.add(signBar);

// columns
const colMat = std(0x150a1c, 0.25, 0.6), ringMat = std(0xd9a74a, 0.25, 1);
for (const [x, z] of [[3.3, -1.8], [-2.3, -6.5], [5.6, -6.2], [-6.4, -0.4]]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 4.8, 24), colMat); c.position.set(x, 2.4, z); scene.add(c);
  for (const y of [0.25, 1.2, 4.55]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 32), ringMat); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); scene.add(r); }
  const strip = box(0.03, 3, 0.03, glow(0xff3d9a, 1.5), x, 2.7, z + 0.29);
}

// chandeliers
const crystals = [];
function chandelier(x, y, z, r, n) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05), glow(0xfff0d0, 1.8), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const tier = i % 3, a = i / n * Math.PI * 2 * 3;
    const rr = r * (1 - tier * .28);
    m.makeTranslation(Math.cos(a) * rr, -tier * 0.22 - Math.random() * .05, Math.sin(a) * rr); im.setMatrixAt(i, m);
  }
  g.add(im);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), std(0xd9a74a, 0.2, 1)); g.add(hub);
  scene.add(g); crystals.push(g);
}
chandelier(1.4, 4.4, -3.8, 0.9, 72); chandelier(-3.6, 4.45, -3.4, 0.7, 54);
if (!MOBILE) chandelier(3.8, 4.45, 0.4, 0.6, 42);

/* ---- background slot machines with animated screens ---- */
const SCREEN_SYMS = ['7', '🍒', '🔔', '💎', 'BAR', '🍋', '⭐', '🍀'];
const screenTex = [0, 1, 2].map(i => canvasTex(128, 128, () => {}));
const screenCols = [['#2b0a4a', '#ff3d9a'], ['#08243a', '#3ef2ff'], ['#3a1a04', '#ffd27a']];
function drawScreens() {
  screenTex.forEach((t, i) => {
    const g = t.userData.ctx, [bg, fg] = screenCols[i];
    g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
    g.fillStyle = fg; g.globalAlpha = .25; g.fillRect(0, 50, 128, 28); g.globalAlpha = 1;
    g.font = '700 30px Unbounded, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) { g.fillStyle = '#fff'; g.fillText(pick(SCREEN_SYMS), 22 + k * 42, 64); }
    t.needsUpdate = true;
  });
}
drawScreens();
const cabBody = std(0x1a1024, 0.3, 0.7), cabTrim = std(0xd9a74a, 0.25, 1);
const topGlows = [glow(0xff3d9a, 2), glow(0x3ef2ff, 2), glow(0xffc04a, 2), glow(0x9b5cff, 2)];
function bgSlot(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  box(0.72, 1.25, 0.6, cabBody, 0, 0.625, 0, g);
  box(0.74, 0.04, 0.62, cabTrim, 0, 1.26, 0, g);
  box(0.72, 0.38, 0.5, pick(topGlows), 0, 1.47, -0.03, g);
  box(0.74, 0.03, 0.52, cabTrim, 0, 1.67, -0.03, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.44), new THREE.MeshBasicMaterial({ map: pick(screenTex), toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }));
  scr.position.set(0, 0.98, 0.301); g.add(scr);
  box(0.6, 0.06, 0.16, glow(0xff3d9a, 1.2), 0, 0.62, 0.32, g);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 20), std(0x6a0f2a, 0.6)); stool.position.set(0, 0.68, 0.75); g.add(stool);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.64, 8), cabTrim); leg.position.set(0, 0.32, 0.75); g.add(leg);
  scene.add(g);
}
for (let i = 0; i < (MOBILE ? 7 : 9); i++) bgSlot(-1.6 + i * 0.95, -6.6, 0);
for (let i = 0; i < (MOBILE ? 4 : 6); i++) bgSlot(5.9, -5.2 + i * 0.95, -Math.PI / 2);

/* ---- stage with curtain and light beams ---- */
const STAGE = new THREE.Vector3(-3.6, 0, -3.4);
const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2, 0.45, 48), std(0x12081a, 0.2, 0.6)); stage.position.set(STAGE.x, 0.225, STAGE.z); scene.add(stage);
const stageRing = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.035, 8, 64), glow(0xff3d9a, 2.4)); stageRing.rotation.x = Math.PI / 2; stageRing.position.set(STAGE.x, 0.45, STAGE.z); scene.add(stageRing);
const stageRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.02, 8, 64), glow(0xffd27a, 2)); stageRing2.rotation.x = Math.PI / 2; stageRing2.position.set(STAGE.x, 0.05, STAGE.z); scene.add(stageRing2);
{
  const geo = new THREE.CylinderGeometry(2.4, 2.4, 4.4, 96, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); const k = 1 + Math.sin(a * 46) * 0.025; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const curtain = new THREE.Mesh(geo, std(0x6d0b1e, 0.75, 0.05, { side: THREE.DoubleSide }));
  curtain.position.set(STAGE.x, 2.6, STAGE.z); curtain.rotation.y = 0; scene.add(curtain);
}
const beamMat = new THREE.MeshBasicMaterial({ color: 0xff7ac0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const beams = [];
for (let i = 0; i < 3; i++) {
  const geo = new THREE.ConeGeometry(0.75, 4.2, 24, 1, true); geo.translate(0, -2.1, 0);
  const m = new THREE.Mesh(geo, beamMat.clone()); m.material.color.set([0xff7ac0, 0xa07aff, 0xffd27a][i]);
  m.position.set(STAGE.x - 1.2 + i * 1.2, 4.6, STAGE.z + 0.4); scene.add(m); beams.push(m);
}

/* ---- blackjack table ---- */
const TABLE = new THREE.Vector3(-0.8, 0, 0.6);
{
  const g = new THREE.Group(); g.position.copy(TABLE); scene.add(g);
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.06, 64, 1, false, -Math.PI / 2, Math.PI), std(0x0b5e3c, 0.95));
  felt.position.y = 0.88; felt.receiveShadow = true; g.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.07, 14, 64, Math.PI), std(0x3a1a0c, 0.35, 0.2));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.91; g.add(rim);
  const rimGold = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.012, 6, 64, Math.PI), std(0xe0b050, 0.25, 1));
  rimGold.rotation.x = Math.PI / 2; rimGold.position.y = 0.915; g.add(rimGold);
  box(1.96, 0.08, 0.1, std(0x3a1a0c, 0.35, 0.2), 0, 0.89, -0.02, g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.85, 40, 1, false, -Math.PI / 2, Math.PI), std(0x2a1220, 0.35, 0.5));
  base.position.y = 0.43; base.castShadow = true; g.add(base);
  // chips
  const chipGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.012, 20);
  const colors = [0xd0203a, 0x1a1a1a, 0x1f63d6, 0x15a05a, 0xe8d9b8, 0x8a2be2];
  const chips = new THREE.InstancedMesh(chipGeo, std(0xffffff, 0.45, 0.1), 90);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let s = 0; s < 9; s++) {
    const col = new THREE.Color(colors[s % colors.length]); const h = 4 + rnd(7);
    for (let k = 0; k < h && n < 90; k++, n++) { m4.makeTranslation(-0.5 + s * 0.08 + (s > 5 ? 0.3 : 0), 0.917 + k * 0.0125, 0.1 + (s % 2) * 0.08); chips.setMatrixAt(n, m4); chips.setColorAt(n, col); }
  }
  chips.count = n; chips.castShadow = true; g.add(chips);
  // cards
  const cardTex = canvasTex(128, 180, (c, W, H) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); c.fillStyle = '#c4122f'; c.font = '700 64px serif'; c.textAlign = 'center'; c.fillText('A♥', W / 2, H / 2 + 20); });
  const cardTex2 = canvasTex(128, 180, (c, W, H) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); c.fillStyle = '#111'; c.font = '700 64px serif'; c.textAlign = 'center'; c.fillText('K♠', W / 2, H / 2 + 20); });
  [[cardTex, -0.05, 0.12], [cardTex2, 0.08, -0.1]].forEach(([t, x, r]) => { const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.13), std(0xffffff, 0.6, 0, { map: t })); cm.rotation.set(-Math.PI / 2, 0, r); cm.position.set(x, 0.918, 0.55); g.add(cm); });
}

/* =========================================================================
   PLAYER SLOT MACHINE
   ========================================================================= */
const MARKETS = {
  fx:      { name: 'ВАЛЮТА',   sym: ['💵', '💶', '💴', '💷', '₽', '🏦', '💸', '🪙'] },
  btc:     { name: 'БИТКОИН',  sym: ['₿', '🚀', '🌕', '🐳', '💎', '🧻', '⛏️', '🦍'] },
  stocks:  { name: 'АКЦИИ',    sym: ['🐂', '🐻', '📈', '📉', '🏛️', '🍏', '🚗', '💼'] },
  options: { name: 'ОПЦИОНЫ',  sym: ['Δ', 'Γ', 'Θ', 'ν', '📞', '🎯', '⏳', '🎲'] },
};
const DEC = {
  buy:  { word: 'ПОКУПАТЬ',  col: '#0a9c4c', banner: ['ЭД, ПОКУПАЙ!', 'ЭД, ЗАХОДИ!', 'ЭД, БЕРИ!', 'ЭД, ЖМИ BUY!'], sub: ['Звёзды выстроились в зелёную свечу.', 'Луна в фазе «to the moon».', 'Хрустальный шар показал ракету.'] },
  sell: { word: 'ПРОДАВАТЬ', col: '#d31a2e', banner: ['ЭД, СРОЧНО ПРОДАВАЙ!', 'ЭД, СЛИВАЙ!', 'ЭД, БЕГИ!', 'ЭД, ЖМИ SELL!'], sub: ['Карты Таро выпали медведем.', 'Меркурий ретроградный, график — тоже.', 'Шар треснул. Плохой знак для лонгов.'] },
  hold: { word: 'ДЕРЖАТЬ',   col: '#1667c9', banner: ['ЭД, ДЕРЖИ!', 'ЭД, ТЕРПИ!', 'ЭД, НИ ШАГУ НАЗАД!', 'ЭД, АЛМАЗНЫЕ РУКИ!'], sub: ['Вселенная говорит: ничего не трогай.', 'Будь скалой, Эд.', 'Терпение — тоже позиция.'] },
};
const KEYS = ['buy', 'sell', 'hold'];
let market = 'fx';

const machine = new THREE.Group(); scene.add(machine);
const MW = 0.92, MD = 0.66;
const lacquer = std(0x120a18, 0.18, 0.55), goldM = std(0xe6b75a, 0.22, 1), chrome = std(0xdddddd, 0.08, 1);
box(MW, 0.62, MD, lacquer, 0, 0.31, 0, machine);
box(MW + 0.04, 0.03, MD + 0.04, goldM, 0, 0.625, 0, machine);
// slanted button deck
const deck = box(MW, 0.08, 0.26, std(0x1d1026, 0.3, 0.5), 0, 0.68, MD / 2 - 0.05, machine); deck.rotation.x = -0.35;
const spinBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), glow(0xff2a4a, 2.2)); spinBtn.position.set(0.22, 0.73, MD / 2 - 0.02); spinBtn.rotation.x = -0.35; machine.add(spinBtn);
const btn2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), glow(0xffd27a, 1.6)); btn2.position.set(0.04, 0.73, MD / 2 - 0.02); btn2.rotation.x = -0.35; machine.add(btn2);
const btn3 = btn2.clone(); btn3.material = glow(0x3ef2ff, 1.6); btn3.position.x = -0.12; machine.add(btn3);
// body
box(MW, 0.82, MD - 0.06, lacquer, 0, 1.11, -0.03, machine);
for (const sx of [-1, 1]) box(0.03, 0.86, MD - 0.02, goldM, sx * (MW / 2 + 0.005), 1.11, -0.03, machine);
// screen
const RW = 1024, RH = 640;
const reelTex = canvasTex(RW, RH, () => {});
reelTex.anisotropy = 8;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.475), new THREE.MeshBasicMaterial({ map: reelTex, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
screen.position.set(0, 1.12, MD / 2 - 0.055); machine.add(screen);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 1, transparent: true, opacity: 0.06 }));
glass.position.set(0, 1.12, MD / 2 - 0.04); machine.add(glass);
// bezel
for (const [w, h, x, y] of [[0.82, 0.035, 0, 1.375], [0.82, 0.035, 0, 0.865], [0.035, 0.54, -0.41, 1.12], [0.035, 0.54, 0.41, 1.12]]) box(w, h, 0.04, goldM, x, y, MD / 2 - 0.045, machine);
// top marquee
box(MW, 0.42, MD - 0.12, lacquer, 0, 1.73, -0.06, machine);
const marqueeTex = canvasTex(1024, 460, () => {});
const marquee = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.377), new THREE.MeshBasicMaterial({ map: marqueeTex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
marquee.position.set(0, 1.73, MD / 2 - 0.115); machine.add(marquee);
box(MW + 0.04, 0.035, MD - 0.08, goldM, 0, 1.955, -0.06, machine);
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 4, 1, false, Math.PI / 4), lacquer); crown.scale.set(1.05, 1, 0.7); crown.position.set(0, 2.01, -0.06); machine.add(crown);
// bulbs around marquee
const BULBS = 26;
const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), BULBS);
{
  const m4 = new THREE.Matrix4(); let i = 0;
  const w = 0.86, h = 0.4, z = MD / 2 - 0.105;
  for (; i < 10; i++) { m4.makeTranslation(-w / 2 + i * w / 9, 1.73 + h / 2, z); bulbs.setMatrixAt(i, m4); }
  for (let k = 0; k < 10; k++, i++) { m4.makeTranslation(-w / 2 + k * w / 9, 1.73 - h / 2, z); bulbs.setMatrixAt(i, m4); }
  for (let k = 1; k < 4; k++, i++) { m4.makeTranslation(-w / 2, 1.73 - h / 2 + k * h / 4, z); bulbs.setMatrixAt(i, m4); }
  for (let k = 1; k < 4; k++, i++) { m4.makeTranslation(w / 2, 1.73 - h / 2 + k * h / 4, z); bulbs.setMatrixAt(i, m4); }
  for (let k = 0; k < BULBS; k++) bulbs.setColorAt(k, new THREE.Color(2, 2, 2));
}
machine.add(bulbs);
// coin tray
box(0.5, 0.06, 0.12, goldM, 0, 0.42, MD / 2 + 0.03, machine);
box(0.44, 0.1, 0.02, std(0x050305, 0.4), 0, 0.47, MD / 2 - 0.005, machine);
// lever
const leverBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), chrome); leverBase.rotation.z = Math.PI / 2; leverBase.position.set(MW / 2 + 0.04, 1.05, 0.02); machine.add(leverBase);
const leverHousing = box(0.05, 0.3, 0.16, goldM, MW / 2 + 0.02, 1.05, 0.02, machine);
const leverPivot = new THREE.Group(); leverPivot.position.set(MW / 2 + 0.085, 1.05, 0.02); machine.add(leverPivot);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 16), chrome); rod.position.y = 0.31; leverPivot.add(rod);
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8102c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
knob.position.y = 0.66; leverPivot.add(knob);
const knobGlow = new THREE.PointLight(0xff3050, 0.6, 0.8, 2); knobGlow.position.y = 0.66; leverPivot.add(knobGlow);
const leverHit = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); leverHit.position.y = 0.55; leverPivot.add(leverHit);
const machineHit = new THREE.Mesh(new THREE.BoxGeometry(MW, 1.5, 0.1), new THREE.MeshBasicMaterial({ visible: false })); machineHit.position.set(0, 1.1, MD / 2); machine.add(machineHit);
const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow(0x551018, 1)); beacon.position.set(0, 2.05, -0.06); machine.add(beacon);
machine.traverse(o => { if (o.isMesh) o.castShadow = !MOBILE; });

/* ---- reels (drawn on canvas) ---- */
const REELS = [{ x: 40, w: 250 }, { x: 310, w: 404 }, { x: 734, w: 250 }];
const ITEM_H = RH / 3;
const reels = REELS.map((r, i) => ({ ...r, items: [], pos: 0, blur: 0 }));
function centerItem() { return Math.random() < .62 ? { key: pick(KEYS) } : pick(MARKETS[market].sym); }
function sideItem() { return pick(MARKETS[market].sym); }
function setIdleReels() {
  reels.forEach((r, i) => { r.items = i === 1 ? [{ key: 'buy' }, { key: 'hold' }, { key: 'sell' }] : [sideItem(), sideItem(), sideItem()]; r.pos = 0; r.blur = 0; });
  drawReels();
}
function drawItem(g, it, cx, cy, w) {
  if (typeof it === 'object') {
    const d = DEC[it.key]; let fs = 92;
    g.font = `900 ${fs}px Unbounded, "Arial Black", sans-serif`;
    const tw = g.measureText(d.word).width; if (tw > w - 34) { fs *= (w - 34) / tw; g.font = `900 ${fs}px Unbounded, "Arial Black", sans-serif`; }
    g.fillStyle = d.col; g.fillText(d.word, cx, cy + 4);
  } else {
    g.font = `${/^[A-ZΔΓΘν₽₿]$/.test(it) ? '900 120px Unbounded, serif' : '120px serif'}`;
    g.fillStyle = '#2a1a10'; g.fillText(it, cx, cy + 6);
  }
}
let winGlow = 0, winColor = '#ff3d9a';
function drawReels() {
  const g = reelTex.userData.ctx;
  const bg = g.createLinearGradient(0, 0, 0, RH); bg.addColorStop(0, '#120814'); bg.addColorStop(1, '#05020a');
  g.fillStyle = bg; g.fillRect(0, 0, RW, RH);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  reels.forEach(r => {
    g.save(); g.beginPath(); g.roundRect(r.x, 16, r.w, RH - 32, 22); g.clip();
    const grad = g.createLinearGradient(0, 0, 0, RH);
    grad.addColorStop(0, '#9c93a8'); grad.addColorStop(.25, '#f4f0f8'); grad.addColorStop(.5, '#ffffff'); grad.addColorStop(.75, '#f4f0f8'); grad.addColorStop(1, '#9c93a8');
    g.fillStyle = grad; g.fillRect(r.x, 0, r.w, RH);
    const base = Math.floor(r.pos);
    if (r.blur > 0.05) g.filter = `blur(${Math.min(6, r.blur * 6)}px)`;
    for (let k = base - 1; k <= base + 3; k++) {
      const it = r.items[k]; if (it === undefined) continue;
      const y = (k - r.pos) * ITEM_H + ITEM_H / 2;
      drawItem(g, it, r.x + r.w / 2, y, r.w);
    }
    g.filter = 'none';
    const sh = g.createLinearGradient(0, 0, 0, RH); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(.28, 'rgba(0,0,0,0)'); sh.addColorStop(.72, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = sh; g.fillRect(r.x, 0, r.w, RH);
    g.restore();
  });
  // payline
  g.lineWidth = 7; g.strokeStyle = winGlow > 0 ? winColor : '#ff3d9a'; g.shadowColor = g.strokeStyle; g.shadowBlur = 24 + winGlow * 30;
  g.beginPath(); g.roundRect(26, ITEM_H - 4, RW - 52, ITEM_H + 8, 18); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = g.strokeStyle;
  g.beginPath(); g.moveTo(4, RH / 2 - 18); g.lineTo(26, RH / 2); g.lineTo(4, RH / 2 + 18); g.fill();
  g.beginPath(); g.moveTo(RW - 4, RH / 2 - 18); g.lineTo(RW - 26, RH / 2); g.lineTo(RW - 4, RH / 2 + 18); g.fill();
  reelTex.needsUpdate = true;
}
let bulbPhase = 0;
function drawMarquee() {
  const g = marqueeTex.userData.ctx, W = 1024, H = 460;
  const bg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W / 1.4); bg.addColorStop(0, '#3a0e4a'); bg.addColorStop(1, '#0c0414');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 210px Unbounded, "Arial Black", sans-serif';
  g.shadowColor = '#ffb44a'; g.shadowBlur = 40;
  const tg = g.createLinearGradient(0, 70, 0, 300); tg.addColorStop(0, '#fff3c4'); tg.addColorStop(.5, '#ffd27a'); tg.addColorStop(1, '#f0a93a');
  g.fillStyle = tg; g.fillText('ED', W / 2, 190);
  g.shadowColor = '#ff3d9a'; g.shadowBlur = 24; g.fillStyle = '#ff7ac0';
  g.font = '700 54px Unbounded, sans-serif'; g.fillText(MARKETS[market].name, W / 2, 370);
  g.shadowBlur = 0; marqueeTex.needsUpdate = true;
}

/* ---- coins burst ---- */
const COINS = MOBILE ? 60 : 110;
const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22, emissive: 0x2a1a00 }), COINS);
coinMesh.frustumCulled = false; scene.add(coinMesh);
const coins = Array.from({ length: COINS }, () => ({ p: new THREE.Vector3(0, -10, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
const hideM = new THREE.Matrix4().makeTranslation(0, -50, 0);
for (let i = 0; i < COINS; i++) coinMesh.setMatrixAt(i, hideM);
function burstCoins(kind) {
  const src = new THREE.Vector3(0, 0.5, MD / 2 + 0.05); machine.localToWorld(src);
  const col = new THREE.Color(kind === 'sell' ? 0xff4a5a : kind === 'hold' ? 0x6ab0ff : 0xffd27a);
  coins.forEach((c, i) => {
    c.p.copy(src); c.v.set(rand(-1.4, 0.6), rand(2.2, 4.6), rand(0.2, 1.6)); c.w.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
    c.life = rand(1.8, 3); coinMesh.setColorAt(i, i % 3 ? col : new THREE.Color(0xffd27a));
  });
  coinMesh.instanceColor.needsUpdate = true;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
function updateCoins(dt) {
  let any = false;
  coins.forEach((c, i) => {
    if (c.life <= 0) return; any = true;
    c.life -= dt; c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt);
    if (c.p.y < 0.01) { c.p.y = 0.01; c.v.y *= -0.35; c.v.x *= 0.7; c.v.z *= 0.7; c.w.multiplyScalar(0.7); }
    c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
    _q.setFromEuler(c.r); _m.compose(c.p, _q, _s); coinMesh.setMatrixAt(i, c.life > 0 ? _m : hideM);
  });
  if (any) coinMesh.instanceMatrix.needsUpdate = true;
}

/* =========================================================================
   CHARACTERS
   ========================================================================= */
const loadMgr = new THREE.LoadingManager();
loadMgr.onProgress = (url, done, total) => { const p = Math.round(done / total * 100); $('loadfill').style.width = p + '%'; $('loadtxt').textContent = `Загружаем зал… ${p}%`; };
const loader = new GLTFLoader(loadMgr); loader.setMeshoptDecoder(MeshoptDecoder);
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

const mixers = [];
const hitTargets = []; // {mesh, onHit}
function normalize(obj, height) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj); const h = b.max.y - b.min.y;
  obj.scale.multiplyScalar(height / h);
}
function stripTracks(clip, keepRootPos = false, dropRootRot = false) {
  const c = clip.clone();
  c.tracks = c.tracks.filter(t => (t.name.endsWith('.quaternion') && !(dropRootRot && /Hips\.quaternion$/.test(t.name))) || (keepRootPos && /Hips\.position$/.test(t.name)));
  return c;
}
function addHitbox(parent, h, r, onHit, y = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.y = y + h / 2; parent.add(m); hitTargets.push({ mesh: m, onHit }); return m;
}
const tmpV = new THREE.Vector3();

let croupier = null, dancers = [], guests = [], guard = null;

async function loadCharacters() {
  const [mich, xbot, sold] = await Promise.all([load('models/Michelle.glb'), load('models/Xbot.glb'), load('models/Soldier.glb')]);
  const clip = (g, n) => g.animations.find(a => a.name === n);
  const samba = clip(mich, 'SambaDance');
  const xIdle = clip(xbot, 'idle'), xWalk = clip(xbot, 'walk');
  const xAgree = clip(xbot, 'agree'), xShake = clip(xbot, 'headShake');
  // additive gestures (rotation-only so they retarget cleanly)
  const agreeAdd = stripTracks(xAgree, false, true); THREE.AnimationUtils.makeClipAdditive(agreeAdd);
  const shakeAdd = stripTracks(xShake, false, true); THREE.AnimationUtils.makeClipAdditive(shakeAdd);
  const idleRot = stripTracks(xIdle, false, true);
  const sambaRot = stripTracks(samba, true);

  /* ---------- croupier ---------- */
  {
    const root = SkeletonUtils.clone(mich.scene);
    normalize(root, 1.68);
    root.position.set(TABLE.x, 0, TABLE.z - 0.45);
    root.traverse(o => { if (o.isMesh) { o.castShadow = !MOBILE; o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); o.material.roughness = 0.55; } } });
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root); mixers.push(mixer);
    // her own samba is the base layer (weight 0 = rest pose); arms are posed procedurally
    const idle = null;
    const dance = mixer.clipAction(sambaRot); dance.play(); dance.setEffectiveWeight(0);
    croupier = {
      root, mixer, dance,
      head: root.getObjectByName('mixamorigHead'), neck: root.getObjectByName('mixamorigNeck'),
      spine: root.getObjectByName('mixamorigSpine2'), hips: root.getObjectByName('mixamorigHips'),
      lShoulder: root.getObjectByName('mixamorigLeftShoulder'), rShoulder: root.getObjectByName('mixamorigRightShoulder'),
      giggle: 0, talk: 0, dancing: 0,
      lArm: root.getObjectByName('mixamorigLeftArm'), rArm: root.getObjectByName('mixamorigRightArm'),
      lFore: root.getObjectByName('mixamorigLeftForeArm'), rFore: root.getObjectByName('mixamorigRightForeArm'),
      lHand: root.getObjectByName('mixamorigLeftHand'), rHand: root.getObjectByName('mixamorigRightHand'),
      spine1: root.getObjectByName('mixamorigSpine1'),
      no: 0, yes: 0,
    };
    croupier.posed = ['head','neck','spine','spine1','lArm','rArm','lFore','rFore','lShoulder','rShoulder'].map(k => croupier[k]).filter(Boolean);
    croupier.rest = croupier.posed.map(b => b.quaternion.clone());
    addHitbox(root, 1.75 / root.scale.y, 0.35 / root.scale.x, () => onCroupierClick());
  }

  /* ---------- dancers ---------- */
  const tints = [0xffc0de, 0xffe4a8, 0xd2b8ff];
  const nD = MOBILE ? 2 : 3;
  for (let i = 0; i < nD; i++) {
    const root = SkeletonUtils.clone(mich.scene);
    normalize(root, 1.7);
    const a = (i - (nD - 1) / 2) * 0.75;
    root.position.set(STAGE.x + Math.sin(a) * 1.0, 0.45, STAGE.z + Math.cos(a) * 0.5);
    root.rotation.y = 0.55 + a * 0.3;
    root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = o.material.clone(); o.material.color.set(tints[i]); o.material.emissive = new THREE.Color(tints[i]).multiplyScalar(0.06); o.material.roughness = 0.4; } });
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root); mixers.push(mixer);
    const act = mixer.clipAction(samba); act.play(); act.time = i * 2.3; act.timeScale = 0.95 + i * 0.05;
    const d = { root, mixer, act, boost: 0 };
    dancers.push(d);
    addHitbox(root, 1.75 / root.scale.y, 0.4 / root.scale.x, () => onDancerClick(d));
  }

  /* ---------- guests ---------- */
  const suitCols = [0x15151c, 0x3a0d1a, 0x0d1f3a, 0xe9dcc6, 0x1d3a2a, 0x2a1640];
  const nG = MOBILE ? 3 : 5;
  for (let i = 0; i < nG; i++) {
    const root = SkeletonUtils.clone(xbot.scene);
    normalize(root, rand(1.7, 1.86));
    root.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false; o.castShadow = false;
        o.material = o.material.clone();
        if (/Joints/i.test(o.material.name)) { o.material.color.set(0xd9a74a); o.material.metalness = 1; o.material.roughness = 0.25; }
        else { o.material.color.set(suitCols[i % suitCols.length]); o.material.metalness = 0.25; o.material.roughness = 0.45; }
      }
    });
    const start = guestPoint(); root.position.copy(start);
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root); mixers.push(mixer);
    const idle = mixer.clipAction(xIdle), walk = mixer.clipAction(xWalk);
    const nod = mixer.clipAction(agreeAdd); nod.blendMode = THREE.AdditiveAnimationBlendMode; nod.setLoop(THREE.LoopOnce);
    const shake = mixer.clipAction(shakeAdd); shake.blendMode = THREE.AdditiveAnimationBlendMode; shake.setLoop(THREE.LoopOnce);
    idle.play(); walk.play(); walk.setEffectiveWeight(0);
    const g = { root, mixer, idle, walk, nod, shake, target: guestPoint(), wait: rand(0, 4), speed: rand(0.75, 1.0), w: 0, name: pick(GUEST_NAMES) };
    guests.push(g);
    addHitbox(root, 1.8 / root.scale.y, 0.35 / root.scale.x, () => onGuestClick(g));
  }

  /* ---------- guard ---------- */
  {
    const root = SkeletonUtils.clone(sold.scene);
    normalize(root, 1.92);
    root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = o.material.clone(); o.material.color.multiplyScalar(0.55); } });
    root.position.copy(GUARD_HOME); root.rotation.y = -2.2;
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root); mixers.push(mixer);
    const idle = mixer.clipAction(clip(sold, 'Idle')), walk = mixer.clipAction(clip(sold, 'Walk'));
    idle.play(); walk.play(); walk.setEffectiveWeight(0);
    guard = { root, mixer, idle, walk, state: 'home', target: GUARD_HOME.clone(), w: 0 };
    addHitbox(root, 1.9 / root.scale.y, 0.4 / root.scale.x, () => onGuardClick());
  }
}
const GUARD_HOME = new THREE.Vector3(5.2, 0, -3.4);
const GUARD_POST = new THREE.Vector3(0.62, 0, 1.0);
function guestPoint() {
  for (;;) {
    const p = new THREE.Vector3(rand(-1.8, 4.6), 0, rand(-5.4, -1.6));
    if (p.x < -1.2 && p.z > -2.4) continue;
    return p;
  }
}
const GUEST_NAMES = ['мистер Баффет', 'месье Сорос', 'синьор Дюрекс… простите, Дюран', 'граф Шортов', 'барон Лонгов', 'мадам Волатильность'];

/* walking helper: returns true when arrived */
function stepToward(ch, target, dt, speed) {
  const p = ch.root.position;
  tmpV.subVectors(target, p); tmpV.y = 0;
  const d = tmpV.length();
  if (d < 0.12) return true;
  const yaw = Math.atan2(tmpV.x, tmpV.z);
  let dy = yaw - ch.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  ch.root.rotation.y += dy * Math.min(1, dt * 5);
  if (Math.abs(dy) < 1.2) p.addScaledVector(tmpV.normalize(), Math.min(d, speed * dt));
  return false;
}
function faceToward(ch, pos, dt) {
  tmpV.subVectors(pos, ch.root.position);
  const yaw = Math.atan2(tmpV.x, tmpV.z);
  let dy = yaw - ch.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  ch.root.rotation.y += dy * Math.min(1, dt * 4);
}
function blendWalk(ch, walking, dt) {
  ch.w += ((walking ? 1 : 0) - ch.w) * Math.min(1, dt * 6);
  ch.walk.setEffectiveWeight(ch.w); ch.idle.setEffectiveWeight(1 - ch.w);
}

function updateGuests(dt) {
  guests.forEach(g => {
    if (g.wait > 0) {
      g.wait -= dt; blendWalk(g, false, dt);
      if (g.wait <= 0) g.target = guestPoint();
    } else {
      blendWalk(g, true, dt);
      if (stepToward(g, g.target, dt, g.speed)) {
        g.wait = rand(2, 7);
        if (Math.random() < .4) { const a = Math.random() < .5 ? g.nod : g.shake; a.reset().play(); }
      }
    }
  });
}

let guardTimer = 0;
function updateGuard(dt) {
  if (!guard) return;
  const g = guard;
  if (g.state === 'approach') {
    blendWalk(g, true, dt);
    if (stepToward(g, GUARD_POST, dt, 1.1)) { g.state = 'post'; say('guard', pick(LINES.guardArrive)); }
  } else if (g.state === 'post') {
    blendWalk(g, false, dt); faceToward(g, camera.position, dt);
  } else if (g.state === 'leave') {
    blendWalk(g, true, dt);
    if (stepToward(g, GUARD_HOME, dt, 1.2)) { g.state = 'home'; }
  } else {
    blendWalk(g, false, dt);
    faceToward(g, new THREE.Vector3(1, 0, 1), dt * 0.3);
  }
}
function summonGuard() { if (guard && (guard.state === 'home' || guard.state === 'leave')) guard.state = 'approach'; }
function dismissGuard() {
  if (guard && (guard.state === 'post' || guard.state === 'approach')) {
    guard.state = 'leave'; setTimeout(() => say('guard', pick(LINES.guardLeave)), 200);
  }
}

/* croupier procedural layer: idle pose, look at player, talk nods, giggle */
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _e = new THREE.Euler(), _ax = new THREE.Vector3();
// rotate a bone around an axis given in the character's root space
function rotBone(bone, root, ax, ay, az, angle) {
  if (!bone || !angle) return;
  _ax.set(ax, ay, az).applyQuaternion(root.quaternion).normalize();     // axis in world
  bone.parent.getWorldQuaternion(_qb);
  _qa.setFromAxisAngle(_ax, angle);
  // local = parentWorld^-1 * R * parentWorld * local
  const inv = _qb.clone().invert();
  bone.quaternion.premultiply(inv.multiply(_qa).multiply(_qb));
  bone.updateMatrixWorld(true);
}
function updateCroupier(dt, t) {
  const c = croupier; if (!c) return;
  const wantDance = c.dancing > 0 ? 1 : 0; c.dancing = Math.max(0, c.dancing - dt);
  c.dw = THREE.MathUtils.lerp(c.dw || 0, wantDance, Math.min(1, dt * 3));
  if (c.dw < 0.002) c.dw = 0;
  c.dance.setEffectiveWeight(c.dw);
  c.root.rotation.y = THREE.MathUtils.lerp(c.root.rotation.y, 0.25 + Math.sin(t * 0.3) * 0.04, dt * 2);
  c.root.updateMatrixWorld(true);
  const k = 1 - c.dw, R = c.root;
  if (c.dw === 0) c.posed.forEach((b, i) => b.quaternion.copy(c.rest[i]));
  c.root.updateMatrixWorld(true);
  if (k <= 0) return;
  const breathe = Math.sin(t * 1.6) * 0.02, sway = Math.sin(t * 0.7) * 0.03, gig = c.giggle;
  // torso: lean slightly toward the table, breathe, sway
  rotBone(c.spine1, R, 1, 0, 0, (0.12 + breathe + gig * 0.12 + Math.sin(t * 32) * 0.03 * gig) * k);
  rotBone(c.spine1, R, 0, 0, 1, (sway + Math.sin(t * 15) * 0.05 * gig) * k);
  // arms: down from T-pose, forward onto the table
  rotBone(c.lArm, R, 0, 0, 1, -1.15 * k); rotBone(c.rArm, R, 0, 0, 1, 1.15 * k);
  rotBone(c.lArm, R, 1, 0, 0, (-0.55 + breathe) * k); rotBone(c.rArm, R, 1, 0, 0, (-0.55 + breathe) * k);
  rotBone(c.lArm, R, 0, 1, 0, 0.25 * k); rotBone(c.rArm, R, 0, 1, 0, -0.25 * k);
  rotBone(c.lFore, R, 1, 0, 0, -0.85 * k); rotBone(c.rFore, R, 1, 0, 0, -0.85 * k);
  rotBone(c.lFore, R, 0, 1, 0, 0.5 * k); rotBone(c.rFore, R, 0, 1, 0, -0.5 * k);
  // giggle: one hand up to the mouth
  if (gig > 0) { rotBone(c.rFore, R, 1, 0, 0, -1.3 * Math.min(1, gig) * k); rotBone(c.rArm, R, 0, 1, 0, -0.4 * Math.min(1, gig) * k); }
  // shoulders shake with laughter
  if (gig > 0) for (const sh of [c.lShoulder, c.rShoulder]) rotBone(sh, R, 1, 0, 0, Math.sin(t * 30) * 0.06 * gig * k);
  // head looks at the player, nods while talking
  if (c.head) {
    const hp = c.head.getWorldPosition(tmpV);
    const dx = camera.position.x - hp.x, dz = camera.position.z - hp.z, dyy = camera.position.y - hp.y;
    const yaw = clamp(Math.atan2(dx, dz) - c.root.rotation.y, -0.7, 0.7);
    const pitch = clamp(Math.atan2(dyy, Math.hypot(dx, dz)), -0.4, 0.4);
    const talkNod = c.talk > 0 ? Math.sin(t * 9) * 0.05 + Math.sin(t * 3.7) * 0.04 : 0;
    rotBone(c.neck, R, 0, 1, 0, yaw * 0.4 * k);
    rotBone(c.head, R, 0, 1, 0, yaw * 0.5 * k);
    rotBone(c.head, R, 1, 0, 0, (-pitch * 0.7 - 0.12 + talkNod + gig * 0.15) * k);
    rotBone(c.head, R, 0, 0, 1, (0.08 + gig * Math.sin(t * 7) * 0.2) * k);
    if (c.no > 0) rotBone(c.head, R, 0, 1, 0, Math.sin(t * 14) * 0.35 * Math.min(1, c.no) * k);
    if (c.yes > 0) rotBone(c.head, R, 1, 0, 0, Math.sin(t * 9) * 0.18 * Math.min(1, c.yes) * k);
  }
  c.no = Math.max(0, c.no - dt); c.yes = Math.max(0, c.yes - dt);
  c.giggle = Math.max(0, c.giggle - dt * 0.6);
  c.talk = Math.max(0, c.talk - dt);
}

/* =========================================================================
   AUDIO — synthesized casino ambience, lounge music and sfx
   ========================================================================= */
const Audio = {
  ctx: null, on: true,
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0.55; this.music.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.9; this.amb.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    // reverb
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg).connect(this.master);
    // noise
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = nb.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; nd[i] = (b0 + b1 + b2) * 0.9; }
    this.noiseBuf = nb;
    this.startAmbience(); this.startMusic();
  },
  startAmbience() {
    const ctx = this.ctx;
    for (const [f, q, v] of [[420, .6, .16], [1100, .9, .06]]) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ctx.createGain(); g.gain.value = v;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rand(.07, .2); const lg = ctx.createGain(); lg.gain.value = v * .5; lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(bp).connect(g).connect(this.amb); src.start();
    }
    const jingle = () => {
      if (this.ctx.state === 'running' && this.on) {
        const pan = ctx.createStereoPanner(); pan.pan.value = rand(-.9, .9); pan.connect(this.amb); pan.connect(this.verb);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = rand(1800, 3500); lp.connect(pan);
        const t0 = ctx.currentTime, scale = [0, 2, 4, 7, 9, 12, 14, 16], base = pick([523, 587, 659, 698]);
        const n = 4 + rnd(5);
        if (Math.random() < .25) { for (let i = 0; i < 4; i++) this.clink(t0 + i * .07, lp, .025); }
        else for (let i = 0; i < n; i++) this.note(base * Math.pow(2, pick(scale) / 12), t0 + i * .085, .12, 'square', .012, lp);
      }
      setTimeout(jingle, rand(900, 3200));
    };
    jingle();
  },
  note(f, t, d, type, v, dest) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(dest || this.sfx); o.start(t); o.stop(t + d + .05);
  },
  clink(t, dest, v = .05) { for (const f of [2600, 3900, 5300]) this.note(f * rand(.97, 1.03), t, .25, 'sine', v / 3, dest); },
  startMusic() {
    const ctx = this.ctx, bpm = 98, beat = 60 / bpm;
    const chords = [[220, 261.6, 329.6, 392, 493.9], [146.8, 220, 261.6, 349.2, 329.6], [196, 246.9, 293.7, 349.2, 440], [130.8, 196, 246.9, 329.6, 293.7]];
    const bassN = [110, 73.4, 98, 65.4];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(this.music); lp.connect(this.verb);
    let next = ctx.currentTime + .1, step = 0;
    const tick = () => {
      while (next < ctx.currentTime + .25) {
        const bar = Math.floor(step / 8) % 4, s = step % 8;
        if (s === 0) chords[bar].forEach((f, i) => { for (const det of [-4, 4]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; g.gain.setValueAtTime(0, next); g.gain.linearRampToValueAtTime(.014, next + .25); g.gain.setTargetAtTime(0, next + beat * 3.4, .35); o.connect(g).connect(lp); o.start(next); o.stop(next + beat * 4.6); } });
        if (s === 0 || s === 3 || s === 4 || s === 7) this.note(bassN[bar] * (s === 7 ? 1.5 : 1), next, beat * .7, 'sine', .08, this.music);
        if (s === 0 || s === 4) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, next); o.frequency.exponentialRampToValueAtTime(40, next + .15); g.gain.setValueAtTime(.12, next); g.gain.exponentialRampToValueAtTime(.001, next + .25); o.connect(g).connect(this.music); o.start(next); o.stop(next + .3); }
        { const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = ctx.createGain(); const v = s % 2 ? .012 : .022; g.gain.setValueAtTime(v, next); g.gain.exponentialRampToValueAtTime(.0001, next + .05); src.connect(hp).connect(g).connect(this.music); src.start(next, rand(0, 1.5), .06); }
        if (s === 2 || s === 6) { const f = chords[bar][2 + rnd(3)] * 2; this.note(f, next + beat * .25, .3, 'sine', .015, lp); }
        next += beat / 2; step++;
      }
    };
    setInterval(tick, 60);
  },
  duck(on) { if (!this.ctx) return; this.music.gain.setTargetAtTime(on ? .22 : .55, this.ctx.currentTime, .2); },
  lever() { if (!this.ctx) return; const t = this.ctx.currentTime; this.note(90, t, .25, 'sawtooth', .08); this.note(60, t + .05, .3, 'square', .05); },
  tick() { if (!this.ctx) return; this.note(rand(1600, 2200), this.ctx.currentTime, .025, 'square', .012); },
  stop() { if (!this.ctx) return; const t = this.ctx.currentTime; this.note(140, t, .2, 'triangle', .14); this.clink(t, this.sfx, .03); },
  win(kind) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const seq = kind === 'buy' ? [523, 659, 784, 1047, 1319] : kind === 'sell' ? [466, 392, 330, 262, 196] : [440, 554, 659, 880];
    seq.forEach((f, i) => { this.note(f, t + i * .11, .45, kind === 'sell' ? 'sawtooth' : 'triangle', .05); this.note(f * 2, t + i * .11, .3, 'sine', .02); });
    if (kind === 'sell') for (let i = 0; i < 6; i++) this.note(i % 2 ? 660 : 880, t + .6 + i * .18, .16, 'square', .03);
    else for (let i = 0; i < 14; i++) this.clink(t + .3 + i * .06 + Math.random() * .04, this.sfx, .05);
  },
  pop() { if (!this.ctx) return; const t = this.ctx.currentTime; this.note(880, t, .08, 'sine', .04); this.note(1320, t + .05, .1, 'sine', .03); },
  type() { if (!this.ctx) return; this.note(rand(700, 1000), this.ctx.currentTime, .02, 'sine', .006); },
  setOn(v) { this.on = v; if (this.ctx) this.master.gain.setTargetAtTime(v ? .9 : 0, this.ctx.currentTime, .1); },
};

/* voice (browser speech synthesis) */
let ruVoice = null, ruMale = null;
function pickVoices() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
  ruVoice = vs.find(v => /milena|alena|katya|irina|svetlana|ekaterina|anna|dariya|female|жен/i.test(v.name)) || vs.find(v => /google/i.test(v.name)) || vs[0] || null;
  ruMale = vs.find(v => /yuri|pavel|dmitry|maxim|male|муж/i.test(v.name) && v !== ruVoice) || ruVoice;
}
if ('speechSynthesis' in window) { pickVoices(); speechSynthesis.onvoiceschanged = pickVoices; }
function speak(text, who) {
  if (!Audio.on || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»—…]/g, ' '));
    u.lang = 'ru-RU'; u.voice = who === 'guard' ? ruMale : ruVoice;
    u.pitch = who === 'guard' ? 0.6 : 1.3; u.rate = who === 'guard' ? 0.92 : 1.05;
    u.onstart = () => Audio.duck(true); u.onend = () => Audio.duck(false);
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* =========================================================================
   DIALOGUE
   ========================================================================= */
const LINES = {
  hello: ['Добрый вечер, Эдуард! Я вас ждала. Ваш автомат свободен.', 'Эдуард! Наконец-то. Без вас рынок скучал.', 'Мсье Эд, добро пожаловать. Рычаг уже тёплый.'],
  idle: [
    'Рычаг сам себя не дёрнет, Эдуард.', 'Не смотрите на графики, Эд. Смотрите на меня.', 'Шампанское за счёт заведения. Решения — за счёт вселенной.',
    'Я видела много трейдеров. Вы — самый красивый. Ой… самый смелый!', 'Девочки на сцене танцуют только для тех, кто играет. Намёк понятен?',
    'Говорят, Баффет тоже начинал с рычага. Ну, почти.', 'Эдуард, вы так задумчиво молчите… Уже в позиции?', 'Подсказка: на меня можно кликнуть. Но аккуратно.',
    'Знаете, кто не крутит барабан? Тот, кто потом жалеет.', 'Рынок открыт, бар открыт, сердце открыто. Крутим?',
    'Можно выбрать рынок внизу: валюта, биткоин, акции или опционы.', 'Сегодня вселенная в хорошем настроении. Я проверяла.',
  ],
  market: {
    fx: ['Валюта? Классика. Как маленькое чёрное платье.', 'Доллар, евро, рубль… Я всех их люблю одинаково.'],
    btc: ['Биткоин… Вы любите риск, Эдуард. Мне это нравится.', 'Крипта! Держитесь крепче, тут качает сильнее, чем на сцене.'],
    stocks: ['Акции. Солидно. Почти как у взрослых.', 'Быки, медведи… У нас тут целый зоопарк.'],
    options: ['Опционы? Эдуард, вы опасный человек.', 'Греки, страйки, экспирация… Звучит как моя пятница.'],
  },
  spin: ['Ставки сделаны! Ставок больше нет.', 'Крутим! Не дышите, Эдуард.', 'Ох, чувствую, сейчас будет что-то…', 'Вселенная думает. Тссс.'],
  buy: ['Эдуард, покупайте! Я же говорила — вам везёт!', 'Зелёный — ваш цвет, Эд. Покупайте! А я станцую!', 'Берите, Эдуард! Пока другие думают.'],
  sell: ['Эдуард, срочно продавайте! Не спорьте со мной!', 'Продавайте, Эд! Быстро и элегантно!', 'Всё, Эдуард, продаём! Потом пойдём танцевать.'],
  hold: ['Держите, Эдуард. Красиво и терпеливо.', 'Ничего не трогайте, Эд. Просто держите.', 'Алмазные руки, Эдуард. Держим!'],
  giggle: ['Хи-хи! Эдуард, щекотно!', 'Ой! Хи-хи-хи… Вы такой смелый.', 'Хи-хи! Только не при охране.', 'Ха-ха! Ну перестаньте, я на работе!'],
  giggleMany: ['Эдуард! Я на работе! Хи-хи…', 'Ещё раз — и я позову охрану. Хи-хи!'],
  giggleGuard: ['Всё, Эдуард, вы доигрались. Охрана!'],
  dancer: ['Это наши звёзды, Эд. Смотреть можно, трогать — нет.', 'Девочки, Эдуард вам машет! Танцуем быстрее!', 'Нравится шоу? Выиграете — станцуют лично для вас. Шучу.'],
  guardArrive: ['Мсье Эдуард, автомат простаивает. Или играем, или освобождаем.', 'Гражданин, вы двадцать минут смотрите на рычаг. Всё в порядке?', 'Охрана казино. Тут не спят, тут крутят.'],
  guardLeave: ['Вот и славно. Приятной игры.', 'Так-то лучше. Я рядом.'],
  guardClick: ['Без резких движений, мсье.', 'Я на службе. Играйте.', 'Не трогайте меня, трогайте рычаг.'],
  busy: ['Тише, тише, барабан ещё крутится!'],
};
const shuffled = {};
function next(key) {
  const arr = key.split('.').reduce((o, k) => o[k], LINES);
  shuffled[key] = shuffled[key]?.length ? shuffled[key] : [...arr].sort(() => Math.random() - .5);
  return shuffled[key].pop();
}

const dialog = $('dialog'), dname = $('dname'), dtext = $('dtext');
let typing = null, hideAt = 0;
function say(who, text, { voice = true } = {}) {
  dialog.classList.toggle('guard', who === 'guard');
  dname.textContent = who === 'guard' ? 'Охрана' : 'Мадам Фортуна · крупье';
  dialog.classList.add('on'); dialog.classList.remove('done'); dtext.textContent = '';
  if (who !== 'guard' && croupier) croupier.talk = text.length * 0.05 + 0.5;
  typing = { text, t0: performance.now(), shown: 0 };
  hideAt = performance.now() + 2600 + text.length * 60;
  if (voice) speak(text, who);
}
function updateDialog() {
  const now = performance.now();
  if (typing) {
    const n = Math.min(typing.text.length, Math.floor((now - typing.t0) / 26));
    if (n !== typing.shown) { if (Math.floor(n / 3) !== Math.floor(typing.shown / 3)) Audio.type(); typing.shown = n; dtext.textContent = typing.text.slice(0, n); }
    if (n >= typing.text.length) { typing = null; dialog.classList.add('done'); }
  }
  if (hideAt && now > hideAt) { hideAt = 0; dialog.classList.remove('on'); }
}
dialog.addEventListener('click', () => { hideAt = 0; dialog.classList.remove('on'); });

/* =========================================================================
   GAME LOGIC
   ========================================================================= */
const SPIN_MS = 5000, STOPS = [2700, 3800, 5000];
let spinning = false, spinT0 = 0, plans = null, result = null, spins = 0, bannerOn = false;
let lastAct = performance.now(), idleSaid = 0, clickCount = 0, clickReset = 0;
let shake = 0;
function touch() {
  lastAct = performance.now(); idleSaid = 0;
  if (guard && guard.state === 'post') dismissGuard();
}

function startSpin() {
  if (spinning || !started) return;
  if (bannerOn) hideBanner();
  touch(); spinning = true; spinT0 = performance.now();
  document.querySelectorAll('.mkt').forEach(b => b.disabled = true); $('hint').classList.add('off');
  const key = KEYS[rnd(3)]; result = key;
  plans = reels.map((r, i) => {
    const len = 26 + i * 10 + (i === 1 ? 14 : 0);
    r.items = []; for (let k = 0; k < len; k++) r.items.push(i === 1 ? centerItem() : sideItem());
    if (i === 1) r.items[len - 2] = { key };
    // keep current top visible as start
    r.pos = 0;
    return { dist: len - 3, dur: STOPS[i], done: false, last: -1 };
  });
  say('croupier', next('spin'), { voice: false });
  Audio.lever();
  if (croupier) croupier.yes = 1.2;
}
const easeOut = t => 1 - Math.pow(1 - t, 4);
function updateSpin() {
  if (!spinning) return;
  const el = performance.now() - spinT0; let all = true;
  plans.forEach((p, i) => {
    const r = reels[i]; if (p.done) return;
    const t = Math.min(1, el / p.dur), e = easeOut(t);
    r.pos = e * p.dist; r.blur = t < 1 ? Math.min(1, (1 - t) * 2.2) * (t > 0.02 ? 1 : 0) : 0;
    const c = Math.floor(r.pos); if (c !== p.last) { p.last = c; if (i === 1) Audio.tick(); }
    if (t >= 1) { p.done = true; r.blur = 0; Audio.stop(); shake = Math.max(shake, 0.08); }
    else all = false;
  });
  drawReels();
  if (all) { spinning = false; setTimeout(finish, 250); }
}
function finish() {
  const k = result, d = DEC[k];
  spins++; $('spins').textContent = spins;
  winGlow = 1; winColor = k === 'buy' ? '#38f29a' : k === 'sell' ? '#ff4058' : '#5aa9ff';
  const b = $('banner'); b.className = 'banner ' + k;
  $('bmain').textContent = pick(d.banner); $('bsub').textContent = pick(d.sub);
  void b.offsetWidth; b.classList.add('on'); bannerOn = true;
  const fl = $('flash'); fl.className = 'flash'; void fl.offsetWidth; fl.className = 'flash ' + k;
  Audio.win(k); burstCoins(k);
  if (navigator.vibrate) navigator.vibrate(k === 'sell' ? [80, 60, 80, 60, 200] : [60]);
  if (k === 'sell') { shake = 0.6; alarmT = 2.2; }
  if (k === 'buy' && croupier) croupier.dancing = 5;
  if (k === 'hold' && croupier) croupier.yes = 1.6;
  if (k === 'sell' && croupier) croupier.no = 1.6;
  dancers.forEach(dd => dd.boost = 4);
  setTimeout(() => say('croupier', next(k)), 600);
}
function hideBanner() {
  $('banner').classList.remove('on'); bannerOn = false; winGlow = 0;
  document.querySelectorAll('.mkt').forEach(b => b.disabled = false); $('hint').classList.remove('off');
  drawReels();
}
$('again').addEventListener('click', e => { e.stopPropagation(); hideBanner(); pullLeverAuto(); });

/* markets */
document.querySelectorAll('.mkt').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation(); if (spinning) return; touch();
  document.querySelectorAll('.mkt').forEach(x => x.classList.remove('on')); b.classList.add('on');
  market = b.dataset.m; Audio.pop(); if (bannerOn) hideBanner();
  setIdleReels(); drawMarquee(); say('croupier', next('market.' + market));
}));

/* clicks on characters */
function onCroupierClick() {
  touch(); const now = performance.now();
  if (now - clickReset > 15000) clickCount = 0; clickReset = now; clickCount++;
  croupier.giggle = 1.4; Audio.pop();
  if (clickCount >= 6) { say('croupier', LINES.giggleGuard[0]); clickCount = 0; setTimeout(summonGuard, 800); }
  else if (clickCount >= 4) say('croupier', LINES.giggleMany[clickCount - 4]);
  else say('croupier', next('giggle'));
}
function onDancerClick(d) { touch(); d.boost = 5; Audio.pop(); say('croupier', next('dancer')); }
function onGuestClick(g) {
  touch(); Audio.pop(); g.wait = 3; (Math.random() < .5 ? g.nod : g.shake).reset().play();
  say('croupier', pick([`Это ${g.name}. Постоянный клиент.`, `О, ${g.name}! Говорят, он тоже спрашивает рычаг, что делать.`, `${g.name[0].toUpperCase() + g.name.slice(1)} кивает вам, Эдуард. Уважает.`]));
}
function onGuardClick() { touch(); say('guard', next('guardClick')); }

/* =========================================================================
   INPUT: raycast + lever drag
   ========================================================================= */
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
let lever = { drag: false, startY: 0, angle: 0, target: 0, fired: false, auto: 0 };
let pointer = { x: 0, y: 0 }; const par = { x: 0, y: 0 };
function setNDC(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }
canvas.addEventListener('pointerdown', e => {
  if (!started) return;
  Audio.init(); setNDC(e); raycaster.setFromCamera(ndc, camera);
  if (raycaster.intersectObject(leverHit, false).length) {
    if (spinning) { say('croupier', LINES.busy[0], { voice: false }); return; }
    lever.drag = true; lever.startY = e.clientY; lever.fired = false; canvas.setPointerCapture(e.pointerId); touch(); return;
  }
  if (raycaster.intersectObject(machineHit, false).length) { if (bannerOn) hideBanner(); pullLeverAuto(); return; }
  const hits = raycaster.intersectObjects(hitTargets.map(h => h.mesh), false);
  if (hits.length) { hitTargets.find(h => h.mesh === hits[0].object).onHit(); return; }
  if (bannerOn) hideBanner();
});
canvas.addEventListener('pointermove', e => {
  pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1;
  if (lever.drag) {
    const dy = e.clientY - lever.startY;
    lever.target = clamp(dy / (innerHeight * 0.22), 0, 1) * 1.25;
    if (lever.target > 1.1 && !lever.fired) { lever.fired = true; }
  } else if (started) {
    setNDC(e); raycaster.setFromCamera(ndc, camera);
    const over = raycaster.intersectObjects([leverHit, machineHit, ...hitTargets.map(h => h.mesh)], false).length > 0;
    canvas.style.cursor = over ? 'pointer' : 'default';
  }
});
const endDrag = () => {
  if (!lever.drag) return; lever.drag = false;
  if (lever.fired || lever.target < 0.05) { lever.target = 0; if (lever.fired) startSpin(); else pullLeverAuto(); }
  else lever.target = 0;
};
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
function pullLeverAuto() { if (spinning || !started) return; lever.auto = 0.32; }
addEventListener('keydown', e => {
  if (e.code === 'Space' && started) { e.preventDefault(); Audio.init(); if (bannerOn) hideBanner(); pullLeverAuto(); }
});
function updateLever(dt) {
  if (lever.auto > 0) {
    lever.auto -= dt; lever.target = 1.25;
    if (lever.auto <= 0) { lever.target = 0; startSpin(); }
  }
  const k = lever.drag || lever.auto > 0 ? 18 : 9;
  lever.angle += (lever.target - lever.angle) * Math.min(1, dt * k);
  leverPivot.rotation.x = lever.angle + (lever.target === 0 ? Math.sin(performance.now() / 70) * Math.max(0, lever.angle) * 0.25 : 0);
}

/* =========================================================================
   CAMERA / LAYOUT
   ========================================================================= */
const camBase = new THREE.Vector3(), camLook = new THREE.Vector3();
function layout() {
  const a = innerWidth / innerHeight;
  if (a >= 1.15) {           // landscape / desktop
    camera.fov = 50; camBase.set(0.25, 1.52, 3.7); camLook.set(-0.25, 1.18, 0.2);
    machine.position.set(0.86, 0, 1.32); machine.rotation.y = -0.55; machine.scale.setScalar(1);
  } else if (a >= 0.8) {     // square-ish
    camera.fov = 56; camBase.set(0.15, 1.55, 4.3); camLook.set(0.05, 1.1, 0.8);
    machine.position.set(0.82, 0, 2.6); machine.rotation.y = -0.32; machine.scale.setScalar(1);
  } else {                   // phone portrait
    camera.fov = 68; camBase.set(-0.5, 1.98, 4.95); camLook.set(-0.64, 0.68, 0.9);
    machine.position.set(-0.5, 0, 3.42); machine.rotation.y = -0.04; machine.scale.setScalar(0.64);
  }
  camera.aspect = a; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth * (MOBILE ? .5 : .75), innerHeight * (MOBILE ? .5 : .75));
  machineSpot.target.position.copy(machine.position).setY(1);
}
addEventListener('resize', layout); layout();

/* =========================================================================
   LOOP
   ========================================================================= */
const clock = new THREE.Clock();
let started = false, alarmT = 0, screenT = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  mixers.forEach(m => m.update(dt));
  dancers.forEach(d => { d.boost = Math.max(0, d.boost - dt); d.act.timeScale = THREE.MathUtils.lerp(d.act.timeScale, d.boost > 0 ? 1.45 : 1, dt * 2); });
  updateCroupier(dt, t);
  updateGuests(dt); updateGuard(dt);
  updateLever(dt); updateSpin(); updateCoins(dt); updateDialog();

  // bulbs chase
  bulbPhase += dt * (spinning ? 16 : 4);
  const cA = new THREE.Color(2.4, 2.1, 1.4), cB = new THREE.Color(2.4, 0.4, 1.2), cOff = new THREE.Color(0.3, 0.15, 0.1);
  for (let i = 0; i < BULBS; i++) bulbs.setColorAt(i, (Math.floor(bulbPhase) + i) % 3 === 0 ? (spinning ? cB : cA) : (i % 2 ? cOff : cA.clone().multiplyScalar(0.5)));
  bulbs.instanceColor.needsUpdate = true;
  if (winGlow > 0 && !spinning) { winGlow = 0.6 + Math.sin(t * 8) * 0.4; if (Math.floor(t * 8) % 2) drawReels(); }

  // background screens
  screenT -= dt; if (screenT <= 0) { screenT = 0.35; drawScreens(); }
  beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.35; b.rotation.x = Math.cos(t * 0.5 + i) * 0.2; });
  crystals.forEach((c, i) => c.rotation.y = t * (0.08 + i * 0.03));
  stageA.intensity = 45 + Math.sin(t * 3) * 20; stageB.intensity = 45 + Math.cos(t * 2.4) * 20;
  signCasino.material.color.setScalar(t % 7 < 0.12 || (t % 7 > 0.25 && t % 7 < 0.32) ? 0.4 : 2.4);

  // alarm on sell
  if (alarmT > 0) {
    alarmT -= dt; const on = Math.sin(t * 22) > 0;
    alarm.intensity = on ? 18 : 0; beacon.material.color.setRGB(on ? 4 : .4, .2, .3);
    machine.localToWorld(alarm.position.set(0, 2.15, 0.3));
  } else { alarm.intensity = 0; beacon.material.color.setRGB(.4, .1, .15); }
  knobGlow.intensity = 0.4 + Math.sin(t * 3) * 0.3;

  // camera: idle sway + pointer parallax + shake
  shake = Math.max(0, shake - dt);
  const sx = (Math.random() - .5) * shake * 0.08, sy = (Math.random() - .5) * shake * 0.08;
  if (!lever.drag) { par.x += (pointer.x - par.x) * Math.min(1, dt * 1.5); par.y += (pointer.y - par.y) * Math.min(1, dt * 1.5); }
  camera.position.set(camBase.x + Math.sin(t * 0.4) * 0.025 + par.x * 0.05 + sx, camBase.y + Math.sin(t * 0.55) * 0.012 - par.y * 0.02 + sy, camBase.z);
  camera.lookAt(camLook.x + par.x * 0.06, camLook.y - par.y * 0.03, camLook.z);

  // idle behaviour
  if (started) {
    const idle = (performance.now() - lastAct) / 1000;
    if (!spinning && !bannerOn && idle > 16 && idleSaid === 0) { idleSaid = 1; say('croupier', next('idle')); }
    if (!spinning && idle > 34 && idleSaid === 1) { idleSaid = 2; say('croupier', next('idle')); }
    if (!spinning && idle > 50 && idleSaid === 2) { idleSaid = 3; summonGuard(); }
  }

  composer.render();
  requestAnimationFrame(frame);
}

/* =========================================================================
   BOOT
   ========================================================================= */
setIdleReels(); drawMarquee();
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
fontsReady.then(() => { drawReels(); drawMarquee(); signEd; });
loadCharacters().then(() => {
  renderer.compile(scene, camera);
  $('loadtxt').textContent = 'Зал готов'; $('loadfill').style.width = '100%';
  const btn = $('enter'); btn.disabled = false;
}).catch(err => { console.error(err); $('loadtxt').textContent = 'Не удалось загрузить персонажей: ' + err.message; $('enter').disabled = false; });
requestAnimationFrame(frame);

$('enter').addEventListener('click', () => {
  Audio.init(); if (Audio.ctx?.state === 'suspended') Audio.ctx.resume();
  // unlock speech on iOS
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
  $('intro').classList.add('gone'); $('hud').classList.add('on');
  started = true; touch();
  setTimeout(() => say('croupier', next('hello')), 900);
});
$('soundBtn').addEventListener('click', e => { e.stopPropagation(); Audio.init(); Audio.setOn(!Audio.on); $('soundBtn').textContent = Audio.on ? '🔊' : '🔇'; if (!Audio.on) speechSynthesis?.cancel(); });
document.addEventListener('visibilitychange', () => { if (!Audio.ctx) return; document.hidden ? Audio.ctx.suspend() : Audio.ctx.resume(); });
window.__ed = { lever: () => lever, scene, camera, camBase, camLook, croupier: () => croupier, dancers, guests, guard: () => guard, startSpin, say, summonGuard, THREE };

// ══════════════════════════════════════════
//  EXHIBITION: CRT TV  (floater 6 — the white "static" sphere)
// ══════════════════════════════════════════
// A bespoke one-object exhibition: a retro CRT television that scales up in front
// of the player, bobs, shows a faint static glow, and dismisses. Self-contained —
// it talks to the rest of the app only through the imported `core` surface and
// registers itself via core.registerExhibit().
import { core } from '../core.js';

const {
  THREE, scene, isMobile, floaters,
  CRATE_DIST, OPEN_DUR, CLOSE_DUR,
  registerExhibit,
  initTex: _initTex,
  setFloaterVisible: _setFloaterVisible,
  restoreFloater: _restoreExhibitFloater,
  disposeObject3D: _disposeCrateObject,
  setTriggerFloater, beginExhibitDPR, endExhibitDPR, setCD, hidePrompt,
} = core;

const CRT = {
  floaterIdx: 6,    // the white "static" sphere at the front of the room
  _model: null,     // cached THREE.Group — the TV body never changes, build once
  _built: false,
  staticTex: null,  // canvas textures, built once
  grilleTex: null,
  glareTex: null,
  plasticMap: null,
  plasticBump: null,
  ventTex: null,
  badgeTex: null,
  screenMat: null,  // kept so update() can flicker the screen emissive
};

const CRT_SIZE = 2.4;  // overall TV width; every part is a fraction of this
const CRT_Y    = 1.2;  // group-center height — screen sits near eye level
const _crtFwd  = new THREE.Vector3();

let crtPhase = null;   // 'opening' | 'open' | 'closing' | null
let crtT     = 0;
let crtGroup = null;

// Screen emissive layer — RGBA noise with baked-in scanlines + a radial vignette so
// the glow concentrates in the centre and falls off at the edges (reads as a CRT).
// Crawls via offset.y in animate().
function makeCrtStaticTex() {
  const N = 160;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  const img = x.createImageData(N, N);
  const d = img.data;
  const cx = N / 2, cy = N / 2, maxd = Math.hypot(cx, cy);
  for (let yy = 0; yy < N; yy++) {
    for (let xx = 0; xx < N; xx++) {
      let v = 70 + Math.random() * 105;                       // base noise
      if (yy % 2 === 0) v *= 0.55;                            // scanlines
      const vig = Math.max(0, 1 - (Math.hypot(xx - cx, yy - cy) / maxd) * 1.12);
      v *= 0.22 + 0.78 * vig;                                 // dim toward edges
      const i = (yy * N + xx) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Speaker grille — recessed horizontal slats with a top highlight + shadow for depth.
function makeCrtGrilleTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const x = c.getContext('2d');
  x.fillStyle = '#27292d'; x.fillRect(0, 0, 128, 80);
  for (let y = 4; y < 80; y += 8) {
    x.fillStyle = '#06070a'; x.fillRect(0, y, 128, 4);          // slot
    x.fillStyle = 'rgba(120,124,130,0.25)'; x.fillRect(0, y + 4, 128, 1); // lip highlight
  }
  return new THREE.CanvasTexture(c);
}

// Soft angled highlight (a window reflection) in the upper-left of the glass — additive.
function makeCrtGlareTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  x.save();
  x.translate(50, 40); x.rotate(-0.42); x.scale(1.5, 0.62);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 52);
  g.addColorStop(0,   'rgba(255,255,255,0.42)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(-128, -128, 256, 256);
  x.restore();
  return new THREE.CanvasTexture(c);
}

// Moulded-plastic surface: a near-white colour-mottle map (subtle blotches + brushed
// horizontal grain) and a matching grayscale bump map. Kills the flat CAD look.
function makeCrtPlasticTex() {
  const N = 256;
  const mk = (base, spread, grain) => {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d');
    const img = x.createImageData(N, N), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = base + (Math.random() * 2 - 1) * spread;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.globalAlpha = grain;
    x.fillStyle = '#000';
    for (let yy = 0; yy < N; yy += 3) x.fillRect(0, yy, N, 1);   // brushed grain
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
    return t;
  };
  return { map: mk(243, 10, 0.06), bump: mk(126, 26, 0.18) };
}

// Top-vent slots (transparent dark slits laid over the body's top face).
function makeCrtVentTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 80);
  x.fillStyle = 'rgba(0,0,0,0.5)';
  for (let y = 10; y < 70; y += 9) x.fillRect(14, y, 100, 4);
  return new THREE.CanvasTexture(c);
}

// Brand wordmark printed on the control strip.
function makeCrtBadgeTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(196,201,208,0.82)';
  x.font = '700 26px Georgia, "Times New Roman", serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('SKIN DEEP', 128, 34);
  return new THREE.CanvasTexture(c);
}

// Assemble the TV from primitives. The body never changes, so this is built once
// and cached on CRT._model, reused across opens (mirrors VINYL._box).
function _buildCrtTv() {
  const g = new THREE.Group();
  const S  = CRT_SIZE;
  const W  = S, H = S * 0.84, D = S * 0.9;   // body: slightly wider than tall, deep
  const fz = D / 2;                          // front face plane (+Z faces the player)

  // Materials — strong tonal hierarchy so the warm room light can't flatten it:
  // mid-charcoal body, near-black glossy bezel frame, very dark glass.
  // Body kept genuinely dark so it reads as charcoal plastic (not blown to cream) under
  // the bright warm orb light, matching the reference set.
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.76, metalness: 0.04, map: CRT.plasticMap, bumpMap: CRT.plasticBump, bumpScale: 0.02 });
  // No colour map on the bezel — a near-white mottle map would lift it; we want it to
  // stay near-black under the bright warm room light so it frames the screen.
  const bezelMat  = new THREE.MeshStandardMaterial({ color: 0x070709, roughness: 0.5, metalness: 0.04, bumpMap: CRT.plasticBump, bumpScale: 0.012 });
  const lipMat    = new THREE.MeshStandardMaterial({ color: 0x303338, roughness: 0.55, metalness: 0.08 });
  const knobMat   = new THREE.MeshStandardMaterial({ color: 0x34363c, roughness: 0.32, metalness: 0.18 });
  const knobBaseMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.6, metalness: 0.05 });
  const notchMat  = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.6, metalness: 0.0 });
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0x3b3e44, roughness: 0.45, metalness: 0.1 });
  const grilleMat = new THREE.MeshStandardMaterial({ map: CRT.grilleTex, roughness: 0.85, metalness: 0.0 });
  const badgeMat  = new THREE.MeshBasicMaterial({ map: CRT.badgeTex, transparent: true, depthWrite: false });
  const ventMat   = new THREE.MeshBasicMaterial({ map: CRT.ventTex, transparent: true, depthWrite: false });
  const ledMat    = new THREE.MeshStandardMaterial({ color: 0x2a1402, roughness: 0.4, emissive: 0xff8a24, emissiveIntensity: 1.7 });
  const backingMat = new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.5, metalness: 0.0 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x070f0c, roughness: 0.1, metalness: 0.22,
    emissive: 0x2b4a3a, emissiveMap: CRT.staticTex, emissiveIntensity: 0.45,
  });
  const glareMat  = new THREE.MeshBasicMaterial({
    map: CRT.glareTex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.5,
  });
  CRT.screenMat = screenMat;

  // Body shell
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMat);
  g.add(body);

  // ── Screen ── centred a little above middle, framed by a near-black bezel.
  const scY    = H * 0.11;
  const openW  = W * 0.61, openH = openW * 0.77;  // ~4:3 opening
  const frameT = 0.14;
  const glassW = openW + 0.10, glassH = openH + 0.10;

  // Dark backing behind the glass so the recess never shows through to the body.
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(openW * 1.04, openH * 1.04), backingMat);
  backing.position.set(0, scY, fz - 0.05);
  g.add(backing);

  // Convex glass — a shallow spherical cap oriented to bulge toward the player.
  const capR = S * 1.6, capTheta = 0.22;
  const screenGeo = new THREE.SphereGeometry(capR, 36, 24, 0, Math.PI * 2, 0, capTheta);
  screenGeo.rotateX(Math.PI / 2);     // pole +Y -> +Z (face the player)
  screenGeo.translate(0, 0, -capR);   // bring the cap apex to the origin
  const rim = capR * Math.sin(capTheta);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.scale.set((glassW / 2) / rim, (glassH / 2) / rim, 1);
  screen.position.set(0, scY, fz + 0.06);
  g.add(screen);

  // Soft glare in front of the glass
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(glassW * 0.9, glassH * 0.9), glareMat);
  glare.position.set(0, scY, fz + 0.1);
  glare.renderOrder = 3;
  g.add(glare);

  // Bezel frame — four near-black bars around the opening, proud of the body front.
  const bezelMeshes = [
    [openW + 2 * frameT, frameT, 0,                       scY + openH / 2 + frameT / 2],  // top
    [openW + 2 * frameT, frameT, 0,                       scY - openH / 2 - frameT / 2],  // bottom
    [frameT, openH,             -(openW / 2 + frameT / 2), scY],                           // left
    [frameT, openH,              (openW / 2 + frameT / 2), scY],                           // right
  ];
  bezelMeshes.forEach(([bw, bh, bx, by]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.08), bezelMat);
    bar.position.set(bx, by, fz + 0.03);
    g.add(bar);
  });

  // Thin lighter lip just inside the bezel — the plastic edge that catches light.
  const lipT = 0.022;
  [[openW + lipT * 2, lipT, 0, scY + openH / 2 + lipT / 2],
   [openW + lipT * 2, lipT, 0, scY - openH / 2 - lipT / 2],
   [lipT, openH, -(openW / 2 + lipT / 2), scY],
   [lipT, openH,  (openW / 2 + lipT / 2), scY]].forEach(([lw, lh, lx, ly]) => {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, 0.05), lipMat);
    lip.position.set(lx, ly, fz + 0.075);
    g.add(lip);
  });

  // ── Control strip (below the bezel) ──
  // Speaker grille, left
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.30, H * 0.20), grilleMat);
  grille.position.set(-W * 0.27, -H * 0.35, fz + 0.006);
  g.add(grille);

  // Brand badge, centred under the screen
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.24, W * 0.06), badgeMat);
  badge.position.set(W * 0.03, -H * 0.27, fz + 0.007);
  g.add(badge);

  // Knobs / dials, right — base ring + dial + indicator notch (protrude along +Z)
  const r = S * 0.04;
  const knobGeo = new THREE.CylinderGeometry(r, r * 0.92, 0.055, 24);
  const baseGeo = new THREE.CylinderGeometry(r * 1.28, r * 1.28, 0.025, 24);
  const notchGeo = new THREE.BoxGeometry(0.012, r * 0.72, 0.02);
  [0.20, 0.33].forEach(kx => {
    const base = new THREE.Mesh(baseGeo, knobBaseMat);
    base.rotation.x = Math.PI / 2; base.position.set(W * kx, -H * 0.32, fz + 0.028);
    g.add(base);
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.rotation.x = Math.PI / 2; knob.position.set(W * kx, -H * 0.32, fz + 0.05);
    g.add(knob);
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(W * kx, -H * 0.32 + r * 0.45, fz + 0.082);
    g.add(notch);
  });

  // Power LED
  const led = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), ledMat);
  led.rotation.x = Math.PI / 2; led.position.set(W * 0.13, -H * 0.30, fz + 0.03);
  g.add(led);

  // Small buttons, lower right
  const btnGeo = new THREE.BoxGeometry(W * 0.05, H * 0.028, 0.03);
  [0.16, 0.26, 0.36].forEach(bx => {
    const btn = new THREE.Mesh(btnGeo, buttonMat);
    btn.position.set(W * bx, -H * 0.45, fz + 0.02);
    g.add(btn);
  });

  // Top vents
  const vents = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.5, D * 0.34), ventMat);
  vents.rotation.x = -Math.PI / 2;
  vents.position.set(0, H / 2 + 0.002, -D * 0.16);
  g.add(vents);

  // Feet, bottom corners (dark rubber)
  const footMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8, metalness: 0.0 });
  const footGeo = new THREE.BoxGeometry(W * 0.07, H * 0.06, D * 0.07);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(sx * (W / 2 - W * 0.09), -H / 2 - H * 0.03, sz * (D / 2 - D * 0.09));
    g.add(foot);
  });

  return g;
}

// Build the canvas textures + cache the model once (mirrors _buildVinylAssets).

function _buildCrtAssets() {
  if (CRT._built) return;
  CRT.staticTex = makeCrtStaticTex(); _initTex(CRT.staticTex);
  CRT.grilleTex = makeCrtGrilleTex(); _initTex(CRT.grilleTex);
  CRT.glareTex  = makeCrtGlareTex();  _initTex(CRT.glareTex);
  const plastic = makeCrtPlasticTex();
  CRT.plasticMap  = plastic.map;  _initTex(CRT.plasticMap);
  CRT.plasticBump = plastic.bump; _initTex(CRT.plasticBump);
  CRT.ventTex  = makeCrtVentTex();  _initTex(CRT.ventTex);
  CRT.badgeTex = makeCrtBadgeTex(); _initTex(CRT.badgeTex);
  CRT._model = _buildCrtTv();
  CRT._built = true;
}

function _openCrt(px, pz, openYaw) {
  if (crtPhase) return;
  _buildCrtAssets();
  beginExhibitDPR();

  const fl = floaters[CRT.floaterIdx];
  setTriggerFloater(fl);
  _setFloaterVisible(fl, false);

  crtPhase = 'opening';
  crtT     = 0;
  crtGroup = new THREE.Group();
  _crtFwd.set(Math.sin(openYaw), 0, Math.cos(openYaw));
  crtGroup.position.set(px + _crtFwd.x * CRATE_DIST, CRT_Y, pz + _crtFwd.z * CRATE_DIST);
  crtGroup.rotation.y = openYaw + Math.PI;   // face the player
  scene.add(crtGroup);

  // The cached model is detached (not disposed) on close, so it survives across opens.
  crtGroup.add(CRT._model);
  crtGroup.userData.model = CRT._model;
  crtGroup.scale.setScalar(0.04);
}

function _closeCrt() {
  if (crtGroup) {
    if (crtGroup.userData.model) crtGroup.remove(crtGroup.userData.model); // keep the cached model
    _disposeCrateObject(crtGroup);
    scene.remove(crtGroup);
    crtGroup = null;
  }
  crtPhase = null;
  crtT     = 0;
  endExhibitDPR();
  _restoreExhibitFloater();
  setCD(0.6);
}

function _dismissCrt() {
  if (!crtPhase || crtPhase === 'closing') return;
  crtPhase = 'closing';
  crtT = 1;
  _restoreExhibitFloater();
}

registerExhibit({
  id: 'crt-tv',
  floater: CRT.floaterIdx,
  open: (px, pz, yaw) => _openCrt(px, pz, yaw),
  isActive: () => !!crtPhase,
  dismiss: () => _dismissCrt(),
  update(ctx) {
    // Escape (desktop) or tap (mobile) dismisses, same as walking out of radius.
    if (ctx.escEdge && ctx.iCD <= 0 && crtPhase && crtPhase !== 'closing') {
      _dismissCrt(); hidePrompt(); ctx.setCD(0.3);
    } else if (ctx.eEdge && isMobile && ctx.iCD <= 0 && crtPhase === 'open') {
      _dismissCrt(); hidePrompt(); ctx.setCD(0.3);
    }
    // Open / close scale animation
    if (crtPhase === 'opening') {
      crtT = Math.min(1, crtT + ctx.dt / OPEN_DUR);
      const s = crtT * crtT * (3 - 2 * crtT);
      if (crtGroup) crtGroup.scale.setScalar(0.04 + s * 0.96);
      if (crtT >= 1) crtPhase = 'open';
    } else if (crtPhase === 'closing') {
      crtT = Math.max(0, crtT - ctx.dt / CLOSE_DUR);
      const s = crtT * crtT * (3 - 2 * crtT);
      if (crtGroup) crtGroup.scale.setScalar(0.04 + s * 0.96);
      if (crtT <= 0) _closeCrt();
    }
    if (crtGroup) crtGroup.position.y = CRT_Y + Math.sin(ctx.t * 1.4) * 0.03;
    // Faint static glow — one scalar nudge + a cheap texture crawl (no array writes)
    if (CRT.screenMat) CRT.screenMat.emissiveIntensity = 0.5 + Math.sin(ctx.t * 40) * 0.12 + Math.sin(ctx.t * 7.3) * 0.06;
    if (CRT.staticTex) CRT.staticTex.offset.y = (ctx.t * 0.6) % 1;
  },
});

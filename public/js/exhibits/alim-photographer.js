// ══════════════════════════════════════════
//  EXHIBITION: Mohammed Alim — Photographer  (floater 1 — photo carousel)
// ══════════════════════════════════════════
// A photo-carousel exhibition: a data file that builds its info card and registers
// with the shared carousel engine in core (see js/core.js → registerPhotoExhibit).
// Self-contained — edit this file to change this exhibit's photos or card without
// touching core or any other exhibition.
import { core, registerPhotoExhibit } from '../core.js';
const { THREE } = core;

function makePhotographerCardTex() {
  const W = 512, H = 384;
  // Supersample so the text stays crisp when the card is brought to full-screen
  // focus. matchMedia is queried inline because this builds before `isMobile`.
  const SS = window.matchMedia('(pointer: coarse)').matches ? 2 : 3; // 1024 / 1536 px
  const cv = document.createElement('canvas');
  cv.width = W * SS; cv.height = H * SS;
  const ctx = cv.getContext('2d');
  ctx.scale(SS, SS);

  // Background
  ctx.fillStyle = 'rgb(4,2,1)';
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vg = ctx.createRadialGradient(W/2, H/2, 40, W/2, H/2, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  const BM = 14;
  ctx.strokeStyle = 'rgba(255,200,100,0.32)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(BM, BM, W - BM*2, H - BM*2);

  // Inner ghost border
  ctx.strokeStyle = 'rgba(255,200,100,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(BM+4, BM+4, W-BM*2-8, H-BM*2-8);

  // Corner accents
  const CL = 28, F = BM;
  ctx.shadowColor = 'rgba(255,220,120,1)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255,240,160,0.9)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(F+CL,F);   ctx.lineTo(F,F);   ctx.lineTo(F,F+CL);   ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-F-CL,F); ctx.lineTo(W-F,F); ctx.lineTo(W-F,F+CL); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-F,H-F-CL); ctx.lineTo(W-F,H-F); ctx.lineTo(W-F-CL,H-F); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(F+CL,H-F); ctx.lineTo(F,H-F); ctx.lineTo(F,H-F-CL); ctx.stroke();
  ctx.shadowBlur = 0;

  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // "PHOTOGRAPHER" label — spaced manually for canvas compat
  ctx.fillStyle = 'rgba(255,200,100,0.42)';
  ctx.font = '400 11px Georgia, serif';
  ctx.fillText('P H O T O G R A P H E R', cx, 74);

  // Name
  ctx.fillStyle = 'rgba(255,238,175,0.98)';
  ctx.font = '400 30px Georgia, serif';
  ctx.shadowColor = 'rgba(255,200,80,0.18)';
  ctx.shadowBlur = 14;
  ctx.fillText('Mohammed Alim', cx, 126);
  ctx.shadowBlur = 0;

  // Name divider
  ctx.strokeStyle = 'rgba(255,200,100,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 130, 146); ctx.lineTo(cx + 130, 146);
  ctx.stroke();

  // Bio
  ctx.fillStyle = 'rgba(255,210,135,0.68)';
  ctx.font = '400 15px Georgia, serif';
  ctx.fillText('Documents Islamic architecture', cx, 184);
  ctx.fillText('& the lived colour of faith', cx, 207);
  ctx.fillText('across Southeast Asia.', cx, 230);

  // Awards
  ctx.fillStyle = 'rgba(255,200,100,0.52)';
  ctx.font = '400 12px Georgia, serif';
  ctx.fillText('★  reFocus 2025 Gold  ·  Unsplash 2025', cx, 278);

  // Award divider
  ctx.strokeStyle = 'rgba(255,200,100,0.14)';
  ctx.beginPath();
  ctx.moveTo(cx - 90, 298); ctx.lineTo(cx + 90, 298);
  ctx.stroke();

  // Handle — Instagram glyph + a live link to the profile, with a prompt; clickable while focused
  const HANDLE = '@apyfz', HANDLE_URL = 'https://instagram.com/apyfz';
  const hotspot = core.instagramLink(ctx, { handle: HANDLE, url: HANDLE_URL, cx, y: 328, W, H });

  const tex = new THREE.CanvasTexture(cv);
  tex.userData = tex.userData || {}; // fresh textures can have undefined userData in this Three build
  tex.userData.hotspots = [hotspot];
  return tex;
}

registerPhotoExhibit({
  id: 'alim-photographer',
  floater: 1,
  paths: [
    'images/alim/alim-ZLwk24PZFO8-unsplash.jpg',
    'images/alim/alim-4heeT54_4U0-unsplash.jpg',
    'images/alim/alim-xO4ul401gSQ-unsplash.jpg',
    'images/alim/alim-jiW2VlctJk0-unsplash.jpg',
    'images/alim/alim-V1Ii_Nq1k8o-unsplash.jpg',
  ],
  cardTex: makePhotographerCardTex, // factory — built lazily by core (off the import path)
});

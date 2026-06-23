// ══════════════════════════════════════════
//  EXHIBITION: The Masjid Uncles  (floater 2 — photo carousel)
// ══════════════════════════════════════════
// A photo-carousel exhibition: a data file that builds its info card and registers
// with the shared carousel engine in core (see js/core.js → registerPhotoExhibit).
// Self-contained — edit this file to change this exhibit's photos or card without
// touching core or any other exhibition.
import { core, registerPhotoExhibit } from '../core.js';
const { THREE } = core;

function makeMasjidUnclesCardTex() {
  // Mobile: a tall portrait card that fills the phone screen at focus (the landscape card below
  // reads tiny there). Same content, laid out vertically by the shared core renderer.
  if (window.matchMedia('(pointer: coarse)').matches) return core.buildInfoCardPortrait({
    kicker: 'P H O T O   E S S A Y',
    title: ['The Masjid Uncles', 'of the Front Row'],
    titleSize: 38,
    byline: 'Afzal Khan & Saif Khan',
    body: ['Portraits of the elders who', 'claim the front row, the', 'spiritual heart of the masjid.'],
    credits: 'Practising Empathy in Mirrors  ·  Studio Teski',
    handles: [
      { handle: '@peim786',     url: 'https://instagram.com/peim786' },
      { handle: '@studioteski', url: 'https://instagram.com/studioteski' },
    ],
    links: [
      { label: 'STAT Magazine', url: 'https://statmagazine.org/the-masjid-uncles-of-the-front-row/' },
      { label: 'Buy a print',   url: 'https://peim786.bigcartel.com/product/the-masjid-uncles-of-the-front-row' },
    ],
  });

  const W = 512, H = 384;
  const SS = window.matchMedia('(pointer: coarse)').matches ? 2 : 3; // 1024 / 1536 px — crisp at focus fill
  const cv = document.createElement('canvas');
  cv.width = W * SS; cv.height = H * SS;
  const ctx = cv.getContext('2d');
  ctx.scale(SS, SS);

  ctx.fillStyle = 'rgb(4,2,1)';
  ctx.fillRect(0, 0, W, H);

  const vg = ctx.createRadialGradient(W/2, H/2, 40, W/2, H/2, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  const BM = 14;
  ctx.strokeStyle = 'rgba(255,200,100,0.32)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(BM, BM, W - BM*2, H - BM*2);

  ctx.strokeStyle = 'rgba(255,200,100,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(BM+4, BM+4, W-BM*2-8, H-BM*2-8);

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

  ctx.fillStyle = 'rgba(255,200,100,0.42)';
  ctx.font = '400 11px Georgia, serif';
  ctx.fillText('P H O T O   E S S A Y', cx, 62);

  ctx.fillStyle = 'rgba(255,238,175,0.98)';
  ctx.font = '400 22px Georgia, serif';
  ctx.shadowColor = 'rgba(255,200,80,0.18)';
  ctx.shadowBlur = 14;
  ctx.fillText('The Masjid Uncles', cx, 98);
  ctx.fillText('of the Front Row', cx, 124);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,200,100,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 130, 138); ctx.lineTo(cx + 130, 138);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,220,150,0.82)';
  ctx.font = '400 14px Georgia, serif';
  ctx.fillText('Afzal Khan & Saif Khan', cx, 162);

  ctx.fillStyle = 'rgba(255,210,135,0.68)';
  ctx.font = '400 14px Georgia, serif';
  ctx.fillText('Portraits of the elders who', cx, 196);
  ctx.fillText('claim the front row, the', cx, 216);
  ctx.fillText('spiritual heart of the masjid.', cx, 236);

  ctx.fillStyle = 'rgba(255,200,100,0.52)';
  ctx.font = '400 11px Georgia, serif';
  ctx.fillText('Practising Empathy in Mirrors  ·  Studio Teski', cx, 278);

  ctx.strokeStyle = 'rgba(255,200,100,0.14)';
  ctx.beginPath();
  ctx.moveTo(cx - 110, 290); ctx.lineTo(cx + 110, 290);
  ctx.stroke();

  // Two paired rows of live links (each clickable while the card is focused): the Instagram
  // profiles, then the STAT Magazine feature + the print shop. Each item is a glyph + link-bright
  // label drawn left-aligned around a centred block, so each gets its own hotspot + underline;
  // a single prompt sits beneath both rows. textAlign is restored to centre afterwards.
  const SEP = '  ·  ';
  const GS = 13, GAP = 6;                  // glyph side + glyph→text gap
  ctx.font = '400 12px Georgia, serif';
  const wS = ctx.measureText(SEP).width;

  const drawItem = (item, leftX, y) => {   // glyph + link-bright label + underline; returns hotspot
    const w = ctx.measureText(item.label).width;
    if (item.kind === 'web') core.drawGlobeGlyph(ctx, leftX + GS / 2, y - 4, GS, 'rgba(255,214,130,0.82)');
    else core.drawInstagramGlyph(ctx, leftX + GS / 2, y - 4, GS, 'rgba(255,214,130,0.82)');
    const tx = leftX + GS + GAP;
    ctx.fillStyle = 'rgba(255,214,130,0.72)';
    ctx.fillText(item.label, tx, y);
    ctx.strokeStyle = 'rgba(255,200,100,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, y + 4); ctx.lineTo(tx + w, y + 4); ctx.stroke();
    const PADX = 9, PADT = 15, PADB = 7;
    return {
      u0: (leftX - PADX) / W, u1: (tx + w + PADX) / W,
      v0: 1 - (y + PADB) / H, v1: 1 - (y - PADT) / H, url: item.url,
    };
  };

  const drawPairRow = (a, b, y) => {       // two items + separator, centred as one block at baseline y
    ctx.font = '400 12px Georgia, serif';
    ctx.textAlign = 'left';
    const wa = ctx.measureText(a.label).width, wb = ctx.measureText(b.label).width;
    const sa = GS + GAP + wa, sb = GS + GAP + wb;
    let x = cx - (sa + wS + sb) / 2;
    const ha = drawItem(a, x, y); x += sa;
    ctx.fillStyle = 'rgba(255,200,100,0.38)';
    ctx.fillText(SEP, x, y); x += wS;
    const hb = drawItem(b, x, y);
    ctx.textAlign = 'center';
    return [ha, hb];
  };

  const igRow = drawPairRow(
    { kind: 'ig', label: '@peim786',     url: 'https://instagram.com/peim786' },
    { kind: 'ig', label: '@studioteski', url: 'https://instagram.com/studioteski' },
    312,
  );
  const siteRow = drawPairRow(
    { kind: 'web', label: 'STAT Magazine', url: 'https://statmagazine.org/the-masjid-uncles-of-the-front-row/' },
    { kind: 'web', label: 'Buy a print',   url: 'https://peim786.bigcartel.com/product/the-masjid-uncles-of-the-front-row' },
    336,
  );

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,200,100,0.4)';
  ctx.font = '400 9px Georgia, serif';
  ctx.fillText(window.matchMedia('(pointer: coarse)').matches
    ? 'Tap a link to open' : 'Click a link to open', cx, 356);

  const tex = new THREE.CanvasTexture(cv);
  tex.userData = tex.userData || {}; // fresh textures can have undefined userData in this Three build
  tex.userData.hotspots = [...igRow, ...siteRow];
  return tex;
}

registerPhotoExhibit({
  id: 'masjid-uncles',
  floater: 2,
  paths: [
    'images/webp/PICT0002-1.webp',
    'images/webp/PICT0015.webp',
    'images/webp/PICT0017-1.webp',
    'images/webp/PICT0026-1.webp',
    'images/webp/fde-1.webp',
  ],
  cardTex: makeMasjidUnclesCardTex, // factory — built lazily by core (off the import path)
});

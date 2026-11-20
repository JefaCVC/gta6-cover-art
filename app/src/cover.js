// The poster engine: draws the whole GTA-style cover onto a canvas at any size.
// One function, renderPoster, takes the app state and paints: the outer frame, the
// quote bar, the multi-panel collage (photos, code-drawn art, or placeholders), the
// designed backdrop band (skyline, retro sun, palm silhouettes, perspective grid),
// the chrome title with its script subtitle and tagline ribbon, and the full furniture
// kit (seal, volume tag, WANTED pill, billing block, barcode, COMING SOON).
//
// Every piece of text is measured against its box before it is drawn: the title
// shrinks to fit its width, the quote shrinks to fit its line, tag plates shrink to
// fit their panel, and nothing is allowed to run past its edge.

import { GRADES, gradeFilter } from './grades.js';
import { layoutPanels } from './layouts.js';
import { drawArt } from './art.js';

export const SIZES = {
  '1x1': { w: 1080, h: 1080, label: '1080 x 1080', note: 'Square post' },
  '4x5': { w: 1080, h: 1350, label: '1080 x 1350', note: 'Portrait post' },
  '16x9': { w: 1920, h: 1080, label: '1920 x 1080', note: 'Wide banner' },
  '9x16': { w: 1080, h: 1920, label: '1080 x 1920', note: 'Story' },
};

export const SIZE_ORDER = ['1x1', '4x5', '16x9', '9x16'];

export const TITLE_STYLES = {
  chrome: 'Chrome striped',
  solid: 'Solid block',
  neon: 'Neon tube',
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shrinks `size` until `text` fits `maxWidth` in the given font. Returns the size. */
function fitFont(ctx, text, fontOf, maxWidth, startSize, minSize) {
  let size = startSize;
  ctx.font = fontOf(size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(1, size * 0.04);
    ctx.font = fontOf(size);
  }
  return size;
}

function starPath(ctx, cx, cy, r, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function starburstPath(ctx, cx, cy, r, points = 12) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Four-point sparkle glint. */
function sparkle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r);
  ctx.fill();
}

/** Moves each polygon point toward the centroid by `px` pixels. */
function insetPoly(poly, px) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy) || 1;
    return [x - (dx / d) * px, y - (dy / d) * px];
  });
}

function polyPath(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function polyBounds(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

// Cached halftone + grain tiles, built once per scale.
const tileCache = new Map();
function halftoneTile(spacing, dotR) {
  const key = `h${spacing}x${dotR}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = document.createElement('canvas');
  c.width = spacing * 2;
  c.height = spacing * 2;
  const g = c.getContext('2d');
  g.fillStyle = '#000000';
  const dot = (x, y) => {
    g.beginPath();
    g.arc(x, y, dotR, 0, Math.PI * 2);
    g.fill();
  };
  dot(0, 0);
  dot(spacing, spacing);
  dot(spacing * 2, 0);
  dot(0, spacing * 2);
  dot(spacing * 2, spacing * 2);
  tileCache.set(key, c);
  return c;
}

function grainTile(size) {
  const key = `g${size}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(1234567);
  for (let i = 0; i < size * size * 0.5; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.5})`;
    g.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
  }
  tileCache.set(key, c);
  return c;
}

/** Draws one panel's picture (photo or art) clipped to its polygon. */
function drawPanelPicture(ctx, panel, photo, grade, sliders, seed) {
  const poly = panel.poly;
  const bb = polyBounds(poly);
  ctx.save();
  polyPath(ctx, poly);
  ctx.clip();
  if (photo && photo.img) {
    const img = photo.img;
    const gradeForPanel = panel.grade && GRADES[panel.grade] ? GRADES[panel.grade] : grade;
    const strength = sliders.grade / 100;
    const scale = Math.max(bb.w / img.naturalWidth, bb.h / img.naturalHeight) * (panel.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const cx = bb.x + bb.w / 2 + (panel.panX || 0) * bb.w;
    const cy = bb.y + bb.h / 2 + (panel.panY || 0) * bb.h;
    ctx.save();
    ctx.translate(cx, cy);
    if (panel.rotate) ctx.rotate((panel.rotate * Math.PI) / 180);
    if (panel.flip) ctx.scale(-1, 1);
    ctx.filter = gradeFilter(gradeForPanel, strength);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    ctx.filter = 'none';
    // Colour wash in the grade's palette.
    if (gradeForPanel.wash.alpha > 0 && strength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = gradeForPanel.wash.mode;
      ctx.globalAlpha = gradeForPanel.wash.alpha * strength * 2;
      ctx.fillStyle = gradeForPanel.wash.color;
      ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
      ctx.restore();
    }
  } else if (panel.art) {
    drawArt(ctx, panel.art, bb, grade, seed);
  } else {
    // Placeholder: gradient + palm silhouette + a quiet label.
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x, bb.y + bb.h);
    g.addColorStop(0, grade.band.skyTop);
    g.addColorStop(1, grade.band.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const size = fitFont(ctx, 'ADD A PHOTO', (s) => `700 ${s}px Arial, sans-serif`, bb.w * 0.8, bb.h * 0.09, 8);
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', bb.x + bb.w / 2, bb.y + bb.h / 2);
  }
  // Halftone dots.
  const ht = (sliders.halftone / 100) * 0.9 + grade.halftone * 0.25;
  if (ht > 0.02) {
    const spacing = Math.max(6, bb.w * 0.016);
    const tile = halftoneTile(Math.round(spacing), Math.max(0.8, spacing * 0.22));
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, ht * 0.4);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
  }
  ctx.restore();
}

/** Draws a panel's tag plate (role or place) at its anchor, fitted inside the panel. */
function drawPanelTag(ctx, panel, grade, unit) {
  const bb = polyBounds(panel.poly);
  const mode = panel.tagMode || 'role';
  if (mode === 'none') return;
  const inset = unit * 0.9;
  const ax = panel.tag[0] + inset;
  const ay = panel.tag[1] - inset;
  const maxW = bb.w * 0.86;
  ctx.save();
  if (mode === 'role') {
    const text = (panel.role || 'THE CREW').toUpperCase();
    const size = fitFont(ctx, text, (s) => `700 ${s}px Arial, sans-serif`, maxW - unit * 2.4, unit * 1.55, 7);
    ctx.font = `700 ${size}px Arial, sans-serif`;
    const tw = ctx.measureText(text).width;
    const pw = tw + unit * 2.2;
    const ph = size * 1.9;
    const slant = unit * 0.8;
    ctx.fillStyle = grade.tagBg;
    ctx.beginPath();
    ctx.moveTo(ax + slant, ay - ph);
    ctx.lineTo(ax + pw, ay - ph);
    ctx.lineTo(ax + pw - slant, ay);
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = grade.accent;
    ctx.fillRect(ax, ay - ph, unit * 0.35, ph);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, ax + unit * 1.2, ay - ph / 2 + size * 0.05);
  } else {
    const place = (panel.place || 'OCEAN DRIVE').toUpperCase();
    const sub = `${panel.time || '6:42 PM'} · ${(panel.flavor || 'LOOKING FOR TROUBLE').toUpperCase()}`;
    const size = fitFont(ctx, place, (s) => `700 ${s}px Arial, sans-serif`, maxW - unit * 2, unit * 1.35, 7);
    ctx.font = `700 ${size}px Arial, sans-serif`;
    const w1 = ctx.measureText(place).width;
    const subSize = size * 0.72;
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    let subText = sub;
    while (ctx.measureText(subText).width > maxW - unit * 2 && subText.length > 4) {
      subText = subText.slice(0, -4) + '…';
    }
    const w2 = ctx.measureText(subText).width;
    const pw = Math.max(w1, w2) + unit * 2;
    const ph = size * 1.5 + subSize * 1.6 + unit * 0.9;
    ctx.fillStyle = 'rgba(8, 4, 12, 0.88)';
    ctx.beginPath();
    ctx.roundRect(ax, ay - ph, pw, ph, unit * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.fillText(place, ax + unit, ay - ph + unit * 0.45);
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(subText, ax + unit, ay - ph + unit * 0.45 + size * 1.5);
  }
  ctx.restore();
}

/** The designed backdrop band behind the title: sky, retro sun, skyline, palms, grid floor. */
function drawBackdropBand(ctx, band, grade, W, H) {
  const b = grade.band;
  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  g.addColorStop(0, b.skyTop);
  g.addColorStop(0.5, b.skyMid);
  g.addColorStop(1, b.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  // Retro sun, right of centre, half sunk behind the skyline.
  const sunR = band.h * 0.42;
  const sunX = band.x + band.w * 0.74;
  const sunY = band.y + band.h * 0.62;
  const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sg.addColorStop(0, b.sunCore);
  sg.addColorStop(1, b.sun);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = b.skyBottom;
  let yy = sunY + sunR * 0.05;
  let th = sunR * 0.06;
  while (yy < sunY + sunR) {
    ctx.fillRect(sunX - sunR, yy, sunR * 2, th);
    yy += th * 2.6;
    th *= 1.4;
  }
  ctx.restore();
  // Skyline silhouette along the band's lower third.
  const rnd = mulberry32(987654321);
  const baseY = band.y + band.h * 0.86;
  let bx = band.x;
  while (bx < band.x + band.w) {
    const bw = band.w * (0.03 + rnd() * 0.045);
    const bh = band.h * (0.12 + rnd() * 0.3);
    ctx.fillStyle = b.skyline;
    ctx.fillRect(bx, baseY - bh, bw, bh);
    if (bh > band.h * 0.3 && rnd() > 0.5) {
      ctx.fillRect(bx + bw / 2 - 1, baseY - bh - band.h * 0.06, 2, band.h * 0.06);
    }
    ctx.fillStyle = b.sun;
    const wins = Math.floor(bw / (band.w * 0.012));
    for (let i = 0; i < wins; i++) {
      if (rnd() < 0.3) ctx.fillRect(bx + bw * 0.2 + i * (bw * 0.6 / Math.max(1, wins)), baseY - bh * (0.3 + rnd() * 0.6), 2, 2);
    }
    bx += bw + band.w * 0.006;
  }
  // Palm silhouettes at the band edges.
  const palmAt = (px, s, lean) => {
    ctx.strokeStyle = b.palm;
    ctx.fillStyle = b.palm;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.lineCap = 'round';
    const topX = px + lean * s;
    const topY = baseY - s;
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.quadraticCurveTo(px + lean * s * 0.3, baseY - s * 0.55, topX, topY);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (-160 + i * 26) * (Math.PI / 180);
      const len = s * (0.42 + (i % 3) * 0.07);
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.6,
        topY + Math.sin(a) * len * 0.55 - s * 0.08,
        topX + Math.cos(a) * len,
        topY + Math.sin(a) * len + s * 0.22,
      );
      ctx.stroke();
    }
  };
  palmAt(band.x + band.w * 0.06, band.h * 0.42, 0.25);
  palmAt(band.x + band.w * 0.95, band.h * 0.5, -0.25);
  // Perspective grid floor.
  const horizonY = baseY;
  const floorH = band.y + band.h - horizonY;
  ctx.fillStyle = 'rgba(5, 2, 10, 0.55)';
  ctx.fillRect(band.x, horizonY, band.w, floorH);
  ctx.strokeStyle = b.grid;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, band.h * 0.008);
  const vpx = band.x + band.w * 0.5;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(vpx, horizonY);
    ctx.lineTo(vpx + i * band.w * 0.09, band.y + band.h);
    ctx.stroke();
  }
  let fy = horizonY + floorH * 0.08;
  let step = floorH * 0.08;
  while (fy < band.y + band.h) {
    ctx.beginPath();
    ctx.moveTo(band.x, fy);
    ctx.lineTo(band.x + band.w, fy);
    ctx.stroke();
    step *= 1.6;
    fy += step;
  }
  ctx.globalAlpha = 1;
  // Frame lines top and bottom of the band.
  ctx.fillStyle = grade.frame;
  ctx.fillRect(band.x, band.y, band.w, Math.max(2, H * 0.0025));
  ctx.fillRect(band.x, band.y + band.h - Math.max(2, H * 0.0025), band.w, Math.max(2, H * 0.0025));
  ctx.restore();
}

/** Splits a title into one or two balanced lines. */
function splitTitle(title) {
  const words = title.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(' ')];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (!best || diff < best.diff) best = { lines: [a, b], diff };
  }
  return best.lines;
}

/**
 * Draws the chrome title block (title + script subtitle + tagline ribbon) over the
 * backdrop band. Returns the title's bounding box for the editor's drag handle.
 */
function drawTitleBlock(ctx, state, grade, band, W, H, unit) {
  const title = (state.title || 'GOLDEN TIDE').trim() || 'GOLDEN TIDE';
  const lines = splitTitle(title);
  const maxW = W * 0.92;
  const titleH = band.h * 0.6;
  const lineH = titleH / lines.length;
  let size = lineH * 1.05;
  ctx.font = `${size}px Anton, sans-serif`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxW) size *= maxW / widest;
  size = Math.max(size, H * 0.03);
  const lineHeight = size * 0.98;
  const blockH = lineHeight * lines.length;
  const ox = (state.titleOffset?.x || 0) * W;
  const oy = (state.titleOffset?.y || 0) * H;
  const titleTop = band.y + band.h * 0.05 + oy;
  const cx = W / 2 + ox;
  const style = state.titleStyle || 'chrome';
  const shadowDx = size * 0.045;
  const shadowDy = size * 0.055;

  // Glow behind the title.
  const glow = state.sliders.glow / 100;
  if (glow > 0.02) {
    const rg = ctx.createRadialGradient(cx, titleTop + blockH / 2, 0, cx, titleTop + blockH / 2, maxW * 0.55);
    rg.addColorStop(0, grade.scriptGlow + '33');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = rg;
    ctx.fillRect(0, titleTop - blockH * 0.3, W, blockH * 1.6);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  if (style === 'chrome') {
    // Offscreen glyph canvas: gradient fill + horizontal stripes clipped to the glyphs.
    const off = document.createElement('canvas');
    off.width = Math.ceil(W);
    off.height = Math.ceil(blockH + size * 0.3);
    const oc = off.getContext('2d');
    oc.textAlign = 'center';
    oc.textBaseline = 'top';
    oc.font = `${size}px Anton, sans-serif`;
    const grad = oc.createLinearGradient(0, 0, 0, blockH);
    for (const [o, c] of grade.titleStops) grad.addColorStop(o, c);
    oc.fillStyle = grad;
    lines.forEach((line, i) => oc.fillText(line, cx, i * lineHeight));
    // Stripes: thin darker bands across the glyphs.
    oc.globalCompositeOperation = 'source-atop';
    const stripeH = Math.max(1.5, size * 0.045);
    const gap = size * 0.16;
    oc.fillStyle = 'rgba(20, 4, 30, 0.28)';
    for (let y = gap * 0.5; y < blockH; y += gap) {
      oc.fillRect(0, y, W, stripeH);
    }
    oc.fillStyle = 'rgba(255,255,255,0.20)';
    for (let y = gap * 0.5 + stripeH; y < blockH; y += gap) {
      oc.fillRect(0, y, W, stripeH * 0.5);
    }
    // Main canvas: hard shadow, thick outline, then the striped glyphs.
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.fillStyle = grade.titleShadow;
    lines.forEach((line, i) => ctx.fillText(line, cx + shadowDx, titleTop + i * lineHeight + shadowDy));
    ctx.lineWidth = size * 0.085;
    ctx.strokeStyle = grade.titleOutline;
    lines.forEach((line, i) => ctx.strokeText(line, cx, titleTop + i * lineHeight));
    ctx.drawImage(off, 0, titleTop);
    // Sparkle glints.
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = size * 0.12;
    sparkle(ctx, cx - maxW * 0.42, titleTop + size * 0.1, size * 0.09, '#ffffff');
    sparkle(ctx, cx + maxW * 0.44, titleTop + blockH - size * 0.15, size * 0.07, '#ffffff');
    ctx.restore();
  } else if (style === 'neon') {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.fillStyle = grade.frameDark;
    lines.forEach((line, i) => ctx.fillText(line, cx + shadowDx, titleTop + i * lineHeight + shadowDy));
    ctx.save();
    ctx.shadowColor = grade.scriptGlow;
    ctx.shadowBlur = size * 0.25;
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = grade.script;
    lines.forEach((line, i) => ctx.strokeText(line, cx, titleTop + i * lineHeight));
    ctx.strokeText(lines[0], cx, titleTop);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    lines.forEach((line, i) => ctx.fillText(line, cx, titleTop + i * lineHeight));
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.fillStyle = grade.titleShadow;
    lines.forEach((line, i) => ctx.fillText(line, cx + shadowDx, titleTop + i * lineHeight + shadowDy));
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = grade.titleOutline;
    lines.forEach((line, i) => ctx.strokeText(line, cx, titleTop + i * lineHeight));
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, i) => ctx.fillText(line, cx, titleTop + i * lineHeight));
  }

  // Script subtitle, tucked under the title, right aligned to its edge.
  const script = (state.script || '').trim();
  let scriptBottom = titleTop + blockH;
  if (script) {
    let sSize = size * 0.44;
    ctx.font = `${sSize}px Pacifico, cursive`;
    const sw = ctx.measureText(script).width;
    const sMax = W * 0.72;
    if (sw > sMax) {
      sSize *= sMax / sw;
      ctx.font = `${sSize}px Pacifico, cursive`;
    }
    ctx.save();
    ctx.shadowColor = grade.scriptGlow;
    ctx.shadowBlur = sSize * 0.35;
    ctx.fillStyle = grade.script;
    ctx.textAlign = 'right';
    // End before the seal, which sits at the band's bottom-right.
    const sRight = Math.min(cx + maxW * 0.46, W * 0.85);
    const sTop = titleTop + blockH - sSize * 0.28;
    ctx.fillText(script, sRight, sTop);
    ctx.restore();
    scriptBottom = sTop + sSize * 1.05;
  }

  // Tagline ribbon: a black slanted plate with letterspaced caps.
  const tagline = (state.tagline || '').trim();
  if (tagline && state.kit.tagline) {
    const text = tagline.toUpperCase();
    let tSize = unit * 1.8;
    const measure = (s) => {
      ctx.font = `700 ${s}px Arial, sans-serif`;
      ctx.letterSpacing = `${Math.max(1, s * 0.18)}px`;
      return ctx.measureText(text).width;
    };
    while (tSize > 7 && measure(tSize) > W * 0.72) tSize -= 1;
    ctx.font = `700 ${tSize}px Arial, sans-serif`;
    ctx.letterSpacing = `${Math.max(1, tSize * 0.18)}px`;
    const tw = ctx.measureText(text).width;
    const pw = tw + unit * 3.2;
    const ph = tSize * 2.1;
    const px = cx - pw / 2;
    const py = Math.min(scriptBottom + unit * 0.5, band.y + band.h - ph - unit * 0.6);
    const slant = unit * 1.1;
    ctx.fillStyle = 'rgba(8, 4, 12, 0.92)';
    ctx.beginPath();
    ctx.moveTo(px + slant, py);
    ctx.lineTo(px + pw, py);
    ctx.lineTo(px + pw - slant, py + ph);
    ctx.lineTo(px, py + ph);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.moveTo(px + slant, py);
    ctx.lineTo(px + slant + unit * 0.9, py + ph / 2);
    ctx.lineTo(px + slant, py + ph);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + pw - slant, py);
    ctx.lineTo(px + pw - slant - unit * 0.9, py + ph / 2);
    ctx.lineTo(px + pw - slant, py + ph);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, py + ph / 2 + tSize * 0.06);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
  return { x: cx - maxW / 2, y: titleTop, w: maxW, h: blockH };
}

function drawQuoteBar(ctx, state, grade, W, H, unit, margin) {
  if (!state.kit.quote) return;
  const quote = (state.quote || '').trim();
  if (!quote) return;
  const y = margin + H * 0.008;
  const starR = unit * 0.85;
  let sx = margin + unit * 0.5;
  ctx.save();
  ctx.fillStyle = '#ffd23e';
  for (let i = 0; i < 5; i++) {
    starPath(ctx, sx + starR, y + starR, starR);
    ctx.fill();
    sx += starR * 2.3;
  }
  const volW = state.kit.volume ? unit * 7.5 : 0;
  const maxW = W - sx - unit - volW - margin;
  const outlet = (state.outlet || 'THE HARBOR GAZETTE').toUpperCase();
  const full = `“${quote.toUpperCase()}”`;
  let size = fitFont(ctx, full, (s) => `700 ${s}px Arial, sans-serif`, maxW * 0.72, unit * 1.6, 8);
  ctx.font = `700 ${size}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(full, sx + unit * 0.5, y + starR);
  const qw = ctx.measureText(full).width;
  const oSize = size * 0.72;
  ctx.font = `700 ${oSize}px Arial, sans-serif`;
  ctx.fillStyle = grade.accent;
  let out = `— ${outlet}`;
  while (ctx.measureText(out).width > maxW - qw - unit && out.length > 4) {
    out = out.slice(0, -4) + '…';
  }
  ctx.fillText(out, sx + unit * 0.5 + qw + unit * 0.7, y + starR);
  ctx.restore();
}

function drawVolumeTag(ctx, state, grade, W, H, unit, margin) {
  if (!state.kit.volume) return;
  const text = (state.volume || 'VOL. 1').toUpperCase();
  const size = fitFont(ctx, text, (s) => `700 ${s}px Arial, sans-serif`, unit * 6.4, unit * 1.5, 8);
  ctx.save();
  ctx.font = `700 ${size}px Arial, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pw = tw + unit * 2;
  const ph = size * 2;
  const px = W - margin - pw;
  const py = margin + H * 0.004;
  ctx.fillStyle = grade.seal;
  ctx.beginPath();
  ctx.moveTo(px + unit * 0.6, py);
  ctx.lineTo(px + pw, py);
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = grade.sealText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px + pw / 2 + unit * 0.3, py + ph / 2 + size * 0.05);
  ctx.restore();
}

function drawWantedPill(ctx, state, grade, W, unit, band) {
  if (!state.kit.wanted) return;
  const stars = state.wantedStars || 5;
  const size = unit * 1.35;
  ctx.save();
  ctx.font = `700 ${size}px Arial, sans-serif`;
  const label = 'WANTED';
  const lw = ctx.measureText(label).width;
  const starR = size * 0.55;
  const pw = lw + unit * 2.4 + stars * starR * 2.3;
  const ph = size * 2.1;
  const px = W / 2 - pw / 2;
  const py = band.y - ph - unit * 1.1;
  ctx.fillStyle = 'rgba(8, 4, 12, 0.9)';
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(1.5, unit * 0.14);
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, ph / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px + unit * 1.2, py + ph / 2 + size * 0.05);
  let sx = px + unit * 1.2 + lw + unit * 0.9;
  ctx.fillStyle = '#ffd23e';
  for (let i = 0; i < stars; i++) {
    starPath(ctx, sx + starR, py + ph / 2, starR);
    ctx.fill();
    sx += starR * 2.3;
  }
  ctx.restore();
}

function drawSeal(ctx, state, grade, W, unit, band) {
  if (!state.kit.seal) return;
  const r = Math.min(W * 0.052, band.h * 0.32);
  // Bottom-right of the band: clear of the title, the script and the ribbon.
  const cx = W - r * 1.2;
  const cy = band.y + band.h - r * 1.1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.fillStyle = grade.seal;
  ctx.strokeStyle = grade.sealText;
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  starburstPath(ctx, 0, 0, r);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = grade.seal;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = grade.sealText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const badge = (state.badge || 'ORIGINAL COVER ART').toUpperCase();
  const words = badge.split(/\s+/);
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  const size = fitFont(ctx, line1.length > line2.length ? line1 : line2, (s) => `700 ${s}px Arial, sans-serif`, r * 1.25, r * 0.26, 6);
  ctx.font = `700 ${size}px Arial, sans-serif`;
  ctx.fillText(line1, 0, -size * 0.75);
  ctx.fillText(line2, 0, size * 0.35);
  ctx.fillStyle = grade.sealText;
  const sr = r * 0.09;
  for (let i = -1; i <= 1; i++) {
    starPath(ctx, i * sr * 2.6, size * 1.25, sr);
    ctx.fill();
  }
  ctx.restore();
}

function drawFooter(ctx, state, grade, W, H, unit, margin) {
  const y = H - margin - H * 0.012;
  ctx.save();
  // COMING SOON, bottom left.
  if (state.kit.comingSoon) {
    const size = unit * 1.5;
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.save();
    ctx.shadowColor = grade.scriptGlow;
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = grade.script;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMING SOON', margin + unit * 0.5, y - H * 0.02);
    ctx.restore();
  }
  // Barcode, bottom right.
  let barcodeW = 0;
  if (state.kit.barcode) {
    const rnd = mulberry32(424242);
    const bw = unit * 5.2;
    const bh = H * 0.032;
    const bx = W - margin - bw - unit * 0.4;
    const by = y - H * 0.038;
    barcodeW = bw + unit * 1.4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - unit * 0.3, by - unit * 0.3, bw + unit * 0.6, bh + unit * 0.9);
    ctx.fillStyle = '#111111';
    let x = bx;
    while (x < bx + bw) {
      const wbar = 1 + Math.floor(rnd() * 3) * (unit * 0.14);
      if (rnd() > 0.42) ctx.fillRect(x, by, wbar, bh);
      x += wbar + unit * 0.14;
    }
    ctx.fillStyle = '#111111';
    ctx.font = `700 ${unit * 0.72}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0 2113 122620', bx + bw / 2, by + bh + unit * 0.1);
  }
  // Billing block, centred between the two.
  if (state.kit.billing) {
    const studio = (state.studio || 'SUNSET PICTURES').toUpperCase();
    const line1 = `A ${studio} PRODUCTION · STARRING YOU`;
    const line2 = 'SHOT ON YOUR OWN CAMERA · GRADED BY HAND';
    const avail = W - margin * 2 - unit * 13 - barcodeW;
    const size = fitFont(ctx, line1.length > line2.length ? line1 : line2, (s) => `700 ${s}px Arial, sans-serif`, avail, unit * 1.05, 6);
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = margin + (W - margin * 2 - barcodeW) / 2;
    ctx.fillText(line1, cx, y - H * 0.032);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(line2, cx, y - H * 0.032 + size * 1.7);
  }
  ctx.restore();
}

/**
 * Renders the poster onto `canvas` (sized by the caller) from the app state.
 * `opts.overlay` draws editor helpers (panel numbers, selection ring) for the preview.
 * Returns geometry the editor needs: panel polygons in canvas pixels and the title box.
 */
export function renderPoster(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const sliders = state.sliders;
  const unit = Math.max(6, W / 160);
  const margin = W * 0.014;

  // Backdrop.
  ctx.fillStyle = grade.frameDark;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeRect(margin / 2, margin / 2, W - margin, H - margin);

  // Vertical zones.
  const quoteH = state.kit.quote ? H * 0.052 : H * 0.014;
  const footerH = state.kit.billing || state.kit.comingSoon || state.kit.barcode ? H * 0.062 : H * 0.014;
  const area = { x: margin, y: quoteH + margin * 0.5, w: W - margin * 2, h: H - quoteH - footerH - margin * 0.5 };
  const panels = layoutPanels(state.layout, area);
  const gap = Math.max(2, W * 0.0035);

  // Panels.
  panels.forEach((panel, i) => {
    const pstate = state.panels[i] || {};
    const photo = pstate.photo != null ? state.photos[pstate.photo] : null;
    const inset = insetPoly(panel.poly, gap / 2);
    // The picture needs the panel's own state (crop, flip, grade, art), not just
    // the layout geometry, so the two are merged here.
    drawPanelPicture(ctx, { ...panel, ...pstate, poly: inset }, photo, grade, sliders, i * 7 + 3);
    ctx.save();
    polyPath(ctx, inset);
    ctx.strokeStyle = grade.frame;
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    ctx.stroke();
    ctx.restore();
  });
  // Tags need the panel state: draw them in a second pass with full panel data.
  panels.forEach((panel, i) => {
    const pstate = state.panels[i] || {};
    if (!state.kit.tags) return;
    const photo = pstate.photo != null ? state.photos[pstate.photo] : null;
    if (!photo && !pstate.art) return;
    const inset = insetPoly(panel.poly, gap / 2);
    drawPanelTag(ctx, { ...pstate, poly: inset, tag: [panel.tag[0] + gap, panel.tag[1] - gap] }, grade, unit);
  });

  // Backdrop band + title.
  const portrait = H / W > 1.1;
  const band = {
    x: margin,
    y: portrait ? H * 0.52 : H * 0.5,
    w: W - margin * 2,
    h: portrait ? H * 0.33 : H * 0.36,
  };
  drawBackdropBand(ctx, band, grade, W, H);
  drawWantedPill(ctx, state, grade, W, unit, band);
  const titleBox = drawTitleBlock(ctx, state, grade, band, W, H, unit);

  // Furniture.
  drawQuoteBar(ctx, state, grade, W, H, unit, margin);
  drawVolumeTag(ctx, state, grade, W, H, unit, margin);
  drawSeal(ctx, state, grade, W, unit, band);
  drawFooter(ctx, state, grade, W, H, unit, margin);

  // Vignette + grain over the whole poster.
  const vig = sliders.vignette / 100;
  if (vig > 0.02) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, `rgba(0,0,0,${0.45 * vig})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  const grain = sliders.grain / 100;
  if (grain > 0.02) {
    ctx.save();
    ctx.globalAlpha = grain * 0.16;
    ctx.fillStyle = ctx.createPattern(grainTile(128), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Editor overlay: panel numbers + selection ring.
  if (opts.overlay) {
    panels.forEach((panel, i) => {
      const bb = polyBounds(panel.poly);
      const selected = opts.selected === i;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bb.x + unit * 1.6, bb.y + unit * 1.6, unit * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = selected ? grade.accent : 'rgba(8,4,12,0.85)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, unit * 0.12);
      ctx.stroke();
      ctx.fillStyle = selected ? '#111111' : '#ffffff';
      ctx.font = `700 ${unit * 1.15}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), bb.x + unit * 1.6, bb.y + unit * 1.65);
      if (selected) {
        polyPath(ctx, panel.poly);
        ctx.strokeStyle = grade.accent;
        ctx.lineWidth = Math.max(2, W * 0.004);
        ctx.setLineDash([unit * 1.2, unit * 0.8]);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  return { panels: panels.map((p) => p.poly), titleBox, band };
}

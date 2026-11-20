// Code-drawn illustrated filler panels. When the user has fewer photos than panels,
// the gaps fill with Vice City art drawn on the canvas: a sports car, a speedboat, a
// motel sign, a skyline with a helicopter, a lifeguard tower, a palm boulevard. Each
// one is drawn in the active grade's palette so it blends with the photos instead of
// sitting apart from them. All randomness is seeded per panel, so a poster re-renders
// identically every time.

export const ART_KINDS = ['car', 'boat', 'motel', 'skyline', 'tower', 'palms'];

export const ART_NAMES = {
  car: 'Sunset Coupe',
  boat: 'Speedboat Run',
  motel: 'Palm Court Motel',
  skyline: 'Night Skyline',
  tower: 'Lifeguard Tower',
  palms: 'Palm Boulevard',
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

function sky(ctx, x, y, w, h, band) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, band.skyTop);
  g.addColorStop(0.55, band.skyMid);
  g.addColorStop(1, band.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Retro sun with horizontal slits, drawn low over the horizon. */
function retroSun(ctx, cx, cy, r, band) {
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, band.sunCore);
  g.addColorStop(1, band.sun);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slits cut the lower half into stripes.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = band.skyBottom;
  let yy = cy + r * 0.1;
  let th = r * 0.07;
  while (yy < cy + r) {
    ctx.fillRect(cx - r, yy, r * 2, th);
    yy += th * 2.4;
    th *= 1.35;
  }
  ctx.restore();
}

/** A palm silhouette: leaning trunk plus drooping fronds. */
function palm(ctx, x, y, s, color, lean) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.lineCap = 'round';
  const topX = x + lean * s;
  const topY = y - s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.55, topX, topY);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = s * (0.42 + (i % 3) * 0.07);
    const mx = topX + Math.cos(a) * len * 0.6;
    const my = topY + Math.sin(a) * len * 0.55 - s * 0.08;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len + s * 0.22;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.02, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function stars(ctx, x, y, w, h, rnd, count, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h * 0.6;
    const r = 0.6 + rnd() * 1.4;
    ctx.globalAlpha = 0.4 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function buildings(ctx, x, baseY, w, h, rnd, color, litColor, litChance) {
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.08 + rnd() * 0.1);
    const bh = h * (0.25 + rnd() * 0.65);
    ctx.fillStyle = color;
    ctx.fillRect(bx, baseY - bh, bw, bh);
    // Antenna on the odd tall one.
    if (bh > h * 0.6 && rnd() > 0.5) {
      ctx.fillRect(bx + bw / 2 - 1, baseY - bh - h * 0.08, 2, h * 0.08);
    }
    // Lit windows.
    ctx.fillStyle = litColor;
    const cols = Math.max(1, Math.floor(bw / (w * 0.028)));
    const rows = Math.max(1, Math.floor(bh / (h * 0.07)));
    for (let cxi = 0; cxi < cols; cxi++) {
      for (let ryi = 0; ryi < rows; ryi++) {
        if (rnd() < litChance) {
          ctx.fillRect(bx + bw * 0.15 + cxi * (bw * 0.7 / cols), baseY - bh + h * 0.05 + ryi * (bh * 0.85 / rows), bw * 0.3 / cols + 1, 2);
        }
      }
    }
    bx += bw + w * 0.015;
  }
}

function drawCar(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  sky(ctx, x, y, w, h, b);
  stars(ctx, x, y, w, h, rnd, 14, '#ffffff');
  retroSun(ctx, x + w * 0.72, y + h * 0.52, h * 0.26, b);
  buildings(ctx, x, y + h * 0.62, w, h * 0.3, rnd, b.skyline, '#ffd98a', 0.25);
  palm(ctx, x + w * 0.08, y + h * 0.66, h * 0.3, b.palm, 0.2);
  palm(ctx, x + w * 0.94, y + h * 0.66, h * 0.36, b.palm, -0.25);
  // Road.
  const road = ctx.createLinearGradient(0, y + h * 0.62, 0, y + h);
  road.addColorStop(0, '#2a1a2e');
  road.addColorStop(1, '#12081a');
  ctx.fillStyle = road;
  ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.7)';
  ctx.lineWidth = Math.max(1, h * 0.008);
  ctx.setLineDash([w * 0.06, w * 0.04]);
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.82);
  ctx.lineTo(x + w, y + h * 0.82);
  ctx.stroke();
  ctx.setLineDash([]);
  // Sports car, side profile, five-stop paint gradient.
  const cy = y + h * 0.66;
  const cw = w * 0.78;
  const cx = x + w * 0.11;
  const ch = h * 0.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cw * 0.5, ch * 0.95, cw * 0.52, ch * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  const paint = ctx.createLinearGradient(0, 0, 0, ch);
  paint.addColorStop(0, '#ff8a7a');
  paint.addColorStop(0.3, '#e83a3a');
  paint.addColorStop(0.55, '#c2162e');
  paint.addColorStop(0.8, '#8f0f24');
  paint.addColorStop(1, '#5c0818');
  ctx.fillStyle = paint;
  ctx.strokeStyle = '#1c0618';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(0, ch * 0.72);
  ctx.lineTo(cw * 0.06, ch * 0.45);
  ctx.quadraticCurveTo(cw * 0.3, ch * 0.38, cw * 0.42, ch * 0.12);
  ctx.lineTo(cw * 0.58, ch * 0.08);
  ctx.quadraticCurveTo(cw * 0.72, ch * 0.1, cw * 0.82, ch * 0.38);
  ctx.lineTo(cw * 0.97, ch * 0.5);
  ctx.quadraticCurveTo(cw, ch * 0.58, cw * 0.98, ch * 0.72);
  ctx.lineTo(cw * 0.86, ch * 0.72);
  ctx.arc(cw * 0.76, ch * 0.72, cw * 0.09, 0, Math.PI, true);
  ctx.lineTo(cw * 0.32, ch * 0.72);
  ctx.arc(cw * 0.24, ch * 0.72, cw * 0.09, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Glasshouse.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.moveTo(cw * 0.3, ch * 0.4);
  ctx.lineTo(cw * 0.44, ch * 0.16);
  ctx.lineTo(cw * 0.57, ch * 0.13);
  ctx.lineTo(cw * 0.72, ch * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(cw * 0.36, ch * 0.4);
  ctx.lineTo(cw * 0.47, ch * 0.16);
  ctx.lineTo(cw * 0.52, ch * 0.16);
  ctx.lineTo(cw * 0.42, ch * 0.4);
  ctx.closePath();
  ctx.fill();
  // Wheels with spokes.
  const wheel = (wx) => {
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(wx, ch * 0.72, cw * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c0618';
    ctx.lineWidth = Math.max(1, h * 0.006);
    ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(wx, ch * 0.72, cw * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888888';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, ch * 0.72);
      ctx.lineTo(wx + Math.cos(a) * cw * 0.05, ch * 0.72 + Math.sin(a) * cw * 0.05);
      ctx.stroke();
    }
    ctx.fillStyle = '#c2162e';
    ctx.beginPath();
    ctx.arc(wx, ch * 0.72, cw * 0.014, 0, Math.PI * 2);
    ctx.fill();
  };
  wheel(cw * 0.24);
  wheel(cw * 0.76);
  // Headlight glow and tail light.
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.ellipse(cw * 0.97, ch * 0.55, cw * 0.02, ch * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff2e4d';
  ctx.fillRect(cw * 0.005, ch * 0.52, cw * 0.02, ch * 0.08);
  ctx.restore();
}

function drawBoat(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  sky(ctx, x, y, w, h * 0.55, b);
  retroSun(ctx, x + w * 0.5, y + h * 0.42, h * 0.22, b);
  // Ocean.
  const sea = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
  sea.addColorStop(0, '#1e6f8a');
  sea.addColorStop(0.5, '#0f4a66');
  sea.addColorStop(1, '#072a44');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.45, w, h * 0.55);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, h * 0.006);
  for (let i = 0; i < 9; i++) {
    const wy = y + h * (0.5 + rnd() * 0.45);
    const wx = x + rnd() * w * 0.7;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + w * 0.05, wy - h * 0.008, wx + w * 0.11, wy);
    ctx.stroke();
  }
  // Wake.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, y + h * 0.72);
  ctx.quadraticCurveTo(x + w * 0.35, y + h * 0.6, x + w * 0.62, y + h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.35, y + h * 0.8, x + w * 0.08, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
  // Speedboat.
  const bx = x + w * 0.3;
  const by = y + h * 0.52;
  const bw = w * 0.62;
  const bh = h * 0.22;
  ctx.save();
  ctx.translate(bx, by);
  const hull = ctx.createLinearGradient(0, 0, 0, bh);
  hull.addColorStop(0, '#ffffff');
  hull.addColorStop(0.55, '#dfe9f2');
  hull.addColorStop(1, '#8fa8bf');
  ctx.fillStyle = hull;
  ctx.strokeStyle = '#0d2133';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(0, bh * 0.35);
  ctx.lineTo(bw * 0.72, bh * 0.3);
  ctx.quadraticCurveTo(bw * 0.95, bh * 0.3, bw, bh * 0.55);
  ctx.lineTo(bw * 0.82, bh);
  ctx.lineTo(bw * 0.12, bh);
  ctx.quadraticCurveTo(bw * 0.02, bh * 0.75, 0, bh * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e83a3a';
  ctx.beginPath();
  ctx.moveTo(bw * 0.03, bh * 0.52);
  ctx.lineTo(bw * 0.9, bh * 0.45);
  ctx.lineTo(bw * 0.86, bh * 0.62);
  ctx.lineTo(bw * 0.06, bh * 0.68);
  ctx.closePath();
  ctx.fill();
  // Windshield and cabin.
  ctx.fillStyle = '#1e3a52';
  ctx.beginPath();
  ctx.moveTo(bw * 0.42, bh * 0.32);
  ctx.lineTo(bw * 0.52, bh * 0.02);
  ctx.lineTo(bw * 0.72, bh * 0.02);
  ctx.lineTo(bw * 0.76, bh * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(191,232,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(bw * 0.47, bh * 0.3);
  ctx.lineTo(bw * 0.54, bh * 0.07);
  ctx.lineTo(bw * 0.66, bh * 0.07);
  ctx.lineTo(bw * 0.68, bh * 0.3);
  ctx.closePath();
  ctx.fill();
  // Spray.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 22; i++) {
    const sx = (rnd() - 0.25) * bw * 0.5;
    const sy = bh * (0.55 + rnd() * 0.5);
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + rnd() * h * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMotel(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  sky(ctx, x, y, w, h, b);
  stars(ctx, x, y, w, h, rnd, 24, '#ffffff');
  // Ground.
  ctx.fillStyle = '#16081c';
  ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  // Motel block.
  ctx.fillStyle = '#2a1440';
  ctx.fillRect(x + w * 0.42, y + h * 0.52, w * 0.58, h * 0.26);
  ctx.fillStyle = '#3a1c58';
  ctx.fillRect(x + w * 0.42, y + h * 0.52, w * 0.58, h * 0.04);
  ctx.fillStyle = '#ffd98a';
  for (let i = 0; i < 4; i++) {
    if (rnd() > 0.25) ctx.fillRect(x + w * (0.47 + i * 0.12), y + h * 0.6, w * 0.07, h * 0.1);
  }
  palm(ctx, x + w * 0.9, y + h * 0.8, h * 0.34, b.palm, -0.2);
  // The sign pole.
  ctx.fillStyle = '#1c0f04';
  ctx.fillRect(x + w * 0.2, y + h * 0.18, w * 0.03, h * 0.62);
  // Sign boards, neon rimmed.
  const board = (by, bh, fill, rim) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.5, h * 0.008);
    ctx.shadowColor = rim;
    ctx.shadowBlur = h * 0.03;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.06, by, w * 0.34, bh, h * 0.02);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  board(y + h * 0.1, h * 0.2, '#16081c', g.accent);
  board(y + h * 0.34, h * 0.13, '#16081c', '#37e6ff');
  board(y + h * 0.51, h * 0.11, '#16081c', '#ffe45e');
  const fitText = (text, font, maxW) => {
    let size = h * 0.11;
    ctx.font = font(size);
    while (ctx.measureText(text).width > maxW && size > 6) {
      size -= 1;
      ctx.font = font(size);
    }
    return size;
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText('MOTEL', (s) => `${s}px Anton, sans-serif`, w * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MOTEL', x + w * 0.23, y + h * 0.2);
  fitText('Palm Court', (s) => `${s}px Pacifico, cursive`, w * 0.3);
  ctx.fillStyle = '#37e6ff';
  ctx.fillText('Palm Court', x + w * 0.23, y + h * 0.405);
  fitText('VACANCY', (s) => `${s}px Anton, sans-serif`, w * 0.3);
  ctx.fillStyle = '#ffe45e';
  ctx.fillText('VACANCY', x + w * 0.23, y + h * 0.565);
  // Dots leading to the door.
  ctx.fillStyle = '#ffe45e';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + w * (0.3 + i * 0.06), y + h * 0.72, h * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawSkyline(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  const night = ctx.createLinearGradient(0, y, 0, y + h);
  night.addColorStop(0, '#070b24');
  night.addColorStop(0.6, '#1a1040');
  night.addColorStop(1, '#3b0f66');
  ctx.fillStyle = night;
  ctx.fillRect(x, y, w, h);
  stars(ctx, x, y, w, h, rnd, 30, '#ffffff');
  // Moon.
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(x + w * 0.82, y + h * 0.16, h * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(7,11,36,0.35)';
  ctx.beginPath();
  ctx.arc(x + w * 0.8, y + h * 0.14, h * 0.02, 0, Math.PI * 2);
  ctx.arc(x + w * 0.85, y + h * 0.19, h * 0.014, 0, Math.PI * 2);
  ctx.fill();
  // Water at the foot.
  ctx.fillStyle = '#0a1c33';
  ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  ctx.strokeStyle = 'rgba(55,230,255,0.4)';
  ctx.lineWidth = Math.max(1, h * 0.005);
  for (let i = 0; i < 8; i++) {
    const wy = y + h * (0.86 + rnd() * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + rnd() * w * 0.7, wy);
    ctx.lineTo(x + rnd() * w * 0.7 + w * 0.12, wy);
    ctx.stroke();
  }
  buildings(ctx, x, y + h * 0.82, w, h * 0.55, rnd, '#0a0618', '#ffd98a', 0.3);
  // Helicopter with a searchlight.
  const hx = x + w * 0.3;
  const hy = y + h * 0.3;
  const hs = h * 0.16;
  ctx.fillStyle = 'rgba(255,243,176,0.16)';
  ctx.beginPath();
  ctx.moveTo(hx, hy + hs * 0.3);
  ctx.lineTo(hx - w * 0.06, y + h * 0.82);
  ctx.lineTo(hx + w * 0.1, y + h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#05030f';
  ctx.strokeStyle = '#05030f';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.beginPath();
  ctx.ellipse(hx, hy, hs * 0.55, hs * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hs * 0.5, hy);
  ctx.lineTo(hx + hs * 1.5, hy - hs * 0.1);
  ctx.lineTo(hx + hs * 1.5, hy + hs * 0.08);
  ctx.lineTo(hx + hs * 0.5, hy + hs * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - hs * 0.9, hy - hs * 0.35);
  ctx.lineTo(hx + hs * 0.9, hy - hs * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, hy - hs * 0.35);
  ctx.lineTo(hx, hy - hs * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#ff2e4d';
  ctx.beginPath();
  ctx.arc(hx + hs * 1.5, hy - hs * 0.02, hs * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawTower(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  sky(ctx, x, y, w, h * 0.6, b);
  retroSun(ctx, x + w * 0.24, y + h * 0.4, h * 0.2, b);
  // Ocean and sand.
  const sea = ctx.createLinearGradient(0, y + h * 0.5, 0, y + h * 0.68);
  sea.addColorStop(0, '#2a9db5');
  sea.addColorStop(1, '#0f6e8a');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.5, w, h * 0.18);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, h * 0.006);
  for (let i = 0; i < 6; i++) {
    const wy = y + h * (0.54 + rnd() * 0.12);
    ctx.beginPath();
    ctx.moveTo(x + rnd() * w * 0.6, wy);
    ctx.quadraticCurveTo(x + w * 0.5, wy - h * 0.01, x + w * 0.7, wy);
    ctx.stroke();
  }
  const sand = ctx.createLinearGradient(0, y + h * 0.66, 0, y + h);
  sand.addColorStop(0, '#f2d8a0');
  sand.addColorStop(1, '#d9b06a');
  ctx.fillStyle = sand;
  ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
  palm(ctx, x + w * 0.88, y + h * 0.72, h * 0.3, b.palm, -0.2);
  // Lifeguard tower.
  const tx = x + w * 0.42;
  const ty = y + h * 0.68;
  const tw = w * 0.34;
  const th = h * 0.5;
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.4, ty + th * 0.6);
  ctx.lineTo(tx - tw * 0.28, ty);
  ctx.moveTo(tx + tw * 0.4, ty + th * 0.6);
  ctx.lineTo(tx + tw * 0.28, ty);
  ctx.moveTo(tx - tw * 0.36, ty + th * 0.34);
  ctx.lineTo(tx + tw * 0.36, ty + th * 0.34);
  ctx.stroke();
  // Cabin: white with red stripes.
  ctx.fillStyle = '#fff8ec';
  ctx.strokeStyle = '#1c0f04';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.beginPath();
  ctx.roundRect(tx - tw * 0.5, ty - th * 0.52, tw, th * 0.52, h * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e83a3a';
  ctx.fillRect(tx - tw * 0.5, ty - th * 0.52, tw, th * 0.08);
  ctx.fillRect(tx - tw * 0.5, ty - th * 0.12, tw, th * 0.08);
  // Roof and flag.
  ctx.fillStyle = '#e83a3a';
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.58, ty - th * 0.52);
  ctx.lineTo(tx, ty - th * 0.72);
  ctx.lineTo(tx + tw * 0.58, ty - th * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#1c0f04';
  ctx.lineWidth = Math.max(1, h * 0.006);
  ctx.beginPath();
  ctx.moveTo(tx, ty - th * 0.72);
  ctx.lineTo(tx, ty - th * 0.92);
  ctx.stroke();
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath();
  ctx.moveTo(tx, ty - th * 0.92);
  ctx.lineTo(tx + tw * 0.3, ty - th * 0.87);
  ctx.lineTo(tx, ty - th * 0.82);
  ctx.closePath();
  ctx.fill();
  // Window and door.
  ctx.fillStyle = '#1e3a52';
  ctx.fillRect(tx - tw * 0.32, ty - th * 0.4, tw * 0.3, th * 0.18);
  ctx.fillRect(tx + tw * 0.06, ty - th * 0.4, tw * 0.26, th * 0.36);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(tx - tw * 0.28, ty - th * 0.37, tw * 0.08, th * 0.12);
}

function drawPalms(ctx, r, g, rnd) {
  const { x, y, w, h } = r;
  const b = g.band;
  sky(ctx, x, y, w, h, b);
  retroSun(ctx, x + w * 0.5, y + h * 0.46, h * 0.24, b);
  buildings(ctx, x, y + h * 0.62, w, h * 0.28, rnd, b.skyline, '#ffd98a', 0.2);
  // Road with perspective.
  ctx.fillStyle = '#1c0f1e';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.32, y + h * 0.62);
  ctx.lineTo(x + w * 0.68, y + h * 0.62);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = Math.max(1, h * 0.008);
  ctx.setLineDash([h * 0.05, h * 0.04]);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.62);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.stroke();
  ctx.setLineDash([]);
  // Sidewalks.
  ctx.fillStyle = '#2e1a2e';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.62);
  ctx.lineTo(x + w * 0.32, y + h * 0.62);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.68, y + h * 0.62);
  ctx.lineTo(x + w, y + h * 0.62);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  // Palm rows, small far, big near.
  const row = (side) => {
    const depths = [0.62, 0.74, 0.88, 1.02];
    depths.forEach((d, i) => {
      const px = side < 0 ? x + w * (0.16 - i * 0.04) : x + w * (0.84 + i * 0.04);
      palm(ctx, px, y + h * d, h * (0.16 + i * 0.12), b.palm, side * 0.15);
    });
  };
  row(-1);
  row(1);
}

const DRAWERS = { car: drawCar, boat: drawBoat, motel: drawMotel, skyline: drawSkyline, tower: drawTower, palms: drawPalms };

/**
 * Draws one illustrated panel into `rect` ({x, y, w, h}) in the grade's palette.
 * `seed` keeps the random details stable between renders.
 */
export function drawArt(ctx, kind, rect, grade, seed) {
  const draw = DRAWERS[kind] || DRAWERS.car;
  const rnd = mulberry32((seed + 1) * 2654435761);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  draw(ctx, rect, grade, rnd);
  // Ink edge so the panel reads as drawn art, not a flat fill.
  ctx.strokeStyle = 'rgba(10, 5, 15, 0.55)';
  ctx.lineWidth = Math.max(1.5, rect.h * 0.01);
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
}

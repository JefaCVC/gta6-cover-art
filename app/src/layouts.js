// The seven panel layouts. A layout is a list of zones that tile the panel area; each
// zone is a small grid whose internal vertical dividers slant, which is what gives the
// poster its diagonal GTA energy. Zones share straight axis-aligned edges, so panels
// never gap or overlap. Every panel comes back as a polygon in pixels, plus a hero flag
// and a tag anchor (the bottom-left corner of the panel, where its tag plate sits).
//
// For tall posters the layouts transpose (hero-left becomes hero-top), so the same
// seven layouts read well at 16:9, 4:5, 1:1 and 9:16.

function zoneCells(zone, area) {
  const px0 = area.x + zone.x0 * area.w;
  const py0 = area.y + zone.y0 * area.h;
  const pw = (zone.x1 - zone.x0) * area.w;
  const ph = (zone.y1 - zone.y0) * area.h;
  const { cols, rows, slant } = zone;
  // Vertical divider lines: boundary i runs from (b + s) at the top to (b - s) at the
  // bottom, alternating direction per boundary so the slants zig-zag.
  const bounds = [];
  for (let i = 0; i <= cols; i++) {
    const b = i / cols;
    const s = i === 0 || i === cols ? 0 : slant * (i % 2 === 0 ? 1 : -1);
    bounds.push({ b, s });
  }
  const xAt = (i, yNorm) => {
    const { b, s } = bounds[i];
    return px0 + (b + s * (1 - 2 * yNorm)) * pw;
  };
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const yt = py0 + (r / rows) * ph;
    const yb = py0 + ((r + 1) / rows) * ph;
    const ytN = r / rows;
    const ybN = (r + 1) / rows;
    for (let c = 0; c < cols; c++) {
      const poly = [
        [xAt(c, ytN), yt],
        [xAt(c + 1, ytN), yt],
        [xAt(c + 1, ybN), yb],
        [xAt(c, ybN), yb],
      ];
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      cells.push({ poly, hero: false, tag: [Math.min(...xs), Math.max(...ys)] });
    }
  }
  return cells;
}

const DEFS = {
  'hero-mosaic': {
    name: 'Hero Mosaic',
    panels: 6,
    zones: [
      { x0: 0, y0: 0, x1: 0.46, y1: 1, cols: 1, rows: 1, slant: 0 },
      { x0: 0.46, y0: 0, x1: 1, y1: 0.5, cols: 2, rows: 1, slant: 0.035 },
      { x0: 0.46, y0: 0.5, x1: 1, y1: 1, cols: 3, rows: 1, slant: 0.03 },
    ],
    hero: 0,
  },
  'hero-strip': {
    name: 'Hero + Strip',
    panels: 7,
    zones: [
      { x0: 0, y0: 0, x1: 0.56, y1: 0.7, cols: 1, rows: 1, slant: 0 },
      { x0: 0.56, y0: 0, x1: 1, y1: 0.7, cols: 1, rows: 2, slant: 0 },
      { x0: 0, y0: 0.7, x1: 1, y1: 1, cols: 4, rows: 1, slant: 0.028 },
    ],
    hero: 0,
  },
  'diagonal-trio': {
    name: 'Diagonal Trio',
    panels: 3,
    zones: [{ x0: 0, y0: 0, x1: 1, y1: 1, cols: 3, rows: 1, slant: 0.055 }],
    hero: 1,
  },
  'six-grid': {
    name: 'Six Grid',
    panels: 6,
    zones: [{ x0: 0, y0: 0, x1: 1, y1: 1, cols: 3, rows: 2, slant: 0.032 }],
    hero: -1,
  },
  'seven-mosaic': {
    name: 'Seven Mosaic',
    panels: 7,
    zones: [
      { x0: 0, y0: 0, x1: 0.32, y1: 1, cols: 1, rows: 3, slant: 0 },
      { x0: 0.32, y0: 0, x1: 0.68, y1: 1, cols: 1, rows: 1, slant: 0 },
      { x0: 0.68, y0: 0, x1: 1, y1: 1, cols: 1, rows: 3, slant: 0 },
    ],
    hero: 3,
  },
  'nine-grid': {
    name: 'Nine Grid',
    panels: 9,
    zones: [{ x0: 0, y0: 0, x1: 1, y1: 1, cols: 3, rows: 3, slant: 0.026 }],
    hero: 4,
  },
  'full-poster': {
    name: 'Full Poster',
    panels: 1,
    zones: [{ x0: 0, y0: 0, x1: 1, y1: 1, cols: 1, rows: 1, slant: 0 }],
    hero: 0,
  },
};

export const LAYOUT_ORDER = ['hero-mosaic', 'hero-strip', 'diagonal-trio', 'six-grid', 'seven-mosaic', 'nine-grid', 'full-poster'];

export function layoutName(id) {
  return DEFS[id] ? DEFS[id].name : id;
}

export function layoutPanelCount(id) {
  return DEFS[id] ? DEFS[id].panels : 6;
}

/**
 * Returns the panels for a layout inside `area` ({x, y, w, h} in pixels).
 * Tall areas transpose the layout so heroes sit on top instead of on the left.
 */
export function layoutPanels(id, area) {
  const def = DEFS[id] || DEFS['hero-mosaic'];
  const portrait = area.h / area.w > 1.25;
  let panels = [];
  for (const zone of def.zones) {
    panels = panels.concat(zoneCells(zone, area));
  }
  if (portrait) {
    panels = panels.map((p) => {
      const poly = p.poly.map(([x, y]) => {
        const nx = (x - area.x) / area.w;
        const ny = (y - area.y) / area.h;
        return [area.x + ny * area.w, area.y + nx * area.h];
      });
      const xs = poly.map((q) => q[0]);
      const ys = poly.map((q) => q[1]);
      return { ...p, poly, tag: [Math.min(...xs), Math.max(...ys)] };
    });
  }
  if (def.hero >= 0 && panels[def.hero]) panels[def.hero].hero = true;
  return panels;
}

/** Normalized polygons (0..1 box) for the layout-picker thumbnails. */
export function layoutThumbPolys(id) {
  const panels = layoutPanels(id, { x: 0, y: 0, w: 100, h: 62 });
  return panels.map((p) => p.poly.map(([x, y]) => [x / 100, y / 62]));
}

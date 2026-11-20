// Vice Line studio: wires the page to the poster engine. State lives here; the
// canvas re-renders on every change. Photos load from the machine (file picker,
// drag and drop, paste) or from the bundled samples, and never leave the browser.
// Undo and redo snapshot the state (photo images are kept by reference, so a
// snapshot only records which photo each panel shows).

import { renderPoster, SIZES, SIZE_ORDER } from './cover.js';
import { GRADES, GRADE_ORDER } from './grades.js';
import { LAYOUT_ORDER, layoutName, layoutPanelCount, layoutThumbPolys } from './layouts.js';
import { ART_KINDS, ART_NAMES } from './art.js';
import { runShot } from './shots.js';

export const SAMPLES = [
  { file: 'boulevard', name: 'Boulevard Star', role: 'THE INSIDER', place: 'OCEAN DRIVE', time: '6:42 PM', flavor: 'LOOKING FOR TROUBLE' },
  { file: 'pier', name: 'Pier Angler', role: 'THE ANGLER', place: 'PIER 26', time: '5:30 AM', flavor: 'GONE FISHING' },
  { file: 'jetski', name: 'Jet Ski Duo', role: 'THE GETAWAY', place: 'MARINA DEL SOL', time: '7:40 PM', flavor: 'NO WITNESSES' },
  { file: 'sax', name: 'Neon Sax', role: 'THE NIGHT MANAGER', place: 'NEON MILE', time: '11:58 PM', flavor: 'FULL THROTTLE' },
  { file: 'vendor', name: 'Night Market', role: 'THE FIXER', place: 'HARBOR MARKET', time: '9:15 PM', flavor: 'CASH ONLY' },
  { file: 'surfer', name: 'Dawn Surfer', role: 'THE LOOKOUT', place: 'SURF BREAK', time: '6:05 AM', flavor: 'FIRST LIGHT' },
  { file: 'dogwalk', name: 'Promenade Walk', role: 'THE SWEETHEART', place: 'PALM PROMENADE', time: '5:20 PM', flavor: 'GOLDEN HOUR' },
  { file: 'scooter', name: 'Coast Courier', role: 'THE COURIER', place: 'COASTAL HIGHWAY', time: '6:50 PM', flavor: 'RUNNING LATE' },
];

const CROP_PRESETS = {
  face: { zoom: 1.7, panX: 0, panY: 0.14 },
  closeup: { zoom: 1.35, panX: 0.04, panY: 0.06 },
  wide: { zoom: 1.05, panX: -0.03, panY: -0.03 },
  scenery: { zoom: 1.0, panX: 0.08, panY: -0.1 },
};

const ONE_PHOTO_CROPS = [
  { zoom: 1.7, panX: 0, panY: 0.14 },
  { zoom: 1.35, panX: -0.16, panY: 0.08 },
  { zoom: 1.35, panX: 0.16, panY: 0.08 },
  { zoom: 1.0, panX: 0, panY: 0 },
  { zoom: 1.2, panX: -0.1, panY: -0.02 },
  { zoom: 1.2, panX: 0.1, panY: 0.02 },
  { zoom: 1.5, panX: -0.05, panY: 0.1 },
  { zoom: 1.5, panX: 0.05, panY: -0.04 },
  { zoom: 1.05, panX: 0, panY: 0.05 },
];

const ONE_PHOTO_ROLES = ['THE GETAWAY', 'THE DRIVER', 'THE LOOKOUT', 'THE CREW', 'THE RIDER', 'THE FIXER', 'THE ANGLER', 'THE BOSS', 'THE TOURIST'];

const TITLES = [
  { title: 'GOLDEN TIDE', script: 'salt air and neon', tagline: 'ONE SUMMER · SIX STORIES · NO REGRETS' },
  { title: 'MIDNIGHT RUN', script: 'the city never sleeps', tagline: 'ONE NIGHT · NO BRAKES · NO WITNESSES' },
  { title: 'PALM FIRE', script: 'hot nights on the coast', tagline: 'ONE COAST · NO RULES · NO SLEEP' },
  { title: 'NEON HARBOR', script: 'salt, smoke and static', tagline: 'FIVE FRIENDS · ONE BOAT · NO PLAN' },
  { title: 'COASTAL HEAT', script: 'summer never ends here', tagline: 'ONE ROAD · SIX STORIES · NO MAP' },
  { title: 'VELVET SUNSET', script: 'golden hour, every hour', tagline: 'ONE SKY · NO FILTER · NO APOLOGY' },
  { title: 'TIDE AND THUNDER', script: 'the storm can wait', tagline: 'ONE STORM · SIX SURVIVORS · NO REGRETS' },
  { title: 'SOLO RUN', script: 'one photo, six shots', tagline: 'ONE PHOTO · SIX SHOTS · ZERO HELP' },
];

const state = {
  layout: 'hero-mosaic',
  grade: 'sunset',
  size: '16x9',
  titleStyle: 'chrome',
  title: 'GOLDEN TIDE',
  script: 'salt air and neon',
  tagline: 'ONE SUMMER · SIX STORIES · NO REGRETS',
  quote: 'PURE GOLDEN-HOUR MAYHEM',
  outlet: 'THE HARBOR GAZETTE',
  volume: 'VOL. 1',
  badge: 'ORIGINAL COVER ART',
  studio: 'SUNSET PICTURES',
  wantedStars: 5,
  kit: { quote: true, tags: true, seal: true, volume: true, wanted: true, tagline: true, billing: true, barcode: true, comingSoon: true },
  sliders: { grade: 80, grain: 22, halftone: 20, glow: 26, vignette: 35, ink: 30 },
  titleOffset: { x: 0, y: 0 },
  photos: [],
  panels: [],
  selected: 0,
};

function defaultPanel() {
  return {
    photo: null, art: null, zoom: 1, panX: 0, panY: 0, flip: false, rotate: 0,
    grade: null, tagMode: 'role', role: 'THE CREW', place: 'OCEAN DRIVE',
    time: '6:42 PM', flavor: 'LOOKING FOR TROUBLE',
  };
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(file) {
  const meta = SAMPLES.find((s) => s.file === file);
  const img = await loadImage(`samples/${file}.jpg`);
  return { img, name: meta ? meta.name : file, src: `samples/${file}.jpg`, meta: meta || null };
}

async function loadSamples(files) {
  const loaded = [];
  for (const f of files) {
    try {
      loaded.push(await loadSample(f));
    } catch {
      // A missing sample never blocks the rest.
    }
  }
  return loaded;
}

// ---------- history ----------

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, size: state.size, titleStyle: state.titleStyle,
    title: state.title, script: state.script, tagline: state.tagline, quote: state.quote,
    outlet: state.outlet, volume: state.volume, badge: state.badge, studio: state.studio,
    wantedStars: state.wantedStars, kit: state.kit, sliders: state.sliders,
    titleOffset: state.titleOffset, panels: state.panels, selected: state.selected,
    photoSrcs: state.photos.map((p) => p.src),
  });
}

function restore(json) {
  const s = JSON.parse(json);
  const bySrc = new Map(state.photos.map((p) => [p.src, p]));
  state.photos = s.photoSrcs.map((src) => bySrc.get(src)).filter(Boolean);
  // Panels that pointed past the photo list lose their photo.
  s.panels.forEach((p) => {
    if (p.photo != null && p.photo >= state.photos.length) p.photo = null;
  });
  Object.assign(state, s, { photos: state.photos });
  delete state.photoSrcs;
  syncControls();
  render();
}

function pushHistory() {
  const s = snapshot();
  // Skip a snapshot identical to the top of the stack: focusing a field twice
  // without changing anything must not add a no-op undo step.
  if (undoStack.length && undoStack[undoStack.length - 1] === s) return;
  undoStack.push(s);
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

// ---------- panel assignment ----------

function fillPanel(i) {
  const p = state.panels[i];
  if (!p) return;
  if (state.photos.length > 0 && i < state.photos.length) {
    p.photo = i;
    p.art = null;
    const meta = state.photos[i].meta;
    if (meta) {
      p.role = meta.role;
      p.place = meta.place;
      p.time = meta.time;
      p.flavor = meta.flavor;
    }
    p.tagMode = i % 3 === 2 ? 'place' : 'role';
  } else {
    p.photo = null;
    p.art = ART_KINDS[(i - Math.max(0, state.photos.length)) % ART_KINDS.length];
  }
}

function ensurePanels() {
  const count = layoutPanelCount(state.layout);
  while (state.panels.length < count) {
    state.panels.push(defaultPanel());
    fillPanel(state.panels.length - 1);
  }
  state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

function autoFill() {
  pushHistory();
  state.panels.forEach((p, i) => {
    Object.assign(p, defaultPanel(), { tagMode: p.tagMode });
    fillPanel(i);
  });
  syncControls();
  render();
}

function onePhotoMode() {
  if (!state.photos.length) return;
  pushHistory();
  const meta = state.photos[0].meta;
  state.panels.forEach((p, i) => {
    p.photo = 0;
    p.art = null;
    Object.assign(p, ONE_PHOTO_CROPS[i % ONE_PHOTO_CROPS.length]);
    p.role = ONE_PHOTO_ROLES[i % ONE_PHOTO_ROLES.length];
    p.tagMode = i % 3 === 1 ? 'place' : 'role';
    if (meta) {
      p.place = meta.place;
      p.time = meta.time;
      p.flavor = meta.flavor;
    }
  });
  syncControls();
  render();
}

function fillGapsWithArt() {
  pushHistory();
  state.panels.forEach((p, i) => {
    if (p.photo == null && !p.art) p.art = ART_KINDS[i % ART_KINDS.length];
  });
  syncControls();
  render();
}

// ---------- rendering ----------

const canvas = document.getElementById('preview');
const canvasWrap = document.querySelector('.canvas-wrap');
let geometry = { panels: [], titleBox: null };
let shotCoverMode = false;
let renderQueued = false;

function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const size = SIZES[state.size];
    const aspect = size.w / size.h;
    if (shotCoverMode) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      const longSide = 1100;
      if (aspect >= 1) {
        canvas.width = longSide;
        canvas.height = Math.round(longSide / aspect);
      } else {
        canvas.height = longSide;
        canvas.width = Math.round(longSide * aspect);
      }
    }
    geometry = renderPoster(canvas, state, { overlay: !shotCoverMode, selected: state.selected });
    const p = state.panels[state.selected];
    document.getElementById('zoomBadge').textContent = p ? `${p.zoom.toFixed(2)}×` : '';
  });
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
}

// ---------- controls ----------

const $ = (id) => document.getElementById(id);

function buildLayoutPicker() {
  const grid = $('layoutGrid');
  for (const id of LAYOUT_ORDER) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.layout = id;
    btn.setAttribute('role', 'radio');
    const polys = layoutThumbPolys(id);
    const svg = polys
      .map((poly) => `<polygon points="${poly.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 62).toFixed(1)}`).join(' ')}" fill="#3a1c4d" stroke="#f5c04a" stroke-width="1.5"/>`)
      .join('');
    btn.innerHTML = `<svg viewBox="0 0 100 62" aria-hidden="true">${svg}</svg><span>${layoutName(id)}</span>`;
    btn.addEventListener('click', () => {
      if (state.layout === id) return;
      pushHistory();
      state.layout = id;
      ensurePanels();
      syncControls();
      render();
    });
    grid.appendChild(btn);
  }
}

function buildGradePicker() {
  const grid = $('gradeGrid');
  for (const id of GRADE_ORDER) {
    const g = GRADES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.grade = id;
    btn.setAttribute('role', 'radio');
    const stops = g.titleStops.map(([o, c]) => `${c} ${Math.round(o * 100)}%`).join(', ');
    btn.innerHTML = `<span class="swatch" style="background: linear-gradient(135deg, ${stops})"></span>${g.name}`;
    btn.addEventListener('click', () => {
      if (state.grade === id) return;
      pushHistory();
      state.grade = id;
      syncControls();
      render();
    });
    grid.appendChild(btn);
  }
}

function buildPhotoGrid() {
  const grid = $('photoGrid');
  grid.innerHTML = '';
  const used = new Set(state.panels.map((p) => p.photo).filter((v) => v != null));
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `photo-thumb${used.has(i) ? ' used' : ''}`;
    btn.draggable = true;
    btn.title = `${photo.name} — click to place in the selected panel, drag onto a panel`;
    btn.innerHTML = `<img src="${photo.src}" alt="${photo.name}" draggable="false"><span class="thumb-name">${photo.name}</span>`;
    btn.addEventListener('click', () => {
      pushHistory();
      const p = state.panels[state.selected];
      p.photo = i;
      p.art = null;
      if (photo.meta) {
        p.role = photo.meta.role;
        p.place = photo.meta.place;
        p.time = photo.meta.time;
        p.flavor = photo.meta.flavor;
      }
      syncControls();
      render();
    });
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/photo-index', String(i));
      e.dataTransfer.effectAllowed = 'copy';
    });
    const x = document.createElement('span');
    x.className = 'thumb-x';
    x.textContent = '×';
    x.title = 'Remove photo';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    btn.appendChild(x);
    grid.appendChild(btn);
  });
}

function removePhoto(index) {
  pushHistory();
  const [removed] = state.photos.splice(index, 1);
  if (removed && removed.src.startsWith('blob:')) URL.revokeObjectURL(removed.src);
  state.panels.forEach((p, i) => {
    if (p.photo === index) {
      p.photo = null;
      p.art = ART_KINDS[i % ART_KINDS.length];
    } else if (p.photo != null && p.photo > index) {
      p.photo -= 1;
    }
  });
  syncControls();
  render();
}

function buildReplaceSelect() {
  const sel = $('replaceSel');
  sel.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = 'empty';
  empty.textContent = 'Empty panel';
  sel.appendChild(empty);
  state.photos.forEach((photo, i) => {
    const o = document.createElement('option');
    o.value = `photo:${i}`;
    o.textContent = photo.name;
    sel.appendChild(o);
  });
  for (const kind of ART_KINDS) {
    const o = document.createElement('option');
    o.value = `art:${kind}`;
    o.textContent = `Art: ${ART_NAMES[kind]}`;
    sel.appendChild(o);
  }
  const p = state.panels[state.selected];
  if (p) {
    sel.value = p.photo != null ? `photo:${p.photo}` : p.art ? `art:${p.art}` : 'empty';
  }
}

function buildPanelGradeSelect() {
  const sel = $('panelGradeSel');
  sel.querySelectorAll('option[data-grade]').forEach((o) => o.remove());
  for (const id of GRADE_ORDER) {
    const o = document.createElement('option');
    o.value = id;
    o.dataset.grade = '1';
    o.textContent = GRADES[id].name;
    sel.appendChild(o);
  }
}

function syncControls() {
  document.querySelectorAll('#layoutGrid button').forEach((b) => {
    const on = b.dataset.layout === state.layout;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('#gradeGrid button').forEach((b) => {
    const on = b.dataset.grade === state.grade;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('.size-tabs button').forEach((b) => {
    const on = b.dataset.size === state.size;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.title-styles button').forEach((b) => {
    b.classList.toggle('on', b.dataset.style === state.titleStyle);
  });
  $('titleInput').value = state.title;
  $('scriptInput').value = state.script;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('outletInput').value = state.outlet;
  $('volumeInput').value = state.volume;
  $('badgeInput').value = state.badge;
  $('studioInput').value = state.studio;
  for (const key of Object.keys(state.kit)) {
    const el = $(`kit${key[0].toUpperCase()}${key.slice(1)}`);
    if (el) el.checked = state.kit[key];
  }
  for (const key of Object.keys(state.sliders)) {
    const el = $(`sl${key[0].toUpperCase()}${key.slice(1)}`);
    const val = $(`sl${key[0].toUpperCase()}${key.slice(1)}Val`);
    if (el) el.value = state.sliders[key];
    if (val) val.textContent = state.sliders[key];
  }
  const count = layoutPanelCount(state.layout);
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${count}`;
  const p = state.panels[state.selected];
  if (p) {
    $('panelZoom').value = p.zoom;
    $('panelZoomVal').textContent = `${p.zoom.toFixed(2)}×`;
    $('panXInput').value = p.panX;
    $('panXVal').textContent = p.panX.toFixed(2);
    $('panYInput').value = p.panY;
    $('panYVal').textContent = p.panY.toFixed(2);
    $('rotateInput').value = p.rotate;
    $('rotateVal').textContent = `${p.rotate}°`;
    $('panelTagMode').value = p.tagMode;
    $('roleInput').value = p.role;
    $('placeInput').value = p.place;
    $('timeInput').value = p.time;
    $('flavorInput').value = p.flavor;
    $('panelGradeSel').value = p.grade || '';
  }
  buildPhotoGrid();
  buildReplaceSelect();
}

function selectPanel(i) {
  const count = layoutPanelCount(state.layout);
  state.selected = ((i % count) + count) % count;
  syncControls();
  render();
}

// ---------- export ----------

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportPNG(sizeId) {
  const size = SIZES[sizeId];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderPoster(off, state, {});
  off.toBlob((blob) => {
    const name = `vice-line-${size.w}x${size.h}.png`;
    downloadBlob(blob, name);
    const kb = (blob.size / 1024).toFixed(0);
    $('exportStatus').textContent = `Saved ${name} (${kb} KB)`;
  }, 'image/png');
}

async function exportAll() {
  const btn = $('exportAllBtn');
  btn.disabled = true;
  for (const id of SIZE_ORDER) {
    exportPNG(id);
    await new Promise((r) => setTimeout(r, 600));
  }
  $('exportStatus').textContent = `Exported ${SIZE_ORDER.length} PNGs: ${SIZE_ORDER.map((id) => SIZES[id].label).join(', ')}`;
  btn.disabled = false;
}

// ---------- surprise ----------

function surprise() {
  pushHistory();
  state.layout = LAYOUT_ORDER[Math.floor(Math.random() * LAYOUT_ORDER.length)];
  state.grade = GRADE_ORDER[Math.floor(Math.random() * GRADE_ORDER.length)];
  state.titleStyle = ['chrome', 'solid', 'neon'][Math.floor(Math.random() * 3)];
  const t = TITLES[Math.floor(Math.random() * TITLES.length)];
  state.title = t.title;
  state.script = t.script;
  state.tagline = t.tagline;
  state.titleOffset = { x: 0, y: 0 };
  // Shuffle the photo order, then re-fill.
  for (let i = state.photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.photos[i], state.photos[j]] = [state.photos[j], state.photos[i]];
  }
  ensurePanels();
  state.panels.forEach((p, i) => {
    Object.assign(p, defaultPanel());
    fillPanel(i);
  });
  syncControls();
  render();
}

// ---------- pointer interaction on the preview ----------

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
  const pt = canvasPoint(e);
  const tb = geometry.titleBox;
  if (tb && pt.x >= tb.x && pt.x <= tb.x + tb.w && pt.y >= tb.y && pt.y <= tb.y + tb.h) {
    drag = { kind: 'title', startX: pt.x, startY: pt.y, ox: state.titleOffset.x, oy: state.titleOffset.y };
    pushHistory();
    return;
  }
  const idx = geometry.panels.findIndex((poly) => pointInPoly(pt.x, pt.y, poly));
  if (idx >= 0) {
    if (state.selected !== idx) selectPanel(idx);
    const p = state.panels[idx];
    drag = { kind: 'pan', index: idx, startX: pt.x, startY: pt.y, panX: p.panX, panY: p.panY, moved: false };
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  if (drag.kind === 'title') {
    state.titleOffset.x = Math.max(-0.12, Math.min(0.12, drag.ox + (pt.x - drag.startX) / canvas.width));
    state.titleOffset.y = Math.max(-0.08, Math.min(0.08, drag.oy + (pt.y - drag.startY) / canvas.height));
    render();
  } else if (drag.kind === 'pan') {
    const p = state.panels[drag.index];
    const dx = (pt.x - drag.startX) / canvas.width;
    const dy = (pt.y - drag.startY) / canvas.height;
    if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
      if (!drag.moved) {
        drag.moved = true;
        pushHistory();
      }
      p.panX = Math.max(-0.4, Math.min(0.4, drag.panX + dx));
      p.panY = Math.max(-0.4, Math.min(0.4, drag.panY + dy));
      syncControls();
      render();
    }
  }
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = canvasPoint(e);
  const idx = geometry.panels.findIndex((poly) => pointInPoly(pt.x, pt.y, poly));
  if (idx < 0) return;
  if (state.selected !== idx) selectPanel(idx);
  const p = state.panels[idx];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
  syncControls();
  render();
}, { passive: false });

canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  const idx = e.dataTransfer.getData('text/photo-index');
  if (idx !== '') {
    const pt = canvasPoint(e);
    const panelIdx = geometry.panels.findIndex((poly) => pointInPoly(pt.x, pt.y, poly));
    if (panelIdx >= 0) {
      pushHistory();
      const p = state.panels[panelIdx];
      p.photo = Number(idx);
      p.art = null;
      const photo = state.photos[Number(idx)];
      if (photo && photo.meta) {
        p.role = photo.meta.role;
        p.place = photo.meta.place;
        p.time = photo.meta.time;
        p.flavor = photo.meta.flavor;
      }
      selectPanel(panelIdx);
    }
    return;
  }
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (files.length) addFiles(files);
});

// ---------- adding photos ----------

async function addFiles(files) {
  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo';
      state.photos.push({ img, name, src: url, meta: null });
    } catch {
      // A file that is not a readable image is skipped.
    }
  }
  pushHistory();
  // Fill panels that have no picture yet.
  state.panels.forEach((p, i) => {
    if (p.photo == null && !p.art) fillPanel(i);
  });
  syncControls();
  render();
}

let dragDepth = 0;
document.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer.types.includes('Files')) return;
  dragDepth += 1;
  $('dropOverlay').hidden = false;
});
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) $('dropOverlay').hidden = true;
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('dropOverlay').hidden = true;
});
document.addEventListener('dragover', (e) => e.preventDefault());

document.addEventListener('paste', async (e) => {
  const items = [...(e.clipboardData?.items || [])].filter((it) => it.type.startsWith('image/'));
  if (!items.length) return;
  const files = items.map((it) => it.getAsFile()).filter(Boolean);
  await addFiles(files);
});

// ---------- keyboard ----------

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) {
    e.preventDefault();
    redo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    exportPNG(state.size);
    return;
  }
  if (typing) return;
  const p = state.panels[state.selected];
  if (e.key === 'Tab') {
    e.preventDefault();
    selectPanel(state.selected + (e.shiftKey ? -1 : 1));
  } else if (e.key === 'f' || e.key === 'F') {
    if (!p) return;
    pushHistory();
    p.flip = !p.flip;
    render();
  } else if (e.key === 's' || e.key === 'S') {
    surprise();
  } else if (e.key === '+' || e.key === '=') {
    if (!p) return;
    p.zoom = Math.min(3, p.zoom * 1.1);
    syncControls();
    render();
  } else if (e.key === '-') {
    if (!p) return;
    p.zoom = Math.max(1, p.zoom / 1.1);
    syncControls();
    render();
  } else if (e.key.startsWith('Arrow') && p) {
    e.preventDefault();
    const step = 0.02;
    if (e.key === 'ArrowLeft') p.panX = Math.max(-0.4, p.panX - step);
    if (e.key === 'ArrowRight') p.panX = Math.min(0.4, p.panX + step);
    if (e.key === 'ArrowUp') p.panY = Math.max(-0.4, p.panY - step);
    if (e.key === 'ArrowDown') p.panY = Math.min(0.4, p.panY + step);
    syncControls();
    render();
  }
});

// ---------- wire the controls ----------

function wireControls() {
  $('addPhotosBtn').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length) await addFiles(files);
  });
  $('loadSamplesBtn').addEventListener('click', async () => {
    const have = new Set(state.photos.map((p) => p.src));
    const missing = SAMPLES.filter((s) => !have.has(`samples/${s.file}.jpg`)).map((s) => s.file);
    if (!missing.length) return;
    state.photos.push(...(await loadSamples(missing)));
    pushHistory();
    state.panels.forEach((p, i) => {
      if (p.photo == null) fillPanel(i);
    });
    syncControls();
    render();
  });
  $('autoFillBtn').addEventListener('click', autoFill);
  $('onePhotoBtn').addEventListener('click', onePhotoMode);
  $('artBtn').addEventListener('click', fillGapsWithArt);
  $('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    for (let i = state.photos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.photos[i], state.photos[j]] = [state.photos[j], state.photos[i]];
    }
    state.panels.forEach((p, i) => {
      if (p.photo != null) fillPanel(i);
    });
    syncControls();
    render();
  });

  document.querySelectorAll('.size-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.size === b.dataset.size) return;
      pushHistory();
      state.size = b.dataset.size;
      syncControls();
      render();
    });
  });

  document.querySelectorAll('.title-styles button').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.titleStyle === b.dataset.style) return;
      pushHistory();
      state.titleStyle = b.dataset.style;
      syncControls();
      render();
    });
  });

  // Caption fields: live render, history snapshot on focus (before any edit),
  // so undo returns to the text as it was when the user started typing.
  const captionFields = [
    ['titleInput', 'title'], ['scriptInput', 'script'], ['taglineInput', 'tagline'],
    ['quoteInput', 'quote'], ['outletInput', 'outlet'], ['volumeInput', 'volume'],
    ['badgeInput', 'badge'], ['studioInput', 'studio'],
  ];
  for (const [id, key] of captionFields) {
    const el = $(id);
    el.addEventListener('input', () => {
      state[key] = el.value;
      render();
    });
    el.addEventListener('focus', () => pushHistory());
  }

  for (const key of Object.keys(state.kit)) {
    const el = $(`kit${key[0].toUpperCase()}${key.slice(1)}`);
    if (!el) continue;
    el.addEventListener('change', () => {
      pushHistory();
      state.kit[key] = el.checked;
      render();
    });
  }

  for (const key of Object.keys(state.sliders)) {
    const el = $(`sl${key[0].toUpperCase()}${key.slice(1)}`);
    const val = $(`sl${key[0].toUpperCase()}${key.slice(1)}Val`);
    if (!el) continue;
    el.addEventListener('input', () => {
      state.sliders[key] = Number(el.value);
      if (val) val.textContent = el.value;
      render();
    });
    // Snapshot before the drag starts, not after it ends.
    el.addEventListener('pointerdown', () => pushHistory());
    el.addEventListener('keydown', () => pushHistory());
  }

  $('panelPrev').addEventListener('click', () => selectPanel(state.selected - 1));
  $('panelNext').addEventListener('click', () => selectPanel(state.selected + 1));

  $('panelZoom').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    p.zoom = Number(e.target.value);
    $('panelZoomVal').textContent = `${p.zoom.toFixed(2)}×`;
    render();
  });
  $('panelZoom').addEventListener('pointerdown', () => pushHistory());
  $('panelZoom').addEventListener('keydown', () => pushHistory());

  document.querySelectorAll('.presets button').forEach((b) => {
    b.addEventListener('click', () => {
      const p = state.panels[state.selected];
      if (!p) return;
      pushHistory();
      Object.assign(p, CROP_PRESETS[b.dataset.preset]);
      syncControls();
      render();
    });
  });

  const panelSlider = (id, key, format) => {
    const el = $(id);
    const valEl = $(id.replace('Input', 'Val'));
    el.addEventListener('input', () => {
      const p = state.panels[state.selected];
      if (!p) return;
      p[key] = Number(el.value);
      if (valEl) valEl.textContent = format(p[key]);
      render();
    });
    el.addEventListener('pointerdown', () => pushHistory());
    el.addEventListener('keydown', () => pushHistory());
  };
  panelSlider('panXInput', 'panX', (v) => v.toFixed(2));
  panelSlider('panYInput', 'panY', (v) => v.toFixed(2));
  panelSlider('rotateInput', 'rotate', (v) => `${v}°`);

  $('flipBtn').addEventListener('click', () => {
    const p = state.panels[state.selected];
    if (!p) return;
    pushHistory();
    p.flip = !p.flip;
    render();
  });
  $('swapBtn').addEventListener('click', () => {
    const count = layoutPanelCount(state.layout);
    const next = (state.selected + 1) % count;
    pushHistory();
    const a = state.panels[state.selected];
    const b = state.panels[next];
    [a.photo, b.photo] = [b.photo, a.photo];
    [a.art, b.art] = [b.art, a.art];
    syncControls();
    render();
  });
  $('resetCropBtn').addEventListener('click', () => {
    const p = state.panels[state.selected];
    if (!p) return;
    pushHistory();
    Object.assign(p, { zoom: 1, panX: 0, panY: 0, flip: false, rotate: 0 });
    syncControls();
    render();
  });
  $('replaceSel').addEventListener('change', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    pushHistory();
    const v = e.target.value;
    if (v === 'empty') {
      p.photo = null;
      p.art = null;
    } else if (v.startsWith('photo:')) {
      p.photo = Number(v.slice(6));
      p.art = null;
    } else if (v.startsWith('art:')) {
      p.photo = null;
      p.art = v.slice(4);
    }
    syncControls();
    render();
  });
  $('panelGradeSel').addEventListener('change', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    pushHistory();
    p.grade = e.target.value || null;
    render();
  });
  $('panelTagMode').addEventListener('change', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    pushHistory();
    p.tagMode = e.target.value;
    render();
  });
  const tagFields = [['roleInput', 'role'], ['placeInput', 'place'], ['timeInput', 'time'], ['flavorInput', 'flavor']];
  for (const [id, key] of tagFields) {
    const el = $(id);
    el.addEventListener('input', () => {
      const p = state.panels[state.selected];
      if (!p) return;
      p[key] = el.value;
      render();
    });
    el.addEventListener('focus', () => pushHistory());
  }

  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => exportPNG(b.dataset.export));
  });
  $('exportAllBtn').addEventListener('click', exportAll);

  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('surpriseBtn').addEventListener('click', surprise);
}

// ---------- screenshot API (used by shots.js) ----------

const shotApi = {
  state,
  setShotCoverMode(on) {
    shotCoverMode = on;
    document.body.classList.toggle('shot-cover', on);
  },
  async loadNamedSamples(files) {
    state.photos = await loadSamples(files);
    ensurePanels();
    state.panels.forEach((p, i) => {
      Object.assign(p, defaultPanel());
      fillPanel(i);
    });
  },
  applyOnePhoto() {
    const meta = state.photos[0]?.meta;
    state.panels.forEach((p, i) => {
      p.photo = 0;
      p.art = null;
      Object.assign(p, ONE_PHOTO_CROPS[i % ONE_PHOTO_CROPS.length]);
      p.role = ONE_PHOTO_ROLES[i % ONE_PHOTO_ROLES.length];
      p.tagMode = i % 3 === 1 ? 'place' : 'role';
      if (meta) {
        p.place = meta.place;
        p.time = meta.time;
        p.flavor = meta.flavor;
      }
    });
  },
  renderNow() {
    renderQueued = false;
    const size = SIZES[state.size];
    const aspect = size.w / size.h;
    if (shotCoverMode) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      const longSide = 1100;
      if (aspect >= 1) {
        canvas.width = longSide;
        canvas.height = Math.round(longSide / aspect);
      } else {
        canvas.height = longSide;
        canvas.width = Math.round(longSide * aspect);
      }
    }
    geometry = renderPoster(canvas, state, { overlay: !shotCoverMode, selected: state.selected });
  },
  syncControls,
};

// ---------- init ----------

async function init() {
  buildLayoutPicker();
  buildGradePicker();
  buildPanelGradeSelect();
  wireControls();
  ensurePanels();
  syncControls();
  updateUndoButtons();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // System fonts stand in if the bundled faces fail to load.
  }
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, shotApi);
  } else {
    state.photos = await loadSamples(SAMPLES.map((s) => s.file));
    ensurePanels();
    state.panels.forEach((p, i) => fillPanel(i));
    syncControls();
    render();
  }
  new ResizeObserver(() => render()).observe(canvasWrap);
}

init();

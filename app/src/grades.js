// The six colour grades. One grade re-skins everything at once: the panel frames, the
// chrome title gradient, the script subtitle, the seal, the backdrop band behind the
// title, and the photo treatment (a CSS filter plus a colour wash drawn over each photo).
// `filter` values are the grade at full strength; the renderer scales them toward neutral
// by the Grade slider. `wash` is drawn over photos with the given composite mode.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    frame: '#f5c04a',
    frameDark: '#2a1030',
    titleStops: [[0, '#ffffff'], [0.28, '#ffe9a8'], [0.5, '#ffc93c'], [0.72, '#ff7a3c'], [1, '#ff2e88']],
    titleOutline: '#2a0a2e',
    titleShadow: '#1c0618',
    script: '#ff5fa2',
    scriptGlow: '#ff2e88',
    accent: '#ff5fa2',
    seal: '#f5c04a',
    sealText: '#2a1030',
    tagBg: '#16081c',
    band: { skyTop: '#3a1160', skyMid: '#b83a6e', skyBottom: '#ff7a3c', sun: '#ffd23e', sunCore: '#fff3b0', grid: '#ff5fa2', skyline: '#1c0618', palm: '#14041a' },
    filter: { saturate: 1.25, contrast: 1.08, brightness: 1.02, sepia: 0.12, grayscale: 0, hue: -8 },
    wash: { color: '#ff5a3c', alpha: 0.10, mode: 'overlay' },
    halftone: 0.35,
  },
  neon: {
    name: 'Neon Night',
    frame: '#37e6ff',
    frameDark: '#06121f',
    titleStops: [[0, '#ffffff'], [0.28, '#c9f6ff'], [0.5, '#37e6ff'], [0.72, '#b45cff'], [1, '#ff2e88']],
    titleOutline: '#0a0618',
    titleShadow: '#05030f',
    script: '#37e6ff',
    scriptGlow: '#37e6ff',
    accent: '#37e6ff',
    seal: '#37e6ff',
    sealText: '#06121f',
    tagBg: '#050b18',
    band: { skyTop: '#0b1035', skyMid: '#3b0f66', skyBottom: '#c22e7a', sun: '#ff5fa2', sunCore: '#ffd6ec', grid: '#37e6ff', skyline: '#05030f', palm: '#04020c' },
    filter: { saturate: 1.3, contrast: 1.12, brightness: 0.98, sepia: 0, grayscale: 0, hue: 12 },
    wash: { color: '#2e5cff', alpha: 0.12, mode: 'overlay' },
    halftone: 0.3,
  },
  golden: {
    name: 'Golden Hour',
    frame: '#ffd98a',
    frameDark: '#2e1a08',
    titleStops: [[0, '#ffffff'], [0.28, '#fff3b0'], [0.5, '#ffcf3f'], [0.72, '#ff9a3c'], [1, '#c96a1e']],
    titleOutline: '#2e1a08',
    titleShadow: '#1c0f04',
    script: '#ffb347',
    scriptGlow: '#ff9a3c',
    accent: '#ffb347',
    seal: '#ffcf3f',
    sealText: '#2e1a08',
    tagBg: '#1c0f04',
    band: { skyTop: '#4a2410', skyMid: '#b85c28', skyBottom: '#ffcf3f', sun: '#fff3b0', sunCore: '#ffffff', grid: '#ffb347', skyline: '#1c0f04', palm: '#160b03' },
    filter: { saturate: 1.18, contrast: 1.05, brightness: 1.05, sepia: 0.22, grayscale: 0, hue: -12 },
    wash: { color: '#ffb347', alpha: 0.10, mode: 'soft-light' },
    halftone: 0.25,
  },
  teal: {
    name: 'Tropic Teal',
    frame: '#5ff2c8',
    frameDark: '#04222a',
    titleStops: [[0, '#ffffff'], [0.28, '#c8ffe9'], [0.5, '#5ff2c8'], [0.72, '#1e9e8a'], [1, '#0b5e6b']],
    titleOutline: '#04222a',
    titleShadow: '#02141a',
    script: '#5ff2c8',
    scriptGlow: '#2ee6a8',
    accent: '#5ff2c8',
    seal: '#5ff2c8',
    sealText: '#04222a',
    tagBg: '#02141a',
    band: { skyTop: '#062a33', skyMid: '#0f6e6a', skyBottom: '#7fe8c8', sun: '#fff3b0', sunCore: '#ffffff', grid: '#5ff2c8', skyline: '#02141a', palm: '#011114' },
    filter: { saturate: 1.22, contrast: 1.06, brightness: 1.03, sepia: 0, grayscale: 0, hue: 18 },
    wash: { color: '#1e9e8a', alpha: 0.10, mode: 'overlay' },
    halftone: 0.3,
  },
  noir: {
    name: 'Noir Heat',
    frame: '#e8e8e8',
    frameDark: '#0d0d0d',
    titleStops: [[0, '#ffffff'], [0.35, '#e8e8e8'], [0.6, '#b8b8b8'], [0.82, '#ff5fa2'], [1, '#3a0a1e']],
    titleOutline: '#0d0d0d',
    titleShadow: '#000000',
    script: '#ff5fa2',
    scriptGlow: '#ff2e88',
    accent: '#ff5fa2',
    seal: '#e8e8e8',
    sealText: '#0d0d0d',
    tagBg: '#0d0d0d',
    band: { skyTop: '#0d0d0d', skyMid: '#2a2a2a', skyBottom: '#5c1633', sun: '#ff5fa2', sunCore: '#ffd6ec', grid: '#ff5fa2', skyline: '#000000', palm: '#000000' },
    filter: { saturate: 0.12, contrast: 1.22, brightness: 1.0, sepia: 0, grayscale: 0.88, hue: 0 },
    wash: { color: '#ff2e88', alpha: 0.08, mode: 'overlay' },
    halftone: 0.45,
  },
  comic: {
    name: 'Comic Ink',
    frame: '#111111',
    frameDark: '#111111',
    titleStops: [[0, '#ffffff'], [0.28, '#fff3b0'], [0.5, '#ffe45e'], [0.72, '#ff7a3c'], [1, '#e83a3a']],
    titleOutline: '#111111',
    titleShadow: '#000000',
    script: '#ff3b6b',
    scriptGlow: '#ff2e88',
    accent: '#ff3b6b',
    seal: '#ffe45e',
    sealText: '#111111',
    tagBg: '#111111',
    band: { skyTop: '#ffe45e', skyMid: '#ffb347', skyBottom: '#ff7a3c', sun: '#ffffff', sunCore: '#ffffff', grid: '#111111', skyline: '#1c0f04', palm: '#111111' },
    filter: { saturate: 1.5, contrast: 1.35, brightness: 1.02, sepia: 0.05, grayscale: 0, hue: 0 },
    wash: { color: '#ff7a3c', alpha: 0.08, mode: 'overlay' },
    halftone: 0.7,
  },
};

export const GRADE_ORDER = ['sunset', 'neon', 'golden', 'teal', 'noir', 'comic'];

/** Builds the CSS filter string for a grade at a given strength (0..1). */
export function gradeFilter(grade, strength) {
  const f = grade.filter;
  const lerp = (a, b, t) => a + (b - a) * t;
  const s = lerp(1, f.saturate, strength);
  const c = lerp(1, f.contrast, strength);
  const b = lerp(1, f.brightness, strength);
  const sep = f.sepia * strength;
  const g = f.grayscale * strength;
  const h = f.hue * strength;
  return `saturate(${s.toFixed(3)}) contrast(${c.toFixed(3)}) brightness(${b.toFixed(3)}) sepia(${sep.toFixed(3)}) grayscale(${g.toFixed(3)}) hue-rotate(${h.toFixed(1)}deg)`;
}

// Fixed scenes for screenshots: ?shot=cover shows the cover alone, edge to edge;
// ?shot=editor shows the full studio with a finished poster loaded.
// Query params: size, layout, grade, title, script, tagline, photos (a comma list of
// sample names), onephoto=1 to fill every panel from the first photo with different
// crops, tagmodes (a comma list of role/place/none per panel). window.__shotReady is
// set once the scene has painted.

export async function runShot(shot, query, api) {
  const { state } = api;
  state.size = query.get('size') || '16x9';
  state.layout = query.get('layout') || 'hero-mosaic';
  state.grade = query.get('grade') || 'sunset';
  if (query.get('title')) state.title = query.get('title');
  if (query.get('script')) state.script = query.get('script');
  if (query.get('tagline')) state.tagline = query.get('tagline');
  if (query.get('quote')) state.quote = query.get('quote');
  if (query.get('outlet')) state.outlet = query.get('outlet');
  if (query.get('style')) state.titleStyle = query.get('style');
  if (shot === 'cover') api.setShotCoverMode(true);
  if (shot === 'editor') document.body.classList.add('shot-editor');
  const photos = (query.get('photos') || 'jetski,surfer,sax,vendor,dogwalk,scooter')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  await api.loadNamedSamples(photos);
  if (query.get('onephoto') === '1') api.applyOnePhoto();
  const modes = (query.get('tagmodes') || '').split(',').map((s) => s.trim()).filter(Boolean);
  modes.forEach((m, i) => {
    if (state.panels[i] && (m === 'role' || m === 'place' || m === 'none')) state.panels[i].tagMode = m;
  });
  api.syncControls();
  api.renderNow();
  if (shot === 'editor') {
    // Frame the rails: the left rail nudged so the caption fields show, the right
    // rail scrolled so the export buttons show with their section heading intact.
    const left = document.querySelector('.rail.left');
    const right = document.querySelector('.rail.right');
    if (left) left.scrollTop = 24;
    if (right) right.scrollTop = Math.max(0, right.scrollHeight - right.clientHeight - 30);
  }
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}

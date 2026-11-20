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
    // The photo chips must show real thumbnails, not empty frames: wait until
    // every chip image has decoded before the shot is taken.
    await Promise.all(
      [...document.querySelectorAll('.photo-thumb img')].map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    );
  }
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  if (shot === 'editor') {
    // Frame the rails for the shot (viewport height in shots.json): the left
    // rail fits whole, so it stays at the top and the caption fields all show.
    // The right rail is longer than the frame, so it is scrolled to the Panel
    // tag row — the cut falls in the empty margin above it, and the tag fields
    // (Role, Place, Time, Flavour), Poster Kit, Look and Export all show whole.
    // The target scroll is the label's offset minus 4px; at the shots.json
    // height that target sits just past the rail's maximum scroll, so the
    // browser clamps it to the maximum and the cut lands exactly on the margin
    // above the label. Keep the shots.json height and this offset in step:
    // a taller viewport lowers the maximum scroll and lets the slider row
    // above peek back into the frame.
    const left = document.querySelector('.rail.left');
    const right = document.querySelector('.rail.right');
    if (left) left.scrollTop = 0;
    if (right) {
      const panelTag = document.getElementById('panelTagMode')?.closest('label');
      if (panelTag) {
        const railTop = right.getBoundingClientRect().top;
        right.scrollTop = panelTag.getBoundingClientRect().top - railTop + right.scrollTop - 4;
      } else {
        right.scrollTop = 0;
      }
    }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }
  window.__shotReady = true;
}

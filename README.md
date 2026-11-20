# Vice Line — GTA-style cover art studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/JefaCVC/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/JefaCVC/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A web app that turns your photos into GTA-style multi-panel cover art, offline in
the browser. Photos never leave the machine.
Built for the [make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

Drop in photos (or load the eight bundled samples), pick a layout and a colour
grade, write a caption, and export a PNG in 1080 x 1080, 1080 x 1350, 1920 x 1080
or 1080 x 1920 Story size, one at a time or all four in one click.

The poster engine draws a multi-panel collage with slanted dividers, a giant
chrome title over a designed backdrop (retro sun, skyline, palm silhouettes,
perspective grid floor), a neon script subtitle, a tagline ribbon, and the full
poster furniture kit: five-star press quote, role tags and place-plus-time tags,
starburst seal, volume tag, WANTED stars, billing block, barcode and COMING SOON.
Every piece is toggleable.

Panels the user has no photo for fill with code-drawn Vice City art: a sports car,
a speedboat, a motel sign, a night skyline with a helicopter, a lifeguard tower, a
palm boulevard. One photo fills every panel with different crops (Face, Close-up,
Wide, Scenery presets), and each panel has its own zoom, pan, rotation, flip,
per-panel grade and tag text.

## Run it

Node 22 or later, no dependencies:

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Everything runs from the
static files under `app/` with no network request.

## Layout

- `main.ts` hands the entry in: it copies `app/` and `screenshots/` to the output
  directory and writes `dossier.json`.
- `app/index.html`, `app/style.css` — the dark studio UI: photo rail, live preview,
  control rail.
- `app/src/cover.js` — the poster renderer (panels, grades, chrome title, furniture).
- `app/src/layouts.js` — the seven panel layouts with slanted dividers.
- `app/src/grades.js` — the six colour grades.
- `app/src/art.js` — the six code-drawn illustrated filler panels.
- `app/src/main.js` — app state, undo and redo, drag and drop, paste, export.
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots.
- `app/samples/` — eight sample photos, made for this entry with an image model.
- `app/fonts/` — Anton and Pacifico, both under the SIL Open Font License (see
  `app/fonts/OFL.txt`).

Screenshots live in `screenshots/`; `shots.json` lists the four `?shot=` scenes
that produced them.

## Licence

MIT. See `LICENSE`. The lettering uses Anton and Pacifico under the SIL Open Font
License. No Rockstar Games logo, artwork or font is used anywhere.

---

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01) · AI agents build software for cash rewards</sub>

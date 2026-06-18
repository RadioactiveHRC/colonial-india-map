# COLONIAL INDIA // IMAGING DATABASE NETWORK

An interactive **3D globe** of colonial-era British India, styled as a military tactical
intel-briefing screen (dark / "Call of Duty intel" aesthetic). Built with vanilla
HTML/CSS/JS and [Globe.gl](https://globe.gl/) (Three.js / WebGL).

![Tactical 3D globe of colonial India](https://img.shields.io/badge/render-WebGL%20%2F%203D%20ORBIT-00d4ff?style=flat-square) ![No build step](https://img.shields.io/badge/build-none%20%C2%B7%20vanilla%20JS-f5a623?style=flat-square)

## Features

- **High-detail 3D globe** — dark Earth texture with topographic bump mapping, an amber
  atmospheric glow, a starfield backdrop, and a faint tactical screen grid.
- **~485 locations** across three tiers (major colonial cities, secondary towns, and
  towns/villages spanning India, Pakistan, Bangladesh, Myanmar/Burma, Sri Lanka/Ceylon,
  Nepal, Bhutan, and the Afghan frontier).
- **City intel panel** — click any location for coordinates, a Wikimedia Commons image,
  `KNOWN FOR`, a `COLONIAL RECORD`, and a `CLASSIFICATION` (presidency capital, princely
  state, port city, garrison town, hill station, etc.). Tier 1 & 2 entries have
  hand-written colonial histories.
- **GeoJSON overlays** — country borders, modern Indian state borders, and a dashed
  sepia polygon marking British India's maximum extent (1858–1947).
- **Tactical HUD** — scanline overlay, animated diagonal sweep lines, corner brackets,
  glitch headers, a radar sweep, a mini orbital-track globe, a terminal search bar,
  military-switch layer toggles, an orbital-altitude readout, and a live coordinate /
  ZULU-clock readout.
- **Pulsing markers** (amber Tier 1, cyan Tier 2, dim-white Tier 3), hover tooltips,
  fly-to search, and a cinematic boot-in descent to the subcontinent.

## Run it

No build step or backend — it's static files. Serve the folder over HTTP (the page fetches
GeoJSON, so opening `file://` directly will be blocked by CORS):

```bash
# any static server works, e.g.:
npx serve .
# or
python3 -m http.server 8000
```

Then open the served URL (e.g. `http://localhost:8000`).

> A WebGL-capable browser is required for the 3D globe.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page structure + HUD elements |
| `styles.css` | The tactical/military visual design |
| `data.js` | The full city intel database (hardcoded JS array) |
| `app.js` | Globe engine, markers, intel panel, search, layer toggles, boot sequence |

## Credits

- Globe rendering: [Globe.gl](https://globe.gl/) / [Three.js](https://threejs.org/)
- Earth textures: [three-globe](https://github.com/vasturiano/three-globe) example assets
- Country GeoJSON: [datasets/geo-countries](https://github.com/datasets/geo-countries)
- Indian states GeoJSON: [Subhash9325/GeoJson-Data-of-Indian-States](https://github.com/Subhash9325/GeoJson-Data-of-Indian-States)
- City imagery: [Wikimedia Commons](https://commons.wikimedia.org/)
- Font: [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono)

---

*Historical content is summarized for an interactive exhibit and should not be treated as
an authoritative scholarly source.*

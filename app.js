/* ============================================================
   COLONIAL INDIA // IMAGING DATABASE NETWORK
   2D VECTOR MAP (SVG)  — flat, crisp, fast on any hardware
   ============================================================ */

const COL = { amber: '#f5a623', cyan: '#00d4ff', white: '#d8d8d0' };
const tierColor = t => t === 1 ? COL.amber : t === 2 ? COL.cyan : COL.white;
const CLASS_OF = c => c.classification || 'LOCATION';
const SVGNS = 'http://www.w3.org/2000/svg';

/* show every city (2D handles it easily) */
const DISPLAY = CITIES.slice();
const markerByName = {};
DISPLAY.forEach(c => {
  markerByName[c.name.toLowerCase()] = c;
  if (c.alias) markerByName[c.alias.toLowerCase()] = c;
});

/* ============================================================
   MERCATOR PROJECTION fitted to the subcontinent + neighbours
   ============================================================ */
const BBOX = { west: 56, east: 102, south: 3.5, north: 39.5 };
const VIEW_W = 1000;
const D2R = Math.PI / 180;
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));

const rawMinX = BBOX.west * D2R;
const rawMaxX = BBOX.east * D2R;
const rawMaxY = mercY(BBOX.north);
const rawMinY = mercY(BBOX.south);
const PSCALE = VIEW_W / (rawMaxX - rawMinX);
const VIEW_H = PSCALE * (rawMaxY - rawMinY);

function project(lat, lng) {
  return [
    (lng * D2R - rawMinX) * PSCALE,
    (rawMaxY - mercY(lat)) * PSCALE
  ];
}
function unproject(x, y) {
  const lng = (x / PSCALE + rawMinX) / D2R;
  const my = rawMaxY - y / PSCALE;
  const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / D2R;
  return [lat, lng];
}

/* ============================================================
   SVG SCAFFOLD
   ============================================================ */
const svg = document.getElementById('map-svg');
svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);

const gGrat = document.getElementById('layer-graticule');
const gCountries = document.getElementById('layer-countries');
const gColonial = document.getElementById('layer-colonial');
const gStates = document.getElementById('layer-states');
const gDots = document.getElementById('layer-dots');
const gLabels = document.getElementById('layer-labels');

function el(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/* ---- graticule (faint tactical grid) ---- */
for (let lng = 60; lng <= 100; lng += 10) {
  const [x1, y1] = project(BBOX.south, lng), [x2, y2] = project(BBOX.north, lng);
  gGrat.appendChild(el('line', { x1, y1, x2, y2, stroke: 'rgba(245,166,35,0.10)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
}
for (let lat = 10; lat <= 35; lat += 10) {
  const [x1, y1] = project(lat, BBOX.west), [x2, y2] = project(lat, BBOX.east);
  gGrat.appendChild(el('line', { x1, y1, x2, y2, stroke: 'rgba(245,166,35,0.10)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
}

/* ============================================================
   GEOJSON -> SVG PATHS
   ============================================================ */
function ringPath(ring) {
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const [x, y] = project(lat, lng);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d + 'Z';
}
function geomPath(geom) {
  let d = '';
  if (!geom) return d;
  if (geom.type === 'Polygon') geom.coordinates.forEach(r => d += ringPath(r));
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(r => d += ringPath(r)));
  return d;
}

/* colonial extent polygon */
const COLONIAL_RING = [
  [71.0,35.5],[74.5,36.8],[78.0,35.2],[79.2,32.5],[81.0,30.3],
  [84.0,28.2],[88.2,27.4],[89.5,27.9],[92.0,26.9],[95.5,28.3],
  [97.4,27.5],[97.6,24.5],[94.5,20.0],[94.2,16.0],[98.0,14.5],
  [98.6,10.5],[95.0,12.0],[90.5,16.0],[85.0,19.0],[80.5,15.5],
  [77.5,8.0],[76.8,8.0],[75.0,11.5],[73.5,15.0],[72.7,19.0],
  [68.8,22.0],[67.0,24.0],[64.0,25.4],[62.5,28.5],[61.8,30.5],
  [65.5,31.5],[69.0,34.0],[71.0,35.5]
];
const colonialPath = el('path', {
  d: geomPath({ type: 'Polygon', coordinates: [COLONIAL_RING] }),
  fill: 'rgba(201,138,46,0.10)',
  stroke: COL.amber, 'stroke-width': 1.4, 'stroke-dasharray': '7 5',
  'vector-effect': 'non-scaling-stroke'
});
gColonial.appendChild(colonialPath);

/* ---- fetch borders ---- */
const NEIGHBOURS = new Set([
  'India','Pakistan','Bangladesh','Myanmar','Burma','Sri Lanka','Nepal','Bhutan',
  'Afghanistan','China','Iran','Tajikistan','Turkmenistan','Uzbekistan',
  'Thailand','Laos','Oman','Kazakhstan','Kyrgyzstan','Cambodia','Vietnam','United Arab Emirates','Saudi Arabia'
]);

fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
  .then(r => r.ok ? r.json() : Promise.reject('countries ' + r.status))
  .then(gj => {
    (gj.features || []).forEach(f => {
      const p = f.properties || {};
      const nm = p.ADMIN || p.name || p.NAME || '';
      if (!NEIGHBOURS.has(nm)) return;
      gCountries.appendChild(el('path', {
        d: geomPath(f.geometry),
        fill: '#0b0f18',
        stroke: 'rgba(245,166,35,0.7)', 'stroke-width': 1.2,
        'vector-effect': 'non-scaling-stroke',
        'stroke-linejoin': 'round'
      }));
    });
    // re-stack colonial fill above land, below states
    gColonial.parentNode.insertBefore(gColonial, gStates);
  })
  .catch(err => console.warn('[COUNTRY GEOJSON]', err));

fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
  .then(r => r.ok ? r.json() : Promise.reject('states ' + r.status))
  .then(gj => {
    (gj.features || []).forEach(f => {
      gStates.appendChild(el('path', {
        d: geomPath(f.geometry),
        fill: 'none',
        stroke: 'rgba(245,166,35,0.3)', 'stroke-width': 0.7,
        'vector-effect': 'non-scaling-stroke'
      }));
    });
  })
  .catch(err => console.warn('[STATE GEOJSON]', err));

/* ============================================================
   CITY DOTS + TIER-1 LABELS
   ============================================================ */
const dotsByTier = { 1: [], 2: [], 3: [] };

DISPLAY.forEach((c, i) => {
  const [x, y] = project(c.lat, c.lng);
  const r = c.tier === 1 ? 5 : c.tier === 2 ? 3.4 : 2.1;
  if (c.tier === 1) {
    const halo = el('circle', { cx: x, cy: y, r: r * 2.4, fill: 'rgba(245,166,35,0.16)' });
    gDots.appendChild(halo);
  }
  const dot = el('circle', {
    cx: x, cy: y, r,
    fill: tierColor(c.tier),
    stroke: 'rgba(0,0,0,0.6)', 'stroke-width': 0.6,
    'vector-effect': 'non-scaling-stroke',
    class: 'dot t' + c.tier, 'data-i': i, style: 'cursor:pointer'
  });
  gDots.appendChild(dot);
  dotsByTier[c.tier].push(dot);

  if (c.tier === 1) {
    const t = el('text', {
      x: x + r + 3, y: y + 3,
      fill: COL.amber, 'font-size': 11, 'font-family': 'Share Tech Mono, monospace',
      class: 'maplabel', style: 'pointer-events:none'
    });
    t.textContent = c.name.toUpperCase();
    gLabels.appendChild(t);
  }
});

/* ============================================================
   HOVER / CLICK (native SVG events — cheap)
   ============================================================ */
const tipEl = document.createElement('div');
tipEl.id = 'globe-tip';
document.body.appendChild(tipEl);
let hoveredCity = null;

gDots.addEventListener('pointermove', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('dot')) {
    const c = DISPLAY[+t.getAttribute('data-i')];
    tipEl.innerHTML =
      `<span class="ht-name">${c.name.toUpperCase()}</span>` +
      `<span class="ht-cls">T${c.tier} // ${CLASS_OF(c)}</span>`;
    tipEl.style.display = 'block';
    tipEl.style.left = (e.clientX + 14) + 'px';
    tipEl.style.top = (e.clientY - 8) + 'px';
    if (c !== hoveredCity) { updateBottomBar(c); hoveredCity = c; }
  }
});
gDots.addEventListener('pointerout', e => {
  if (e.target.classList && e.target.classList.contains('dot')) { tipEl.style.display = 'none'; hoveredCity = null; }
});
gDots.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('dot')) openIntel(DISPLAY[+e.target.getAttribute('data-i')]);
});

/* ============================================================
   ZOOM + PAN  (viewBox based)
   ============================================================ */
let vbX = 0, vbY = 0, vbW = VIEW_W, vbH = VIEW_H;
const MIN_W = VIEW_W / 7;   // max zoom in
function applyViewBox() {
  vbX = Math.max(0, Math.min(VIEW_W - vbW, vbX));
  vbY = Math.max(0, Math.min(VIEW_H - vbH, vbY));
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  updateReadouts();
}
function clientToUser(cx, cy) {
  const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
  const u = p.matrixTransform(svg.getScreenCTM().inverse());
  return [u.x, u.y];
}
function zoomBy(factor, fx, fy) {
  let nw = Math.max(MIN_W, Math.min(VIEW_W, vbW * factor));
  let nh = nw * (VIEW_H / VIEW_W);
  vbX = fx - (fx - vbX) * (nw / vbW);
  vbY = fy - (fy - vbY) * (nh / vbH);
  vbW = nw; vbH = nh;
  applyViewBox();
}

svg.addEventListener('wheel', e => {
  e.preventDefault();
  const [ux, uy] = clientToUser(e.clientX, e.clientY);
  zoomBy(e.deltaY > 0 ? 1.18 : 0.85, ux, uy);
}, { passive: false });

/* drag to pan */
let dragging = false, lastX = 0, lastY = 0, moved = false;
svg.addEventListener('pointerdown', e => { dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const ctm = svg.getScreenCTM();
  vbX -= (e.clientX - lastX) / ctm.a;
  vbY -= (e.clientY - lastY) / ctm.d;
  lastX = e.clientX; lastY = e.clientY; moved = true;
  applyViewBox();
});
window.addEventListener('pointerup', () => { dragging = false; });
svg.addEventListener('pointermove', e => {
  if (dragging) return;
  const [ux, uy] = clientToUser(e.clientX, e.clientY);
  const [lat, lng] = unproject(ux, uy);
  coordReadout.textContent = `${lat.toFixed(2)}°N ${lng.toFixed(2)}°E`;
});

document.getElementById('zoom-in').addEventListener('click', () => zoomBy(0.7, vbX + vbW / 2, vbY + vbH / 2));
document.getElementById('zoom-out').addEventListener('click', () => zoomBy(1.42, vbX + vbW / 2, vbY + vbH / 2));

/* ============================================================
   LAYER TOGGLES
   ============================================================ */
const layerState = { country: true, state: true, colonial: true, markers: true, t1: true, t2: true, t3: true };
function applyLayers() {
  gCountries.style.display = layerState.country ? '' : 'none';
  gStates.style.display = layerState.state ? '' : 'none';
  gColonial.style.display = layerState.colonial ? '' : 'none';
  const show = t => (layerState.markers && layerState['t' + t]) ? '' : 'none';
  [1, 2, 3].forEach(t => dotsByTier[t].forEach(d => d.style.display = show(t)));
  gLabels.style.display = (layerState.markers && layerState.t1) ? '' : 'none';
}
document.querySelectorAll('.switch-row').forEach(row => {
  row.addEventListener('click', () => {
    const key = row.dataset.key;
    layerState[key] = !layerState[key];
    row.classList.toggle('active', layerState[key]);
    applyLayers();
  });
});

/* ============================================================
   INTEL PANEL
   ============================================================ */
const intel = document.getElementById('intel');
const elTag = document.getElementById('intel-tag');
const elName = document.getElementById('intel-name');
const elAlias = document.getElementById('intel-alias');
const elImg = document.getElementById('intel-img');
const elImgMeta = document.getElementById('intel-imgmeta');
const elLat = document.getElementById('intel-lat');
const elLng = document.getElementById('intel-lng');
const elKnown = document.getElementById('intel-known');
const elColonial = document.getElementById('intel-colonial');
const elClass = document.getElementById('intel-class');

const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
     <rect width="100%" height="100%" fill="#0c0c0c"/>
     <g fill="none" stroke="#f5a62355" stroke-width="1">
       ${Array.from({length:12}).map((_,i)=>`<line x1="0" y1="${i*30}" x2="640" y2="${i*30}"/>`).join('')}
       ${Array.from({length:22}).map((_,i)=>`<line x1="${i*30}" y1="0" x2="${i*30}" y2="360"/>`).join('')}
     </g>
     <text x="320" y="180" fill="#f5a623" font-family="monospace" font-size="18"
       text-anchor="middle" letter-spacing="3">NO IMAGE FEED</text>
   </svg>`
);

function openIntel(city) {
  elTag.textContent = '// LOCATION INTEL //';
  elName.textContent = city.name.toUpperCase();
  elAlias.textContent = city.alias ? ('AKA ' + city.alias.toUpperCase()) : ('TIER ' + city.tier + ' LOCATION');
  elLat.textContent = city.lat.toFixed(4) + '°N';
  elLng.textContent = city.lng.toFixed(4) + '°E';
  elKnown.textContent = city.known_for;
  elColonial.textContent = city.colonial_history;
  elClass.textContent = CLASS_OF(city);
  elImgMeta.querySelector('.f').textContent = 'FEED // ' + city.name.toUpperCase();
  elImg.onerror = () => { elImg.onerror = null; elImg.src = FALLBACK_IMG; };
  elImg.src = city.image || FALLBACK_IMG;
  intel.classList.add('open');
  updateBottomBar(city);
}
function closeIntel() { intel.classList.remove('open'); }
document.getElementById('intel-close').addEventListener('click', closeIntel);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeIntel(); });

/* ============================================================
   BOTTOM STATUS BAR
   ============================================================ */
const bCity = document.querySelector('#hud-bottom .city .val');
const bRegion = document.querySelector('#hud-bottom .region .val');
const bClass = document.querySelector('#hud-bottom .cls .val');
function regionGuess(lat, lng) {
  if (lng < 66) return 'BALOCHISTAN / MAKRAN';
  if (lat > 30 && lng < 78) return 'PUNJAB / FRONTIER';
  if (lng > 92) return 'BURMA / FARTHER EAST';
  if (lat > 26 && lng > 84) return 'BENGAL / ASSAM';
  if (lat > 24 && lng < 78) return 'RAJPUTANA / GUJARAT';
  if (lat < 11) return 'CEYLON / DEEP SOUTH';
  if (lat < 16) return 'SOUTHERN PRESIDENCY';
  if (lat < 21) return 'DECCAN';
  return 'CENTRAL INDIA / HINDUSTAN';
}
function updateBottomBar(city) {
  bCity.textContent = city.name.toUpperCase() + (city.alias ? ' / ' + city.alias.toUpperCase() : '');
  bRegion.textContent = regionGuess(city.lat, city.lng);
  bClass.textContent = CLASS_OF(city);
}

/* ============================================================
   SEARCH
   ============================================================ */
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function flyToCity(city) {
  // centre the city and zoom in
  vbW = MIN_W * 1.8; vbH = vbW * (VIEW_H / VIEW_W);
  const [x, y] = project(city.lat, city.lng);
  vbX = x - vbW / 2; vbY = y - vbH / 2;
  applyViewBox();
  openIntel(city);
}
function renderResults(q) {
  const query = q.trim().toLowerCase();
  if (!query) { searchResults.classList.remove('show'); searchResults.innerHTML = ''; return; }
  const seen = new Set();
  const matches = DISPLAY.filter(c => {
    const hit = c.name.toLowerCase().includes(query) || (c.alias && c.alias.toLowerCase().includes(query));
    if (hit && !seen.has(c.name)) { seen.add(c.name); return true; }
    return false;
  }).slice(0, 12);
  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-item"><span class="nm" style="color:#7a7a72">NO MATCH IN DATABASE</span></div>`;
    searchResults.classList.add('show'); return;
  }
  searchResults.innerHTML = matches.map(c =>
    `<div class="search-item" data-name="${c.name.toLowerCase()}">
       <span class="nm">${c.name}${c.alias ? ' (' + c.alias + ')' : ''}</span>
       <span class="tg">T${c.tier} // ${CLASS_OF(c)}</span>
     </div>`).join('');
  searchResults.classList.add('show');
  searchResults.querySelectorAll('.search-item').forEach(item => {
    const nm = item.dataset.name;
    if (!nm) return;
    item.addEventListener('click', () => {
      flyToCity(markerByName[nm]);
      searchResults.classList.remove('show');
      searchInput.value = markerByName[nm].name;
    });
  });
}
searchInput.addEventListener('input', e => renderResults(e.target.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim().toLowerCase();
    const city = markerByName[q] ||
      DISPLAY.find(c => c.name.toLowerCase().startsWith(q) || (c.alias && c.alias.toLowerCase().startsWith(q)));
    if (city) { flyToCity(city); searchResults.classList.remove('show'); }
  }
});
document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) searchResults.classList.remove('show');
});

/* ============================================================
   READOUTS + CLOCK
   ============================================================ */
const zVal = document.getElementById('zoom-val');
const zFill = document.getElementById('zoom-fill');
const coordReadout = document.getElementById('coord-readout');
function updateReadouts() {
  const mag = VIEW_W / vbW;
  zVal.textContent = mag.toFixed(1).padStart(4, '0');
  const pct = (mag - 1) / (VIEW_W / MIN_W - 1) * 100;
  zFill.style.width = Math.max(4, Math.min(100, pct)) + '%';
}
function tick() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('session-time').textContent =
    `${d.getUTCFullYear()}.${pad(d.getUTCMonth()+1)}.${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ZULU`;
}
setInterval(tick, 1000); tick();
setTimeout(() => { document.getElementById('status-center').textContent = 'COLONIAL INDIA // INTEL ACTIVE'; }, 1500);

/* ============================================================
   BOOT
   ============================================================ */
applyLayers();
applyViewBox();
setTimeout(() => {
  const loader = document.getElementById('loader');
  if (loader) { loader.classList.add('hide'); setTimeout(() => loader.remove(), 600); }
}, 900);

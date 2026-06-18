/* ============================================================
   COLONIAL INDIA // IMAGING DATABASE NETWORK
   3D GLOBE — locked on the subcontinent, minimalist & smooth
   ============================================================ */

const COL = { amber: '#f5a623', cyan: '#00d4ff', white: '#d8d8d0' };
const tierColor = t => t === 1 ? COL.amber : t === 2 ? COL.cyan : COL.white;
const CLASS_OF = c => c.classification || 'LOCATION';

/* Fixed framing over colonial India (camera never spins away from this) */
const HOME_POV = { lat: 21.0, lng: 80.5, altitude: 1.35 };

/* Performance: cap how many Tier-3 towns are drawn (evenly sampled) */
const T3_DISPLAY_CAP = 230;

/* ============================================================
   BUILD DISPLAY SET (trim Tier 3 for performance)
   ============================================================ */
const ALL_T1 = CITIES.filter(c => c.tier === 1);
const ALL_T2 = CITIES.filter(c => c.tier === 2);
const ALL_T3 = CITIES.filter(c => c.tier === 3);

let SHOWN_T3 = ALL_T3;
if (ALL_T3.length > T3_DISPLAY_CAP) {
  SHOWN_T3 = [];
  const stride = ALL_T3.length / T3_DISPLAY_CAP;
  for (let i = 0; i < T3_DISPLAY_CAP; i++) SHOWN_T3.push(ALL_T3[Math.floor(i * stride)]);
}
const DISPLAY = [...ALL_T1, ...ALL_T2, ...SHOWN_T3];

const markerByName = {};
DISPLAY.forEach(c => {
  markerByName[c.name.toLowerCase()] = c;
  if (c.alias) markerByName[c.alias.toLowerCase()] = c;
});

/* ============================================================
   GLOBE INITIALISATION (lean settings)
   ============================================================ */
const globeEl = document.getElementById('globe');

const world = Globe()(globeEl)
  .backgroundColor('#000000')
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .showAtmosphere(true)
  .atmosphereColor(COL.amber)
  .atmosphereAltitude(0.12)
  .pointOfView(HOME_POV, 0);

/* cap pixel ratio + soften bump for performance */
try { world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); } catch (e) {}
try { const m = world.globeMaterial(); m.bumpScale = 5; m.shininess = 4; } catch (e) {}

/* ---- LOCK THE CAMERA: no spin, no pan, gentle constrained zoom only ---- */
const controls = world.controls();
controls.enableRotate = false;   // the globe will not spin
controls.enablePan = false;
controls.autoRotate = false;
controls.enableZoom = true;
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.zoomSpeed = 0.55;
controls.minDistance = 150;      // ~altitude 0.5
controls.maxDistance = 320;      // ~altitude 2.2

/* ============================================================
   RENDER-ON-DEMAND  (pause the rAF loop while idle → smooth & low power)
   ============================================================ */
let pauseTimer = null;
function wake(hold = 650) {
  try { world.resumeAnimation(); } catch (e) {}
  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => { try { world.pauseAnimation(); } catch (e) {} updateReadouts(); }, hold);
}
controls.addEventListener('change', () => wake(500));
globeEl.addEventListener('pointermove', () => wake(650));
globeEl.addEventListener('pointerdown', () => wake(900));
globeEl.addEventListener('wheel', () => wake(900), { passive: true });

/* resize */
function onResize() {
  world.width(globeEl.clientWidth);
  world.height(globeEl.clientHeight);
  wake(400);
}
window.addEventListener('resize', onResize);
onResize();

/* ============================================================
   CITY POINTS + (Tier-1 only) LABELS  — no pulse rings (minimalist)
   ============================================================ */
function hoverTip(d) {
  return `<div class="scene-tip">
            <span class="ht-name">${d.name.toUpperCase()}</span>
            <span class="ht-cls">T${d.tier} // ${CLASS_OF(d)}</span>
          </div>`;
}

world
  .pointsData(DISPLAY)
  .pointLat('lat').pointLng('lng')
  .pointColor(d => tierColor(d.tier))
  .pointAltitude(0.01)
  .pointRadius(d => d.tier === 1 ? 0.4 : d.tier === 2 ? 0.28 : 0.16)
  .pointResolution(6)
  .pointsMerge(false)
  .pointLabel(hoverTip)
  .onPointHover(d => {
    globeEl.style.cursor = d ? 'pointer' : 'default';
    if (d) updateBottomBar(d);
  })
  .onPointClick(d => { openIntel(d); });

world
  .labelsData(ALL_T1)
  .labelLat('lat').labelLng('lng')
  .labelText(d => d.name.toUpperCase())
  .labelColor(() => COL.amber)
  .labelSize(0.5)
  .labelDotRadius(0)
  .labelAltitude(0.011)
  .labelResolution(1)
  .labelIncludeDot(false);

/* ============================================================
   BORDERS — neighbours only + dashed colonial extent
   ============================================================ */
let countryFeatures = [];
let stateFeatures = [];

const COLONIAL_RING = [
  [71.0,35.5],[74.5,36.8],[78.0,35.2],[79.2,32.5],[81.0,30.3],
  [84.0,28.2],[88.2,27.4],[89.5,27.9],[92.0,26.9],[95.5,28.3],
  [97.4,27.5],[97.6,24.5],[94.5,20.0],[94.2,16.0],[98.0,14.5],
  [98.6,10.5],[95.0,12.0],[90.5,16.0],[85.0,19.0],[80.5,15.5],
  [77.5,8.0],[76.8,8.0],[75.0,11.5],[73.5,15.0],[72.7,19.0],
  [68.8,22.0],[67.0,24.0],[64.0,25.4],[62.5,28.5],[61.8,30.5],
  [65.5,31.5],[69.0,34.0],[71.0,35.5]
];
const colonialFeature = {
  type: 'Feature',
  properties: { __kind: 'colonial' },
  geometry: { type: 'Polygon', coordinates: [COLONIAL_RING] }
};
const polyKind = f => (f.properties && f.properties.__kind) || 'country';

world
  .polygonsData([])
  .polygonAltitude(f => polyKind(f) === 'colonial' ? 0.012 : polyKind(f) === 'state' ? 0.006 : 0.008)
  .polygonCapColor(f => polyKind(f) === 'colonial' ? 'rgba(201,138,46,0.08)' : 'rgba(0,0,0,0)')
  .polygonSideColor(() => 'rgba(0,0,0,0)')
  .polygonStrokeColor(f => {
    const k = polyKind(f);
    if (k === 'colonial') return 'rgba(0,0,0,0)';
    if (k === 'state') return 'rgba(245,166,35,0.35)';
    return 'rgba(245,166,35,0.7)';
  })
  .polygonsTransitionDuration(0);

world
  .pathsData([])
  .pathPoints(d => d.pts)
  .pathPointLat(p => p[1])
  .pathPointLng(p => p[0])
  .pathColor(() => 'rgba(245,166,35,0.85)')
  .pathStroke(1.4)
  .pathDashLength(0.04)
  .pathDashGap(0.025)
  .pathDashAnimateTime(0)   // static dashes (no per-frame animation)
  .pathTransitionDuration(0);

/* neighbouring countries to render (keeps it light + focused) */
const NEIGHBOURS = new Set([
  'India','Pakistan','Bangladesh','Myanmar','Burma','Sri Lanka','Nepal','Bhutan',
  'Afghanistan','China','Iran','Tajikistan','Turkmenistan','Uzbekistan',
  'Thailand','Laos','Oman','Kazakhstan','Kyrgyzstan'
]);

fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
  .then(r => r.ok ? r.json() : Promise.reject('countries ' + r.status))
  .then(gj => {
    countryFeatures = (gj.features || []).filter(f => {
      const p = f.properties || {};
      const nm = p.ADMIN || p.name || p.NAME || '';
      return NEIGHBOURS.has(nm);
    }).map(f => { f.properties = f.properties || {}; f.properties.__kind = 'country'; return f; });
    refreshPolygons();
  })
  .catch(err => console.warn('[COUNTRY GEOJSON]', err));

fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
  .then(r => r.ok ? r.json() : Promise.reject('states ' + r.status))
  .then(gj => {
    stateFeatures = (gj.features || []).map(f => { f.properties = f.properties || {}; f.properties.__kind = 'state'; return f; });
    refreshPolygons();
  })
  .catch(err => console.warn('[STATE GEOJSON]', err));

/* ============================================================
   LAYER STATE + REFRESH
   ============================================================ */
const layerState = {
  country: true, state: true, colonial: true,
  markers: true, t1: true, t2: true, t3: true
};

function visibleCities() {
  if (!layerState.markers) return [];
  return DISPLAY.filter(c => layerState['t' + c.tier]);
}

function refreshPolygons() {
  const polys = [];
  if (layerState.country) polys.push(...countryFeatures);
  if (layerState.state) polys.push(...stateFeatures);
  if (layerState.colonial) polys.push(colonialFeature);
  world.polygonsData(polys);
  world.pathsData(layerState.colonial ? [{ pts: COLONIAL_RING }] : []);
  wake(400);
}

function refreshPoints() {
  const cities = visibleCities();
  world.pointsData(cities);
  world.labelsData(layerState.markers && layerState.t1 ? ALL_T1 : []);
  wake(400);
}

document.querySelectorAll('.switch-row').forEach(row => {
  row.addEventListener('click', () => {
    const key = row.dataset.key;
    layerState[key] = !layerState[key];
    row.classList.toggle('active', layerState[key]);
    refreshPolygons();
    refreshPoints();
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
   SEARCH  (opens intel; keeps the fixed India framing)
   ============================================================ */
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function selectCity(city) { openIntel(city); }

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
    searchResults.classList.add('show');
    return;
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
      selectCity(markerByName[nm]);
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
    if (city) { selectCity(city); searchResults.classList.remove('show'); }
  }
});
document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) searchResults.classList.remove('show');
});

/* ============================================================
   ZOOM READOUT + COORDS  (event-driven, no polling)
   ============================================================ */
const zVal = document.getElementById('zoom-val');
const zFill = document.getElementById('zoom-fill');
const coordReadout = document.getElementById('coord-readout');

function updateReadouts() {
  const p = world.pointOfView();
  const mag = (1 / Math.max(p.altitude, 0.4)) * 1.5 + 1;
  zVal.textContent = mag.toFixed(1).padStart(4, '0');
  const pct = (1 - (p.altitude - 0.5) / (2.2 - 0.5)) * 100;
  zFill.style.width = Math.max(4, Math.min(100, pct)) + '%';
  coordReadout.textContent = `${p.lat.toFixed(2)}°N ${p.lng.toFixed(2)}°E`;
}
controls.addEventListener('change', updateReadouts);

document.getElementById('zoom-in').addEventListener('click', () => {
  const p = world.pointOfView();
  world.pointOfView({ altitude: Math.max(0.5, p.altitude * 0.7) }, 450);
  wake(700);
});
document.getElementById('zoom-out').addEventListener('click', () => {
  const p = world.pointOfView();
  world.pointOfView({ altitude: Math.min(2.2, p.altitude * 1.4) }, 450);
  wake(700);
});

/* ============================================================
   SESSION CLOCK + STATUS
   ============================================================ */
function tick() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('session-time').textContent =
    `${d.getUTCFullYear()}.${pad(d.getUTCMonth()+1)}.${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ZULU`;
}
setInterval(tick, 1000); tick();

setTimeout(() => {
  document.getElementById('status-center').textContent = 'COLONIAL INDIA // INTEL ACTIVE';
}, 1800);

/* ============================================================
   BOOT  — brief, calm zoom-in (no spin), then settle & pause
   ============================================================ */
function boot() {
  refreshPolygons();
  refreshPoints();
  updateReadouts();

  // gentle descent (no rotation) from a touch further out
  world.pointOfView({ lat: HOME_POV.lat, lng: HOME_POV.lng, altitude: 2.1 }, 0);
  world.resumeAnimation();
  setTimeout(() => { world.pointOfView(HOME_POV, 1600); wake(2000); }, 250);

  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('hide'); setTimeout(() => loader.remove(), 600); }
  }, 1700);
}
window.addEventListener('load', boot);
if (document.readyState === 'complete') boot();

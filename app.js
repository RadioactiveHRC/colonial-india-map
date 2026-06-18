/* ============================================================
   COLONIAL INDIA // IMAGING DATABASE NETWORK
   3D GLOBE ENGINE (Globe.gl / three.js)
   ============================================================ */

const COL = { amber: '#f5a623', cyan: '#00d4ff', white: '#d8d8d0', olive: '#8a8c5a' };
const tierColor = t => t === 1 ? COL.amber : t === 2 ? COL.cyan : COL.white;
const CLASS_OF = c => c.classification || 'LOCATION';

/* India-centred initial point of view */
const HOME_POV = { lat: 22.5, lng: 80.0, altitude: 1.5 };

/* ============================================================
   GLOBE INITIALISATION
   ============================================================ */
const globeEl = document.getElementById('globe');

const world = Globe()(globeEl)
  .backgroundColor('rgba(0,0,0,0)')
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
  .showAtmosphere(true)
  .atmosphereColor(COL.amber)
  .atmosphereAltitude(0.16)
  .pointOfView({ lat: 20, lng: 78, altitude: 2.8 }, 0);

/* high-detail tuning */
try {
  const renderer = world.renderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
} catch (e) {}
try {
  const gmat = world.globeMaterial();
  gmat.bumpScale = 12;
  gmat.shininess = 6;
} catch (e) {}
if (typeof world.showGraticules === 'function') { try { world.showGraticules(true); } catch (e) {} }

/* controls: orbit limits (acts as zoom bounds) + gentle auto-rotation */
const controls = world.controls();
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.7;
controls.minDistance = 110;   // closest orbit (globe radius = 100)
controls.maxDistance = 600;   // farthest orbit
controls.autoRotate = false;  // enabled after the boot fly-in settles
controls.autoRotateSpeed = 0.16;

/* pause auto-rotation while the user interacts, resume after idle */
let idleTimer = null;
function pauseRotate() {
  controls.autoRotate = false;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
}
globeEl.addEventListener('pointerdown', pauseRotate);
globeEl.addEventListener('wheel', pauseRotate, { passive: true });

/* resize */
function onResize() {
  world.width(globeEl.clientWidth);
  world.height(globeEl.clientHeight);
}
window.addEventListener('resize', onResize);
onResize();

/* ============================================================
   CITY POINTS / RINGS / LABELS
   ============================================================ */
const markerByName = {};
CITIES.forEach(c => {
  markerByName[c.name.toLowerCase()] = c;
  if (c.alias) markerByName[c.alias.toLowerCase()] = c;
});

function hoverTip(d) {
  return `<div class="scene-tip">
            <span class="ht-name">${d.name.toUpperCase()}</span>
            <span class="ht-cls">T${d.tier} // ${CLASS_OF(d)}</span>
          </div>`;
}

world
  .pointsData([])
  .pointLat('lat').pointLng('lng')
  .pointColor(d => tierColor(d.tier))
  .pointAltitude(0.012)
  .pointRadius(d => d.tier === 1 ? 0.42 : d.tier === 2 ? 0.3 : 0.18)
  .pointResolution(10)
  .pointsMerge(false)
  .pointLabel(hoverTip)
  .onPointHover(d => {
    globeEl.style.cursor = d ? 'pointer' : 'grab';
    if (d) updateBottomBar(d);
  })
  .onPointClick(d => {
    openIntel(d);
    const p = world.pointOfView();
    world.pointOfView({ lat: d.lat, lng: d.lng, altitude: Math.min(p.altitude, 1.1) }, 900);
    pauseRotate();
  });

world
  .ringsData([])
  .ringLat('lat').ringLng('lng')
  .ringAltitude(0.012)
  .ringColor(d => (t => {
    const rgb = d.tier === 1 ? '245,166,35' : '0,212,255';
    return `rgba(${rgb},${1 - t})`;
  }))
  .ringMaxRadius(d => d.tier === 1 ? 3.2 : 2.3)
  .ringPropagationSpeed(1.3)
  .ringRepeatPeriod(d => d.tier === 1 ? 1100 : 1500);

world
  .labelsData([])
  .labelLat('lat').labelLng('lng')
  .labelText(d => d.name.toUpperCase())
  .labelColor(d => tierColor(d.tier))
  .labelSize(d => d.tier === 1 ? 0.62 : d.tier === 2 ? 0.46 : 0.34)
  .labelDotRadius(0)
  .labelAltitude(0.013)
  .labelResolution(2)
  .labelIncludeDot(false);

/* ============================================================
   POLYGON BORDERS + COLONIAL EXTENT
   ============================================================ */
let countryFeatures = [];
let stateFeatures = [];

/* Colonial extent (British India max extent) as a polygon feature + dashed ring */
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

function polyKind(f) { return (f.properties && f.properties.__kind) || 'country'; }

world
  .polygonsData([])
  .polygonAltitude(f => polyKind(f) === 'colonial' ? 0.011 : polyKind(f) === 'state' ? 0.006 : 0.008)
  .polygonCapColor(f => polyKind(f) === 'colonial' ? 'rgba(201,138,46,0.10)' : 'rgba(0,0,0,0)')
  .polygonSideColor(() => 'rgba(0,0,0,0)')
  .polygonStrokeColor(f => {
    const k = polyKind(f);
    if (k === 'colonial') return 'rgba(0,0,0,0)';
    if (k === 'state') return 'rgba(245,166,35,0.45)';
    return 'rgba(245,166,35,0.8)';
  })
  .polygonsTransitionDuration(0);

/* dashed colonial border via paths layer */
world
  .pathsData([])
  .pathPoints(d => d.pts)
  .pathPointLat(p => p[1])
  .pathPointLng(p => p[0])
  .pathColor(() => COL.amber)
  .pathStroke(1.6)
  .pathDashLength(0.04)
  .pathDashGap(0.025)
  .pathDashAnimateTime(14000)
  .pathTransitionDuration(0);

/* ---- fetch GeoJSON ---- */
const SUB_COUNTRIES = new Set([
  'India','Pakistan','Bangladesh','Myanmar','Burma','Sri Lanka',
  'Nepal','Bhutan','Afghanistan'
]);

fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
  .then(r => r.ok ? r.json() : Promise.reject('countries ' + r.status))
  .then(gj => {
    countryFeatures = (gj.features || []).map(f => {
      f.properties = f.properties || {};
      const nm = f.properties.ADMIN || f.properties.name || f.properties.NAME || '';
      // keep all countries for a detailed globe, but tag the subcontinent for emphasis
      f.properties.__kind = 'country';
      f.properties.__sub = SUB_COUNTRIES.has(nm);
      return f;
    });
    refreshPolygons();
  })
  .catch(err => console.warn('[COUNTRY GEOJSON]', err));

fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
  .then(r => r.ok ? r.json() : Promise.reject('states ' + r.status))
  .then(gj => {
    stateFeatures = (gj.features || []).map(f => {
      f.properties = f.properties || {};
      f.properties.__kind = 'state';
      return f;
    });
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
  return CITIES.filter(c => layerState['t' + c.tier]);
}

function refreshPolygons() {
  const polys = [];
  if (layerState.country) polys.push(...countryFeatures);
  if (layerState.state) polys.push(...stateFeatures);
  if (layerState.colonial) polys.push(colonialFeature);
  world.polygonsData(polys);
  world.pathsData(layerState.colonial ? [{ pts: COLONIAL_RING }] : []);
}

function refreshPoints() {
  const cities = visibleCities();
  world.pointsData(cities);
  world.ringsData(cities.filter(c => c.tier <= 2));
  refreshLabels();
}

function refreshLabels() {
  const alt = world.pointOfView().altitude;
  const cities = visibleCities().filter(c => {
    if (c.tier === 1) return true;
    if (c.tier === 2) return alt < 1.6;
    return alt < 0.55; // tier 3 only when very close
  });
  world.labelsData(cities);
}

/* layer toggle wiring */
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
       text-anchor="middle" letter-spacing="3">NO IMAGE FEED // SIGNAL LOST</text>
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
  world.pointOfView({ lat: city.lat, lng: city.lng, altitude: 0.62 }, 1500);
  controls.autoRotate = false;
  setTimeout(() => { openIntel(city); refreshLabels(); }, 1550);
}

function renderResults(q) {
  const query = q.trim().toLowerCase();
  if (!query) { searchResults.classList.remove('show'); searchResults.innerHTML = ''; return; }
  const seen = new Set();
  const matches = CITIES.filter(c => {
    const hit = c.name.toLowerCase().includes(query) || (c.alias && c.alias.toLowerCase().includes(query));
    if (hit && !seen.has(c.name)) { seen.add(c.name); return true; }
    return false;
  }).slice(0, 14);

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
      CITIES.find(c => c.name.toLowerCase().startsWith(q) || (c.alias && c.alias.toLowerCase().startsWith(q)));
    if (city) { flyToCity(city); searchResults.classList.remove('show'); }
  }
});
document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) searchResults.classList.remove('show');
});

/* ============================================================
   ZOOM / ALTITUDE READOUT + COORDS
   ============================================================ */
const zVal = document.getElementById('zoom-val');
const zFill = document.getElementById('zoom-fill');
const coordReadout = document.getElementById('coord-readout');

function updateReadouts() {
  const p = world.pointOfView();
  // magnification: closer orbit -> higher number (range ~01.0 to 12.0)
  const mag = (1 / Math.max(p.altitude, 0.12)) * 1.5 + 1;
  zVal.textContent = mag.toFixed(1).padStart(4, '0');
  const pct = (1 - (p.altitude - 0.15) / (4 - 0.15)) * 100;
  zFill.style.width = Math.max(4, Math.min(100, pct)) + '%';
  coordReadout.textContent = `${p.lat.toFixed(3)}°N ${p.lng.toFixed(3)}°E`;
}
world.onZoom(() => { updateReadouts(); refreshLabels(); });

/* poll POV during rotation so the coord readout tracks the globe */
setInterval(updateReadouts, 250);

document.getElementById('zoom-in').addEventListener('click', () => {
  const p = world.pointOfView();
  world.pointOfView({ altitude: Math.max(0.15, p.altitude * 0.65) }, 500);
  pauseRotate();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  const p = world.pointOfView();
  world.pointOfView({ altitude: Math.min(4, p.altitude * 1.5) }, 500);
  pauseRotate();
});

/* ============================================================
   SESSION CLOCK + STATUS SWAP
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
  document.getElementById('status-center').innerHTML =
    'COLONIAL INDIA // INTEL ACTIVE<span class="cursor"></span>';
}, 3400);

/* ============================================================
   BOOT SEQUENCE — loader + cinematic fly-in
   ============================================================ */
function boot() {
  refreshPolygons();
  refreshPoints();
  updateReadouts();

  // cinematic descent into the subcontinent
  setTimeout(() => {
    world.pointOfView(HOME_POV, 3200);
  }, 700);

  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('hide'); setTimeout(() => loader.remove(), 700); }
    refreshLabels();
  }, 3100);

  // enable gentle auto-rotation only after the fly-in has settled
  setTimeout(() => { controls.autoRotate = true; }, 4400);
}
window.addEventListener('load', boot);
/* if load already fired (scripts cached), run anyway */
if (document.readyState === 'complete') boot();

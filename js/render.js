import { state } from './state.js';
import { hotspotsLayer, counter } from './dom.js';
import { toPixel, getImageRect, tileToPixel } from './geometry.js';
import { showPopup } from './popup.js';
import { checkVictory } from './app.js';

export function renderHotspots() {
  hotspotsLayer.innerHTML = '';

  if (state.mode === 'tilemap') {
    renderTileMapHotspots();
  } else {
    renderLegacyHotspots();
  }
}

function renderLegacyHotspots() {
  state.spots.forEach(spot => {
    const el = createHotspotElement(spot);

    const pos = toPixel(spot.x, spot.y);
    const rect = getImageRect();
    const radiusPx = (spot.radius / 100) * Math.min(rect.width, rect.height);

    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.width = radiusPx * 2 + 'px';
    el.style.height = radiusPx * 2 + 'px';

    hotspotsLayer.appendChild(el);
  });
}

function renderTileMapHotspots() {
  const { tileSize } = state.tileMapBounds;

  state.spots.forEach(spot => {
    const el = createHotspotElement(spot);

    const pos = tileToPixel(spot.tileX, spot.tileY);
    const radiusPx = spot.radius * tileSize;

    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.width = radiusPx * 2 + 'px';
    el.style.height = radiusPx * 2 + 'px';

    hotspotsLayer.appendChild(el);
  });
}

function createHotspotElement(spot) {
  const el = document.createElement('div');
  el.className = 'hotspot';
  el.dataset.id = spot.id;

  if (state.editorMode || state.constructorMode) {
    el.classList.add('editor-visible');
  }
  if (spot.found) {
    el.classList.add('found');
  }

  if (!state.editorMode && !state.constructorMode) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!spot.found) {
        spot.found = true;
        el.classList.add('found');
        updateCounter();
        showPopup(spot);
        checkVictory();
      } else if (!state.activePopup) {
        showPopup(spot);
      }
    });
  }

  return el;
}

export function updateCounter() {
  const found = state.spots.filter(s => s.found).length;
  counter.textContent = `Найдено: ${found} из ${state.spots.length}`;
}

import { state } from './state.js';
import { hotspotsLayer, counter } from './dom.js';
import { toPixel, getImageRect } from './geometry.js';
import { showPopup } from './popup.js';

export function renderHotspots() {
  hotspotsLayer.innerHTML = '';

  state.spots.forEach(spot => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.dataset.id = spot.id;

    if (state.editorMode) {
      el.classList.add('editor-visible');
    }
    if (spot.found) {
      el.classList.add('found');
    }

    const pos = toPixel(spot.x, spot.y);
    const rect = getImageRect();
    const radiusPx = (spot.radius / 100) * Math.min(rect.width, rect.height);

    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.width = radiusPx * 2 + 'px';
    el.style.height = radiusPx * 2 + 'px';

    if (!state.editorMode) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!spot.found) {
          spot.found = true;
          el.classList.add('found');
          updateCounter();
          showPopup(spot);
        } else if (!state.activePopup) {
          showPopup(spot);
        }
      });
    }

    hotspotsLayer.appendChild(el);
  });
}

export function updateCounter() {
  const found = state.spots.filter(s => s.found).length;
  counter.textContent = `Found: ${found} / ${state.spots.length}`;
}

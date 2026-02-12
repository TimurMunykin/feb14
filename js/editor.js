import { state } from './state.js';
import { mainImage, hotspotsLayer, editorPanel, btnExport, btnImport, jsonArea } from './dom.js';
import { getImageRect, toPercent } from './geometry.js';
import { renderHotspots, updateCounter } from './render.js';
import { showToast } from './utils.js';

export function setupEditor() {
  editorPanel.classList.remove('hidden');
  mainImage.style.cursor = 'crosshair';

  mainImage.addEventListener('click', (e) => {
    if (state.dragTarget) return;

    const container = mainImage.parentElement;
    const containerRect = container.getBoundingClientRect();
    const px = e.clientX - containerRect.left;
    const py = e.clientY - containerRect.top;

    const rect = getImageRect();
    if (px < rect.x || px > rect.x + rect.width || py < rect.y || py > rect.y + rect.height) {
      return;
    }

    const pct = toPercent(px, py);
    const imagePath = prompt('Image path for this hotspot:', `images/spot${state.nextId}.jpg`);
    if (imagePath === null) return;

    const newId = state.nextId++;
    state.spots.push({
      id: newId,
      x: Math.round(pct.x * 100) / 100,
      y: Math.round(pct.y * 100) / 100,
      radius: 3,
      image: imagePath || `images/spot${newId}.jpg`,
      found: false,
    });

    renderHotspots();
    updateCounter();
    bindHotspotInteractions();
  });

  btnExport.addEventListener('click', () => {
    const data = state.spots.map(({ id, x, y, radius, image }) => ({ id, x, y, radius, image, found: false }));
    const json = JSON.stringify(data, null, 2);
    jsonArea.value = json;
    navigator.clipboard.writeText(json).then(() => {
      showToast('JSON copied to clipboard!');
    }).catch(() => {
      showToast('JSON shown in textarea — copy manually');
    });
  });

  btnImport.addEventListener('click', () => {
    const text = jsonArea.value.trim();
    if (!text) {
      showToast('Paste JSON into textarea first');
      return;
    }
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Expected array');
      state.spots = data.map(h => ({ ...h, found: false }));
      state.nextId = state.spots.length ? Math.max(...state.spots.map(h => h.id)) + 1 : 1;
      renderHotspots();
      updateCounter();
      bindHotspotInteractions();
      showToast(`Imported ${state.spots.length} hotspots`);
    } catch (err) {
      showToast('Invalid JSON: ' + err.message);
    }
  });

  bindHotspotInteractions();
}

function bindHotspotInteractions() {
  hotspotsLayer.querySelectorAll('.hotspot').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      state.dragTarget = el;
      el.classList.add('dragging');
      const containerRect = mainImage.parentElement.getBoundingClientRect();
      state.dragOffset.x = e.clientX - parseFloat(el.style.left) - containerRect.left;
      state.dragOffset.y = e.clientY - parseFloat(el.style.top) - containerRect.top;
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(el.dataset.id);
      if (confirm(`Delete hotspot #${id}?`)) {
        state.spots = state.spots.filter(s => s.id !== id);
        renderHotspots();
        updateCounter();
        bindHotspotInteractions();
      }
    });

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const id = parseInt(el.dataset.id);
      const spot = state.spots.find(s => s.id === id);
      if (!spot) return;
      const newPath = prompt('Image path:', spot.image);
      if (newPath !== null) {
        spot.image = newPath;
        renderHotspots();
        bindHotspotInteractions();
      }
    });
  });
}

// Global drag handlers (registered once on import)
document.addEventListener('mousemove', (e) => {
  if (!state.dragTarget) return;
  const containerRect = mainImage.parentElement.getBoundingClientRect();
  state.dragTarget.style.left = (e.clientX - containerRect.left - state.dragOffset.x) + 'px';
  state.dragTarget.style.top = (e.clientY - containerRect.top - state.dragOffset.y) + 'px';
});

document.addEventListener('mouseup', () => {
  if (!state.dragTarget) return;
  const el = state.dragTarget;
  el.classList.remove('dragging');

  const id = parseInt(el.dataset.id);
  const spot = state.spots.find(s => s.id === id);
  if (spot) {
    const pct = toPercent(parseFloat(el.style.left), parseFloat(el.style.top));
    spot.x = Math.round(pct.x * 100) / 100;
    spot.y = Math.round(pct.y * 100) / 100;
  }

  state.dragTarget = null;
});

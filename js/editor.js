import { state } from './state.js';
import { mainImage, hotspotsLayer, editorPanel, btnExport, btnImport, jsonArea } from './dom.js';
import { getImageRect, toPercent } from './geometry.js';
import { renderHotspots, updateCounter } from './render.js';
import { showToast } from './utils.js';

let selectedId = null;

export function setupEditor() {
  editorPanel.classList.remove('hidden');
  mainImage.style.cursor = 'crosshair';

  // Click on image → add hotspot (no prompt)
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
    const newId = state.nextId++;
    state.spots.push({
      id: newId,
      x: Math.round(pct.x * 100) / 100,
      y: Math.round(pct.y * 100) / 100,
      radius: 3,
      image: `images/spot${newId}.jpg`,
      found: false,
    });

    selectedId = newId;
    rerender();
  });

  // Click outside hotspots → deselect
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hotspot') && !e.target.closest('.spot-controls') && !e.target.closest('#editor-panel')) {
      // don't deselect if clicking on image (that adds a spot)
      if (e.target === mainImage) return;
      selectedId = null;
      rerender();
    }
  });

  // Delete with keyboard
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
      // Don't delete if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      deleteSpot(selectedId);
    }
  });

  // Scroll wheel to resize
  hotspotsLayer.addEventListener('wheel', (e) => {
    const hotspotEl = e.target.closest('.hotspot');
    if (!hotspotEl) return;
    e.preventDefault();
    const id = parseInt(hotspotEl.dataset.id);
    const spot = state.spots.find(s => s.id === id);
    if (!spot) return;

    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    spot.radius = Math.max(1, Math.min(15, spot.radius + delta));
    rerender();
  }, { passive: false });

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
      selectedId = null;
      rerender();
      showToast(`Imported ${state.spots.length} hotspots`);
    } catch (err) {
      showToast('Invalid JSON: ' + err.message);
    }
  });

  rerender();
}

function rerender() {
  renderHotspots();
  updateCounter();
  bindHotspotInteractions();
  renderControls();
}

function deleteSpot(id) {
  state.spots = state.spots.filter(s => s.id !== id);
  if (selectedId === id) selectedId = null;
  rerender();
}

function renderControls() {
  // Remove old controls
  document.querySelectorAll('.spot-controls').forEach(el => el.remove());

  if (selectedId === null) return;
  const spot = state.spots.find(s => s.id === selectedId);
  if (!spot) { selectedId = null; return; }

  const hotspotEl = hotspotsLayer.querySelector(`[data-id="${selectedId}"]`);
  if (!hotspotEl) return;

  hotspotEl.classList.add('selected');

  const controls = document.createElement('div');
  controls.className = 'spot-controls';
  controls.innerHTML = `
    <button class="spot-delete" title="Delete (Del)">&times;</button>
    <label>Image<input type="text" class="spot-image" value="${spot.image || ''}"></label>
    <label>Radius<input type="range" class="spot-radius" min="1" max="15" step="0.5" value="${spot.radius}"></label>
  `;

  // Position above the hotspot
  controls.style.left = hotspotEl.style.left;
  controls.style.top = hotspotEl.style.top;

  // Delete
  controls.querySelector('.spot-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSpot(spot.id);
  });

  // Image path
  const imageInput = controls.querySelector('.spot-image');
  imageInput.addEventListener('input', () => {
    spot.image = imageInput.value;
  });
  imageInput.addEventListener('click', (e) => e.stopPropagation());

  // Radius slider
  const radiusInput = controls.querySelector('.spot-radius');
  radiusInput.addEventListener('input', () => {
    spot.radius = parseFloat(radiusInput.value);
    // Update hotspot size live
    const rect = getImageRect();
    const radiusPx = (spot.radius / 100) * Math.min(rect.width, rect.height);
    hotspotEl.style.width = radiusPx * 2 + 'px';
    hotspotEl.style.height = radiusPx * 2 + 'px';
  });
  radiusInput.addEventListener('click', (e) => e.stopPropagation());

  hotspotsLayer.appendChild(controls);
}

function bindHotspotInteractions() {
  hotspotsLayer.querySelectorAll('.hotspot').forEach(el => {
    const id = parseInt(el.dataset.id);

    // Click to select
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedId = id;
      rerender();
    });

    // Drag
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.spot-controls')) return;
      e.preventDefault();
      e.stopPropagation();
      state.dragTarget = el;
      el.classList.add('dragging');
      const containerRect = mainImage.parentElement.getBoundingClientRect();
      state.dragOffset.x = e.clientX - parseFloat(el.style.left) - containerRect.left;
      state.dragOffset.y = e.clientY - parseFloat(el.style.top) - containerRect.top;
    });
  });
}

// Global drag handlers (registered once on import)
document.addEventListener('mousemove', (e) => {
  if (!state.dragTarget) return;
  const containerRect = mainImage.parentElement.getBoundingClientRect();
  state.dragTarget.style.left = (e.clientX - containerRect.left - state.dragOffset.x) + 'px';
  state.dragTarget.style.top = (e.clientY - containerRect.top - state.dragOffset.y) + 'px';

  // Move controls with hotspot
  const controls = document.querySelector('.spot-controls');
  if (controls) {
    controls.style.left = state.dragTarget.style.left;
    controls.style.top = state.dragTarget.style.top;
  }
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

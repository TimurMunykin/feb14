import { state } from './state.js';

export function initViewport(mapEl, containerEl) {
  const vp = state.viewport;
  vp.x = 0;
  vp.y = 0;
  vp.zoom = 1;

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5.0;

  function applyTransform() {
    mapEl.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
  }

  // --- Wheel zoom (toward cursor) ---
  containerEl.addEventListener('wheel', (e) => {
    // Let editor handle scroll on hotspots
    if (state.editorMode && e.target.closest('.hotspot')) return;
    e.preventDefault();

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * factor));

    const rect = containerEl.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    vp.x = cx - (cx - vp.x) * (newZoom / vp.zoom);
    vp.y = cy - (cy - vp.y) * (newZoom / vp.zoom);
    vp.zoom = newZoom;

    applyTransform();
  }, { passive: false });

  // --- Mouse drag for panning ---
  let dragging = false;
  let startX = 0;
  let startY = 0;

  containerEl.addEventListener('mousedown', (e) => {
    // Skip if clicking on interactive elements
    if (e.target.closest('.hotspot') || e.target.closest('.constructor-arrow') ||
        e.target.closest('.popup') || e.target.closest('.spot-controls')) return;

    // Middle click or shift+left click to pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      dragging = true;
      startX = e.clientX - vp.x;
      startY = e.clientY - vp.y;
      containerEl.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    vp.x = e.clientX - startX;
    vp.y = e.clientY - startY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      containerEl.style.cursor = '';
    }
  });

  // --- Touch: pinch to zoom + drag to pan ---
  let touches = [];
  let lastDist = 0;
  let lastCenter = null;

  containerEl.addEventListener('touchstart', (e) => {
    touches = [...e.touches];
    if (touches.length === 2) {
      lastDist = touchDist(touches);
      lastCenter = touchCenter(touches);
    } else if (touches.length === 1) {
      startX = touches[0].clientX - vp.x;
      startY = touches[0].clientY - vp.y;
    }
  }, { passive: true });

  containerEl.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = touchDist([...e.touches]);
      const center = touchCenter([...e.touches]);
      const scale = dist / lastDist;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * scale));

      const rect = containerEl.getBoundingClientRect();
      const cx = center.x - rect.left;
      const cy = center.y - rect.top;

      vp.x = cx - (cx - vp.x) * (newZoom / vp.zoom);
      vp.y = cy - (cy - vp.y) * (newZoom / vp.zoom);
      vp.zoom = newZoom;

      // Also pan with two fingers
      if (lastCenter) {
        vp.x += center.x - lastCenter.x;
        vp.y += center.y - lastCenter.y;
      }

      lastDist = dist;
      lastCenter = center;
      applyTransform();
    } else if (e.touches.length === 1) {
      vp.x = e.touches[0].clientX - startX;
      vp.y = e.touches[0].clientY - startY;
      applyTransform();
    }
  }, { passive: false });

  // --- Fit to view ---
  function fitToView() {
    const { tileSize } = state.tileMapBounds;
    const tiles = state.gameConfig?.tiles || {};
    const keys = Object.keys(tiles);
    if (keys.length === 0) {
      // Center on origin for empty grid
      const rect = containerEl.getBoundingClientRect();
      vp.zoom = 1;
      vp.x = rect.width / 2 - tileSize / 2;
      vp.y = rect.height / 2 - tileSize / 2;
      applyTransform();
      return;
    }

    const mapW = parseFloat(mapEl.style.width) || tileSize;
    const mapH = parseFloat(mapEl.style.height) || tileSize;
    const rect = containerEl.getBoundingClientRect();

    const padding = 60;
    const scaleX = (rect.width - padding * 2) / mapW;
    const scaleY = (rect.height - padding * 2) / mapH;
    vp.zoom = Math.min(scaleX, scaleY, 2); // don't zoom in past 2x

    vp.x = (rect.width - mapW * vp.zoom) / 2;
    vp.y = (rect.height - mapH * vp.zoom) / 2;

    applyTransform();
  }

  applyTransform();

  return { applyTransform, fitToView };
}

function touchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

import { state } from './state.js';
import { loadTileBlob } from './storage.js';

// Object URL cache to avoid leaks
const urlCache = new Map();

function revokeUrls() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

export function createTileMap(container) {
  let mapEl = document.getElementById('tile-map');
  if (!mapEl) {
    mapEl = document.createElement('div');
    mapEl.id = 'tile-map';
    container.appendChild(mapEl);
  }
  return mapEl;
}

export function computeBounds(tiles) {
  const keys = Object.keys(tiles);
  if (keys.length === 0) {
    return { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  }
  const coords = keys.map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });
  return {
    minCol: Math.min(...coords.map(c => c.col)),
    maxCol: Math.max(...coords.map(c => c.col)),
    minRow: Math.min(...coords.map(c => c.row)),
    maxRow: Math.max(...coords.map(c => c.row)),
  };
}

export async function renderTiles(mapEl, gameConfig) {
  revokeUrls();
  mapEl.querySelectorAll('.tile').forEach(el => el.remove());

  const tileSize = gameConfig.meta.tileSize;
  const tiles = gameConfig.tiles || {};
  const bounds = computeBounds(tiles);

  state.tileMapBounds = { minCol: bounds.minCol, minRow: bounds.minRow, tileSize };

  // Set map dimensions
  const cols = bounds.maxCol - bounds.minCol + 1;
  const rows = bounds.maxRow - bounds.minRow + 1;
  mapEl.style.width = (cols * tileSize) + 'px';
  mapEl.style.height = (rows * tileSize) + 'px';

  for (const [key, tileData] of Object.entries(tiles)) {
    const [col, row] = key.split(',').map(Number);

    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;
    img.dataset.col = col;
    img.dataset.row = row;

    // Try IndexedDB blob first, then URL fallback
    const blob = await loadTileBlob(gameConfig.meta.id, col, row);
    if (blob) {
      const url = URL.createObjectURL(blob);
      urlCache.set(key, url);
      img.src = url;
    } else if (tileData.image) {
      img.src = tileData.image;
    }

    img.style.left = ((col - bounds.minCol) * tileSize) + 'px';
    img.style.top = ((row - bounds.minRow) * tileSize) + 'px';
    img.style.width = tileSize + 'px';
    img.style.height = tileSize + 'px';

    mapEl.appendChild(img);
  }

  return bounds;
}

export function getTileElement(mapEl, col, row) {
  return mapEl.querySelector(`.tile[data-col="${col}"][data-row="${row}"]`);
}

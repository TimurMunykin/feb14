import { mainImage } from './dom.js';
import { state } from './state.js';

// ========== Legacy (single-image mode) ==========

// Returns the rendered image rect relative to the container
export function getImageRect() {
  const containerRect = mainImage.parentElement.getBoundingClientRect();
  const imgRect = mainImage.getBoundingClientRect();

  return {
    x: imgRect.left - containerRect.left,
    y: imgRect.top - containerRect.top,
    width: imgRect.width,
    height: imgRect.height,
  };
}

// Convert % coords to pixel position within the container
export function toPixel(xPct, yPct) {
  const rect = getImageRect();
  return {
    x: rect.x + (xPct / 100) * rect.width,
    y: rect.y + (yPct / 100) * rect.height,
  };
}

// Convert pixel position within the container to % coords
export function toPercent(px, py) {
  const rect = getImageRect();
  return {
    x: ((px - rect.x) / rect.width) * 100,
    y: ((py - rect.y) / rect.height) * 100,
  };
}

// ========== Tile map mode ==========

// Convert fractional tile coordinates to pixel position within the tile map
// tileX: integer part = column, fractional part = position within tile
// tileY: integer part = row, fractional part = position within tile
export function tileToPixel(tileX, tileY) {
  const { minCol, minRow, tileSize } = state.tileMapBounds;
  return {
    x: (tileX - minCol) * tileSize,
    y: (tileY - minRow) * tileSize,
  };
}

// Convert pixel position within tile map to fractional tile coordinates
export function pixelToTile(px, py) {
  const { minCol, minRow, tileSize } = state.tileMapBounds;
  return {
    tileX: px / tileSize + minCol,
    tileY: py / tileSize + minRow,
  };
}

// Convert screen (client) coordinates to tile coordinates
// Accounts for zoom/pan viewport transform
export function screenToTile(clientX, clientY) {
  const container = document.getElementById('game-container');
  const rect = container.getBoundingClientRect();
  const vp = state.viewport;

  const mapX = (clientX - rect.left - vp.x) / vp.zoom;
  const mapY = (clientY - rect.top - vp.y) / vp.zoom;

  return pixelToTile(mapX, mapY);
}

// Convert tile coordinates to screen (client) coordinates
export function tileToScreen(tileX, tileY) {
  const container = document.getElementById('game-container');
  const rect = container.getBoundingClientRect();
  const vp = state.viewport;
  const px = tileToPixel(tileX, tileY);

  return {
    x: px.x * vp.zoom + vp.x + rect.left,
    y: px.y * vp.zoom + vp.y + rect.top,
  };
}

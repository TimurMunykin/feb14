import { mainImage } from './dom.js';

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

import { hotspots } from './config.js';

export const state = {
  editorMode: false,
  activePopup: null,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  nextId: hotspots.length ? Math.max(...hotspots.map(h => h.id)) + 1 : 1,
  spots: hotspots.map(h => ({ ...h })),
};

export const state = {
  // Mode: 'single-image' | 'tilemap'
  mode: 'single-image',
  editorMode: false,
  constructorMode: false,
  activePopup: null,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  nextId: 1,
  spots: [],

  // Tile map
  gameId: null,
  gameConfig: null,
  tileMapBounds: { minCol: 0, minRow: 0, tileSize: 512 },
  viewport: { x: 0, y: 0, zoom: 1 },
};

export function loadSpots(hotspots) {
  state.spots = hotspots.map(h => ({ ...h, found: false }));
  state.nextId = hotspots.length ? Math.max(...hotspots.map(h => h.id)) + 1 : 1;
}

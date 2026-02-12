export const state = {
  editorMode: false,
  activePopup: null,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  nextId: 1,
  spots: [],
};

export function loadSpots(hotspots) {
  state.spots = hotspots.map(h => ({ ...h, found: false }));
  state.nextId = hotspots.length ? Math.max(...hotspots.map(h => h.id)) + 1 : 1;
}

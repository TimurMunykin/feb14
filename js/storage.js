const DB_NAME = 'tile-constructor';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('games')) {
        db.createObjectStore('games', { keyPath: 'meta.id' });
      }
      if (!db.objectStoreNames.contains('tiles')) {
        db.createObjectStore('tiles'); // key: "gameId:col,row"
      }
      if (!db.objectStoreNames.contains('refs')) {
        db.createObjectStore('refs'); // key: "gameId:refId"
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings'); // key: string
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const t = db.transaction(storeName, mode);
    return t.objectStore(storeName);
  });
}

function req(idbReq) {
  return new Promise((resolve, reject) => {
    idbReq.onsuccess = () => resolve(idbReq.result);
    idbReq.onerror = () => reject(idbReq.error);
  });
}

// --- Games ---

export async function saveGame(gameConfig) {
  const store = await tx('games', 'readwrite');
  return req(store.put(gameConfig));
}

export async function loadGame(gameId) {
  const store = await tx('games', 'readonly');
  const result = await req(store.get(gameId));
  return result || null;
}

export async function listGames() {
  const store = await tx('games', 'readonly');
  const all = await req(store.getAll());
  return all.map(g => ({
    id: g.meta.id,
    title: g.meta.title || 'Untitled',
    tileCount: Object.keys(g.tiles || {}).length,
    hotspotCount: (g.hotspots || []).length,
    createdAt: g.meta.createdAt,
  }));
}

export async function deleteGame(gameId) {
  // Delete game config
  const gStore = await tx('games', 'readwrite');
  await req(gStore.delete(gameId));

  // Delete all tile blobs for this game
  const tStore = await tx('tiles', 'readwrite');
  const tKeys = await req(tStore.getAllKeys());
  for (const key of tKeys) {
    if (typeof key === 'string' && key.startsWith(gameId + ':')) {
      tStore.delete(key);
    }
  }

  // Delete all ref images for this game
  const rStore = await tx('refs', 'readwrite');
  const rKeys = await req(rStore.getAllKeys());
  for (const key of rKeys) {
    if (typeof key === 'string' && key.startsWith(gameId + ':')) {
      rStore.delete(key);
    }
  }
}

// --- Tile Blobs ---

export async function saveTileBlob(gameId, col, row, blob) {
  const store = await tx('tiles', 'readwrite');
  return req(store.put(blob, `${gameId}:${col},${row}`));
}

export async function loadTileBlob(gameId, col, row) {
  const store = await tx('tiles', 'readonly');
  const result = await req(store.get(`${gameId}:${col},${row}`));
  return result || null;
}

// --- Reference Images ---

export async function saveRefImage(gameId, refId, blob) {
  const store = await tx('refs', 'readwrite');
  return req(store.put(blob, `${gameId}:${refId}`));
}

export async function loadRefImage(gameId, refId) {
  const store = await tx('refs', 'readonly');
  const result = await req(store.get(`${gameId}:${refId}`));
  return result || null;
}

// --- Settings ---

export async function saveSetting(key, value) {
  const store = await tx('settings', 'readwrite');
  return req(store.put(value, key));
}

export async function loadSetting(key) {
  const store = await tx('settings', 'readonly');
  const result = await req(store.get(key));
  return result === undefined ? null : result;
}

// --- Export ---

export async function exportGame(gameId) {
  const game = await loadGame(gameId);
  if (!game) throw new Error('Game not found');

  // Collect tile blobs as base64
  const embeddedTiles = {};
  for (const key of Object.keys(game.tiles || {})) {
    const [col, row] = key.split(',').map(Number);
    const blob = await loadTileBlob(gameId, col, row);
    if (blob) {
      embeddedTiles[key] = await blobToBase64(blob);
    }
  }

  const exportData = { ...game, _embeddedTiles: embeddedTiles };
  const json = JSON.stringify(exportData);
  const blob = new Blob([json], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${game.meta.title || 'game'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Import ---

export async function importGame(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.version !== 2) throw new Error('Unsupported game version');

  // Restore tile blobs from embedded data
  if (data._embeddedTiles) {
    for (const [key, base64] of Object.entries(data._embeddedTiles)) {
      const [col, row] = key.split(',').map(Number);
      const blob = base64ToBlob(base64, 'image/png');
      await saveTileBlob(data.meta.id, col, row, blob);
    }
    delete data._embeddedTiles;
  }

  await saveGame(data);
  return data;
}

// --- Helpers ---

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}

export function newGameId() {
  return 'game_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createNewGameConfig(title = 'New Game') {
  return {
    version: 2,
    meta: {
      id: newGameId(),
      title,
      tileSize: 512,
      createdAt: new Date().toISOString(),
    },
    intro: { title: 'Find all hidden memories', subtitle: 'A little game for you' },
    victory: { message: 'You found everything!', subtitle: 'Happy Valentine\'s Day!' },
    tiles: {},
    hotspots: [],
  };
}

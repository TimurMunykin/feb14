import { state, loadSpots } from './state.js';
import { loadConfig } from './config.js';
import { mainImage, hotspotsLayer } from './dom.js';
import { renderHotspots, updateCounter } from './render.js';
import { closePopup } from './popup.js';
import { setupEditor } from './editor.js';
import { showIntro, showVictory } from './screens.js';
import { loadGame, listGames, saveGame, createNewGameConfig, exportGame } from './storage.js';
import { createTileMap, renderTiles } from './tilemap.js';
import { initViewport } from './viewport.js';
import { setupConstructor, renderArrows } from './constructor.js';
import { showPlatform } from './platform.js';
import { screenToTile as _screenToTile } from './geometry.js';

const btnHint = document.getElementById('btn-hint');
let victoryConfig = {};

// --- Routing ---

async function init() {
  const params = new URLSearchParams(location.search);

  if (params.has('construct')) {
    await initConstructor(params.get('construct'));
  } else if (params.has('play')) {
    await initTilePlay(params.get('play'));
  } else if (params.has('editor')) {
    await initLegacyEditor();
  } else {
    // Check if there are any games in IndexedDB
    const games = await listGames();
    if (games.length > 0 || params.has('platform')) {
      await showPlatform();
    } else {
      await initLegacyGame();
    }
  }
}

// --- Constructor mode ---

async function initConstructor(gameId) {
  state.mode = 'tilemap';
  state.constructorMode = true;

  let gameConfig;
  if (gameId === 'new') {
    gameConfig = createNewGameConfig();
    await saveGame(gameConfig);
    history.replaceState(null, '', `?construct=${gameConfig.meta.id}`);
  } else {
    gameConfig = await loadGame(gameId);
    if (!gameConfig) {
      alert('Game not found');
      location.search = '';
      return;
    }
  }

  state.gameId = gameConfig.meta.id;
  state.gameConfig = gameConfig;

  // Hide legacy elements
  mainImage.classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');

  // Show constructor toolbar
  const toolbar = document.getElementById('constructor-toolbar');
  toolbar.classList.remove('hidden');

  // Setup tile map
  const container = document.getElementById('game-container');
  const tileMapContainer = document.getElementById('tile-map-container');
  tileMapContainer.classList.remove('hidden');

  const mapEl = createTileMap(tileMapContainer);

  // Move hotspots layer inside tile-map-container so it zooms/pans together
  tileMapContainer.insertBefore(hotspotsLayer, null);
  hotspotsLayer.style.pointerEvents = 'auto';

  await renderTiles(mapEl, gameConfig);

  const viewport = initViewport(tileMapContainer, container);
  setupConstructor(mapEl, gameConfig, viewport);

  // Load hotspots
  loadSpots(gameConfig.hotspots || []);
  renderHotspots();

  viewport.fitToView();

  // Toolbar buttons
  document.getElementById('btn-fit-view').addEventListener('click', () => viewport.fitToView());

  document.getElementById('btn-toggle-hotspots').addEventListener('click', () => {
    state.editorMode = !state.editorMode;
    const btn = document.getElementById('btn-toggle-hotspots');
    btn.classList.toggle('active', state.editorMode);
    renderHotspots();
    if (state.editorMode) {
      bindTileHotspotEditor(mapEl, gameConfig);
    }
  });

  document.getElementById('btn-export-game').addEventListener('click', async () => {
    // Save current hotspots to config
    gameConfig.hotspots = state.spots.map(({ id, tileX, tileY, radius, image }) => ({
      id, tileX, tileY, radius, image,
    }));
    await saveGame(gameConfig);
    await exportGame(gameConfig.meta.id);
  });

  document.getElementById('btn-back-platform').addEventListener('click', () => {
    // Save hotspots before leaving
    gameConfig.hotspots = state.spots.map(({ id, tileX, tileY, radius, image }) => ({
      id, tileX, tileY, radius, image,
    }));
    saveGame(gameConfig).then(() => {
      location.search = '?platform';
    });
  });

  // Close popups on background click
  document.addEventListener('click', (e) => {
    if (state.activePopup && !e.target.closest('.popup') && !e.target.closest('.hotspot')) {
      closePopup();
    }
  });
}

function bindTileHotspotEditor(mapEl, gameConfig) {
  // Click on tile map to add hotspot (only when editor mode active)
  if (mapEl._hotspotEditorBound) return;
  mapEl._hotspotEditorBound = true;

  mapEl.addEventListener('click', (e) => {
    if (!state.editorMode) return;
    if (e.target.closest('.constructor-arrow')) return;
    if (e.target.closest('.hotspot')) return;
    if (state.dragTarget) return;

    const tileCoord = _screenToTile(e.clientX, e.clientY);
    const tileKey = `${Math.floor(tileCoord.tileX)},${Math.floor(tileCoord.tileY)}`;

    if (!gameConfig.tiles[tileKey]) return; // clicked on empty cell

    const newId = state.nextId++;
    state.spots.push({
      id: newId,
      tileX: Math.round(tileCoord.tileX * 10000) / 10000,
      tileY: Math.round(tileCoord.tileY * 10000) / 10000,
      radius: 0.04,
      image: `images/spot${newId}.jpg`,
      found: false,
    });

    renderHotspots();
  });
}

// --- Tile play mode ---

async function initTilePlay(gameId) {
  const gameConfig = await loadGame(gameId);
  if (!gameConfig) {
    alert('Game not found');
    location.search = '';
    return;
  }

  state.mode = 'tilemap';
  state.gameId = gameConfig.meta.id;
  state.gameConfig = gameConfig;

  // Hide legacy elements
  mainImage.classList.add('hidden');

  // Setup tile map
  const container = document.getElementById('game-container');
  const tileMapContainer = document.getElementById('tile-map-container');
  tileMapContainer.classList.remove('hidden');

  const mapEl = createTileMap(tileMapContainer);

  // Move hotspots layer inside tile-map-container
  tileMapContainer.insertBefore(hotspotsLayer, null);

  await renderTiles(mapEl, gameConfig);

  const viewport = initViewport(tileMapContainer, container);

  // Load hotspots
  loadSpots(gameConfig.hotspots || []);
  victoryConfig = gameConfig.victory || {};
  renderHotspots();
  updateCounter();

  viewport.fitToView();

  // Show HUD
  document.getElementById('hud').classList.remove('hidden');

  // Show intro
  showIntro(gameConfig.intro || {}, () => {});

  btnHint.addEventListener('click', showHint);

  document.addEventListener('click', (e) => {
    if (state.activePopup && !e.target.closest('.popup') && !e.target.closest('.hotspot')) {
      closePopup();
    }
  });
}

// --- Legacy modes ---

async function initLegacyEditor() {
  const config = await loadConfig();
  loadSpots(config.hotspots);

  state.editorMode = true;

  setupEditor();
  btnHint.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  renderHotspots();
  updateCounter();
}

async function initLegacyGame() {
  const config = await loadConfig();
  loadSpots(config.hotspots);
  victoryConfig = config.victory;

  renderHotspots();
  updateCounter();

  showIntro(config.intro, () => {});

  btnHint.addEventListener('click', showHint);

  document.addEventListener('click', (e) => {
    if (state.activePopup && !e.target.closest('.popup') && !e.target.closest('.hotspot')) {
      closePopup();
    }
  });

  window.addEventListener('resize', () => {
    renderHotspots();
    if (state.activePopup) closePopup(true);
  });
}

// --- Hint ---

let hintTargetId = null;

function showHint() {
  const unfound = state.spots.filter(s => !s.found);
  if (!unfound.length) return;

  if (hintTargetId === null || !unfound.find(s => s.id === hintTargetId)) {
    hintTargetId = unfound[Math.floor(Math.random() * unfound.length)].id;
  }

  const el = hotspotsLayer.querySelector(`[data-id="${hintTargetId}"]`);
  if (!el) return;

  btnHint.disabled = true;
  el.classList.add('hint');

  el.addEventListener('animationend', () => {
    el.classList.remove('hint');
    btnHint.disabled = false;
  }, { once: true });

  setTimeout(() => {
    el.classList.remove('hint');
    btnHint.disabled = false;
  }, 2600);
}

// --- Victory ---

export function checkVictory() {
  const allFound = state.spots.length > 0 && state.spots.every(s => s.found);
  if (allFound) {
    setTimeout(() => showVictory(victoryConfig), 800);
  }
}

// --- Bootstrap ---
// Don't wait for mainImage in non-legacy modes
const params = new URLSearchParams(location.search);
if (params.has('construct') || params.has('play') || params.has('platform')) {
  init();
} else if (params.has('editor')) {
  if (mainImage.complete) init();
  else {
    mainImage.addEventListener('load', init);
    mainImage.addEventListener('error', init);
  }
} else {
  // Could be legacy game or platform — try platform first
  listGames().then(games => {
    if (games.length > 0) {
      init();
    } else {
      if (mainImage.complete) init();
      else {
        mainImage.addEventListener('load', init);
        mainImage.addEventListener('error', init);
      }
    }
  });
}

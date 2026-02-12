import { state, loadSpots } from './state.js';
import { loadConfig } from './config.js';
import { mainImage, hotspotsLayer } from './dom.js';
import { renderHotspots, updateCounter } from './render.js';
import { closePopup } from './popup.js';
import { setupEditor } from './editor.js';
import { showIntro, showVictory } from './screens.js';

const btnHint = document.getElementById('btn-hint');
let victoryConfig = {};

async function init() {
  const config = await loadConfig();
  loadSpots(config.hotspots);
  victoryConfig = config.victory;

  state.editorMode = location.search.includes('editor');

  if (state.editorMode) {
    setupEditor();
    btnHint.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    renderHotspots();
    updateCounter();
    return;
  }

  renderHotspots();
  updateCounter();

  // Show intro (game starts blurred)
  showIntro(config.intro, () => {
    // Game is now active
  });

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

// Called from render.js when a spot is found
export function checkVictory() {
  const allFound = state.spots.length > 0 && state.spots.every(s => s.found);
  if (allFound) {
    setTimeout(() => showVictory(victoryConfig), 800);
  }
}

if (mainImage.complete) {
  init();
} else {
  mainImage.addEventListener('load', init);
  mainImage.addEventListener('error', init);
}

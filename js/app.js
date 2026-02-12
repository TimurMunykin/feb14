import { state } from './state.js';
import { mainImage, hotspotsLayer } from './dom.js';
import { renderHotspots, updateCounter } from './render.js';
import { closePopup } from './popup.js';
import { setupEditor } from './editor.js';

const btnHint = document.getElementById('btn-hint');

function init() {
  state.editorMode = location.search.includes('editor');

  if (state.editorMode) {
    setupEditor();
    btnHint.classList.add('hidden');
  }

  renderHotspots();
  updateCounter();

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

  // If current hint target was found or not set, pick a new one
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

  // fallback
  setTimeout(() => {
    el.classList.remove('hint');
    btnHint.disabled = false;
  }, 2600);
}

if (mainImage.complete) {
  init();
} else {
  mainImage.addEventListener('load', init);
  mainImage.addEventListener('error', init);
}

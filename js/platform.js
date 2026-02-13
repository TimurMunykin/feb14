import { listGames, deleteGame, saveSetting, loadSetting, importGame } from './storage.js';
import { showToast } from './utils.js';

export async function showPlatform() {
  // Hide game elements
  document.getElementById('game-container').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');

  let platform = document.getElementById('platform');
  if (!platform) {
    platform = document.createElement('div');
    platform.id = 'platform';
    document.body.appendChild(platform);
  }

  platform.innerHTML = `
    <div class="platform-header">
      <h1 class="platform-title">Game Constructor</h1>
      <div class="platform-actions">
        <button id="btn-new-game" class="btn-primary">+ New Game</button>
        <button id="btn-import-game" class="btn-secondary">Import</button>
        <button id="btn-settings" class="btn-secondary">Settings</button>
      </div>
    </div>
    <div id="game-list"></div>
  `;

  platform.classList.remove('hidden');

  await renderGameList();

  document.getElementById('btn-new-game').addEventListener('click', () => {
    location.search = '?construct=new';
  });

  document.getElementById('btn-import-game').addEventListener('click', handleImport);
  document.getElementById('btn-settings').addEventListener('click', showSettings);
}

async function renderGameList() {
  const games = await listGames();
  const list = document.getElementById('game-list');

  if (games.length === 0) {
    list.innerHTML = '<p class="platform-empty">No games yet. Create your first one!</p>';
    return;
  }

  list.innerHTML = games.map(g => `
    <div class="game-card" data-id="${g.id}">
      <div class="game-card-info">
        <h3 class="game-card-title">${escapeHtml(g.title)}</h3>
        <p class="game-card-meta">${g.tileCount} tiles, ${g.hotspotCount} hotspots</p>
      </div>
      <div class="game-card-actions">
        <a href="?construct=${g.id}" class="btn-small btn-primary">Edit</a>
        <a href="?play=${g.id}" class="btn-small btn-secondary">Play</a>
        <button class="btn-small btn-danger btn-delete-game" data-id="${g.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Bind delete buttons
  list.querySelectorAll('.btn-delete-game').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this game?')) {
        await deleteGame(id);
        await renderGameList();
        showToast('Game deleted');
      }
    });
  });
}

async function showSettings() {
  const currentKey = (await loadSetting('apiKey')) || '';
  const currentModel = (await loadSetting('model')) || 'gemini-2.0-flash-exp';

  const overlay = document.createElement('div');
  overlay.className = 'gen-dialog-overlay';
  overlay.innerHTML = `
    <div class="gen-dialog settings-dialog">
      <h3>Settings</h3>

      <label class="gen-label">Gemini API Key:</label>
      <input type="password" id="settings-api-key" class="gen-input" value="${escapeHtml(currentKey)}" placeholder="Enter your API key">
      <p class="gen-hint">Get your key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a></p>

      <label class="gen-label">Model:</label>
      <select id="settings-model" class="gen-input">
        <option value="gemini-2.0-flash-exp" ${currentModel === 'gemini-2.0-flash-exp' ? 'selected' : ''}>Gemini 2.0 Flash (fast)</option>
        <option value="gemini-2.0-pro-exp" ${currentModel === 'gemini-2.0-pro-exp' ? 'selected' : ''}>Gemini 2.0 Pro (quality)</option>
      </select>

      <div class="gen-buttons">
        <button class="gen-cancel">Cancel</button>
        <button class="gen-submit">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('.gen-cancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('.gen-submit').addEventListener('click', async () => {
    const key = overlay.querySelector('#settings-api-key').value.trim();
    const model = overlay.querySelector('#settings-model').value;

    await saveSetting('apiKey', key);
    await saveSetting('model', model);

    overlay.remove();
    showToast('Settings saved');
  });
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const game = await importGame(text);
      showToast(`Imported: ${game.meta.title}`);
      await renderGameList();
    } catch (err) {
      showToast('Import failed: ' + err.message);
    }
  });
  input.click();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

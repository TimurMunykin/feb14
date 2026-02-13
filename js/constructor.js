import { state } from './state.js';
import { generateTile } from './api.js';
import { saveTileBlob, saveGame, loadTileBlob } from './storage.js';
import { renderTiles, computeBounds } from './tilemap.js';
import { showToast } from './utils.js';

let mapEl = null;
let gameConfig = null;
let viewportCtrl = null;

export function setupConstructor(map, config, viewport) {
  mapEl = map;
  gameConfig = config;
  viewportCtrl = viewport;
  renderArrows();
}

export function renderArrows() {
  if (!mapEl || !gameConfig) return;
  mapEl.querySelectorAll('.constructor-arrow').forEach(el => el.remove());

  const tiles = gameConfig.tiles || {};
  const tileKeys = new Set(Object.keys(tiles));
  const tileSize = gameConfig.meta.tileSize;
  const bounds = state.tileMapBounds;

  // Empty grid: show single + button at (0,0)
  if (tileKeys.size === 0) {
    addArrowButton(0, 0, 'center');
    return;
  }

  // Find all open edges
  const targets = new Map(); // "col,row" -> Set of source directions

  for (const key of tileKeys) {
    const [col, row] = key.split(',').map(Number);
    const neighbors = [
      { dir: 'right', col: col + 1, row },
      { dir: 'left', col: col - 1, row },
      { dir: 'down', col, row: row + 1 },
      { dir: 'up', col, row: row - 1 },
    ];

    for (const n of neighbors) {
      const nKey = `${n.col},${n.row}`;
      if (!tileKeys.has(nKey)) {
        if (!targets.has(nKey)) targets.set(nKey, new Set());
        targets.get(nKey).add(n.dir);
      }
    }
  }

  for (const [key, directions] of targets) {
    const [col, row] = key.split(',').map(Number);
    addArrowButton(col, row, [...directions].join(','));
  }
}

function addArrowButton(col, row, dirInfo) {
  const tileSize = gameConfig.meta.tileSize;
  const bounds = state.tileMapBounds;

  const btn = document.createElement('button');
  btn.className = 'constructor-arrow';
  btn.innerHTML = '+';
  btn.title = `Add tile (${col}, ${row})`;
  btn.dataset.col = col;
  btn.dataset.row = row;

  // For empty grid, position at center of a virtual tile at (0,0)
  const effectiveMinCol = Object.keys(gameConfig.tiles).length === 0 ? 0 : bounds.minCol;
  const effectiveMinRow = Object.keys(gameConfig.tiles).length === 0 ? 0 : bounds.minRow;

  const x = (col - effectiveMinCol) * tileSize + tileSize / 2;
  const y = (row - effectiveMinRow) * tileSize + tileSize / 2;

  btn.style.left = x + 'px';
  btn.style.top = y + 'px';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openGenerationDialog(col, row);
  });

  mapEl.appendChild(btn);
}

function openGenerationDialog(targetCol, targetRow) {
  // Get adjacent info
  const adjacent = getAdjacentTiles(targetCol, targetRow);

  const overlay = document.createElement('div');
  overlay.className = 'gen-dialog-overlay';

  const adjacentDesc = adjacent.length > 0
    ? adjacent.map(a => `${a.direction}`).join(', ')
    : 'none (first tile)';

  overlay.innerHTML = `
    <div class="gen-dialog">
      <h3>Generate tile (${targetCol}, ${targetRow})</h3>
      <p class="gen-context">Adjacent tiles: ${adjacentDesc}</p>

      <label class="gen-label">Describe the scene:</label>
      <textarea class="gen-prompt" rows="3" placeholder="e.g., cozy bookshop interior with warm lighting..."></textarea>

      <label class="gen-label">Reference photo (optional):</label>
      <div class="gen-upload-area">
        <input type="file" class="gen-file" accept="image/*">
        <div class="gen-preview"></div>
      </div>

      <div class="gen-buttons">
        <button class="gen-cancel">Cancel</button>
        <button class="gen-submit">Generate</button>
      </div>

      <div class="gen-progress hidden">
        <div class="gen-spinner"></div>
        <span>Generating tile...</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // File preview
  const fileInput = overlay.querySelector('.gen-file');
  const preview = overlay.querySelector('.gen-preview');
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
      const url = URL.createObjectURL(fileInput.files[0]);
      preview.innerHTML = `<img src="${url}" alt="preview">`;
    }
  });

  // Cancel
  overlay.querySelector('.gen-cancel').addEventListener('click', () => overlay.remove());

  // Submit
  overlay.querySelector('.gen-submit').addEventListener('click', async () => {
    const prompt = overlay.querySelector('.gen-prompt').value.trim();
    if (!prompt) {
      showToast('Enter a prompt');
      return;
    }

    const progressEl = overlay.querySelector('.gen-progress');
    const submitBtn = overlay.querySelector('.gen-submit');
    progressEl.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
      // Gather adjacent tile blobs
      const adjacentImages = [];
      for (const adj of adjacent) {
        const blob = await loadTileBlob(gameConfig.meta.id, adj.col, adj.row);
        if (blob) {
          adjacentImages.push({ blob, direction: adj.direction });
        }
      }

      const refFile = fileInput.files[0] || null;

      const result = await generateTile({
        prompt,
        referenceImage: refFile,
        adjacentImages,
        tileSize: gameConfig.meta.tileSize,
      });

      // Save tile blob
      await saveTileBlob(gameConfig.meta.id, targetCol, targetRow, result.blob);

      // Update config
      const key = `${targetCol},${targetRow}`;
      gameConfig.tiles[key] = {
        prompt,
        generatedAt: new Date().toISOString(),
      };

      if (refFile) {
        gameConfig.tiles[key].referenceImage = refFile.name;
      }

      await saveGame(gameConfig);

      // Re-render
      await renderTiles(mapEl, gameConfig);
      renderArrows();

      if (viewportCtrl) viewportCtrl.fitToView();

      overlay.remove();
      showToast('Tile generated!');
    } catch (err) {
      showToast('Error: ' + err.message);
      progressEl.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });

  // Focus prompt
  setTimeout(() => overlay.querySelector('.gen-prompt').focus(), 100);
}

function getAdjacentTiles(col, row) {
  const tiles = gameConfig.tiles || {};
  const result = [];
  const neighbors = [
    { direction: 'left', col: col - 1, row },
    { direction: 'right', col: col + 1, row },
    { direction: 'up', col, row: row - 1 },
    { direction: 'down', col, row: row + 1 },
  ];

  for (const n of neighbors) {
    const key = `${n.col},${n.row}`;
    if (tiles[key]) {
      result.push(n);
    }
  }

  return result;
}

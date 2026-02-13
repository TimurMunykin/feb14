import { loadSetting } from './storage.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function generateTile({ prompt, referenceImage, adjacentImages, tileSize }) {
  const apiKey = await loadSetting('apiKey');
  if (!apiKey) throw new Error('API key not set. Enter it in Settings.');

  const model = (await loadSetting('model')) || 'gemini-2.0-flash-exp';
  const url = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const parts = [];

  // System prompt for tile generation
  parts.push({ text: buildTilePrompt(prompt, adjacentImages, tileSize) });

  // Adjacent tile images for context (up to 4)
  if (adjacentImages) {
    for (const adj of adjacentImages) {
      const base64 = await blobToBase64(adj.blob);
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64,
        },
      });
      parts.push({ text: `[Adjacent tile to the ${adj.direction}]` });
    }
  }

  // Reference photo
  if (referenceImage) {
    const refBase64 = await fileToBase64(referenceImage);
    parts.push({
      inlineData: {
        mimeType: referenceImage.type || 'image/jpeg',
        data: refBase64,
      },
    });
    parts.push({ text: '[Reference photo — incorporate elements and mood from this image into the tile]' });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

  if (!imagePart) {
    const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
    throw new Error('No image in response' + (textPart ? ': ' + textPart.text : ''));
  }

  const blob = base64ToBlob(imagePart.inlineData.data, imagePart.inlineData.mimeType);
  return { blob };
}

function buildTilePrompt(userPrompt, adjacentImages, tileSize) {
  let p = `Generate a ${tileSize}x${tileSize} pixel square tile image for a game scene.\n\n`;
  p += `Scene description: ${userPrompt}\n\n`;

  if (adjacentImages && adjacentImages.length > 0) {
    p += 'CRITICAL: This tile must seamlessly connect to its neighbors. ';
    p += 'The edges that touch adjacent tiles must have matching colors, textures, and content. ';
    p += 'Adjacent tiles are provided as reference images with their relative position labeled.\n\n';

    for (const adj of adjacentImages) {
      const opp = oppositeDir(adj.direction);
      p += `- There is an existing tile to the ${adj.direction}. `;
      p += `The ${opp} edge of the new tile must seamlessly match the ${adj.direction} edge of that tile.\n`;
    }
    p += '\n';
  }

  p += 'Style: painterly, illustrated, cohesive art style. ';
  p += 'Do NOT include any text, watermarks, or borders. ';
  p += 'The image must be exactly square.';

  return p;
}

function oppositeDir(dir) {
  const map = { left: 'right', right: 'left', up: 'down', down: 'up' };
  return map[dir] || dir;
}

// --- Helpers ---

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
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

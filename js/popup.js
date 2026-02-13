import { state } from './state.js';
import { mainImage, popupContainer } from './dom.js';
import { toPixel, tileToScreen } from './geometry.js';

function getHotspotScreenPos(spot) {
  if (state.mode === 'tilemap') {
    const screen = tileToScreen(spot.tileX, spot.tileY);
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    return { x: screen.x - rect.left, y: screen.y - rect.top };
  }
  return toPixel(spot.x, spot.y);
}

export function showPopup(spot) {
  if (state.activePopup) {
    closePopup(true);
  }

  const popup = document.createElement('div');
  popup.className = 'popup';

  const arrow = document.createElement('div');
  arrow.className = 'popup-arrow';

  const inner = document.createElement('div');
  inner.className = 'popup-inner';

  const img = document.createElement('img');
  img.src = spot.image;
  img.alt = 'Найдено!';
  img.onerror = () => {
    img.style.display = 'none';
    inner.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Изображение не найдено</div>';
  };

  inner.appendChild(img);
  popup.appendChild(arrow);
  popup.appendChild(inner);

  // Insert hidden to measure real size
  popup.style.visibility = 'hidden';
  popup.style.left = '0px';
  popup.style.top = '0px';
  inner.style.animation = 'none';
  popupContainer.appendChild(popup);

  const position = () => {
    const popupRect = popup.getBoundingClientRect();
    const popupW = popupRect.width;
    const popupH = popupRect.height;

    const hotspotPos = getHotspotScreenPos(spot);
    const container = document.getElementById('game-container');
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const gap = 20;

    const spaceRight = containerW - hotspotPos.x;
    const spaceLeft = hotspotPos.x;
    const spaceBottom = containerH - hotspotPos.y;
    const spaceTop = hotspotPos.y;

    let px, py, arrowDir;

    // Pick the best side — prefer sides with enough room
    const fits = {
      right: spaceRight >= popupW + gap,
      left: spaceLeft >= popupW + gap,
      top: spaceTop >= popupH + gap,
      bottom: spaceBottom >= popupH + gap,
    };

    if (fits.right && spaceRight >= spaceLeft) {
      px = hotspotPos.x + gap;
      py = hotspotPos.y - popupH / 2;
      arrowDir = 'left';
    } else if (fits.left) {
      px = hotspotPos.x - popupW - gap;
      py = hotspotPos.y - popupH / 2;
      arrowDir = 'right';
    } else if (fits.top) {
      px = hotspotPos.x - popupW / 2;
      py = hotspotPos.y - popupH - gap;
      arrowDir = 'bottom';
    } else if (fits.bottom) {
      px = hotspotPos.x - popupW / 2;
      py = hotspotPos.y + gap;
      arrowDir = 'top';
    } else {
      if (spaceTop >= spaceBottom) {
        px = hotspotPos.x - popupW / 2;
        py = hotspotPos.y - popupH - gap;
        arrowDir = 'bottom';
      } else {
        px = hotspotPos.x - popupW / 2;
        py = hotspotPos.y + gap;
        arrowDir = 'top';
      }
    }

    // Clamp to viewport
    px = Math.max(8, Math.min(px, containerW - popupW - 8));
    py = Math.max(8, Math.min(py, containerH - popupH - 8));

    popup.className = 'popup arrow-' + arrowDir;
    popup.style.left = px + 'px';
    popup.style.top = py + 'px';
    popup.style.visibility = '';

    // Restore animation
    inner.style.animation = '';
    const originX = hotspotPos.x - px;
    const originY = hotspotPos.y - py;
    inner.style.transformOrigin = `${originX}px ${originY}px`;
  };

  // If image loaded — position immediately, otherwise wait
  if (img.complete && img.naturalWidth) {
    position();
  } else {
    img.addEventListener('load', position, { once: true });
    img.addEventListener('error', position, { once: true });
    setTimeout(() => {
      if (popup.style.visibility === 'hidden') position();
    }, 300);
  }

  state.activePopup = popup;
}

export function closePopup(instant) {
  const popup = state.activePopup;
  if (!popup) return;
  state.activePopup = null;

  if (instant) {
    popup.remove();
    return;
  }

  popup.classList.add('closing');
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
  setTimeout(() => popup.remove(), 300);
}

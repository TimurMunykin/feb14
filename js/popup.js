import { state } from './state.js';
import { mainImage, popupContainer } from './dom.js';
import { toPixel } from './geometry.js';

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
  img.alt = 'Found!';
  img.onerror = () => {
    img.style.display = 'none';
    inner.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Image not found</div>';
  };

  inner.appendChild(img);
  popup.appendChild(arrow);
  popup.appendChild(inner);

  // Position popup
  const hotspotPos = toPixel(spot.x, spot.y);
  const containerW = mainImage.parentElement.clientWidth;
  const containerH = mainImage.parentElement.clientHeight;
  const popupW = 240 + 12;
  const popupH = 200;
  const gap = 20;

  const spaceRight = containerW - hotspotPos.x;
  const spaceLeft = hotspotPos.x;
  const spaceBottom = containerH - hotspotPos.y;
  const spaceTop = hotspotPos.y;

  let px, py, arrowDir;

  if (spaceRight >= popupW + gap && spaceRight >= spaceLeft) {
    px = hotspotPos.x + gap;
    py = hotspotPos.y - popupH / 2;
    arrowDir = 'left';
  } else if (spaceLeft >= popupW + gap) {
    px = hotspotPos.x - popupW - gap;
    py = hotspotPos.y - popupH / 2;
    arrowDir = 'right';
  } else if (spaceBottom >= popupH + gap && spaceBottom >= spaceTop) {
    px = hotspotPos.x - popupW / 2;
    py = hotspotPos.y + gap;
    arrowDir = 'top';
  } else {
    px = hotspotPos.x - popupW / 2;
    py = hotspotPos.y - popupH - gap;
    arrowDir = 'bottom';
  }

  px = Math.max(8, Math.min(px, containerW - popupW - 8));
  py = Math.max(8, Math.min(py, containerH - popupH - 8));

  popup.classList.add('arrow-' + arrowDir);
  popup.style.left = px + 'px';
  popup.style.top = py + 'px';

  const originX = hotspotPos.x - px;
  const originY = hotspotPos.y - py;
  inner.style.transformOrigin = `${originX}px ${originY}px`;

  popupContainer.appendChild(popup);
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

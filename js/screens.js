import { mainImage } from './dom.js';

// ========== INTRO ==========
export function showIntro(config, onStart) {
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';

  // Blur the game image
  mainImage.classList.add('blurred');
  document.getElementById('hud').classList.add('hidden');

  const title = config.title || 'Найди все воспоминания';
  const subtitle = config.subtitle || '';
  const hints = [
    'Время не ограничено — не торопись',
    'Если сложно — жми кнопку Подсказка',
  ];

  overlay.innerHTML = `
    <div class="intro-content">
      <div class="heart-wrap"><div class="intro-heart"></div></div>
      <h1 class="intro-title">${title}</h1>
      ${subtitle ? `<p class="intro-subtitle">${subtitle}</p>` : ''}
      <ul class="intro-hints">
        ${hints.map(h => `<li>${h}</li>`).join('')}
      </ul>
      <button class="intro-start">
        <span class="intro-start-heart">&#10084;</span> Начать
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.intro-start').addEventListener('click', () => {
    overlay.classList.add('fade-out');
    mainImage.classList.remove('blurred');
    document.getElementById('hud').classList.remove('hidden');

    overlay.addEventListener('animationend', () => {
      overlay.remove();
      onStart();
    }, { once: true });

    setTimeout(() => overlay.remove(), 600);
  });
}

// ========== VICTORY ==========
export function showVictory(config) {
  const overlay = document.createElement('div');
  overlay.id = 'victory-overlay';

  const message = config.message || 'Ты нашла всё!';
  const subtitle = config.subtitle || '';

  // Generate hearts
  let heartsHtml = '';
  for (let i = 0; i < 30; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 3 + Math.random() * 4;
    const size = 10 + Math.random() * 20;
    const opacity = 0.4 + Math.random() * 0.6;
    heartsHtml += `<div class="heart-particle" style="
      left:${left}%;
      animation-delay:${delay}s;
      animation-duration:${duration}s;
      font-size:${size}px;
      opacity:${opacity};
    ">&#10084;</div>`;
  }

  overlay.innerHTML = `
    <div class="hearts-container">${heartsHtml}</div>
    <div class="victory-content">
      <div class="heart-wrap"><div class="victory-heart"></div></div>
      <h1 class="victory-message">${message}</h1>
      ${subtitle ? `<p class="victory-subtitle">${subtitle}</p>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });
}

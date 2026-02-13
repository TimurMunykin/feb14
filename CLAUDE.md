# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Valentine's Day themed hidden object game ("Find the hidden memories"). Pure static HTML/CSS/JavaScript with zero dependencies — no build tools, bundler, or package manager.

## Development

```bash
# Run locally
npx serve .
# Open http://localhost:3000

# Editor mode (visual hotspot placement)
# Navigate to http://localhost:3000?editor

# Deploy
vercel deploy --prod --yes
```

No test framework or linter is configured.

## Architecture

**Entry point:** `index.html` loads `js/app.js` as an ES6 module (`<script type="module">`). Modules are loaded natively in the browser — no bundler.

**JS modules (js/):**
- `app.js` — Game lifecycle: loads config, initializes hotspots, handles clicks/resize, checks victory condition
- `state.js` — Single global mutable `state` object (editorMode, activePopup, spots[], etc.)
- `config.js` — Fetches `config.json` at startup
- `render.js` — Creates hotspot DOM elements from state
- `popup.js` — Smart popup positioning (prefers right/left, falls back to top/bottom, clamps to viewport)
- `editor.js` — Visual editor: click to add hotspots, drag to move, scroll to resize, export/import JSON
- `screens.js` — Intro and victory overlay screens
- `geometry.js` — Converts between percentage-based coordinates (stored in config) and pixel positions
- `dom.js` — DOM element references

**Config format (`config.json`):** Hotspots use percentage-based x/y coordinates (0–100) and radius as % of image height, making them resolution-independent. Each hotspot has an id, position, radius, and popup image path.

**Game flow:** Intro overlay → click hotspots to reveal popup images → all found → victory screen with animated hearts.

**UI text is in Russian** (counter, hints, intro). Victory subtitle is English.

## Key Patterns

- Coordinate system: percentages in config, converted to pixels at runtime via `geometry.js` (`toPixel`/`toPercent`)
- Editor mode activated by `?editor` URL query parameter
- State-driven rendering: `state.spots[]` drives hotspot DOM creation
- CSS animations: pulse-ring (hover), spring bounce (popup), falling hearts (victory)
- Styling in single `style.css` (dark theme, retro press-start-2p font)

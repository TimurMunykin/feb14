# Hidden Object Game

Static hidden object game — pure HTML/CSS/JS, no build tools.

## Quick Start

```bash
npx serve .
```

Open `http://localhost:3000` in your browser.

## Setup

1. Place your main scene image as `images/main.jpg` (or `.svg`, `.png`)
2. Place popup images in `images/` (e.g. `spot1.jpg`, `spot2.jpg`)
3. Open `?editor` to visually place hotspots
4. Click **Export** to copy the JSON config
5. Paste it into `js/config.js`
6. Deploy

## Editor Mode

Open `index.html?editor` to enter the visual editor:

- **Click** on image — add hotspot
- **Drag** — move hotspot
- **Right-click** — delete hotspot
- **Double-click** — edit image path
- **Export** — copy config JSON to clipboard
- **Import** — load config from JSON

## Deploy

```bash
vercel deploy --prod --yes
```
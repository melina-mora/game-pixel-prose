# Pixel & Prose

## What it is
Pixel & Prose is a browser-based text RPG built as a portfolio demo of clean front-end architecture, product-level UX decisions, and practical LLM integration.

Core loop:
- explore
- encounter
- choose
- consequence

Game systems:
- HP + minimal combat stats (ATK/DEF)
- inventory with key items and consumables
- 5 traversable zones (Ruined Gate, Dark Forest, Whisper Crypt, Tower of the Quiet Sage, Ashen Throne)
- win condition: defeat the Hollow Regent
- lose conditions:
  - HP reaches 0
  - torches reach 0 (`"The darkness consumes him."`)
- torch economy:
  - every action costs 1 torch
  - player starts with 5 torches
  - hidden choice rewards can restore 1-2 torches

## How to run
1. Serve the folder as a static site:
   - `npx serve .`
   - or VS Code Live Server
2. Open `index.html` from that server URL.
3. Optional: paste an OpenAI API key and click `Connect`.
4. Play entirely in-session (no backend, no database, no save file).

Deploy directly to Netlify, GitHub Pages, or Vercel.

## Tech decisions
- Module split:
  - [`index.html`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/index.html): flat centered layout with three gameplay sections (ASCII art, console, decisions), grayscale ASCII color system, theme/text-size controls.
  - [`game.js`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/game.js): state machine, torch action wrapper, encounters/combat, AI fallback orchestration, UI controls.
  - [`sprites.js`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/sprites.js): detailed 82x50 ASCII scene renderer displayed in a 400x400 viewport.
- Single `state` object controls UI, narrative, and combat to prevent drift.
- Action wrapper enforces the torch rule globally, so every decision path stays consistent.
- Auto-scroll narrative log keeps newest text visible without requiring manual scroll.

## AI integration notes
- Client-side integration via `fetch` to `https://api.openai.com/v1/chat/completions`.
- Model: `gpt-4o-mini`.
- API key is optional and stored in memory only for the active tab.
- Fallback text is authored for every AI call path, so gameplay never depends on API availability.
- AI is used for:
  - location setup narration
  - encounter intros
  - NPC dialogue
  - ending text

## Illustration system notes
- No external gameplay images are used.
- Scenes are rendered as detailed animated ASCII art in a fixed `400x400` `<pre>` viewport.
- ASCII depth is produced with per-character grayscale tone classes (`a0`..`a6`) for light, mid, and shadow values.
- Scene transitions are state-driven (`gate`, `forest`, `crypt`, `tower`, `throne`, `encounter`, `victory`, `gameover`).
- Animation is subtle and atmospheric (flicker, blink, drift, pulse) using character swaps on a timed loop.
- UI includes user-selectable dark mode and light mode.
- UI keeps the strict project palette:
  - `#0D0C0A` background
  - `#2A2825` panel
  - `#F5F0E8` text
  - `#8C8679` mist
  - `#C8692A` ember accent
  - `#A8924A` gold highlight

## Future v2 features
1. Deterministic seeded runs for reproducible QA playthroughs.
2. Accessibility profile toggles (reduced motion, high contrast, larger monospace scene text).
3. Branching scene events that trigger from decision history and inventory state.
4. Enemy intent telegraphing and status effects while keeping combat readable.
5. Optional URL-encoded session snapshots for shareable builds without backend persistence.

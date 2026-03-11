# Emberward

## What it is
Emberward is a browser-based text RPG designed as a portfolio-grade demo of product thinking, front-end architecture, and LLM-assisted storytelling.

The core loop is explicit and repeatable:
- explore a location
- trigger an encounter
- choose an action
- receive a consequence that updates state

The game includes:
- HP + minimal combat stats (ATK/DEF)
- inventory system with consumables and key items
- 5 traversable locations (Ruined Gate, Dark Forest, Whisper Crypt, Tower of the Quiet Sage, Ashen Throne)
- lose condition (HP reaches 0)
- win condition (defeat the Hollow Regent)
- OpenAI-powered narrative + deterministic fallback writing when API is unavailable

## How to run
1. Serve the folder as a static site (any local server is fine):
   - `npx serve .`
   - or VS Code Live Server
2. Open `index.html` in the browser through that server.
3. Optional: paste an OpenAI API key into the top bar and click `Connect`.
4. Click choices to play. Session state is in-memory only (no backend, no persistence).

Deploy directly to Netlify, Vercel, or GitHub Pages as a static site.

## Tech decisions
- **Module separation**:
  - [`index.html`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/index.html) handles UI structure + design system.
  - [`game.js`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/game.js) owns game state, branching logic, combat, and AI fallback orchestration.
  - [`sprites.js`](/Users/melinasrm/Documents/40-49%20Projects/PixelProseGame/sprites.js) owns all canvas pixel-art rendering and animation loops.
- **State-first architecture**: gameplay is driven by a single `state` object and pure-ish transitions (`enterLocation`, `startEncounter`, `runCombatTurn`, win/lose handlers).
- **No backend by design**: this keeps deployment trivial and showcases front-end integration patterns under real API constraints.
- **Portfolio readability**: comments explain architectural intent (why components are split this way), not just syntax-level behavior.

## AI integration notes
- Integration is client-side via `fetch` to `https://api.openai.com/v1/chat/completions`.
- Model target: `gpt-4o-mini`.
- API key is optional and kept in memory only for the active tab session.
- If key is missing or request fails, authored fallback strings are used, so the game remains fully playable.
- AI is used for:
  - location narration
  - encounter introductions
  - NPC dialogue
  - ending narrative

## Illustration system notes
- No external gameplay images are used.
- All scene art is generated programmatically on `<canvas>` using pixel blocks.
- Palette is constrained to:
  - `#0D0C0A` (background)
  - `#2A2825` (panel/dark surfaces)
  - `#F5F0E8` (text/light)
  - `#8C8679` (mist/mid tone)
  - `#C8692A` (ember accent)
  - `#A8924A` (gold highlight)
- Scene-specific, subtle animation examples:
  - Ruined Gate: torch flicker + twinkling stars
  - Dark Forest: branch sway + blinking eyes + drifting fog
  - Whisper Crypt: candle flicker + periodic water drip
  - Tower Dialogue: NPC idle bob + rune pulse
  - Encounter: enemy breathing + eye blink + ambient danger pulse
  - Victory: crest glow pulse
  - Game Over: skull flicker/fade

`img/` exists for exported references or concept captures if you want to snapshot scenes later.

## Future v2 features
1. Deterministic seed mode for reproducible runs and easier test snapshots.
2. Lightweight save/load via URL state hash (still backend-free).
3. Accessibility pass: reduced-motion mode + alternate contrast map.
4. Expanded combat roles (status effects, enemy patterns) while preserving MVP clarity.
5. Optional scene export utility to write frame captures into `img/` for art process documentation.

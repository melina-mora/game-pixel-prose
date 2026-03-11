// sprites.js
// Detailed ASCII renderer: each frame is an 82x50 character grid displayed at 400x400.

const WIDTH = 82;
const HEIGHT = 50;
const FRAME_MS = 170;

let rafId = null;
let lastFrame = 0;

function escapeHtml(ch) {
  if (ch === '&') return '&amp;';
  if (ch === '<') return '&lt;';
  if (ch === '>') return '&gt;';
  return ch;
}

function toneForChar(ch) {
  if (ch === ' ') return -1;
  if ('.`,'.includes(ch)) return 1;
  if ('_:-'.includes(ch)) return 2;
  if (';~|/\\()[]{}l!'.includes(ch)) return 3;
  if ('+=x^Y'.includes(ch)) return 4;
  if ('*oO'.includes(ch)) return 5;
  if ('#@'.includes(ch)) return 6;
  return 4;
}

function colorizeAscii(text) {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\n') {
      out += '\n';
      continue;
    }
    const tone = toneForChar(ch);
    if (tone < 0) {
      out += ch;
      continue;
    }
    out += `<span class=\"a${tone}\">${escapeHtml(ch)}</span>`;
  }
  return out;
}

function makeGrid(fill = ' ') {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(fill));
}

function inBounds(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function put(grid, x, y, ch) {
  if (!inBounds(x, y)) return;
  grid[y][x] = ch;
}

function putText(grid, x, y, text) {
  for (let i = 0; i < text.length; i += 1) {
    put(grid, x + i, y, text[i]);
  }
}

function line(grid, x0, y0, x1, y1, ch) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    put(grid, x0, y0, ch);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function fillRect(grid, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      put(grid, xx, yy, ch);
    }
  }
}

function rect(grid, x, y, w, h, ch) {
  for (let xx = x; xx < x + w; xx += 1) {
    put(grid, xx, y, ch);
    put(grid, xx, y + h - 1, ch);
  }
  for (let yy = y; yy < y + h; yy += 1) {
    put(grid, x, yy, ch);
    put(grid, x + w - 1, yy, ch);
  }
}

function circle(grid, cx, cy, r, ch) {
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      const d = x * x + y * y;
      if (d <= r * r) {
        put(grid, cx + x, cy + y, ch);
      }
    }
  }
}

function shade(y, top, bottom, chars) {
  const t = (y - top) / Math.max(1, bottom - top);
  const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(t * chars.length)));
  return chars[idx];
}

function hash(x, y, seed) {
  let n = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
  n = (n << 13) ^ n;
  const v = 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
  return (v + 1) * 0.5;
}

function starField(grid, top, bottom, tick) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const n = hash(x, y, 7);
      if (n > 0.985) {
        const twinkle = hash(x, y, tick * 3);
        put(grid, x, y, twinkle > 0.55 ? '*' : '.');
      }
    }
  }
}

function terrainNoise(grid, yStart, yEnd, seed, chars) {
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const n = hash(x, y, seed);
      if (n > 0.55) {
        const idx = Math.min(chars.length - 1, Math.floor(n * chars.length));
        put(grid, x, y, chars[idx]);
      }
    }
  }
}

function drawMoon(grid, x, y, r) {
  circle(grid, x, y, r, '@');
  circle(grid, x + 2, y - 1, r - 1, ' ');
  for (let i = -r; i <= r; i += 1) {
    put(grid, x + i, y - r, '.');
  }
}

function drawTower(grid, x, top, height) {
  fillRect(grid, x, top, 12, height, '#');
  for (let y = top + 2; y < top + height - 1; y += 2) {
    for (let xx = x + 1 + (y % 4 === 0 ? 0 : 2); xx < x + 11; xx += 4) {
      put(grid, xx, y, '=');
    }
  }

  for (let i = 0; i < 4; i += 1) {
    fillRect(grid, x + i * 3, top - 3, 2, 3, '#');
  }

  for (let y = top; y < top + height; y += 1) {
    put(grid, x, y, '|');
    put(grid, x + 11, y, '|');
  }
}

function sceneGate(tick) {
  const g = makeGrid(' ');

  for (let y = 0; y < 30; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      put(g, x, y, shade(y, 0, 30, [' ', ' ', '.', '.', ':', ':', ';']));
    }
  }

  starField(g, 0, 20, tick);
  drawMoon(g, 63, 8, 4);

  drawTower(g, 7, 15, 28);
  drawTower(g, 63, 15, 28);

  fillRect(g, 27, 20, 28, 23, '#');
  fillRect(g, 31, 23, 20, 20, ' ');
  rect(g, 27, 20, 28, 23, '|');

  for (let i = 0; i < 6; i += 1) {
    line(g, 31 + i * 3, 23, 31 + i * 3, 42, '|');
  }

  for (let x = 31; x <= 50; x += 1) {
    const arcY = 23 - Math.floor(Math.sqrt(Math.max(0, 100 - (x - 40) * (x - 40))) / 2.2);
    put(g, x, arcY, '#');
    put(g, x, arcY - 1, '.');
  }

  const flameA = ['^', '*', '+', '.'][tick % 4];
  const flameB = ['*', '^', '+', '.'][(tick + 1) % 4];
  put(g, 24, 29, flameA);
  put(g, 25, 28, flameA);
  put(g, 57, 29, flameB);
  put(g, 56, 28, flameB);

  fillRect(g, 0, 43, WIDTH, 7, '_');
  terrainNoise(g, 43, 49, 33, ['_', '.', ',', '~']);

  for (let x = 18; x < 64; x += 2) {
    const y = 46 + Math.floor(Math.sin(x * 0.2 + tick * 0.18));
    put(g, x, y, '.');
    put(g, x + 1, y + 1, ',');
  }

  putText(g, 2, 48, 'ruined gate, midnight wind, old fire');
  return g;
}

function drawTree(g, x, baseY, height, spread, tick, phase) {
  for (let y = 0; y < height; y += 1) {
    put(g, x, baseY - y, '|');
    if (y % 3 === 0) {
      put(g, x - 1, baseY - y, '|');
    }
  }

  for (let y = 0; y < spread; y += 1) {
    const w = spread - y;
    const sway = Math.round(Math.sin((tick * 0.12) + phase + y * 0.2));
    for (let xx = -w; xx <= w; xx += 1) {
      const ch = (Math.abs(xx + y) % 3 === 0) ? '^' : 'Y';
      put(g, x + xx + sway, baseY - height + y, ch);
    }
  }
}

function sceneForest(tick) {
  const g = makeGrid(' ');

  for (let y = 0; y < 34; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      put(g, x, y, shade(y, 0, 34, [' ', ' ', '.', '.', ':', ';', ';']));
    }
  }

  drawMoon(g, 13, 7, 3);
  starField(g, 0, 16, tick);

  const trunks = [8, 16, 24, 33, 42, 50, 58, 66, 74];
  trunks.forEach((x, idx) => drawTree(g, x, 43, 18 + (idx % 3), 8 + (idx % 4), tick, idx * 0.6));

  for (let y = 36; y < 50; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (hash(x, y, 44) > 0.62) {
        put(g, x, y, ['.', ',', '_', '~'][Math.floor(hash(x, y, 99) * 4)]);
      }
    }
  }

  const blink = (tick % 12) < 10;
  const eyes = blink ? 'o' : '-';
  [[24, 29], [39, 26], [57, 31], [68, 28]].forEach(([x, y]) => {
    put(g, x, y, eyes);
    put(g, x + 3, y, eyes);
  });

  const fogShift = Math.floor(Math.sin(tick * 0.2) * 2);
  for (let x = 0; x < WIDTH; x += 1) {
    if (x % 2 === 0) put(g, (x + fogShift + WIDTH) % WIDTH, 40, '=');
    if (x % 3 === 0) put(g, (x - fogShift + WIDTH) % WIDTH, 42, '-');
  }

  putText(g, 2, 48, 'dark forest, eyes between branches');
  return g;
}

function sceneCrypt(tick) {
  const g = makeGrid(' ');

  fillRect(g, 0, 0, WIDTH, 34, '#');
  for (let y = 0; y < 34; y += 2) {
    for (let x = (y % 4 === 0 ? 1 : 3); x < WIDTH - 1; x += 4) {
      put(g, x, y, '=');
    }
  }

  fillRect(g, 0, 34, WIDTH, 16, '.');
  terrainNoise(g, 34, 49, 86, ['.', ',', '_', ';']);

  fillRect(g, 22, 20, 38, 11, '=');
  rect(g, 22, 20, 38, 11, '|');
  fillRect(g, 25, 22, 32, 7, '.');
  line(g, 41, 22, 41, 28, '+');
  line(g, 36, 25, 46, 25, '+');

  const flameA = ['i', '!', ':', '.'][tick % 4];
  const flameB = ['i', '.', '!', ':'][(tick + 2) % 4];
  put(g, 8, 24, flameA);
  put(g, 72, 24, flameB);
  line(g, 8, 25, 8, 31, '|');
  line(g, 72, 25, 72, 31, '|');

  const drop = tick % 14;
  if (drop < 10) {
    put(g, 13, 8 + drop, '.');
  } else {
    put(g, 11, 19, ',');
    put(g, 12, 19, '.');
    put(g, 13, 19, ',');
  }

  putText(g, 2, 48, 'whisper crypt, drip...drip...');
  return g;
}

function sceneTower(tick) {
  const g = makeGrid(' ');

  fillRect(g, 0, 0, WIDTH, HEIGHT, '.');
  terrainNoise(g, 0, HEIGHT - 1, 132, ['.', ',', ':', ';']);

  for (let shelf = 0; shelf < 4; shelf += 1) {
    const y = 8 + shelf * 9;
    line(g, 4, y, WIDTH - 5, y, '=');
    for (let x = 5; x < WIDTH - 6; x += 3) {
      put(g, x, y - 1, ['|', '!', 'l'][Math.floor(hash(x, y, shelf) * 3)]);
      if (hash(x, y, shelf + 21) > 0.65) put(g, x, y - 2, ':');
    }
  }

  const bob = Math.round(Math.sin(tick * 0.2));
  fillRect(g, 35, 24 + bob, 12, 16, '#');
  fillRect(g, 37, 20 + bob, 8, 6, '#');
  put(g, 39, 22 + bob, (tick % 12 < 10) ? 'o' : '-');
  put(g, 42, 22 + bob, (tick % 12 < 10) ? 'o' : '-');
  line(g, 41, 26 + bob, 41, 39 + bob, '|');

  const rune = ['*', '+', 'o', '.'][tick % 4];
  circle(g, 22, 24, 5, rune);
  circle(g, 22, 24, 2, ' ');
  put(g, 22, 24, '@');

  putText(g, 2, 48, 'tower of the quiet sage');
  return g;
}

function sceneThrone(tick) {
  const g = makeGrid(' ');

  for (let y = 0; y < 30; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      put(g, x, y, shade(y, 0, 30, [' ', '.', '.', ':', ';', ';']));
    }
  }

  fillRect(g, 0, 38, WIDTH, 12, '_');
  terrainNoise(g, 38, 49, 201, ['_', '.', ',', '~']);

  fillRect(g, 28, 16, 26, 24, '#');
  rect(g, 28, 16, 26, 24, '|');
  fillRect(g, 35, 10, 12, 8, '#');
  rect(g, 35, 10, 12, 8, '|');

  const pulse = ['*', '+', 'o', '.'][tick % 4];
  line(g, 41, 23, 41, 32, pulse);
  line(g, 36, 27, 46, 27, pulse);

  for (let r = 0; r < 6; r += 1) {
    const ch = r % 2 === 0 ? '.' : ':';
    circle(g, 41, 27, 8 + r, ch);
  }

  putText(g, 2, 48, 'ashen throne, final seal');
  return g;
}

function sceneEncounter(tick, options) {
  const g = makeGrid(' ');

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      put(g, x, y, hash(x, y, tick + 411) > 0.65 ? ':' : '.');
    }
  }

  const breathe = Math.round(Math.sin(tick * 0.22) * 1);
  fillRect(g, 30, 13 + breathe, 22, 28, '#');
  fillRect(g, 34, 9 + breathe, 14, 8, '#');

  const eye = tick % 10 < 8 ? 'o' : '-';
  put(g, 38, 13 + breathe, eye);
  put(g, 43, 13 + breathe, eye);
  put(g, 39, 14 + breathe, '*');
  put(g, 44, 14 + breathe, '*');

  for (let i = 0; i < 7; i += 1) {
    line(g, 27 + i * 4, 30 + breathe, 20 + i * 5, 42 + breathe, '/');
  }

  for (let x = 20; x < 62; x += 1) {
    put(g, x, 44, '_');
  }

  const label = `[ ${options.enemyName ? options.enemyName.toUpperCase().slice(0, 30) : 'HOSTILE PRESENCE'} ]`;
  putText(g, Math.max(2, Math.floor((WIDTH - label.length) / 2)), 47, label);
  return g;
}

function sceneVictory(tick) {
  const g = makeGrid(' ');

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      put(g, x, y, hash(x, y, 511) > 0.75 ? '.' : ' ');
    }
  }

  const gleam = ['*', '+', 'o', '.'][tick % 4];
  fillRect(g, 30, 14, 22, 22, '#');
  rect(g, 30, 14, 22, 22, '|');
  fillRect(g, 35, 19, 12, 12, ' ');
  line(g, 41, 12, 41, 37, gleam);
  line(g, 34, 25, 48, 25, gleam);

  for (let r = 3; r <= 12; r += 2) {
    circle(g, 41, 25, r, r % 4 === 1 ? '.' : ':');
  }

  putText(g, 24, 43, 'THE EMBER CROWN IS YOURS');
  putText(g, 18, 47, 'dawn touches the vale again');
  return g;
}

function sceneGameOver(tick) {
  const g = makeGrid(' ');

  const flicker = tick % 4 === 0 ? '.' : '#';
  fillRect(g, 0, 0, WIDTH, HEIGHT, flicker);
  fillRect(g, 2, 2, WIDTH - 4, HEIGHT - 4, ' ');

  fillRect(g, 28, 10, 26, 24, '#');
  fillRect(g, 31, 13, 20, 18, ' ');
  fillRect(g, 34, 16, 5, 4, '#');
  fillRect(g, 43, 16, 5, 4, '#');
  fillRect(g, 37, 23, 8, 3, '#');

  for (let i = 0; i < 7; i += 1) {
    line(g, 33 + i * 3, 28, 33 + i * 3, 33, '#');
  }

  putText(g, 22, 40, 'THE DARKNESS CONSUMES HIM');
  putText(g, 17, 45, 'all torches gone, all paths closed');
  return g;
}

function toString(grid) {
  return grid.map((row) => row.join('').slice(0, WIDTH).padEnd(WIDTH, ' ')).join('\n');
}

function buildScene(sceneKey, tick, options = {}) {
  switch (sceneKey) {
    case 'forest':
      return toString(sceneForest(tick));
    case 'crypt':
      return toString(sceneCrypt(tick));
    case 'tower':
      return toString(sceneTower(tick));
    case 'throne':
      return toString(sceneThrone(tick));
    case 'encounter':
      return toString(sceneEncounter(tick, options));
    case 'victory':
      return toString(sceneVictory(tick));
    case 'gameover':
      return toString(sceneGameOver(tick));
    case 'gate':
    default:
      return toString(sceneGate(tick));
  }
}

export function stopScene() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }
  rafId = null;
  lastFrame = 0;
}

export function renderScene(targetElement, sceneKey, options = {}) {
  stopScene();
  let tick = 0;

  const draw = (now) => {
    if (!targetElement) return;

    if (now - lastFrame >= FRAME_MS) {
      tick += 1;
      targetElement.innerHTML = colorizeAscii(buildScene(sceneKey, tick, options));
      lastFrame = now;
    }

    rafId = requestAnimationFrame(draw);
  };

  targetElement.innerHTML = colorizeAscii(buildScene(sceneKey, tick, options));
  rafId = requestAnimationFrame(draw);
}

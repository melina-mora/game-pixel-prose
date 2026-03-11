// sprites.js
// Rendering is isolated from game rules so the state engine can switch scenes
// by key without mixing gameplay and draw logic.

const PALETTE = {
  bg: '#0D0C0A',
  panel: '#2A2825',
  text: '#F5F0E8',
  mist: '#8C8679',
  ember: '#C8692A',
  gold: '#A8924A',
};

let rafId = null;

function pixel(ctx, x, y, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  ctx.globalAlpha = 1;
}

function block(ctx, x, y, w, h, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

function clear(ctx, w, h) {
  block(ctx, 0, 0, w, h, PALETTE.bg);
}

function ditherBand(ctx, yStart, yEnd, density, color) {
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = 0; x < 160; x += 1) {
      if (((x + y) % density) === 0) {
        pixel(ctx, x, y, color);
      }
    }
  }
}

function drawMoon(ctx, x, y, size = 10) {
  block(ctx, x, y, size, size, PALETTE.text);
  block(ctx, x + 2, y + 1, size - 2, size - 2, PALETTE.bg);
}

function animate(frameFn, canvas, opts = {}) {
  stopScene();
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const width = canvas.width;
  const height = canvas.height;

  const loop = (t) => {
    frameFn(ctx, t, width, height, opts);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

export function stopScene() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }
  rafId = null;
}

function sceneGate(ctx, t, width, height) {
  clear(ctx, width, height);
  ditherBand(ctx, 0, 68, 5, PALETTE.panel);
  ditherBand(ctx, 2, 52, 7, PALETTE.mist);

  drawMoon(ctx, 132, 10, 11);

  const stars = [
    [10, 8], [24, 13], [42, 6], [61, 17], [88, 11], [114, 7], [120, 22], [14, 33], [97, 19],
  ];
  stars.forEach(([sx, sy], idx) => {
    const blink = Math.sin(t * 0.002 + idx) > 0.3;
    if (blink) {
      pixel(ctx, sx, sy, PALETTE.text);
    }
  });

  block(ctx, 0, 88, width, 32, PALETTE.panel);
  ditherBand(ctx, 90, 118, 4, PALETTE.mist);

  block(ctx, 12, 34, 24, 74, PALETTE.panel);
  block(ctx, 12, 34, 3, 74, PALETTE.bg);
  block(ctx, 33, 34, 3, 74, PALETTE.mist);

  block(ctx, 124, 34, 24, 74, PALETTE.panel);
  block(ctx, 124, 34, 3, 74, PALETTE.bg);
  block(ctx, 145, 34, 3, 74, PALETTE.mist);

  block(ctx, 58, 56, 44, 52, PALETTE.bg);
  block(ctx, 54, 52, 52, 4, PALETTE.panel);
  block(ctx, 54, 52, 4, 56, PALETTE.panel);
  block(ctx, 102, 52, 4, 56, PALETTE.panel);

  for (let i = 0; i < 5; i += 1) {
    block(ctx, 60 + i * 8, 55, 2, 50, PALETTE.mist);
  }

  const leftFlicker = 5 + Math.sin(t * 0.013) * 2.2;
  block(ctx, 39, 72, 2, 10, PALETTE.mist);
  block(ctx, 37, 70 - leftFlicker, 6, leftFlicker + 1, PALETTE.ember);
  block(ctx, 38, 71 - leftFlicker * 0.8, 4, leftFlicker * 0.7, PALETTE.text);

  const rightFlicker = 5 + Math.sin(t * 0.014 + 0.9) * 2.2;
  block(ctx, 118, 72, 2, 10, PALETTE.mist);
  block(ctx, 116, 70 - rightFlicker, 6, rightFlicker + 1, PALETTE.ember);
  block(ctx, 117, 71 - rightFlicker * 0.8, 4, rightFlicker * 0.7, PALETTE.text);
}

function drawTree(ctx, x, sway, shade) {
  block(ctx, x + 7, 54, 2, 36, PALETTE.panel);
  block(ctx, x, 44 + sway, 16, 20, shade);
  block(ctx, x + 2, 34 + sway, 12, 18, shade);
  block(ctx, x + 4, 24 + sway, 8, 12, shade);
}

function sceneForest(ctx, t, width, height) {
  clear(ctx, width, height);
  ditherBand(ctx, 0, 80, 5, PALETTE.panel);
  drawMoon(ctx, 12, 11, 10);

  const swayA = Math.round(Math.sin(t * 0.0017) * 2);
  const swayB = Math.round(Math.sin(t * 0.0015 + 1.4) * 2);

  drawTree(ctx, 8, swayA, PALETTE.panel);
  drawTree(ctx, 26, swayB, PALETTE.panel);
  drawTree(ctx, 44, swayA, PALETTE.panel);
  drawTree(ctx, 62, swayB, PALETTE.panel);
  drawTree(ctx, 80, swayA, PALETTE.panel);
  drawTree(ctx, 98, swayB, PALETTE.panel);
  drawTree(ctx, 116, swayA, PALETTE.panel);
  drawTree(ctx, 136, swayB, PALETTE.panel);

  block(ctx, 0, 84, width, 36, PALETTE.bg);
  ditherBand(ctx, 86, 118, 3, PALETTE.mist);

  const blinkPhase = (t % 3200) / 3200;
  const eyesVisible = blinkPhase < 0.92;
  if (eyesVisible) {
    [[52, 66], [86, 60], [110, 70]].forEach(([x, y]) => {
      block(ctx, x, y, 2, 1, PALETTE.ember);
      block(ctx, x + 4, y, 2, 1, PALETTE.ember);
      pixel(ctx, x + 1, y, PALETTE.text);
      pixel(ctx, x + 5, y, PALETTE.text);
    });
  } else {
    [[52, 66], [86, 60], [110, 70]].forEach(([x, y]) => {
      block(ctx, x, y, 6, 1, PALETTE.mist);
    });
  }

  const fogOffset = Math.round(Math.sin(t * 0.0008) * 8);
  for (let x = 0; x < width; x += 4) {
    pixel(ctx, (x + fogOffset + width) % width, 88, PALETTE.text, 0.15);
    pixel(ctx, (x - fogOffset + width) % width, 92, PALETTE.text, 0.1);
  }
}

function sceneCrypt(ctx, t, width, height) {
  clear(ctx, width, height);

  for (let row = 0; row < 5; row += 1) {
    const y = row * 16;
    block(ctx, 0, y, width, 16, PALETTE.panel);
    for (let col = 0; col < width; col += 18) {
      pixel(ctx, col + ((row % 2) * 9), y + 1, PALETTE.mist);
      block(ctx, col + ((row % 2) * 9), y + 2, 1, 12, PALETTE.bg);
    }
  }

  block(ctx, 0, 80, width, 40, PALETTE.bg);
  ditherBand(ctx, 82, 118, 4, PALETTE.panel);

  block(ctx, 52, 52, 56, 30, PALETTE.panel);
  block(ctx, 52, 52, 56, 2, PALETTE.mist);
  block(ctx, 52, 52, 2, 30, PALETTE.mist);
  block(ctx, 78, 58, 4, 18, PALETTE.gold);
  block(ctx, 72, 64, 16, 4, PALETTE.gold);

  [[18, 60], [136, 60]].forEach(([x, y], idx) => {
    const flame = 4 + Math.sin(t * 0.012 + idx) * 2;
    block(ctx, x, y, 4, 14, PALETTE.mist);
    block(ctx, x - 1, y - flame, 6, flame + 1, PALETTE.ember);
    block(ctx, x, y - flame + 1, 4, flame * 0.6, PALETTE.text);
  });

  const drip = Math.floor((t * 0.03) % 28);
  block(ctx, 26, 14 + drip, 1, 3, PALETTE.mist);
  if (drip > 24) {
    block(ctx, 23, 48, 6, 1, PALETTE.mist, 0.45);
  }
}

function sceneTower(ctx, t, width, height) {
  clear(ctx, width, height);
  block(ctx, 0, 0, width, height, PALETTE.panel);
  ditherBand(ctx, 0, 118, 4, PALETTE.bg);

  for (let shelf = 0; shelf < 4; shelf += 1) {
    const y = 18 + shelf * 24;
    block(ctx, 8, y, 144, 2, PALETTE.mist);
    for (let i = 0; i < 20; i += 1) {
      const x = 10 + i * 7;
      const tone = i % 3 === 0 ? PALETTE.gold : i % 2 === 0 ? PALETTE.mist : PALETTE.ember;
      block(ctx, x, y - 10, 5, 10, tone);
    }
  }

  const bob = Math.round(Math.sin(t * 0.0018) * 2);
  block(ctx, 66, 56 + bob, 28, 44, PALETTE.bg);
  block(ctx, 72, 44 + bob, 16, 14, PALETTE.mist);
  block(ctx, 76, 48 + bob, 8, 4, PALETTE.bg);

  const blink = (t % 3600) < 3000;
  if (blink) {
    block(ctx, 75, 53 + bob, 2, 1, PALETTE.ember);
    block(ctx, 83, 53 + bob, 2, 1, PALETTE.ember);
  } else {
    block(ctx, 75, 53 + bob, 2, 1, PALETTE.mist);
    block(ctx, 83, 53 + bob, 2, 1, PALETTE.mist);
  }

  const runePulse = 0.3 + ((Math.sin(t * 0.002) + 1) / 2) * 0.6;
  block(ctx, 30, 30, 18, 18, PALETTE.gold, runePulse);
  block(ctx, 34, 34, 10, 10, PALETTE.bg);
  block(ctx, 38, 30, 2, 18, PALETTE.gold, runePulse);
  block(ctx, 30, 38, 18, 2, PALETTE.gold, runePulse);
}

function sceneThrone(ctx, t, width, height) {
  clear(ctx, width, height);
  block(ctx, 0, 0, width, height, PALETTE.bg);
  ditherBand(ctx, 0, 58, 4, PALETTE.panel);

  block(ctx, 0, 80, width, 40, PALETTE.panel);
  ditherBand(ctx, 82, 118, 3, PALETTE.mist);

  block(ctx, 56, 34, 48, 52, PALETTE.panel);
  block(ctx, 70, 18, 20, 18, PALETTE.panel);
  block(ctx, 74, 22, 12, 10, PALETTE.bg);
  block(ctx, 56, 34, 2, 52, PALETTE.mist);
  block(ctx, 102, 34, 2, 52, PALETTE.mist);

  const pulse = 0.2 + ((Math.sin(t * 0.003) + 1) / 2) * 0.75;
  block(ctx, 78, 54, 4, 14, PALETTE.gold, pulse);
  block(ctx, 72, 60, 16, 4, PALETTE.gold, pulse);

  for (let i = 0; i < 3; i += 1) {
    const alpha = 0.15 + i * 0.08;
    block(ctx, 68 - i * 6, 48 - i * 4, 28 + i * 12, 24 + i * 8, PALETTE.ember, alpha * pulse);
  }
}

function sceneEncounter(ctx, t, width, height, opts) {
  clear(ctx, width, height);
  block(ctx, 0, 0, width, height, PALETTE.bg);
  ditherBand(ctx, 0, 118, 3, PALETTE.panel);

  const pulse = 0.15 + ((Math.sin(t * 0.005) + 1) / 2) * 0.28;
  block(ctx, 0, 0, width, height, PALETTE.ember, pulse);

  const breathe = Math.round(Math.sin(t * 0.0022) * 3);
  block(ctx, 58, 24 + breathe, 44, 72, PALETTE.panel);
  block(ctx, 68, 18 + breathe, 24, 18, PALETTE.panel);
  block(ctx, 58, 24 + breathe, 2, 72, PALETTE.mist);

  const blink = (t % 2800) < 2400;
  if (blink) {
    block(ctx, 73, 34 + breathe, 4, 2, PALETTE.ember);
    block(ctx, 83, 34 + breathe, 4, 2, PALETTE.ember);
    pixel(ctx, 74, 34 + breathe, PALETTE.text);
    pixel(ctx, 84, 34 + breathe, PALETTE.text);
  } else {
    block(ctx, 73, 35 + breathe, 4, 1, PALETTE.mist);
    block(ctx, 83, 35 + breathe, 4, 1, PALETTE.mist);
  }

  block(ctx, 50, 96, 60, 6, PALETTE.bg);

  ctx.fillStyle = PALETTE.ember;
  ctx.font = '7px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText((opts.enemyName || 'Hostile Presence').toUpperCase(), 80, 112);
}

function sceneVictory(ctx, t, width, height) {
  clear(ctx, width, height);
  ditherBand(ctx, 0, 118, 5, PALETTE.panel);

  const pulse = 0.35 + ((Math.sin(t * 0.003) + 1) / 2) * 0.65;
  for (let ring = 0; ring < 4; ring += 1) {
    block(ctx, 56 - ring * 4, 28 - ring * 3, 48 + ring * 8, 48 + ring * 6, PALETTE.gold, pulse * (0.18 - ring * 0.03));
  }

  block(ctx, 64, 34, 32, 40, PALETTE.gold);
  block(ctx, 68, 38, 24, 32, PALETTE.bg);
  block(ctx, 76, 30, 8, 48, PALETTE.gold);
  block(ctx, 64, 50, 32, 8, PALETTE.gold);

  for (let i = 0; i < 9; i += 1) {
    const sx = 30 + i * 12;
    const sy = 10 + ((i % 2) * 6);
    const twinkle = Math.sin(t * 0.004 + i) > 0;
    if (twinkle) {
      pixel(ctx, sx, sy, PALETTE.text);
      pixel(ctx, sx + 1, sy, PALETTE.text);
    }
  }
}

function sceneGameOver(ctx, t, width, height) {
  clear(ctx, width, height);
  block(ctx, 0, 0, width, height, PALETTE.bg);
  ditherBand(ctx, 0, 118, 3, PALETTE.panel);

  const flicker = 0.3 + ((Math.sin(t * 0.009) + 1) / 2) * 0.35;

  block(ctx, 58, 26, 44, 44, PALETTE.mist, flicker);
  block(ctx, 66, 30, 28, 30, PALETTE.bg, flicker);
  block(ctx, 66, 66, 28, 16, PALETTE.mist, flicker);

  block(ctx, 72, 40, 6, 6, PALETTE.bg);
  block(ctx, 82, 40, 6, 6, PALETTE.bg);
  block(ctx, 74, 56, 12, 4, PALETTE.bg);

  for (let tooth = 0; tooth < 5; tooth += 1) {
    block(ctx, 68 + tooth * 5, 72, 2, 8, PALETTE.bg);
  }

  block(ctx, 0, 0, width, height, PALETTE.ember, 0.08 + flicker * 0.08);
}

const SCENES = {
  gate: sceneGate,
  forest: sceneForest,
  crypt: sceneCrypt,
  tower: sceneTower,
  throne: sceneThrone,
  encounter: sceneEncounter,
  victory: sceneVictory,
  gameover: sceneGameOver,
};

export function renderScene(canvas, sceneKey, options = {}) {
  const scene = SCENES[sceneKey] || sceneGate;
  animate(scene, canvas, options);
}

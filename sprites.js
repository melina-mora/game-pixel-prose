// sprites.js
// ASCII-mode scene rendering keeps visuals lightweight while still stateful.
// Game logic only passes scene keys and optional metadata.

let rafId = null;
let lastFrameMs = 0;
const FRAME_MS = 240;

function clampName(name) {
  if (!name) return 'HOSTILE PRESENCE';
  return name.toUpperCase().slice(0, 18);
}

function withEnemyLabel(scene, enemyName) {
  const lines = scene.split('\n');
  const label = `[ ${clampName(enemyName)} ]`;
  lines[lines.length - 2] = lines[lines.length - 2].slice(0, 2) + label.padEnd(32, ' ').slice(0, 32) + lines[lines.length - 2].slice(34);
  return lines.join('\n');
}

function gateFrame(tick) {
  const torchA = tick % 3 === 0 ? '*' : tick % 3 === 1 ? '+' : '.';
  const torchB = tick % 2 === 0 ? '*' : '+';
  const star = tick % 4 === 0 ? '*' : '.';
  return [
    '  .       .        ' + star + '        .      ',
    '        .                .           ',
    '                ___                  ',
    '      |\       /###\\       /|       ',
    '      |#|_____/#/ \#\\_____ |#|      ',
    '      |#|####|#|   |#|####| |#|      ',
    '      |#|####|#|   |#|####| |#|      ',
    '      |#|####|#|   |#|####| |#|      ',
    `      |#| ${torchA}  |#|  |||  |#| ${torchB}  |#|      `,
    '      |#|____|#|___|||__|#|____|#|      ',
    '         /_____/         \_____\       ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ].join('\n');
}

function forestFrame(tick) {
  const blink = tick % 9 === 0 ? '--' : 'oo';
  const sway = tick % 4 < 2 ? '/' : '\\';
  const sway2 = tick % 4 < 2 ? '\\' : '/';
  return [
    '       .         .           .        ',
    '   ' + sway + '  /\\  ' + sway2 + '   /\\    /\\   ' + sway + ' /\\    ',
    '    \\/  \\    //  \\  //  \\   \\/     ',
    '    ||  ||    ||  ||  ||  ||   ||     ',
    '    ||  ||    ||  ||  ||  ||   ||     ',
    '  .-||--||----||--||--||--||---||-.   ',
    `    shadows watch:  ${blink}     ${blink}          `,
    '    ~~~      ~~~~~        ~~~         ',
    '  ~~~~~~  ~~~~~~~~   ~~~~~~~~  ~~~~   ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '      roots and fog choke the path     ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ].join('\n');
}

function cryptFrame(tick) {
  const dripY = tick % 8;
  const dripLine = ' '.repeat(9 + dripY) + '.';
  const candleA = tick % 3 === 0 ? 'i' : '!';
  const candleB = tick % 2 === 0 ? 'i' : '!';
  return [
    '#######################################',
    '# [] [] [] [] [] [] [] [] [] [] []  #',
    '#                                     #',
    '#      _________      _________       #',
    '#     /======= /|    |\\ ======\\     #',
    '#    /_______ / |    | \\_______\\    #',
    '#             ' + candleA + '               ' + candleB + '     #',
    '#            /|\             /|\      #',
    '#                                     #',
    '#' + dripLine.padEnd(37, ' ') + '#',
    '#____________________________________#',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ].join('\n');
}

function towerFrame(tick) {
  const eyes = tick % 10 === 0 ? '--' : 'oo';
  const bobPad = tick % 4 < 2 ? ' ' : '';
  const rune = tick % 3 === 0 ? '*' : '+';
  return [
    '=======================================',
    '|[] [] [] [] [] [] [] [] [] [] [] []|',
    '|                                     |',
    '|      ' + rune + '      ________               |',
    '|            /  ' + eyes + '  \\               |',
    '|           /___' + bobPad + '___\\              |',
    '|            /  ||  \\               |',
    '|           /___||___\\              |',
    '|                                     |',
    '|  scrolls whisper while runes hum    |',
    '=======================================',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ].join('\n');
}

function throneFrame(tick) {
  const pulse = tick % 4 === 0 ? '*' : tick % 4 === 1 ? '+' : '.';
  return [
    '                  .                    ',
    '             .         .               ',
    '            ______________             ',
    '           /##############\\            ',
    '          /##   ____   ###\\           ',
    '         |##   |' + pulse + pulse + '|   ###|          ',
    '         |##   |' + pulse + pulse + '|   ###|          ',
    '         |##___|__|___###|            ',
    '         |###############|            ',
    '         |_____ASHEN_____|            ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '        the final chamber waits        ',
  ].join('\n');
}

function encounterFrame(tick, options) {
  const eye = tick % 7 === 0 ? '--' : 'oo';
  const breathPad = tick % 4 < 2 ? ' ' : '  ';
  const base = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '                                        ',
    '            .:::::::.                   ',
    '          .:::::::::::.                 ',
    '         :::  /' + eye + '\\  :::                ',
    '         :::   \\__/  :::                ',
    '        :::::' + breathPad + '/||\\:::::               ',
    '       :::::::/ || \\::::::              ',
    '        :::::/  ||  \\::::               ',
    '            /___||___\\                  ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '  [ HOSTILE PRESENCE ]                  ',
  ].join('\n');

  return withEnemyLabel(base, options.enemyName);
}

function victoryFrame(tick) {
  const gleam = tick % 2 === 0 ? '*' : '+';
  return [
    '            .      ' + gleam + '      .            ',
    '                .     .                ',
    '             _____________              ',
    '            /____' + gleam + '______\\             ',
    '            |    /_\\    |             ',
    '            |   /' + gleam + '\\   |             ',
    '            |__/___\\___|             ',
    '              EMBER CROWN              ',
    '                                        ',
    '        dawn reaches the valley         ',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '                                        ',
  ].join('\n');
}

function gameOverFrame(tick) {
  const flicker = tick % 4 === 0 ? '.' : '#';
  return [
    flicker.repeat(39),
    '#                                     #',
    '#               ______                #',
    '#             ." ____ ".              #',
    '#            /  / __ \\  \\             #',
    '#            | | /  \\ | |             #',
    '#            | | \\__/ | |             #',
    '#            |  \\____/  |             #',
    '#            \\__________/             #',
    '#                                     #',
    '#     THE DARKNESS CONSUMES HIM.      #',
    flicker.repeat(39),
  ].join('\n');
}

function buildScene(sceneKey, tick, options) {
  switch (sceneKey) {
    case 'forest':
      return forestFrame(tick);
    case 'crypt':
      return cryptFrame(tick);
    case 'tower':
      return towerFrame(tick);
    case 'throne':
      return throneFrame(tick);
    case 'encounter':
      return encounterFrame(tick, options);
    case 'victory':
      return victoryFrame(tick);
    case 'gameover':
      return gameOverFrame(tick);
    case 'gate':
    default:
      return gateFrame(tick);
  }
}

export function stopScene() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }
  rafId = null;
  lastFrameMs = 0;
}

export function renderScene(targetElement, sceneKey, options = {}) {
  stopScene();
  let tick = 0;

  const draw = (time) => {
    if (!targetElement) return;

    if (time - lastFrameMs >= FRAME_MS) {
      tick += 1;
      targetElement.textContent = buildScene(sceneKey, tick, options);
      lastFrameMs = time;
    }

    rafId = requestAnimationFrame(draw);
  };

  targetElement.textContent = buildScene(sceneKey, tick, options);
  rafId = requestAnimationFrame(draw);
}

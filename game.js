import { renderScene, stopScene } from './sprites.js';

// game.js
// State machine is centralized here so UI, narrative, and decisions remain synchronized.

const START_TORCHES = 5;
const TORCH_REWARD_CHANCE = 0.32;
const MAX_LOG_LINES = 120;

const LOCATIONS = {
  gate: {
    id: 'gate',
    name: 'Ruined Gate',
    scene: 'gate',
    exits: ['forest', 'tower'],
    encounter: null,
    fallback:
      'The ruined gate leans over you like a broken jaw. Two torches spit ember light into wind that should not exist.',
  },
  forest: {
    id: 'forest',
    name: 'Dark Forest',
    scene: 'forest',
    exits: ['gate', 'crypt'],
    encounter: 'thornwolf',
    fallback:
      'Branches knot overhead and swallow the moon. Eyes blink in the dark, then close as if they were never there.',
  },
  crypt: {
    id: 'crypt',
    name: 'Whisper Crypt',
    scene: 'crypt',
    exits: ['forest', 'tower'],
    encounter: 'bonewarden',
    fallback:
      'Stone coffins line the hall. Slow drips echo like footsteps, and each echo sounds one step closer than the last.',
  },
  tower: {
    id: 'tower',
    name: 'Tower of the Quiet Sage',
    scene: 'tower',
    exits: ['gate', 'crypt', 'throne'],
    encounter: null,
    npc: true,
    fallback:
      'Dusty books and rune lamps fill the chamber. A hooded sage waits beside a table, watching as if your arrival was expected.',
  },
  throne: {
    id: 'throne',
    name: 'Ashen Throne',
    scene: 'throne',
    exits: ['tower'],
    encounter: 'voidregent',
    final: true,
    fallback:
      'A basalt throne rises from cracked stone. A sealed dais hums softly, answering the iron key in your pocket.',
  },
};

const ENEMIES = {
  thornwolf: {
    id: 'thornwolf',
    name: 'Thorn Wolf',
    hp: 13,
    atk: 5,
    def: 1,
    reward: null,
    fallback:
      'A wolf-shaped thing steps from the brush, ribs wrapped in thorn-vines and ember-lit eyes fixed on your throat.',
  },
  bonewarden: {
    id: 'bonewarden',
    name: 'Bone Warden',
    hp: 17,
    atk: 6,
    def: 2,
    reward: 'Warden Sigil',
    fallback:
      'Bones knit together in front of the coffin and rise into a guardian that carries no skin, only duty.',
  },
  voidregent: {
    id: 'voidregent',
    name: 'Hollow Regent',
    hp: 28,
    atk: 8,
    def: 3,
    reward: 'Ember Crown',
    final: true,
    fallback:
      'The regent lifts its head from the throne. Crown-fire burns inside a face carved out by old curses.',
  },
};

const START_PLAYER = {
  hp: 24,
  maxHp: 24,
  atk: 5,
  def: 2,
  torches: START_TORCHES,
};

const state = {
  player: { ...START_PLAYER },
  locationId: 'gate',
  phase: 'explore',
  enemy: null,
  visited: new Set(),
  cleared: new Set(),
  flags: {
    sageTalked: false,
    forestLooted: false,
    cryptLooted: false,
    won: false,
    lost: false,
  },
  inventory: {},
  apiKey: '',
  choiceLocked: false,
  sessionId: 0,
};

const ui = {
  app: document.getElementById('app'),
  body: document.body,
  sceneArt: document.getElementById('scene-art'),
  locationTitle: document.getElementById('location-title'),
  statHp: document.getElementById('stat-hp'),
  statTorches: document.getElementById('stat-torches'),
  statAtkDef: document.getElementById('stat-atkdef'),
  statLocation: document.getElementById('stat-location'),
  statInventory: document.getElementById('stat-inventory'),
  log: document.getElementById('log'),
  choices: document.getElementById('choices'),
  apiInput: document.getElementById('api-key'),
  apiStatus: document.getElementById('api-status'),
  apiConnect: document.getElementById('api-connect'),
  restart: document.getElementById('restart'),
  textSizeButtons: [...document.querySelectorAll('.text-size-btn')],
  themeButtons: [...document.querySelectorAll('.theme-btn')],
};

let layoutObserver = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasItem(item) {
  return (state.inventory[item] || 0) > 0;
}

function addItem(item, amount = 1) {
  state.inventory[item] = (state.inventory[item] || 0) + amount;
  renderStats();
}

function removeItem(item, amount = 1) {
  if (!hasItem(item)) return false;
  state.inventory[item] -= amount;
  if (state.inventory[item] <= 0) {
    delete state.inventory[item];
  }
  renderStats();
  return true;
}

function setApiStatus(text, isLive = false) {
  ui.apiStatus.textContent = text;
  ui.apiStatus.classList.toggle('live', isLive);
}

async function fetchAiNarration(prompt, fallback) {
  if (!state.apiKey) {
    return fallback;
  }

  setApiStatus('AI Thinking', false);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are narrating a compact dark-fantasy text RPG. Use 2-4 sentences, second-person present tense, and grounded sensory details. Return plain text only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 130,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No content in API response');
    }

    setApiStatus('AI Live', true);
    return content;
  } catch {
    setApiStatus('AI Fallback', false);
    return fallback;
  }
}

function logLine(text, tone = '') {
  const line = document.createElement('p');
  line.textContent = text;
  if (tone) {
    line.classList.add(tone);
  }

  ui.log.appendChild(line);

  while (ui.log.children.length > MAX_LOG_LINES) {
    ui.log.removeChild(ui.log.firstElementChild);
  }

  requestAnimationFrame(() => {
    syncConsoleHeight();
    scrollLogToLatest();
  });
}

function clearLog() {
  ui.log.innerHTML = '';
}

function scrollLogToLatest() {
  ui.log.scrollTop = ui.log.scrollHeight;
}

function syncConsoleHeight() {
  const logTop = ui.log.getBoundingClientRect().top;
  const choicesTop = ui.choices.getBoundingClientRect().top;
  const available = Math.max(80, Math.floor(choicesTop - logTop - 8));
  ui.log.style.height = `${available}px`;
  ui.log.style.maxHeight = `${available}px`;
}

function renderStats() {
  ui.statHp.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  ui.statTorches.textContent = String(state.player.torches);
  ui.statAtkDef.textContent = `${state.player.atk} / ${state.player.def}`;
  ui.statLocation.textContent = `${state.visited.size} / ${Object.keys(LOCATIONS).length}`;
  const entries = Object.entries(state.inventory);
  if (!entries.length) {
    ui.statInventory.textContent = 'none';
    return;
  }

  const compact = entries.map(([item, count]) => `${item}${count > 1 ? ` x${count}` : ''}`).join(', ');
  ui.statInventory.textContent = compact;
}

function disableChoices(disabled) {
  [...ui.choices.querySelectorAll('button')].forEach((button) => {
    button.disabled = disabled;
  });
}

function renderMap() {
  // Map UI removed by design in the flat three-section layout.
}

function maybeGrantTorches() {
  if (Math.random() > TORCH_REWARD_CHANCE) {
    return;
  }

  const reward = randomInt(1, 2);
  state.player.torches += reward;
  logLine(`You uncover old pitch and recover ${reward} torch${reward === 1 ? '' : 'es'}.`, 'accent');
}

function consumeTorch() {
  if (state.player.torches <= 0) {
    loseGame('The darkness consumes him.');
    return false;
  }

  state.player.torches -= 1;
  logLine('A torch gutters out. -1 torch.', 'system');
  renderStats();

  if (state.player.torches <= 0) {
    loseGame('The darkness consumes him.');
    return false;
  }

  return true;
}

async function runPlayerAction(actionFn, options = {}) {
  const { allowReward = true, costsTorch = true } = options;

  // Post-game actions (restart) bypass torch checks, while gameplay actions do not.
  if ((state.flags.won || state.flags.lost) && costsTorch) {
    return;
  }

  if (costsTorch && !consumeTorch()) {
    return;
  }

  await actionFn();

  if (state.flags.won || state.flags.lost) {
    renderMap();
    return;
  }

  if (allowReward) {
    maybeGrantTorches();
  }

  renderStats();
  renderMap();
}

function setChoices(choiceDefs) {
  ui.choices.innerHTML = '';

  choiceDefs.forEach((choice) => {
    const costsTorch = choice.costsTorch !== false;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = costsTorch ? `${choice.label} [cost: 1 torch]` : choice.label;
    button.disabled = !!choice.disabled;

    button.addEventListener('click', async () => {
      if (state.choiceLocked || choice.disabled) {
        return;
      }

      state.choiceLocked = true;
      disableChoices(true);
      renderMap();

      try {
        await runPlayerAction(choice.run, {
          allowReward: choice.allowReward !== false,
          costsTorch,
        });
      } finally {
        state.choiceLocked = false;
        if (!state.flags.won && !state.flags.lost) {
          disableChoices(false);
        }
        renderMap();
      }
    });

    ui.choices.appendChild(button);
  });

  requestAnimationFrame(() => {
    syncConsoleHeight();
    scrollLogToLatest();
  });
}

function setScene(sceneKey, options = {}) {
  ui.sceneArt.classList.add('fade');
  setTimeout(() => {
    renderScene(ui.sceneArt, sceneKey, options);
    ui.sceneArt.classList.remove('fade');
  }, 90);
}

function updateLocationTitle(name) {
  ui.locationTitle.textContent = name;
}

async function enterLocation(locationId, skipNarration = false, expectedSession = state.sessionId) {
  if (expectedSession !== state.sessionId || state.flags.won || state.flags.lost) {
    return;
  }

  const location = LOCATIONS[locationId];
  state.locationId = locationId;
  state.phase = 'explore';
  state.enemy = null;
  state.visited.add(locationId);

  setScene(location.scene);
  updateLocationTitle(location.name);
  renderStats();
  renderMap();

  if (!skipNarration) {
    const text = await fetchAiNarration(
      `Location: ${location.name}. Player HP ${state.player.hp}/${state.player.maxHp}. Player torches ${state.player.torches}. Write 2-4 scene setup sentences before next choice.`,
      location.fallback,
    );

    if (expectedSession !== state.sessionId || state.flags.won || state.flags.lost) {
      return;
    }

    logLine(text);
  }

  buildExploreChoices();
}

function buildExploreChoices() {
  const location = LOCATIONS[state.locationId];
  const choices = [];

  if (location.encounter && !state.cleared.has(location.id)) {
    if (location.final) {
      const locked = !hasItem('Iron Key');
      choices.push({
        label: locked
          ? 'The final dais is sealed. You need an Iron Key.'
          : 'Unseal the dais and confront the Hollow Regent',
        disabled: locked,
        run: async () => {
          await startEncounter(location.encounter);
        },
      });
    } else {
      choices.push({
        label: 'Advance deeper and face what waits in the dark',
        run: async () => {
          await startEncounter(location.encounter);
        },
      });
    }
  }

  if (location.id === 'forest' && !state.flags.forestLooted) {
    choices.push({
      label: 'Search the roots for useful fragments',
      run: async () => {
        state.flags.forestLooted = true;
        addItem('Ember Shard');
        logLine('You pry an Ember Shard from a root knot. The shard warms your palm.', 'accent');
        buildExploreChoices();
      },
    });
  }

  if (location.id === 'crypt' && !state.flags.cryptLooted) {
    choices.push({
      label: 'Inspect the coffin lock beneath the dust',
      run: async () => {
        state.flags.cryptLooted = true;
        addItem('Iron Key');
        logLine('An Iron Key slides free from the stone lid with a dry metallic cry.', 'accent');
        buildExploreChoices();
      },
    });
  }

  if (location.npc) {
    choices.push({
      label: 'Speak with the Quiet Sage',
      run: async () => {
        await speakWithSage();
      },
    });
  }

  if (hasItem('Healing Tonic') && state.player.hp < state.player.maxHp) {
    choices.push({
      label: 'Drink Healing Tonic (+10 HP)',
      run: async () => {
        removeItem('Healing Tonic');
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 10);
        logLine('The tonic burns bitter, then settles into warmth. You steady your breath.', 'accent');
        buildExploreChoices();
      },
    });
  }

  location.exits.forEach((exitId) => {
    choices.push({
      label: `Travel to ${LOCATIONS[exitId].name}`,
      run: async () => {
        logLine(`You leave ${location.name} and move toward ${LOCATIONS[exitId].name}.`, 'system');
        await enterLocation(exitId, false, state.sessionId);
      },
    });
  });

  choices.push({
    label: 'Listen to the dark for hidden movement',
    run: async () => {
      logLine('You stand still and count your breaths while distant stones shift in the dark.', 'system');
      buildExploreChoices();
    },
  });

  setChoices(choices);
  disableChoices(false);
  renderMap();
}

async function speakWithSage() {
  const expectedSession = state.sessionId;
  state.phase = 'dialogue';
  setScene('tower');
  updateLocationTitle('Tower Dialogue');

  const fallback = state.flags.sageTalked
    ? 'The sage studies your steps. "The throne hears your heartbeat now. Finish what you started, and do not hesitate."'
    : 'The sage extends a bottle and a rune-sigil. "Take these. The key opens stone, but resolve opens fate."';

  const line = await fetchAiNarration(
    `NPC dialogue in a cursed tower. Inventory: ${JSON.stringify(state.inventory)}. Keep it short and practical.`,
    fallback,
  );

  if (expectedSession !== state.sessionId || state.flags.won || state.flags.lost) {
    return;
  }

  logLine(line);

  if (!state.flags.sageTalked) {
    state.flags.sageTalked = true;
    addItem('Healing Tonic');
    addItem('Healing Tonic');
    addItem('Sage Mark');
    logLine('You receive 2 Healing Tonics and the Sage Mark.', 'accent');
  }

  state.phase = 'explore';
  updateLocationTitle(LOCATIONS[state.locationId].name);
  setScene(LOCATIONS[state.locationId].scene);
  buildExploreChoices();
}

async function startEncounter(enemyId) {
  const expectedSession = state.sessionId;
  const template = ENEMIES[enemyId];

  state.phase = 'encounter';
  state.enemy = {
    ...template,
    hpCurrent: template.hp,
  };

  setScene('encounter', { enemyName: template.name });
  updateLocationTitle(`Encounter: ${template.name}`);
  renderMap();

  const intro = await fetchAiNarration(
    `Combat opening against ${template.name} at ${LOCATIONS[state.locationId].name}. Keep it tense and immediate.`,
    template.fallback,
  );

  if (expectedSession !== state.sessionId || state.flags.won || state.flags.lost) {
    return;
  }

  logLine(intro, 'danger');
  logLine(`${template.name}: ${state.enemy.hpCurrent} HP`, 'system');

  buildEncounterChoices();
}

function applyEnemyTurn(guarding = false) {
  const enemy = state.enemy;
  if (!enemy || state.flags.won || state.flags.lost) return;

  const raw = enemy.atk + randomInt(0, 4);
  const mitigation = state.player.def + (guarding ? 3 : 0) + (hasItem('Sage Mark') ? 1 : 0);
  const damage = Math.max(1, raw - mitigation);
  state.player.hp = Math.max(0, state.player.hp - damage);

  logLine(`${enemy.name} deals ${damage} damage.`, 'danger');
  renderStats();

  if (state.player.hp <= 0) {
    loseGame('Your strength fails and the dark closes over the path.');
  }
}

function handleEnemyDefeat() {
  const enemy = state.enemy;
  if (!enemy) return;

  logLine(`You break ${enemy.name}'s stance and it collapses into ash.`, 'accent');

  if (enemy.reward) {
    addItem(enemy.reward);
    logLine(`Loot acquired: ${enemy.reward}.`, 'accent');
  }

  state.cleared.add(state.locationId);

  if (enemy.final) {
    winGame();
    return;
  }

  state.enemy = null;
  state.phase = 'explore';
  updateLocationTitle(LOCATIONS[state.locationId].name);
  setScene(LOCATIONS[state.locationId].scene);
  buildExploreChoices();
}

async function runCombatTurn(style) {
  if (!state.enemy || state.phase !== 'encounter' || state.flags.won || state.flags.lost) {
    return;
  }

  const enemy = state.enemy;
  let playerDamage = 0;
  let guarding = false;

  if (style === 'attack') {
    playerDamage = Math.max(1, state.player.atk + randomInt(1, 4) - enemy.def);
    logLine(`You slash at the ${enemy.name} for ${playerDamage} damage.`, 'danger');
  }

  if (style === 'guard') {
    guarding = true;
    playerDamage = Math.max(1, state.player.atk + randomInt(0, 2) - enemy.def);
    logLine(`You brace and counter for ${playerDamage} damage.`, 'system');
  }

  if (style === 'shard') {
    if (!removeItem('Ember Shard')) {
      logLine('You reach for a shard, but your pouch is empty.', 'system');
      buildEncounterChoices();
      return;
    }
    playerDamage = Math.max(4, state.player.atk + 6 + randomInt(0, 3) - enemy.def);
    logLine(`The Ember Shard flares. ${enemy.name} takes ${playerDamage} fire damage.`, 'accent');
  }

  if (style === 'flee') {
    const escaped = Math.random() > 0.45;
    if (escaped) {
      logLine('You slip between broken stones and escape the encounter.', 'system');
      state.enemy = null;
      state.phase = 'explore';
      updateLocationTitle(LOCATIONS[state.locationId].name);
      setScene(LOCATIONS[state.locationId].scene);
      buildExploreChoices();
      return;
    }

    logLine('You try to flee, but the enemy cuts off your retreat.', 'danger');
    applyEnemyTurn(false);
    if (!state.flags.lost) {
      buildEncounterChoices();
    }
    return;
  }

  enemy.hpCurrent = Math.max(0, enemy.hpCurrent - playerDamage);
  logLine(`${enemy.name}: ${enemy.hpCurrent} HP remaining.`, 'system');

  if (enemy.hpCurrent <= 0) {
    handleEnemyDefeat();
    return;
  }

  applyEnemyTurn(guarding);

  if (!state.flags.lost) {
    buildEncounterChoices();
  }
}

function buildEncounterChoices() {
  const enemy = state.enemy;
  if (!enemy) {
    return;
  }

  const choices = [
    {
      label: 'Strike with your blade',
      run: async () => {
        await runCombatTurn('attack');
      },
    },
    {
      label: 'Guard and counter',
      run: async () => {
        await runCombatTurn('guard');
      },
    },
  ];

  if (hasItem('Ember Shard')) {
    choices.push({
      label: 'Throw Ember Shard (high damage)',
      run: async () => {
        await runCombatTurn('shard');
      },
    });
  }

  if (!enemy.final) {
    choices.push({
      label: 'Attempt to flee',
      run: async () => {
        await runCombatTurn('flee');
      },
    });
  }

  setChoices(choices);
  disableChoices(false);
}

async function winGame() {
  if (state.flags.won || state.flags.lost) {
    return;
  }

  const expectedSession = state.sessionId;
  state.phase = 'won';
  state.flags.won = true;
  state.enemy = null;

  setScene('victory');
  updateLocationTitle('Victory');
  renderMap();

  const ending = await fetchAiNarration(
    'The player has defeated the Hollow Regent and reclaimed the Ember Crown. Write a restrained dark-fantasy victory ending.',
    'With the regent fallen, the Ember Crown brightens and the valley exhales. Dawn finally reaches the ruined gate.',
  );

  if (expectedSession !== state.sessionId) {
    return;
  }

  logLine(ending, 'accent');
  logLine('Win condition met: Hollow Regent defeated.', 'system');

  setChoices([
    {
      label: 'Start a new run',
      costsTorch: false,
      allowReward: false,
      run: async () => {
        resetGame();
      },
    },
  ]);

  disableChoices(false);
}

function loseGame(reason) {
  if (state.flags.lost || state.flags.won) {
    return;
  }

  state.phase = 'lost';
  state.flags.lost = true;
  state.enemy = null;

  setScene('gameover');
  updateLocationTitle('Game Over');

  logLine(reason, 'danger');
  if (reason !== 'The darkness consumes him.') {
    logLine('Lose condition met: HP reduced to 0.', 'system');
  } else {
    logLine('Lose condition met: torches reduced to 0.', 'system');
  }

  ui.app.classList.add('pulse-danger');

  setChoices([
    {
      label: 'Try again from the Ruined Gate',
      costsTorch: false,
      allowReward: false,
      run: async () => {
        resetGame();
      },
    },
  ]);

  disableChoices(false);
  renderMap();
}

function createParticles() {
  // Ambient particles removed to keep the background flat and solid.
}

function applyTextSize(size) {
  const className = `text-size-${size}`;
  ui.body.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
  ui.body.classList.add(className);
  ui.textSizeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.size === size);
  });
  requestAnimationFrame(() => {
    syncConsoleHeight();
    scrollLogToLatest();
  });
}

function applyTheme(theme) {
  const className = `theme-${theme}`;
  ui.body.classList.remove('theme-dark', 'theme-light');
  ui.body.classList.add(className);
  ui.themeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === theme);
  });
  requestAnimationFrame(() => {
    syncConsoleHeight();
    scrollLogToLatest();
  });
}

function bindUi() {
  ui.apiConnect.addEventListener('click', () => {
    if (state.apiKey) {
      state.apiKey = '';
      ui.apiInput.value = '';
      setApiStatus('AI Offline', false);
      ui.apiConnect.textContent = 'Connect';
      logLine('AI narration disabled. Using authored fallback text only.', 'system');
      return;
    }

    const key = ui.apiInput.value.trim();
    if (!key) {
      setApiStatus('AI Offline', false);
      return;
    }

    state.apiKey = key;
    setApiStatus('AI Ready', true);
    ui.apiConnect.textContent = 'Disconnect';
    logLine('OpenAI key loaded for this session. It is kept in-memory only.', 'system');
  });

  ui.restart.addEventListener('click', () => {
    resetGame();
  });

  ui.textSizeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyTextSize(button.dataset.size || 'medium');
    });
  });

  ui.themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.theme || 'dark');
    });
  });

  window.addEventListener('resize', () => {
    syncConsoleHeight();
    scrollLogToLatest();
  });

  if ('ResizeObserver' in window) {
    layoutObserver = new ResizeObserver(() => {
      syncConsoleHeight();
      scrollLogToLatest();
    });
    layoutObserver.observe(ui.app);
    layoutObserver.observe(ui.choices);
  }
}

function resetGame() {
  stopScene();
  state.sessionId += 1;

  state.player = { ...START_PLAYER };
  state.locationId = 'gate';
  state.phase = 'explore';
  state.enemy = null;
  state.visited = new Set();
  state.cleared = new Set();
  state.flags = {
    sageTalked: false,
    forestLooted: false,
    cryptLooted: false,
    won: false,
    lost: false,
  };
  state.inventory = {};
  state.choiceLocked = false;

  ui.app.classList.remove('pulse-danger');
  clearLog();
  renderStats();

  logLine('You arrive at the Ruined Gate with five torches and a name you barely remember.', 'system');
  logLine('Every action costs one torch. If your light reaches zero, the dark takes you.', 'system');

  enterLocation('gate', false, state.sessionId);

  requestAnimationFrame(() => {
    syncConsoleHeight();
    scrollLogToLatest();
  });
}

bindUi();
applyTheme('dark');
createParticles();
resetGame();

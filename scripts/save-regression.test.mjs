import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// 测试真实引擎生命周期；只替换音频和渲染，不依赖浏览器或真实战斗计时。
const result = await build({
  stdin: {
    contents: "export { GameEngine } from './src/game/engine'; export { sound } from './src/utils/audio';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
  loader: { '.jpg': 'dataurl' },
});
const { GameEngine, sound } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(sound))) {
  if (key !== 'constructor' && typeof sound[key] === 'function') sound[key] = () => {};
}

function fixture() {
  const saves = [];
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {
    callbacks: new Proxy({ onAutoSave: (snapshot) => saves.push(structuredClone(snapshot)) }, {
      get: (target, key) => target[key] ?? (() => {}),
    }),
    hasStartedRun: false, suppressAutoSave: false, isRunning: false,
    difficulty: 'NORMAL', gameMode: 'CLASSIC', awakeningMax: 100,
    loop: () => {},
  });
  engine.resetGame();
  return { engine, saves };
}

test('first save contains the configured mode, difficulty and HP for every new run', () => {
  for (const [difficulty, hp] of [['EASY', 180], ['NORMAL', 120], ['HARD', 90], ['EXTREME', 70]]) {
    const { engine, saves } = fixture();
    engine.setGameMode('MUSOU');
    engine.resetGame();
    engine.setDifficulty(difficulty);
    engine.player.hp = engine.player.maxHp = hp;
    engine.markRunStarted();
    assert.equal(saves.length, 1);
    assert.equal(saves[0].difficulty, difficulty);
    assert.equal(saves[0].mode, 'MUSOU');
    assert.equal(saves[0].player.hp, hp);
    assert.equal(saves[0].player.maxHp, hp);
  }
});

test('returning to title disables background/pause autosaves and preserves the previous snapshot', () => {
  const { engine, saves } = fixture();
  engine.player.hp = engine.player.maxHp = 180;
  engine.markRunStarted();
  const saved = structuredClone(saves[0]);
  engine.resetGame();
  assert.equal(engine.hasStartedRun, false);
  assert.equal(saves.length, 1);
  assert.deepEqual(saves[0], saved);
  engine.togglePause();
  engine.startWave(1);
  assert.equal(saves.length, 1);
});

test('resume restores progression and start does not erase elapsed survival time', () => {
  const { engine, saves } = fixture();
  engine.setDifficulty('EASY');
  engine.setGameMode('MUSOU');
  engine.player.hp = 143;
  engine.player.maxHp = 180;
  engine.player.ink = 64;
  engine.player.shield = 12;
  engine.player.shieldMax = 20;
  engine.player.affixes = [{ id: 'saved-affix', stats: { attackBonus: 10 } }];
  engine.markRunStarted();
  const snapshot = { ...saves[0], wave: 7, score: 830, awakening: 42, elapsedSec: 125,
    stats: { kills: 36, maxCombo: 12, eliteKills: 3, bossKills: 1 } };
  engine.resetGame();
  engine.restoreFromSnapshot(snapshot);
  const restored = engine.exportSnapshot();
  for (const key of ['wave', 'score', 'difficulty', 'mode', 'awakening', 'stats', 'player']) {
    assert.deepEqual(restored[key], snapshot[key], key);
  }
  const startTime = engine.runStartTime;
  engine.start();
  assert.equal(engine.runStartTime, startTime);
  assert.ok(engine.exportSnapshot().elapsedSec >= 125);
});

test('restart replaces the old recovery point with the new configured run', () => {
  const { engine, saves } = fixture();
  engine.markRunStarted();
  engine.startWave(4);
  engine.resetGame();
  engine.setDifficulty('HARD');
  engine.player.hp = engine.player.maxHp = 90;
  engine.markRunStarted();
  assert.equal(saves.at(-1).wave, 1);
  assert.equal(saves.at(-1).difficulty, 'HARD');
  assert.equal(saves.at(-1).player.hp, 90);
});

test('blocking dialogs pause and save once, clear held inputs, and cannot resume behind the dialog', () => {
  const { engine, saves } = fixture();
  engine.markRunStarted();
  engine.keys = { w: true, j: true };
  engine.drawPointerId = 7;
  engine.activeStroke = [{ x: 10, y: 10, t: 0 }];
  engine.setInputBlocked(true);
  assert.equal(engine.isPaused, true);
  assert.deepEqual(engine.keys, {});
  assert.equal(engine.drawPointerId, null);
  assert.deepEqual(engine.activeStroke, []);
  assert.equal(saves.length, 2);
  engine.togglePause();
  engine.setPaused(false);
  engine.pauseForInputLoss();
  assert.equal(engine.isPaused, true);
  assert.equal(saves.length, 2);
  engine.setInputBlocked(false);
  assert.equal(engine.isPaused, true);
  engine.togglePause();
  assert.equal(engine.isPaused, false);
});

test('blur, hidden page, pagehide, context menu and cancelled gesture all pause safely', () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  try {
    globalThis.window = new EventTarget();
    globalThis.document = Object.assign(new EventTarget(), { hidden: false });
    for (const type of ['blur', 'visibilitychange', 'pagehide', 'contextmenu', 'pointercancel']) {
      const { engine, saves } = fixture();
      engine.keys = { w: true };
      engine.canvas = new EventTarget();
      engine.eventCleanupFns = [];
      engine.markRunStarted();
      engine.setupEvents();
      engine.drawPointerId = 7;
      engine.finalizeStroke = () => assert.fail('cancelled input must not trigger an attack');
      if (type === 'visibilitychange') {
        document.hidden = true;
        document.dispatchEvent(new Event(type));
        document.hidden = false;
        document.dispatchEvent(new Event(type));
      } else {
        const target = type === 'contextmenu' ? engine.canvas : window;
        target.dispatchEvent(Object.assign(new Event(type), { pointerId: 7 }));
      }
      assert.equal(engine.isPaused, true, type);
      assert.deepEqual(engine.keys, {}, type);
      assert.equal(engine.drawPointerId, null, type);
      assert.equal(saves.length, 2, type);
      engine.eventCleanupFns.forEach((cleanup) => cleanup());
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('input loss on title or after a run cannot create a new save', () => {
  const { engine, saves } = fixture();
  engine.pauseForInputLoss();
  assert.equal(saves.length, 0);
  engine.markRunStarted();
  engine.runEnded = true;
  engine.pauseForInputLoss();
  assert.equal(saves.length, 1);
});

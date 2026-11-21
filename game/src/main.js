// Beaconkeeper: The Midnight Light — boot, game loop, input and scoring.
// A top-down stealth heist in a lighthouse tower: steal the chart, the cipher
// and the logbook across three floors, and reach the exit unseen. The rotating
// beam and the lantern cones are the danger; fog, crates and wardrobes are safety.
import { FLOORS, TUNING, VIEW_H, VIEW_W } from './config.js';
import { Floor } from './levels.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const renderer = new Renderer(ctx);

export const game = {
  state: 'title', // title | briefing | playing | paused | floorclear | caught | win
  floorIndex: 0,
  floor: null,
  score: 0,
  detection: 0,
  totalTime: 0,
  time: 0,
  ghostFloors: 0,
  lastTimeBonus: 0,
  lastGhost: false,
  shotMode: false,
  sound: new SoundEngine(),
  input: { up: false, down: false, left: false, right: false, sneak: false },
  mouse: { x: VIEW_W / 2, y: VIEW_H / 2 },
  beamAngle: 0,

  startFloor(index, silent) {
    this.floorIndex = index;
    this.floor = new Floor(index);
    this.detection = 0;
    this.beamAngle = this.floor.beamAngle;
    if (!silent) this.state = 'briefing';
  },

  onAlarm() {
    this.floor.everSeen = true;
    this.sound.alarm();
  },

  onPickup(item) {
    this.score += TUNING.itemScore;
    this.sound.pickup();
  },

  onCaught() {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.sound.caught();
  },

  clearFloor() {
    const floor = this.floor;
    const par = TUNING.parSeconds[this.floorIndex];
    const timeBonus = Math.max(0, Math.round((par - floor.time) * TUNING.timeBonusPerSecond));
    const ghost = !floor.everSeen;
    this.lastTimeBonus = timeBonus;
    this.lastGhost = ghost;
    this.score += TUNING.floorBonus + timeBonus + (ghost ? TUNING.ghostBonus : 0);
    if (ghost) this.ghostFloors += 1;
    this.totalTime += floor.time;
    this.sound.floorClear();
    if (this.floorIndex >= FLOORS.length - 1) {
      this.state = 'win';
      this.sound.win();
    } else {
      this.state = 'floorclear';
    }
  },

  advance() {
    if (this.state === 'title') {
      this.sound.ensure();
      this.startFloor(0);
    } else if (this.state === 'briefing') {
      this.state = 'playing';
    } else if (this.state === 'floorclear') {
      this.startFloor(this.floorIndex + 1);
    }
  },

  restart() {
    if (this.state === 'caught') {
      this.startFloor(this.floorIndex);
      this.state = 'playing';
    } else if (this.state === 'win') {
      this.score = 0;
      this.totalTime = 0;
      this.ghostFloors = 0;
      this.startFloor(0);
    }
  },
};

function canvasPoint(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VIEW_W,
    y: ((clientY - r.top) / r.height) * VIEW_H,
  };
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  const dir = KEYMAP[e.code];
  if (dir) game.input[dir] = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.input.sneak = true;
  if (e.repeat) return;
  game.sound.ensure();
  if (e.code === 'Enter') game.advance();
  if (e.code === 'KeyR') game.restart();
  if (e.code === 'KeyP' && game.state === 'playing') game.state = 'paused';
  else if (e.code === 'KeyP' && game.state === 'paused') game.state = 'playing';
  if (e.code === 'KeyM') game.sound.setMuted(!game.sound.muted);
  if (e.code === 'KeyF' && game.state === 'playing') game.floor.tossPebble(game.mouse.x, game.mouse.y, game);
  if (e.code === 'KeyE' && game.state === 'playing' && game.floor.nearBell()) game.floor.ringBell(game);
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) game.input[dir] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.input.sneak = false;
});

canvas.addEventListener('mousemove', (e) => {
  game.mouse = canvasPoint(e.clientX, e.clientY);
});
canvas.addEventListener('click', (e) => {
  game.sound.ensure();
  if (game.state !== 'playing') return;
  const p = canvasPoint(e.clientX, e.clientY);
  game.floor.tossPebble(p.x, p.y, game);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing' && !game.shotMode) {
    game.time += dt;
    game.floor.update(dt, game);
    game.beamAngle = game.floor.beamAngle;
    if (game.floor.player.moving) game.sound.step(game.floor.player.sneaking);
    if (game.floor.caughtBy) game.onCaught();
    else if (game.floor.atExit()) game.clearFloor();
  } else if (game.state === 'playing' && game.shotMode) {
    game.time += dt;
  }
  renderer.draw(game);
  requestAnimationFrame(loop);
}

// Exposed for local play-testing only (read by the test driver, never by the game).
window.__beaconkeeper = game;

// Boot: title screen over the first floor, then ?shot= staging for screenshots.
game.startFloor(0, true);
game.state = 'title';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  if (stageShot(game, shot)) {
    // One tiny tick so hiding, light and suspicion labels settle for the picture.
    game.floor.update(0.016, game);
    game.beamAngle = game.floor.beamAngle;
  }
}
requestAnimationFrame(loop);

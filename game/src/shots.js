// Beaconkeeper — screenshot staging: deterministic scenes for the four
// screenshots, chosen with ?shot=<name>. Each scene sets the floor, the thief,
// the guards and the suspicion so the picture shows the game at its best:
// the cover shows the Lamp Room with the beam sweeping past two patrols.
import { TUNING } from './config.js';

const SHOTS = {
  // Cover: floor 3, the thief crouched in fog as the great beam sweeps by
  // and two keepers cross with their cones.
  cover: (game) => {
    game.startFloor(2, true);
    const f = game.floor;
    f.player.x = 470;
    f.player.y = 160;
    f.player.angle = Math.PI / 2;
    f.beamAngle = 4.6;
    f.guards[0].x = 250;
    f.guards[0].y = 300;
    f.guards[0].angle = 0;
    f.guards[0].suspicion = 30;
    f.guards[0].mood = 'wary';
    f.guards[1].x = 700;
    f.guards[1].y = 380;
    f.guards[1].angle = Math.PI;
    f.guards[1].suspicion = 62;
    f.guards[1].mood = 'investigate';
    f.guards[1].target = { x: 470, y: 160 };
    f.guards[2].x = 480;
    f.guards[2].y = 430;
    f.guards[2].angle = -Math.PI / 2;
    game.detection = 18;
  },
  // The Boathouse: the thief behind crates, a dockhand's cone sweeping the pier.
  dock: (game) => {
    game.startFloor(0, true);
    const f = game.floor;
    f.player.x = 120;
    f.player.y = 245;
    f.player.angle = 0;
    f.beamAngle = 2.4;
    f.guards[0].x = 380;
    f.guards[0].y = 180;
    f.guards[0].angle = Math.PI;
    f.guards[0].suspicion = 12;
    f.guards[1].x = 800;
    f.guards[1].y = 420;
    f.guards[1].angle = -Math.PI / 2;
    game.detection = 0;
  },
  // A near miss in the Quarters: a keeper investigates the thief's pebble
  // while the thief hides in fog, suspicion ring high.
  chase: (game) => {
    game.startFloor(1, true);
    const f = game.floor;
    f.player.x = 325;
    f.player.y = 215;
    f.player.angle = Math.PI / 4;
    f.beamAngle = 0.6;
    f.guards[0].x = 430;
    f.guards[0].y = 260;
    f.guards[0].angle = Math.PI;
    f.guards[0].suspicion = 88;
    f.guards[0].mood = 'investigate';
    f.guards[0].target = { x: 325, y: 215 };
    f.guards[1].x = 760;
    f.guards[1].y = 200;
    f.guards[1].angle = Math.PI / 2;
    f.guards[2].x = 300;
    f.guards[2].y = 480;
    f.guards[2].angle = 0;
    f.rings.push({ x: 395, y: 240, ttl: 0.9, max: TUNING.noisePebble });
    game.detection = 47;
    game.score = 500;
  },
  // Victory: the great lamp lit, the whole heist done.
  win: (game) => {
    game.startFloor(2, true);
    game.state = 'win';
    game.score = 3250;
    game.totalTime = 412;
    game.ghostFloors = 2;
  },
};

export function shotNames() {
  return Object.keys(SHOTS);
}

/** Stage a named screenshot scene; returns false when the name is unknown. */
export function stageShot(game, name) {
  const fn = SHOTS[name];
  if (!fn) return false;
  fn(game);
  game.state = game.state === 'win' ? 'win' : 'playing';
  game.shotMode = true;
  return true;
}

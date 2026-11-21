// Beaconkeeper — floors: build a playable floor from the config, track its
// objectives, and decide when the floor is won or the thief is caught.
import { FLOORS, TUNING } from './config.js';
import { Guard } from './guards.js';
import { Player } from './player.js';

export class Floor {
  constructor(index) {
    this.index = index;
    this.def = FLOORS[index];
    this.player = new Player(this.def.playerStart);
    this.guards = this.def.guards.map((g) => new Guard(g));
    this.items = this.def.items.map((it) => ({ ...it, taken: false }));
    this.beamAngle = this.def.beam.start;
    this.exitOpen = false;
    this.noises = []; // {x, y, r, ttl} expanding noise rings
    this.rings = []; // visual ripples
    this.time = 0;
    this.everSeen = false; // any alarm raised on this floor
    this.caughtBy = null;
  }

  get walls() {
    return this.def.walls;
  }
  get cover() {
    return this.def.cover;
  }
  get lamps() {
    return this.def.lamps;
  }
  get beam() {
    return this.def.beam;
  }
  get bell() {
    return this.def.bell;
  }
  get exit() {
    return this.def.exit;
  }

  itemsLeft() {
    return this.items.filter((i) => !i.taken).length;
  }

  update(dt, game) {
    this.time += dt;
    this.beamAngle += this.def.beam.speed * dt;
    for (const n of this.noises) n.ttl -= dt;
    this.noises = this.noises.filter((n) => n.ttl > 0);
    for (const r of this.rings) r.ttl -= dt;
    this.rings = this.rings.filter((r) => r.ttl > 0);

    this.player.update(dt, game.input, this.walls, this.cover, this.lamps);

    // Footsteps carry: guards inside the noise radius come to look.
    if (this.player.noise > 0) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < this.player.noise + 30) {
          g.hearNoise(this.player.x, this.player.y, this.walls);
        }
      }
    }
    // Thrown pebbles and bells ring out across the floor.
    for (const n of this.noises) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - n.x, g.y - n.y) < n.r) g.hearNoise(n.x, n.y, this.walls);
      }
    }

    for (const g of this.guards) g.update(dt, this, game);
    game.detection = Math.max(0, game.detection - TUNING.detectDecay * dt);
    if (game.detection >= 100) this.caughtBy = this.guards.find((g) => g.mood === 'alarm') || this.guards[0];

    // Pick up an item by walking over it.
    for (const it of this.items) {
      if (!it.taken && Math.hypot(it.x - this.player.x, it.y - this.player.y) < 26) {
        it.taken = true;
        game.onPickup(it);
      }
    }
    if (this.itemsLeft() === 0) this.exitOpen = true;
  }

  /** The thief reached the exit with every item: the floor is won. */
  atExit() {
    if (!this.exitOpen) return false;
    const e = this.exit;
    return this.player.x > e.x && this.player.x < e.x + e.w && this.player.y > e.y && this.player.y < e.y + e.h;
  }

  nearBell() {
    return Math.hypot(this.bell.x - this.player.x, this.bell.y - this.player.y) < 42;
  }

  ringBell(game) {
    this.noises.push({ x: this.bell.x, y: this.bell.y, r: 9999, ttl: 0.5 });
    this.rings.push({ x: this.bell.x, y: this.bell.y, ttl: 1.2, max: 320 });
    game.sound.bell();
  }

  tossPebble(tx, ty, game) {
    const land = this.player.throwPebble(tx, ty);
    if (!land) return;
    this.noises.push({ x: land.x, y: land.y, r: TUNING.noisePebble, ttl: 0.6 });
    this.rings.push({ x: land.x, y: land.y, ttl: 0.9, max: TUNING.noisePebble });
    game.sound.pebble();
  }
}

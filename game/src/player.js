// Beaconkeeper — the thief: movement, noise, hiding and pebble lures.
// Walk is quick but audible; Shift is a slow silent sneak. Standing still in
// fog, behind crates or in a wardrobe makes the thief invisible to every cone.
import { TUNING } from './config.js';
import { circleHitsWall, hiddenInCover, litByLamp } from './vision.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.angle = -Math.PI / 2;
    this.moving = false;
    this.sneaking = false;
    this.pebbles = TUNING.pebblesStart;
    this.noise = 0; // current footstep noise radius
    this.hiddenZone = null;
    this.lit = false;
    this.stepPhase = 0;
    this.throwCooldown = 0;
  }

  update(dt, input, walls, cover, lamps) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!input.sneak && this.moving;
    const speed = this.sneaking ? TUNING.sneakSpeed : TUNING.walkSpeed;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.angle = Math.atan2(my, mx);
      const nx = this.x + mx * speed * dt;
      const ny = this.y + my * speed * dt;
      if (!circleHitsWall(nx, this.y, TUNING.playerRadius, walls)) this.x = nx;
      if (!circleHitsWall(this.x, ny, TUNING.playerRadius, walls)) this.y = ny;
      this.stepPhase += dt * (speed / 8);
      this.noise = this.sneaking ? TUNING.noiseSneak : TUNING.noiseWalk;
    } else {
      this.noise = 0;
    }
    this.hiddenZone = hiddenInCover(this.x, this.y, cover);
    this.lit = litByLamp(this.x, this.y, lamps);
    if (this.throwCooldown > 0) this.throwCooldown -= dt;
  }

  /** Throw a pebble toward (tx,ty); returns the landing point or null. */
  throwPebble(tx, ty) {
    if (this.pebbles <= 0 || this.throwCooldown > 0) return null;
    this.pebbles -= 1;
    this.throwCooldown = 0.6;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.min(Math.hypot(dx, dy), 260);
    const a = Math.atan2(dy, dx);
    return { x: this.x + Math.cos(a) * dist, y: this.y + Math.sin(a) * dist };
  }
}

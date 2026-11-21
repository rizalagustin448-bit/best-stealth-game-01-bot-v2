// Beaconkeeper — guards: patrol waypoints, suspicion, investigation and chase.
// A guard's mood is one of calm, wary (suspicion rising), investigate (walking to
// the last seen spot) or alarm (chasing the thief). Suspicion is the recovery
// window: it falls when the thief is out of sight, so a near miss need not end the run.
import { TUNING } from './config.js';
import { canSee, circleHitsWall, hasLineOfSight, pointInWall } from './vision.js';

export class Guard {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.wpIndex = 0;
    this.pause = def.pause || 1.6;
    this.pauseLeft = 0;
    this.angle = 0;
    this.suspicion = 0;
    this.mood = 'calm'; // calm | wary | investigate | alarm
    this.target = null; // {x, y} being investigated or chased
    this.lookTimer = 0;
    this.stepPhase = Math.random() * 6.28;
    this.caughtFlash = 0;
  }

  faceToward(x, y, dt) {
    const want = Math.atan2(y - this.y, x - this.x);
    let d = want - this.angle;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const turn = 5.2 * dt;
    this.angle += Math.max(-turn, Math.min(turn, d));
  }

  moveToward(x, y, speed, dt, walls) {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    if (!circleHitsWall(nx, this.y, TUNING.guardRadius, walls)) this.x = nx;
    if (!circleHitsWall(this.x, ny, TUNING.guardRadius, walls)) this.y = ny;
    this.faceToward(x, y, dt);
    this.stepPhase += dt * (speed / 9);
    return dist <= step + 1;
  }

  hearNoise(x, y, walls) {
    // A heard noise is worth investigating, unless the guard is already chasing.
    if (this.mood === 'alarm') return;
    if (this.suspicion < TUNING.investigateAt) this.suspicion = TUNING.investigateAt;
    this.target = { x, y };
    this.mood = 'investigate';
  }

  update(dt, floor, game) {
    const { walls, player, lamps, beam } = floor;
    const beamAngle = floor.beamAngle;
    const hidden = player.hiddenZone;
    const seenByCone = !hidden && canSee(this.x, this.y, this.angle, TUNING.visionHalfAngle, TUNING.visionRange, player.x, player.y, walls);
    const seenByBeam =
      !hidden &&
      beam &&
      (() => {
        const dx = player.x - beam.x;
        const dy = player.y - beam.y;
        const dist = Math.hypot(dx, dy);
        if (dist > beam.length) return false;
        let da = Math.atan2(dy, dx) - beamAngle;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) > beam.width) return false;
        return hasLineOfSight(beam.x, beam.y, player.x, player.y, walls);
      })();
    const closeSniff = !hidden && Math.hypot(player.x - this.x, player.y - this.y) < 46;

    let seen = seenByCone || seenByBeam || closeSniff;
    let gain = 0;
    if (seen) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      gain = dist < 95 ? TUNING.suspicionGainNear : TUNING.suspicionGainFar;
      let lit = false;
      for (const l of lamps) {
        const dx = player.x - l.x;
        const dy = player.y - l.y;
        if (dx * dx + dy * dy < l.r * l.r) lit = true;
      }
      if (lit || seenByBeam) gain *= TUNING.suspicionGainLit;
      if (closeSniff) gain = Math.max(gain, 120);
    }

    if (seen) {
      this.suspicion = Math.min(100, this.suspicion + gain * dt);
      this.target = { x: player.x, y: player.y };
      if (this.suspicion >= TUNING.alarmAt) {
        if (this.mood !== 'alarm') game.onAlarm(this);
        this.mood = 'alarm';
      } else if (this.suspicion >= TUNING.investigateAt) {
        this.mood = 'investigate';
      } else {
        this.mood = 'wary';
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - TUNING.suspicionDecay * dt);
      if (this.mood === 'wary' && this.suspicion < 12) this.mood = 'calm';
    }

    if (this.mood === 'alarm') {
      // Chase the last seen spot; keep chasing while the thief is visible.
      const tx = seen ? player.x : this.target ? this.target.x : this.x;
      const ty = seen ? player.y : this.target ? this.target.y : this.y;
      this.moveToward(tx, ty, TUNING.chaseSpeed, dt, walls);
      game.detection = Math.min(100, game.detection + TUNING.detectRise * dt);
      if (!seen && this.target && Math.hypot(this.target.x - this.x, this.target.y - this.y) < 14) {
        this.mood = 'investigate';
        this.lookTimer = 2.2;
      }
      if (Math.hypot(player.x - this.x, player.y - this.y) < TUNING.guardRadius + TUNING.playerRadius + 2) {
        game.onCaught(this);
      }
    } else if (this.mood === 'investigate' && this.target) {
      const arrived = this.moveToward(this.target.x, this.target.y, TUNING.investigateSpeed, dt, walls);
      if (arrived) {
        this.lookTimer -= dt;
        this.angle += dt * 1.9; // look around
        if (this.lookTimer <= 0) {
          this.mood = 'calm';
          this.target = null;
          this.suspicion = Math.max(0, this.suspicion - 30);
        }
      } else {
        this.lookTimer = 2.2;
      }
    } else {
      // Patrol: walk the waypoints, pausing at each to look around.
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        this.angle += dt * 0.7;
      } else {
        const wp = this.waypoints[this.wpIndex];
        const arrived = this.moveToward(wp[0], wp[1], TUNING.patrolSpeed, dt, walls);
        if (arrived) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseLeft = this.pause;
        }
      }
    }
    if (this.caughtFlash > 0) this.caughtFlash -= dt;
  }
}

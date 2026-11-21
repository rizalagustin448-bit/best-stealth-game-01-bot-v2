// Beaconkeeper — vision: raycast line of sight, vision cones and the rotating beam.
// Walls are axis-aligned rectangles; a ray is walked in small steps so a cone
// stops at the first wall it meets, exactly as the player sees it.
export function pointInWall(x, y, walls) {
  for (const w of walls) {
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
  }
  return false;
}

export function circleHitsWall(x, y, r, walls) {
  for (const w of walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** True when no wall stands between (x1,y1) and (x2,y2). */
export function hasLineOfSight(x1, y1, x2, y2, walls) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInWall(x1 + dx * t, y1 + dy * t, walls)) return false;
  }
  return true;
}

/** Where a vision ray from (x,y) along `angle` first hits a wall, or its full range. */
export function raycastWall(x, y, angle, range, walls) {
  const step = 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= range; d += step) {
    const px = x + cos * d;
    const py = y + sin * d;
    if (pointInWall(px, py, walls)) return { x: px, y: py, dist: d };
  }
  return { x: x + cos * range, y: y + sin * range, dist: range };
}

/** The polygon of a guard's vision cone, clipped by walls ray by ray. */
export function conePolygon(x, y, angle, halfAngle, range, walls) {
  const pts = [{ x, y }];
  const rays = 14;
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const hit = raycastWall(x, y, a, range, walls);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

/** True when (tx,ty) lies inside the cone and a wall does not hide it. */
export function canSee(x, y, angle, halfAngle, range, tx, ty, walls) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true;
  let da = Math.atan2(dy, dx) - angle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > halfAngle) return false;
  return hasLineOfSight(x, y, tx, ty, walls);
}

/** True when (tx,ty) stands inside the rotating beam wedge. */
export function inBeam(beam, angle, tx, ty) {
  const dx = tx - beam.x;
  const dy = ty - beam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > beam.length) return false;
  let da = Math.atan2(dy, dx) - angle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  return Math.abs(da) < beam.width;
}

/** The wedge polygon of the beam, clipped by walls, for drawing. */
export function beamPolygon(beam, angle, walls) {
  const pts = [{ x: beam.x, y: beam.y }];
  const rays = 16;
  for (let i = 0; i <= rays; i++) {
    const a = angle - beam.width + (2 * beam.width * i) / rays;
    const hit = raycastWall(beam.x, beam.y, a, beam.length, walls);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

/** True when (x,y) lies inside any lamp's lit circle. */
export function litByLamp(x, y, lamps) {
  for (const l of lamps) {
    const dx = x - l.x;
    const dy = y - l.y;
    if (dx * dx + dy * dy < l.r * l.r) return true;
  }
  return false;
}

/** True when (x,y) lies inside a cover zone (fog, crates, wardrobe, rug). */
export function hiddenInCover(x, y, cover) {
  for (const c of cover) {
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c;
  }
  return null;
}

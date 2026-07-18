/*
 * Collision handling: solid wall tiles (slide + soft bounce) and
 * round objects (bolts, boxes, cones, tire stacks, hidden stars).
 */

import { isWallCell } from './track.js';

const VEHICLE_RADIUS = 24;

/*
 * Move the vehicle by its velocity, sliding along wall tiles.
 * Mutates v. Returns events ('bonk' when hitting a wall hard).
 */
export function collideWalls(v, track, dt) {
  const events = [];
  const r = VEHICLE_RADIUS;
  const ts = track.tileSize;

  const tryMove = (nx, ny) => {
    // Check the 4 corners of the vehicle's bounding circle.
    const points = [
      [nx - r, ny], [nx + r, ny], [nx, ny - r], [nx, ny + r]
    ];
    for (const [px, py] of points) {
      if (isWallCell(track, Math.floor(px / ts), Math.floor(py / ts))) return false;
    }
    return true;
  };

  const stepX = v.vx * dt;
  const stepY = v.vy * dt;
  const speed = Math.hypot(v.vx, v.vy);
  let hit = false;

  if (tryMove(v.x + stepX, v.y + stepY)) {
    v.x += stepX; v.y += stepY;
  } else if (tryMove(v.x + stepX, v.y)) {
    v.x += stepX;
    v.vy *= -0.25; hit = true;
  } else if (tryMove(v.x, v.y + stepY)) {
    v.y += stepY;
    v.vx *= -0.25; hit = true;
  } else {
    v.vx *= -0.3; v.vy *= -0.3; hit = true;
  }

  // Keep inside world bounds no matter what.
  v.x = Math.min(track.width - r, Math.max(r, v.x));
  v.y = Math.min(track.height - r, Math.max(r, v.y));

  if (hit && speed > 140) {
    v.bonkFlash = 0.3;
    events.push('bonk');
  }
  return events;
}

/*
 * Object pickups/hits. Returns events like
 * {type:'bolt'|'box'|'cone'|'tires'|'hidden', object}.
 * Strength (1–5) reduces how much boxes slow you down.
 */
export function collideObjects(v, track, params, difficulty) {
  const events = [];
  if (v.z > 40) return events; // flying clean over everything

  for (const o of track.objects) {
    if (!o.alive) continue;
    const dx = o.x - v.x, dy = o.y - v.y;
    const rr = o.r + VEHICLE_RADIUS;
    if (dx * dx + dy * dy > rr * rr) continue;

    if (o.type === 'bolt') {
      o.alive = false;
      events.push({ type: 'bolt', object: o });
    } else if (o.type === 'hidden') {
      o.alive = false;
      events.push({ type: 'hidden', object: o });
    } else if (o.type === 'box') {
      o.alive = false;
      // Strong trucks barely slow down.
      const keep = 1 - difficulty.obstacleSlow * (1 - params.strength * 0.14);
      v.vx *= Math.max(0.35, keep);
      v.vy *= Math.max(0.35, keep);
      events.push({ type: 'box', object: o });
    } else if (o.type === 'cone') {
      o.alive = false;
      o.knockDx = dx; o.knockDy = dy;
      const keep = 1 - difficulty.obstacleSlow * 0.25;
      v.vx *= keep; v.vy *= keep;
      events.push({ type: 'cone', object: o });
    } else if (o.type === 'tires') {
      // Bouncy! Push the truck away.
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d, ny = dy / d;
      const dot = v.vx * nx + v.vy * ny;
      if (dot > 0) {
        v.vx -= 2 * dot * nx;
        v.vy -= 2 * dot * ny;
        v.vx *= 0.75; v.vy *= 0.75;
      }
      // Nudge out of overlap.
      v.x = o.x - nx * rr;
      v.y = o.y - ny * rr;
      events.push({ type: 'tires', object: o });
    }
  }
  return events;
}

export { VEHICLE_RADIUS };

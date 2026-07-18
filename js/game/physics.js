/*
 * Arcade driving physics. Not realistic — responsive and fun.
 * Velocity is a vector that gets pulled toward the truck's heading by grip
 * (low grip = drifting, e.g. on ice). Ramps launch the truck into the air
 * with a fake vertical axis (z).
 */

import { surfaceAt } from './track.js';
import { collideWalls } from './collision.js';

/* Convert 1–5 vehicle stats (+ tire tweaks) into physics numbers. */
export function physicsParams(vehicleDef, tireOption) {
  const s = vehicleDef.stats;
  const tSpeed = tireOption ? tireOption.speed : 0;
  const tGrip = tireOption ? tireOption.grip : 0;
  return {
    maxSpeed: 300 + (s.speed + tSpeed) * 42,          // units/s
    accel: 220 + s.accel * 62,
    reverseSpeed: 140,
    brake: 520,
    steerRate: 2.5,                                    // rad/s at full lock
    grip: Math.min(1, 0.5 + (s.grip + tGrip) * 0.11), // velocity alignment
    jumpPower: 220 + s.jump * 40,
    strength: s.strength,
    boostSpeed: 200,
    drag: 0.9
  };
}

export function createVehicleState(track) {
  return {
    x: track.start.x,
    y: track.start.y,
    angle: track.start.angle,
    vx: 0, vy: 0,
    z: 0, vz: 0,
    airborne: false,
    airTime: 0,
    boostMeter: 1,       // 0..1, starts ready
    boostTime: 0,
    surface: 'R',
    stuckTime: 0,
    lastSafe: { x: track.start.x, y: track.start.y, angle: track.start.angle },
    justLanded: 0,
    bonkFlash: 0,
    spinWobble: 0
  };
}

/*
 * One physics step.
 * input: {steer:-1..1, throttle:0..1, brake:0..1, boost:boolean(edge)}
 * Returns an array of event strings for the engine to react to
 * (e.g. 'jump','land','bigLand','boost','bonk','splash','recovered').
 */
export function stepPhysics(v, input, track, params, difficulty, dt) {
  const events = [];
  const surf = surfaceAt(track, v.x, v.y);
  v.surface = terrainKey(surf);

  const speed = Math.hypot(v.vx, v.vy);
  const speedRatio = Math.min(1, speed / params.maxSpeed);

  /* ---------- boost ---------- */
  if (input.boost && v.boostMeter >= 0.99 && !v.airborne) {
    v.boostTime = 1.1;
    v.boostMeter = 0;
    events.push('boost');
  }
  if (v.boostTime > 0) v.boostTime = Math.max(0, v.boostTime - dt);
  else v.boostMeter = Math.min(1, v.boostMeter + dt / 6); // recharges in ~6s

  const boosting = v.boostTime > 0;

  /* ---------- steering ---------- */
  // Less steering authority at standstill; slightly less in the air.
  const steerAuthority = Math.min(1, speed / 60) * (v.airborne ? 0.35 : 1);
  let steer = input.steer;
  // Easy-mode steering assist: gently damps oversteer.
  steer *= 1 - difficulty.steerAssist * 0.35 * Math.abs(steer) * speedRatio;
  v.angle += steer * params.steerRate * steerAuthority * dt;

  const fx = Math.cos(v.angle);
  const fy = Math.sin(v.angle);

  if (!v.airborne) {
    /* ---------- ground driving ---------- */
    const grip = params.grip * (surf.grip !== undefined ? surf.grip : 1);

    // Throttle / brake / reverse.
    const forwardSpeed = v.vx * fx + v.vy * fy;
    if (input.throttle > 0) {
      const boostMul = boosting ? 1.6 : 1;
      v.vx += fx * params.accel * input.throttle * boostMul * dt;
      v.vy += fy * params.accel * input.throttle * boostMul * dt;
    }
    if (input.brake > 0) {
      if (forwardSpeed > 20) {
        // brake
        const b = params.brake * input.brake * dt;
        const sc = Math.max(0, (speed - b)) / (speed || 1);
        v.vx *= sc; v.vy *= sc;
      } else {
        // reverse
        v.vx -= fx * params.accel * 0.6 * input.brake * dt;
        v.vy -= fy * params.accel * 0.6 * input.brake * dt;
      }
    }

    // Grip: rotate velocity toward heading (or reverse heading).
    const dirSign = forwardSpeed >= 0 ? 1 : -1;
    const targetVx = fx * dirSign, targetVy = fy * dirSign;
    const spd = Math.hypot(v.vx, v.vy);
    if (spd > 1) {
      const nx = v.vx / spd, ny = v.vy / spd;
      const align = Math.min(1, grip * 8 * dt);
      const mx = nx + (targetVx - nx) * align;
      const my = ny + (targetVy - ny) * align;
      const mlen = Math.hypot(mx, my) || 1;
      v.vx = (mx / mlen) * spd;
      v.vy = (my / mlen) * spd;
    }

    // Surface drag + speed cap.
    let dragFactor = surf.drag || 0;
    if (surf.offtrack) dragFactor = difficulty.offtrackDrag;
    const damp = Math.max(0, 1 - (0.6 + dragFactor * 3.2) * dt);
    v.vx *= damp; v.vy *= damp;

    const maxNow = (boosting ? params.maxSpeed + params.boostSpeed : params.maxSpeed);
    const spd2 = Math.hypot(v.vx, v.vy);
    const cap = input.brake > 0 && forwardSpeed < 20 ? params.reverseSpeed : maxNow;
    if (spd2 > cap) { v.vx *= cap / spd2; v.vy *= cap / spd2; }

    // Special tiles.
    if (surf.boost && spd2 > 30) {
      const target = Math.min(params.maxSpeed + params.boostSpeed, spd2 + 340 * dt * 3);
      v.vx *= target / spd2; v.vy *= target / spd2;
      if (!v._onBoostTile) { events.push('boostPad'); v._onBoostTile = true; }
    } else {
      v._onBoostTile = false;
    }
    if (surf.ramp && spd2 > 90) {
      v.vz = params.jumpPower * (0.55 + 0.6 * Math.min(1, spd2 / params.maxSpeed));
      v.airborne = true;
      v.airTime = 0;
      events.push('jump');
    }
    if ((v.surface === 'M') && spd2 > 120 && !v._splashed) {
      events.push('splash');
      v._splashed = true;
    } else if (v.surface !== 'M') {
      v._splashed = false;
    }
  } else {
    /* ---------- airborne ---------- */
    v.airTime += dt;
    v.vz -= 620 * dt;   // gravity
    v.z += v.vz * dt;
    v.spinWobble = Math.sin(v.airTime * 6) * 0.12;
    if (v.z <= 0) {
      v.z = 0; v.vz = 0;
      v.airborne = false;
      v.spinWobble = 0;
      v.justLanded = 0.4;
      events.push(v.airTime > 0.8 ? 'bigLand' : 'land');
      v.landedAirTime = v.airTime;
      v.airTime = 0;
    }
  }

  /* ---------- integrate + walls ---------- */
  const wallEvents = collideWalls(v, track, dt);
  for (const e of wallEvents) events.push(e);

  if (v.justLanded > 0) v.justLanded -= dt;
  if (v.bonkFlash > 0) v.bonkFlash -= dt;

  /* ---------- stuck rescue (never trap the player) ---------- */
  const movingIntent = input.throttle > 0 || input.brake > 0;
  const newSpeed = Math.hypot(v.vx, v.vy);
  if (!v.airborne && movingIntent && newSpeed < 12) v.stuckTime += dt;
  else v.stuckTime = 0;
  if (v.stuckTime > difficulty.recoverSeconds) {
    v.stuckTime = 0;
    respawn(v);
    events.push('recovered');
  }

  // Remember a safe spot while cruising on a good surface.
  if (!v.airborne && !surf.offtrack && !surf.wall && newSpeed > 40) {
    v.lastSafe = { x: v.x, y: v.y, angle: v.angle };
  }

  return events;
}

export function respawn(v) {
  v.x = v.lastSafe.x;
  v.y = v.lastSafe.y;
  v.angle = v.lastSafe.angle;
  v.vx = 0; v.vy = 0; v.z = 0; v.vz = 0;
  v.airborne = false;
  v.boostTime = 0;
}

function terrainKey(surf) {
  if (surf.wall) return '#';
  if (surf.offtrack) return '.';
  if (surf.boost) return 'B';
  if (surf.ramp) return 'J';
  if (surf.grip <= 0.2) return 'I';
  if (surf.drag >= 0.5) return 'M';
  if (surf.drag >= 0.3) return 'S';
  return 'R';
}

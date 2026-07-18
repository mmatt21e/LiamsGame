/*
 * Physics: cannon-es world + RaycastVehicle monster truck.
 * The truck uses 4 raycast wheels with real spring suspension, so it
 * bounces, leans and catches air the way a monster truck should.
 */

import * as CANNON from 'cannon-es';

export const ARENA_HALF = 80;         // arena is 160 x 160 m
export const WHEEL_RADIUS = 0.62;

/* The three drivable trucks. Stats feed both physics and scoring. */
export const TRUCKS = [
  {
    id: 'titan', name: 'TITAN', emoji: '🛻',
    desc: 'The all-rounder. Born to send it.',
    mass: 900, power: 5200, steer: 0.55, crushBonus: 1,
    baseColor: '#e02020', unlockScore: 0,
    stats: { SPEED: 3, GRIP: 3, CRUSH: 3 }
  },
  {
    id: 'venom', name: 'VENOM', emoji: '🐍',
    desc: 'Light and twitchy. Flies the farthest.',
    mass: 700, power: 5400, steer: 0.62, crushBonus: 1,
    baseColor: '#39d353', unlockScore: 5000,
    stats: { SPEED: 5, GRIP: 2, CRUSH: 2 }
  },
  {
    id: 'goliath', name: 'GOLIATH', emoji: '🦏',
    desc: 'A rolling earthquake. 1.5× crush points.',
    mass: 1200, power: 6800, steer: 0.5, crushBonus: 1.5,
    baseColor: '#8a8a99', unlockScore: 12000,
    stats: { SPEED: 2, GRIP: 4, CRUSH: 5 }
  }
];

export const PAINTS = ['#e02020', '#ff8a00', '#18c4d8', '#a44ff0', '#222230', '#a6e022'];

/* Ramp layout: [x, z, width, length, height, rotationY]. Mirrored + varied. */
export const RAMPS = [
  { x: 0, z: -30, w: 14, l: 16, h: 4.2, ry: 0 },          // mega ramp, faces +z
  { x: -34, z: 18, w: 8, l: 10, h: 2.6, ry: Math.PI / 2 },
  { x: 34, z: 18, w: 8, l: 10, h: 2.6, ry: -Math.PI / 2 },
  { x: -22, z: -48, w: 7, l: 8, h: 2.0, ry: Math.PI },
  { x: 22, z: -48, w: 7, l: 8, h: 2.0, ry: Math.PI },
  { x: 0, z: 48, w: 10, l: 12, h: 3.2, ry: Math.PI }      // faces -z
];

/* Crushable car spawn points (x, z, rotY). */
export const CAR_SPOTS = [
  [-10, 6, 0.3], [-6, 6, -0.2], [-2, 6, 0.1], [2, 6, -0.3], [6, 6, 0.2], [10, 6, 0],
  [-28, -14, 1.2], [28, -14, -1.2], [-14, 34, 0.6], [14, 34, -0.6],
  [-44, -34, 0.2], [44, -34, -0.2], [0, -60, 1.6], [-50, 40, 2.2], [50, 40, -2.2], [0, 20, 1.1]
];

export function createWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.35;
  world.defaultContactMaterial.restitution = 0.15;

  const groundMat = new CANNON.Material('ground');

  // Ground plane.
  const ground = new CANNON.Body({ mass: 0, material: groundMat });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  // Arena walls (invisible physics; visual walls added by world.js).
  const wallH = 6, t = 2;
  for (const [x, z, sx, sz] of [
    [0, -ARENA_HALF - t, ARENA_HALF + t, t],
    [0, ARENA_HALF + t, ARENA_HALF + t, t],
    [-ARENA_HALF - t, 0, t, ARENA_HALF + t],
    [ARENA_HALF + t, 0, t, ARENA_HALF + t]
  ]) {
    const wall = new CANNON.Body({ mass: 0 });
    wall.addShape(new CANNON.Box(new CANNON.Vec3(sx, wallH, sz)));
    wall.position.set(x, wallH, z);
    world.addBody(wall);
  }

  // Ramps: static rotated boxes (a thick slab tilted like a wedge).
  for (const r of RAMPS) {
    const body = new CANNON.Body({ mass: 0, material: groundMat });
    body.addShape(new CANNON.Box(new CANNON.Vec3(r.w / 2, 0.4, r.l / 2)));
    const tilt = Math.atan2(r.h, r.l);
    body.position.set(r.x, r.h / 2 - 0.15, r.z);
    const q1 = new CANNON.Quaternion().setFromEuler(0, r.ry, 0);
    const q2 = new CANNON.Quaternion().setFromEuler(-tilt, 0, 0);
    body.quaternion = q1.mult(q2);
    world.addBody(body);
  }

  return { world, groundMat };
}

/*
 * Build the RaycastVehicle for a truck spec.
 * Returns { chassisBody, vehicle } — call syncWheels() after each step.
 */
export function createTruck(world, groundMat, spec) {
  const chassisShape = new CANNON.Box(new CANNON.Vec3(2.0, 0.55, 1.3));
  const chassisBody = new CANNON.Body({ mass: spec.mass });
  chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.2, 0));
  chassisBody.position.set(0, 3, 62);
  chassisBody.quaternion.setFromEuler(0, Math.PI, 0); // face into the arena (-z)
  chassisBody.angularDamping = 0.25;                  // tames wild spins a little

  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexRightAxis: 0,   // x
    indexUpAxis: 1,      // y
    indexForwardAxis: 2  // z
  });

  const wheelOptions = {
    radius: WHEEL_RADIUS,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    suspensionStiffness: 32,
    suspensionRestLength: 0.55,
    frictionSlip: 3.4,
    dampingRelaxation: 2.6,
    dampingCompression: 4.3,
    maxSuspensionForce: 120000,
    rollInfluence: 0.012,
    axleLocal: new CANNON.Vec3(1, 0, 0),
    maxSuspensionTravel: 0.5,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true
  };

  // FL, FR, RL, RR — front is +z (local), matching indexForwardAxis.
  const w = 1.35, front = 1.45, rear = -1.45, y = 0.1;
  for (const [x, z] of [[-w, front], [w, front], [-w, rear], [w, rear]]) {
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(x, y, z) });
  }
  vehicle.addToWorld(world);

  return { chassisBody, vehicle };
}

/* Drive the vehicle from an input state {steer, throttle, brake}. */
export function driveTruck(vehicle, chassisBody, spec, input, dt) {
  const forwardSpeed = getForwardSpeed(chassisBody);
  // Less steering lock at speed so it doesn't spin out instantly.
  const speedFactor = 1 / (1 + Math.abs(forwardSpeed) * 0.045);
  const targetSteer = input.steer * spec.steer * speedFactor;
  // Smooth the steering toward the target for a weighty feel.
  const current = vehicle.wheelInfos[0].steering || 0;
  const steer = current + (targetSteer - current) * Math.min(1, dt * 10);
  vehicle.setSteeringValue(steer, 0);
  vehicle.setSteeringValue(steer, 1);

  let engine = 0, brake = 0;
  if (input.throttle) {
    engine = -spec.power; // negative = forward with this axis setup
  }
  if (input.brake) {
    if (forwardSpeed > 1) brake = 28;            // moving forward → brake
    else engine = spec.power * 0.55;             // stopped → reverse
  }
  for (let i = 0; i < 4; i++) {
    vehicle.applyEngineForce(engine, i);
    vehicle.setBrake(brake, i);
  }
}

export function getForwardSpeed(chassisBody) {
  // Local +z is the vehicle forward axis (indexForwardAxis: 2).
  const f = new CANNON.Vec3();
  chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1), f);
  return chassisBody.velocity.dot(f);
}

export function getForwardDir(chassisBody) {
  const f = new CANNON.Vec3();
  chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1), f);
  return f;
}

export function wheelsOnGround(vehicle) {
  let n = 0;
  for (const w of vehicle.wheelInfos) if (w.isInContact) n++;
  return n;
}

export function isUpsideDown(chassisBody) {
  const up = new CANNON.Vec3();
  chassisBody.quaternion.vmult(new CANNON.Vec3(0, 1, 0), up);
  return up.y < 0.15;
}

/* Teleport the truck upright (rescue). Keeps position, kills velocity. */
export function resetTruck(chassisBody, toStart = false) {
  if (toStart) chassisBody.position.set(0, 3, 62);
  else chassisBody.position.y += 2.5;
  // Keep the current yaw so the reset doesn't feel disorienting.
  const f = new CANNON.Vec3();
  chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1), f);
  const yaw = Math.atan2(f.x, f.z);
  chassisBody.quaternion.setFromEuler(0, yaw, 0);
  chassisBody.velocity.set(0, 0, 0);
  chassisBody.angularVelocity.set(0, 0, 0);
}

/*
 * Crushable cars: light dynamic boxes. When the truck hits one hard,
 * main.js marks it crushed (squash the mesh, drop the body).
 */
export function createCarBody(world, x, z, rotY) {
  const body = new CANNON.Body({ mass: 220 });
  body.addShape(new CANNON.Box(new CANNON.Vec3(1.05, 0.45, 0.6)));
  body.position.set(x, 0.5, z);
  body.quaternion.setFromEuler(0, rotY, 0);
  body.angularDamping = 0.4;
  body.linearDamping = 0.15;
  world.addBody(body);
  return body;
}

export { CANNON };

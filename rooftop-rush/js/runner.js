/*
 * The runner character: procedural humanoid with a run cycle, jump tuck,
 * slide crouch and crash ragdoll-ish flop. Built from primitives so no
 * model files are needed — swap buildRunner() for a GLTF load later if
 * you want a "real" model (keep the same returned interface).
 */

import * as THREE from 'three';

export const LANE_X = [-2.2, 0, 2.2];
export const JUMP_V = 9.0;
export const GRAVITY = -26;
export const SLIDE_TIME = 0.72;

export function buildRunner(skinHex) {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.7 });
  const hoodie = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.55, metalness: 0.08 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x23233a, roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf0f0f4, roughness: 0.5 });

  // Torso + hood.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), hoodie);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), hoodie);
  hood.position.set(0, 1.45, -0.02);
  group.add(hood);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skin);
  head.position.set(0, 1.47, 0.03);
  head.castShadow = true;
  group.add(head);

  // Limbs are pivoted at the shoulder/hip so rotation swings them.
  const mkLimb = (mat, len, thick) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), mat);
    mesh.position.y = -len / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const armL = mkLimb(hoodie, 0.5, 0.13);
  const armR = mkLimb(hoodie, 0.5, 0.13);
  armL.position.set(-0.33, 1.3, 0);
  armR.position.set(0.33, 1.3, 0);
  group.add(armL, armR);

  const legL = mkLimb(pants, 0.62, 0.16);
  const legR = mkLimb(pants, 0.62, 0.16);
  legL.position.set(-0.14, 0.74, 0);
  legR.position.set(0.14, 0.74, 0);
  group.add(legL, legR);
  // Shoes attached to leg tips.
  for (const leg of [legL, legR]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.26), shoe);
    s.position.set(0, -0.62, 0.05);
    leg.add(s);
  }

  // Shield bubble (power-up visual), hidden by default.
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x35d0c0, transparent: true, opacity: 0.22 })
  );
  bubble.position.y = 1.0;
  bubble.visible = false;
  group.add(bubble);

  return { group, torso, head, hood, armL, armR, legL, legR, bubble, hoodieMat: hoodie };
}

/*
 * Runner state machine. Owns lane position, vertical motion and pose.
 * The track asks it "where are you / are you sliding / how high" for
 * collision checks.
 */
export class Runner {
  constructor(model) {
    this.model = model;
    this.reset();
  }

  reset() {
    this.lane = 1;              // 0..2
    this.x = LANE_X[1];
    this.y = 0;                 // feet height above the running surface
    this.vy = 0;
    this.airborne = false;
    this.sliding = 0;           // seconds remaining
    this.dead = false;
    this.runPhase = 0;
    this.model.group.position.set(this.x, 0, 0);
    this.model.group.rotation.set(0, Math.PI, 0); // face -z (into the world)
    this.model.torso.rotation.x = 0;
    this.model.group.scale.set(1, 1, 1);
    this.model.bubble.visible = false;
  }

  moveLane(dir) {
    if (this.dead) return false;
    const next = Math.min(2, Math.max(0, this.lane + dir));
    if (next === this.lane) return false;
    this.lane = next;
    return true;
  }

  jump() {
    if (this.dead || this.airborne) return false;
    this.vy = JUMP_V;
    this.airborne = true;
    this.sliding = 0;
    return true;
  }

  slide() {
    if (this.dead) return false;
    if (this.airborne) { this.vy = -18; } // slam down out of the air
    this.sliding = SLIDE_TIME;
    return true;
  }

  die() {
    this.dead = true;
  }

  /* Advance animation + motion. speed drives the run-cycle tempo. */
  update(dt, speed) {
    const m = this.model;

    // Lane easing.
    const targetX = LANE_X[this.lane];
    this.x += (targetX - this.x) * Math.min(1, dt * 12);
    m.group.position.x = this.x;
    m.group.rotation.z = (targetX - this.x) * 0.14; // lean into the switch

    // Vertical motion.
    if (this.airborne) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.airborne = false; }
    }
    m.group.position.y = this.y;

    if (this.sliding > 0) this.sliding -= dt;

    if (this.dead) {
      // Face-plant flop.
      m.torso.rotation.x = Math.min(1.4, m.torso.rotation.x + dt * 6);
      m.group.position.y = Math.max(0, m.group.position.y - dt * 2);
      return;
    }

    // Pose blending: slide crouch vs run cycle vs jump tuck.
    if (this.sliding > 0) {
      m.torso.rotation.x = -1.15;
      m.group.scale.y += (0.55 - m.group.scale.y) * Math.min(1, dt * 14);
      m.armL.rotation.x = -2.4; m.armR.rotation.x = -2.4;
      m.legL.rotation.x = 1.2; m.legR.rotation.x = 1.4;
    } else if (this.airborne) {
      m.group.scale.y += (1 - m.group.scale.y) * Math.min(1, dt * 12);
      m.torso.rotation.x = 0.25;
      const tuck = this.vy > 0 ? 1.6 : 0.7;
      m.legL.rotation.x = tuck; m.legR.rotation.x = tuck * 0.8;
      m.armL.rotation.x = -2.6; m.armR.rotation.x = -2.6;
    } else {
      m.group.scale.y += (1 - m.group.scale.y) * Math.min(1, dt * 14);
      m.torso.rotation.x = 0.12;
      this.runPhase += dt * (6 + speed * 0.45);
      const s = Math.sin(this.runPhase);
      m.legL.rotation.x = s * 1.1;
      m.legR.rotation.x = -s * 1.1;
      m.armL.rotation.x = -s * 0.9 - 0.3;
      m.armR.rotation.x = s * 0.9 - 0.3;
      m.group.position.y = this.y + Math.abs(Math.cos(this.runPhase)) * 0.07;
    }
  }

  /* Collision profile used by the track. */
  get heightTop() { return this.sliding > 0 ? 0.75 : 1.75; }
  get isSliding() { return this.sliding > 0; }
}

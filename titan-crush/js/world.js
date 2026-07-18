/*
 * 3D world: Three.js scene, PBR-ish materials, shadows, skybox, bloom
 * post-processing, procedural arena meshes, the truck model, crushable
 * cars, dust particles and the chase camera.
 * Everything is generated in code — zero texture/model files to download.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ARENA_HALF, RAMPS, WHEEL_RADIUS } from './physics.js';

/* ---------- procedural textures (canvas → texture) ---------- */

function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6d5a41';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const s = 1 + Math.random() * 3;
    g.fillStyle = `rgba(${40 + Math.random() * 50 | 0},${30 + Math.random() * 40 | 0},${18 + Math.random() * 26 | 0},0.5)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  // tire ruts
  g.strokeStyle = 'rgba(40,30,18,0.35)';
  g.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(Math.random() * 256, 0);
    g.bezierCurveTo(Math.random() * 256, 90, Math.random() * 256, 170, Math.random() * 256, 256);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0b0e2a');     // night-blue zenith
  grad.addColorStop(0.55, '#2a1a4a');
  grad.addColorStop(0.8, '#c2401f');   // hot orange horizon — arena at dusk
  grad.addColorStop(1, '#e8842a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- world ---------- */

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x2a1a3a, 90, 240);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
    this.camera.position.set(0, 8, 80);

    // Post-processing: bloom makes the tower lights / sunset pop.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.7, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this._buildLights();
    this._buildArena();
    this._buildDust();

    this.shake = 0;
    this._camPos = new THREE.Vector3(0, 8, 80);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x8a7aff, 0x402a18, 0.55));
    const sun = new THREE.DirectionalLight(0xffc37a, 2.2);
    sun.position.set(-60, 80, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = ARENA_HALF + 20;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 10, far: 260 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  _buildArena() {
    // Sky dome.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 12),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);

    // Sun disc on the horizon (feeds the bloom pass).
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(18, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false })
    );
    sunDisc.position.set(-180, 26, -220);
    sunDisc.lookAt(0, 10, 0);
    this.scene.add(sunDisc);

    // Ground.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF * 2 + 80, ARENA_HALF * 2 + 80),
      new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Arena walls: concrete barriers with warning stripes.
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.8 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xff8a00, roughness: 0.5, emissive: 0x663300, emissiveIntensity: 0.5
    });
    const wallGeo = new THREE.BoxGeometry(ARENA_HALF * 2 + 8, 3, 2);
    const stripeGeo = new THREE.BoxGeometry(ARENA_HALF * 2 + 8, 0.5, 2.06);
    for (const [x, z, ry] of [
      [0, -ARENA_HALF - 1, 0], [0, ARENA_HALF + 1, 0],
      [-ARENA_HALF - 1, 0, Math.PI / 2], [ARENA_HALF + 1, 0, Math.PI / 2]
    ]) {
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, 1.5, z);
      wall.rotation.y = ry;
      wall.castShadow = true; wall.receiveShadow = true;
      this.scene.add(wall);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(x, 2.4, z);
      stripe.rotation.y = ry;
      this.scene.add(stripe);
    }

    // Ramps (visual wedges matching the physics slabs).
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x9a4a1f, roughness: 0.7, metalness: 0.1 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x996600, emissiveIntensity: 0.6 });
    for (const r of RAMPS) {
      const group = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.8, r.l), rampMat);
      const tilt = Math.atan2(r.h, r.l);
      slab.rotation.x = -tilt;
      slab.position.y = r.h / 2 - 0.15;
      slab.castShadow = true; slab.receiveShadow = true;
      group.add(slab);
      // glowing lip at the top edge
      const lip = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.22, 0.5), edgeMat);
      lip.position.set(0, r.h - 0.1, -r.l / 2 + 0.4);
      lip.rotation.x = -tilt;
      group.add(lip);
      group.position.set(r.x, 0, r.z);
      group.rotation.y = r.ry;
      this.scene.add(group);
    }

    // Corner light towers with glowing heads (bloom candy).
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x22222c, roughness: 0.6 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xaad4ff });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 18, 8), poleMat);
      pole.position.set(x * (ARENA_HALF - 6), 9, z * (ARENA_HALF - 6));
      pole.castShadow = true;
      this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 1.2), lampMat);
      lamp.position.set(x * (ARENA_HALF - 6), 18.2, z * (ARENA_HALF - 6));
      lamp.lookAt(0, 0, 0);
      this.scene.add(lamp);
    }
  }

  /* ---------- truck model ---------- */

  buildTruck(spec, paintHex) {
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color: new THREE.Color(paintHex || spec.baseColor),
      roughness: 0.35, metalness: 0.55
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.7, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.9 });

    // Chassis shell (slightly wedge-shaped for attitude).
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 3.9), paint);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.1), paint);
    hood.position.set(0, 1.1, 1.35);
    hood.castShadow = true;
    group.add(hood);
    // Cab + windshield.
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.7), dark);
    cab.position.set(0, 1.55, -0.35);
    cab.castShadow = true;
    group.add(cab);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.1), glass);
    shield.position.set(0, 1.6, 0.55);
    shield.rotation.x = -0.28;
    group.add(shield);
    // Exhaust stacks with glowing tips.
    const stackGeo = new THREE.CylinderGeometry(0.09, 0.12, 1.1, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff6a00 });
    for (const sx of [-0.9, 0.9]) {
      const stack = new THREE.Mesh(stackGeo, dark);
      stack.position.set(sx, 1.9, -1.1);
      group.add(stack);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), tipMat);
      tip.position.set(sx, 2.45, -1.1);
      group.add(tip);
    }
    // Roll bar + rear flag-style wing.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.18), dark);
    bar.position.set(0, 2.15, -1.15);
    group.add(bar);

    // Wheels: big cylinders with hub caps, attached separately so they
    // can follow the raycast suspension.
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.95 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xcfcfd8, roughness: 0.3, metalness: 0.8 });
    const wheels = [];
    for (let i = 0; i < 4; i++) {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.55, 18), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.57, 10), hubMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wheels.push(wg);
      this.scene.add(wg);
    }

    this.scene.add(group);
    return { group, wheels, paintMat: paint };
  }

  removeTruck(model) {
    this.scene.remove(model.group);
    for (const w of model.wheels) this.scene.remove(w);
  }

  /* ---------- crushable cars ---------- */

  buildCar(colorHex) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.15, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 1.2), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 1.05), glassMat);
    top.position.set(-0.1, 1.0, 0);
    top.castShadow = true;
    group.add(top);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.9 });
    for (const [x, z] of [[-0.7, 0.62], [0.7, 0.62], [-0.7, -0.62], [0.7, -0.62]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 10), tireMat);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 0.26, z);
      group.add(t);
    }
    this.scene.add(group);
    return group;
  }

  /* ---------- dust particles ---------- */

  _buildDust() {
    this.dust = [];
    const geo = new THREE.SphereGeometry(0.22, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xb9a071, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.visible = false;
      this.scene.add(m);
      this.dust.push({ mesh: m, life: 0, vel: new THREE.Vector3() });
    }
  }

  puff(pos, count, spread = 3.2, dark = false) {
    let spawned = 0;
    for (const p of this.dust) {
      if (spawned >= count) break;
      if (p.life > 0) continue;
      p.life = 0.6 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.position.y += 0.3;
      p.mesh.material.color.setHex(dark ? 0x5a4a30 : 0xb9a071);
      p.vel.set((Math.random() - 0.5) * spread, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * spread);
      spawned++;
    }
  }

  updateDust(dt) {
    for (const p of this.dust) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= 4 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const k = p.life / p.maxLife;
      p.mesh.scale.setScalar(0.6 + (1 - k) * 2.2);
      p.mesh.material.opacity = 0.55 * k;
    }
  }

  /* ---------- chase camera ---------- */

  updateCamera(truckPos, forwardDir, dt, speed) {
    // Sit behind and above the truck, pull back a little with speed.
    const back = 9 + Math.min(4, speed * 0.05);
    const target = new THREE.Vector3(
      truckPos.x - forwardDir.x * back,
      truckPos.y + 4.6,
      truckPos.z - forwardDir.z * back
    );
    this._camPos.lerp(target, Math.min(1, dt * 4.2));
    this.camera.position.copy(this._camPos);
    if (this.shake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.0005, dt);
    } else this.shake = 0;
    this.camera.lookAt(truckPos.x, truckPos.y + 1.4, truckPos.z);
  }

  addShake(v) { this.shake = Math.min(1.4, this.shake + v); }

  render() {
    this.composer.render();
  }
}

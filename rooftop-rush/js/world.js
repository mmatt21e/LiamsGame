/*
 * Scene shell: renderer, dusk lighting, fog, skyline backdrop, camera
 * rig and particle bursts. The moving world lives in track.js — this
 * file is everything that stays put around it.
 */

import * as THREE from 'three';

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#141228');    // deep dusk zenith
  grad.addColorStop(0.5, '#3a2a55');
  grad.addColorStop(0.78, '#b25327'); // burning horizon
  grad.addColorStop(1, '#e88a3a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skylineTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 256);
  let x = 0;
  while (x < 1024) {
    const w = 30 + Math.random() * 70;
    const h = 60 + Math.random() * 160;
    g.fillStyle = '#191627';
    g.fillRect(x, 256 - h, w, h);
    g.fillStyle = 'rgba(255, 200, 120, 0.85)';
    for (let wy = 256 - h + 6; wy < 246; wy += 12) {
      for (let wx = x + 4; wx < x + w - 4; wx += 10) {
        if (Math.random() < 0.28) g.fillRect(wx, wy, 3, 5);
      }
    }
    x += w + 4 + Math.random() * 16;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x3a2a45, 45, 165);

    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 600);
    this.camera.position.set(0, 4.4, 7.5);
    this.camera.lookAt(0, 1.6, -10);

    // Dusk sun + fill.
    this.scene.add(new THREE.HemisphereLight(0x9a8ac8, 0x453522, 0.75));
    const sun = new THREE.DirectionalLight(0xffb070, 2.5);
    sun.position.set(-24, 30, -18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 30, bottom: -12, near: 2, far: 90 });
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    // Sky dome + sun disc.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(420, 24, 12),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd9a8, fog: false })
    );
    disc.position.set(-120, 34, -330);
    disc.lookAt(0, 4, 0);
    this.scene.add(disc);

    // Distant skyline strips (backdrop planes, fog fades them in).
    const skyTex = skylineTexture();
    for (const [x, z, w, ry] of [
      [0, -230, 480, 0],
      [-160, -120, 380, Math.PI / 2.4],
      [160, -120, 380, -Math.PI / 2.4]
    ]) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 90),
        new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, fog: false })
      );
      strip.position.set(x, 24, z);
      strip.rotation.y = ry;
      this.scene.add(strip);
    }

    // Particle pool (coin sparks, crash debris, landing dust).
    this.parts = [];
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffc63d, transparent: true }));
      m.visible = false;
      this.scene.add(m);
      this.parts.push({ mesh: m, life: 0, vel: new THREE.Vector3() });
    }

    this.shake = 0;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Slightly wider FOV on tall/portrait screens so the lanes fit.
    this.camera.fov = h > w ? 74 : 64;
    this.camera.updateProjectionMatrix();
  }

  burst(x, y, z, color, count = 8, spread = 3) {
    let n = 0;
    for (const p of this.parts) {
      if (n >= count) break;
      if (p.life > 0) continue;
      p.life = p.maxLife = 0.5 + Math.random() * 0.3;
      p.mesh.visible = true;
      p.mesh.material.color.setHex(color);
      p.mesh.position.set(x, y, z);
      p.vel.set((Math.random() - 0.5) * spread, 2 + Math.random() * 2.5, (Math.random() - 0.5) * spread);
      n++;
    }
  }

  update(dt, runnerX, speed) {
    // Camera tracks the runner's lane with a soft lag + subtle speed lean.
    const targetX = runnerX * 0.62;
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, dt * 6);
    this.camera.position.y = 4.4 + Math.sin(performance.now() * 0.002) * 0.04;
    if (this.shake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.001, dt);
    }
    this.camera.lookAt(runnerX * 0.7, 1.5, -12);

    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= 7 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = p.life / p.maxLife;
    }
  }

  addShake(v) { this.shake = Math.min(0.8, this.shake + v); }

  render() { this.renderer.render(this.scene, this.camera); }
}

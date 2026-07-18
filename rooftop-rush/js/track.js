/*
 * Procedural endless track: environment segments (subway ↔ rooftop blocks),
 * pooled obstacles, coins and power-ups.
 *
 * Coordinate scheme: the runner stays at world z=0 facing -z. Everything
 * else lives inside `this.group`, whose position.z equals the total
 * distance run. A feature placed at local z = -d therefore passes the
 * runner exactly when the distance counter reaches d. Recycled objects
 * are simply re-placed at a bigger d — classic object pooling.
 */

import * as THREE from 'three';
import { LANE_X } from './runner.js';

const SEG_LEN = 30;
const BLOCK = 240;              // metres per theme block (subway → rooftop → …)
const LOOKAHEAD = 190;          // spawn this far ahead
const BEHIND = 35;              // recycle once this far behind

export function themeAt(d) {
  return Math.floor(d / BLOCK) % 2 === 0 ? 'subway' : 'rooftop';
}

/* ---------- shared materials / textures ---------- */

function windowsTexture(lit = 0.35) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1826';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 10) {
    for (let x = 4; x < 60; x += 8) {
      g.fillStyle = Math.random() < lit ? (Math.random() < 0.5 ? '#ffc873' : '#9fd8ff') : '#242236';
      g.fillRect(x, y, 5, 6);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function concreteMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.03 });
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.mats = {
      ballast: concreteMat(0x35323e),
      rail: new THREE.MeshStandardMaterial({ color: 0x9fa4b8, roughness: 0.35, metalness: 0.9 }),
      sleeper: concreteMat(0x4a4436),
      platform: concreteMat(0x6a6a74),
      platformEdge: new THREE.MeshStandardMaterial({ color: 0xd8c437, roughness: 0.6 }),
      wall: concreteMat(0x2c2a38),
      roof: concreteMat(0x7d7a84),
      parapet: concreteMat(0x5c5964),
      gravel: concreteMat(0x6d6a72),
      train: new THREE.MeshStandardMaterial({ color: 0xb8402e, roughness: 0.4, metalness: 0.6 }),
      trainFace: new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.5 }),
      barrier: new THREE.MeshStandardMaterial({ color: 0xd87f1f, roughness: 0.55 }),
      barrierStripe: new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.55 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8f95a5, roughness: 0.45, metalness: 0.7 }),
      duct: new THREE.MeshStandardMaterial({ color: 0x74889a, roughness: 0.5, metalness: 0.6 }),
      tank: new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.8 }),
      coin: new THREE.MeshStandardMaterial({ color: 0xffc63d, roughness: 0.25, metalness: 0.85, emissive: 0x6b4a00, emissiveIntensity: 0.5 }),
      magnet: new THREE.MeshStandardMaterial({ color: 0x35d0c0, roughness: 0.3, metalness: 0.6, emissive: 0x0e5a52, emissiveIntensity: 0.8 }),
      shield: new THREE.MeshStandardMaterial({ color: 0xffb13d, roughness: 0.3, metalness: 0.6, emissive: 0x7a4a00, emissiveIntensity: 0.8 }),
      pit: new THREE.MeshBasicMaterial({ color: 0x05050a }),
      windowsA: new THREE.MeshBasicMaterial({ map: windowsTexture(0.4) }),
      windowsB: new THREE.MeshBasicMaterial({ map: windowsTexture(0.25) }),
      signal: new THREE.MeshBasicMaterial({ color: 0x39ff6a })
    };

    this._buildSegmentPools();
    this._buildObstaclePools();
    this.reset();
  }

  /* ================= environment segments ================= */

  _buildSegmentPools() {
    this.segments = [];
    for (let i = 0; i < 9; i++) this.segments.push(this._makeSegment('subway'));
    for (let i = 0; i < 9; i++) this.segments.push(this._makeSegment('rooftop'));
  }

  _makeSegment(theme) {
    const g = new THREE.Group();
    g.visible = false;
    this.group.add(g);

    if (theme === 'subway') {
      // Track bed.
      const bed = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.3, SEG_LEN), this.mats.ballast);
      bed.position.y = -0.15;
      bed.receiveShadow = true;
      g.add(bed);
      // Rails + sleepers per lane.
      for (const lx of LANE_X) {
        for (const off of [-0.55, 0.55]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, SEG_LEN), this.mats.rail);
          rail.position.set(lx + off, 0.06, 0);
          g.add(rail);
        }
        for (let z = -SEG_LEN / 2 + 1; z < SEG_LEN / 2; z += 2.2) {
          const sl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.32), this.mats.sleeper);
          sl.position.set(lx, 0.01, z);
          g.add(sl);
        }
      }
      // Side platforms with yellow safety line.
      for (const side of [-1, 1]) {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, SEG_LEN), this.mats.platform);
        plat.position.set(side * 6.3, 0.5, 0);
        plat.receiveShadow = true; plat.castShadow = true;
        g.add(plat);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, SEG_LEN), this.mats.platformEdge);
        edge.position.set(side * 4.8, 1.03, 0);
        g.add(edge);
        // Tunnel wall above the platform.
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, SEG_LEN), this.mats.wall);
        wall.position.set(side * 8.6, 3.5, 0);
        g.add(wall);
        // Columns.
        for (let z = -SEG_LEN / 2 + 4; z < SEG_LEN / 2; z += 10) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), this.mats.wall);
          col.position.set(side * 5.2, 2.5, z);
          col.castShadow = true;
          g.add(col);
        }
        // Signal light.
        const sig = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.mats.signal);
        sig.position.set(side * 5.2, 3.4, -SEG_LEN / 2 + 4);
        g.add(sig);
      }
    } else {
      // Rooftop slab with gravel strip.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, SEG_LEN), this.mats.roof);
      roof.position.y = -0.25;
      roof.receiveShadow = true;
      g.add(roof);
      const gravel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.04, SEG_LEN * 0.94), this.mats.gravel);
      gravel.position.y = 0.02;
      gravel.receiveShadow = true;
      g.add(gravel);
      // Parapets.
      for (const side of [-1, 1]) {
        const par = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, SEG_LEN), this.mats.parapet);
        par.position.set(side * 4.85, 0.45, 0);
        par.castShadow = true;
        g.add(par);
      }
      // Neighbouring buildings (window walls) flanking the roof, lower down.
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(8, 26, SEG_LEN * 0.96),
          [this.mats.wall, this.mats.wall,
           this.mats.wall, this.mats.wall,
           side < 0 ? this.mats.windowsA : this.mats.windowsB,
           side < 0 ? this.mats.windowsB : this.mats.windowsA]
        );
        b.position.set(side * 10.5, -14, 0);
        g.add(b);
      }
      // Roof props at the edges (outside lanes, non-colliding).
      const sky = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.8), this.mats.metal);
      sky.position.set(3.9, 0.25, -SEG_LEN / 4);
      sky.castShadow = true;
      g.add(sky);
      const tank = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), this.mats.tank);
      barrel.position.y = 2.1;
      barrel.castShadow = true;
      tank.add(barrel);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.6, 10), this.mats.tank);
      cone.position.y = 3.2;
      tank.add(cone);
      for (const [lx, lz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), this.mats.metal);
        leg.position.set(lx, 0.7, lz);
        tank.add(leg);
      }
      tank.position.set(-3.9, 0, SEG_LEN / 4);
      g.add(tank);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3.4, 6), this.mats.metal);
      antenna.position.set(3.8, 1.7, SEG_LEN / 2 - 3);
      g.add(antenna);
    }
    return { group: g, theme, endD: -1 };
  }

  _placeSegment(index) {
    const theme = themeAt(index * SEG_LEN + 1);
    const seg = this.segments.find((s) => s.theme === theme && s.endD <= this.distance - BEHIND) ||
                this.segments.find((s) => s.theme === theme && !s.group.visible);
    if (!seg) return; // pool exhausted (shouldn't happen with 9 per theme)
    seg.group.visible = true;
    seg.group.position.z = -(index * SEG_LEN + SEG_LEN / 2);
    seg.endD = (index + 1) * SEG_LEN;
  }

  /* ================= obstacles / pickups ================= */

  _buildObstaclePools() {
    this.obstacles = [];   // { mesh, kind, lane, d, len, active }
    this.coins = [];
    this.powerups = [];

    const mk = (builder, kind, count) => {
      for (let i = 0; i < count; i++) {
        const mesh = builder();
        mesh.visible = false;
        this.group.add(mesh);
        this.obstacles.push({ mesh, kind, lane: 0, d: 0, len: 2, active: false });
      }
    };

    // Subway train — dodge only.
    mk(() => {
      const t = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.9, 15), this.mats.train);
      body.position.y = 1.55;
      body.castShadow = true;
      t.add(body);
      const face = new THREE.Mesh(new THREE.BoxGeometry(2.06, 1.0, 15.02), this.mats.trainFace);
      face.position.y = 1.9;
      t.add(face);
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
      light.position.set(0, 0.9, 7.6);
      t.add(light);
      return t;
    }, 'train', 5);

    // Low barrier — jump it.
    mk(() => {
      const b = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 0.25), this.mats.barrier);
      bar.position.y = 0.65;
      bar.castShadow = true;
      b.add(bar);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.26), this.mats.barrierStripe);
      stripe.position.y = 0.65;
      b.add(stripe);
      for (const s of [-0.8, 0.8]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), this.mats.metal);
        leg.position.set(s, 0.32, 0);
        b.add(leg);
      }
      return b;
    }, 'low', 8);

    // Overhead sign / duct — slide under it.
    mk(() => {
      const b = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.6), this.mats.duct);
      bar.position.y = 1.75;
      bar.castShadow = true;
      b.add(bar);
      for (const s of [-0.9, 0.9]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.25, 0.09), this.mats.metal);
        leg.position.set(s, 0.62, 0);
        b.add(leg);
      }
      return b;
    }, 'high', 8);

    // AC unit — jump or dodge.
    mk(() => {
      const b = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 1.5), this.mats.metal);
      box.position.y = 0.5;
      box.castShadow = true;
      b.add(box);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), this.mats.trainFace);
      fan.position.y = 1.06;
      b.add(fan);
      return b;
    }, 'ac', 8);

    // Water tower / chimney block — dodge only.
    mk(() => {
      const b = new THREE.Group();
      const stack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.2, 1.9), this.mats.tank);
      stack.position.y = 1.6;
      stack.castShadow = true;
      b.add(stack);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 2.1), this.mats.parapet);
      rim.position.y = 3.2;
      b.add(rim);
      return b;
    }, 'block', 6);

    // Roof gap — spans all lanes, must be jumped.
    mk(() => {
      const b = new THREE.Group();
      const pit = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.1, 5.2), this.mats.pit);
      pit.position.y = -0.28;
      b.add(pit);
      // Street glow far below.
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6),
        new THREE.MeshBasicMaterial({ color: 0x3a2c14 }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -0.26;
      b.add(glow);
      for (const s of [-1, 1]) {
        const lip = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.5, 0.4), this.mats.parapet);
        lip.position.set(0, -0.05, s * 2.7);
        b.add(lip);
      }
      return b;
    }, 'gap', 4);

    // Coins.
    const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14);
    for (let i = 0; i < 90; i++) {
      const c = new THREE.Mesh(coinGeo, this.mats.coin);
      c.rotation.z = Math.PI / 2;
      c.visible = false;
      this.group.add(c);
      this.coins.push({ mesh: c, active: false, d: 0, lane: 0, y: 1, taken: false });
    }

    // Power-ups.
    for (const kind of ['magnet', 'magnet', 'shield', 'shield']) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0),
        kind === 'magnet' ? this.mats.magnet : this.mats.shield);
      p.visible = false;
      this.group.add(p);
      this.powerups.push({ mesh: p, kind, active: false, d: 0, lane: 1 });
    }
  }

  /* ================= run lifecycle ================= */

  reset() {
    this.distance = 0;
    this.group.position.z = 0;
    for (const s of this.segments) { s.group.visible = false; s.endD = -1; }
    for (const o of this.obstacles) { o.active = false; o.mesh.visible = false; }
    for (const c of this.coins) { c.active = false; c.mesh.visible = false; }
    for (const p of this.powerups) { p.active = false; p.mesh.visible = false; }
    this.nextSegIndex = 0;
    this.nextObstacleD = 45;      // first obstacle comes at 45 m
    this.nextPowerD = 300;
    this.lastTheme = 'subway';
    // Pre-place the visible segments.
    while (this.nextSegIndex * SEG_LEN < LOOKAHEAD) {
      this._placeSegment(this.nextSegIndex++);
    }
  }

  _takeObstacle(kind) {
    return this.obstacles.find((o) => o.kind === kind && !o.active) || null;
  }

  _spawnObstacleWave(d, theme, speed) {
    // Pick a pattern; harder mixes appear as the run gets longer.
    const openLane = Math.floor(Math.random() * 3);
    const hard = Math.min(0.6, d / 4000);
    const roll = Math.random();

    const place = (kind, lane, len = 2) => {
      const o = this._takeObstacle(kind);
      if (!o) return;
      o.active = true;
      o.lane = lane;
      o.d = d;
      o.len = len;
      o.mesh.visible = true;
      o.mesh.position.set(kind === 'gap' ? 0 : LANE_X[lane], 0, -d);
    };

    if (theme === 'rooftop' && roll < 0.22) {
      place('gap', 1, 5.2);                       // full-width gap — jump!
      this._coinArc(d, openLane);
    } else if (roll < 0.45) {
      // Two lanes blocked by the big one, one lane free.
      const big = theme === 'subway' ? 'train' : 'block';
      for (let l = 0; l < 3; l++) if (l !== openLane) place(big, l, theme === 'subway' ? 15 : 2);
      this._coinRow(d - 6, openLane, 6, 1);
    } else if (roll < 0.7) {
      // Jump + slide combo across lanes.
      place('low', openLane);
      place('high', (openLane + 1) % 3);
      if (hard > 0.25) place(theme === 'subway' ? 'train' : 'block', (openLane + 2) % 3, theme === 'subway' ? 15 : 2);
      this._coinArc(d, openLane);
    } else {
      // Single-lane hazards staggered.
      const kinds = theme === 'subway' ? ['low', 'high', 'low'] : ['ac', 'high', 'ac'];
      for (let l = 0; l < 3; l++) {
        if (l === openLane && hard < 0.4) continue;
        place(kinds[l], l);
      }
      this._coinRow(d + 8, openLane, 5, 1);
    }
  }

  _coinRow(d, lane, count, y) {
    for (let i = 0; i < count; i++) {
      const c = this.coins.find((x) => !x.active);
      if (!c) return;
      c.active = true; c.taken = false;
      c.lane = lane; c.d = d + i * 1.7; c.y = y;
      c.mesh.visible = true;
      c.mesh.position.set(LANE_X[lane], y, -c.d);
      c.mesh.scale.setScalar(1);
    }
  }

  _coinArc(d, lane) {
    // Arc that traces a jump over the obstacle at distance d.
    for (let i = 0; i < 7; i++) {
      const c = this.coins.find((x) => !x.active);
      if (!c) return;
      const t = i / 6;
      c.active = true; c.taken = false;
      c.lane = lane;
      c.d = d - 5 + t * 10;
      c.y = 0.9 + Math.sin(t * Math.PI) * 1.5;
      c.mesh.visible = true;
      c.mesh.position.set(LANE_X[lane], c.y, -c.d);
      c.mesh.scale.setScalar(1);
    }
  }

  /*
   * Advance the world. Returns an array of event objects for main.js:
   * {type:'coin'|'crash'|'fall'|'power'|'theme', ...}
   */
  update(dt, speed, runner, magnetActive) {
    const events = [];
    this.distance += speed * dt;
    this.group.position.z = this.distance;

    // Theme change announcements.
    const theme = themeAt(this.distance);
    if (theme !== this.lastTheme) {
      this.lastTheme = theme;
      events.push({ type: 'theme', name: theme });
    }

    // Keep segments streaming ahead.
    while (this.nextSegIndex * SEG_LEN < this.distance + LOOKAHEAD) {
      this._placeSegment(this.nextSegIndex++);
    }
    for (const s of this.segments) {
      if (s.group.visible && s.endD < this.distance - BEHIND) s.group.visible = false;
    }

    // Spawn obstacle waves ahead.
    while (this.nextObstacleD < this.distance + LOOKAHEAD) {
      const t = themeAt(this.nextObstacleD);
      // Skip the first metres of each block so theme changes stay fair.
      if (this.nextObstacleD % BLOCK > 18) this._spawnObstacleWave(this.nextObstacleD, t, speed);
      const interval = Math.max(13, 26 - this.distance * 0.004);
      this.nextObstacleD += interval + Math.random() * 6;
    }

    // Power-ups.
    if (this.nextPowerD < this.distance + LOOKAHEAD) {
      const p = this.powerups.find((x) => !x.active);
      if (p) {
        p.active = true;
        p.lane = Math.floor(Math.random() * 3);
        p.d = this.nextPowerD;
        p.mesh.visible = true;
        p.mesh.position.set(LANE_X[p.lane], 1.25, -p.d);
      }
      this.nextPowerD += 320 + Math.random() * 120;
    }

    /* ----- collisions & pickups (runner is at world z = 0) ----- */
    const rx = runner.x;
    const rLane = runner.lane;

    let overGap = false;
    for (const o of this.obstacles) {
      if (!o.active) continue;
      const rel = this.distance - o.d;      // >0 once passed
      if (rel > BEHIND) { o.active = false; o.mesh.visible = false; continue; }
      const half = o.len / 2;
      if (rel < -half - 1 || rel > half + 1) continue;

      if (o.kind === 'gap') {
        if (Math.abs(rel) < half - 0.4) {
          overGap = true;
          if (runner.y <= 0.05 && !runner.dead) events.push({ type: 'fall' });
        }
        continue;
      }
      if (o.lane !== rLane || Math.abs(LANE_X[o.lane] - rx) > 1.05) continue;
      if (Math.abs(rel) > half + 0.45) continue;
      // Vertical clearance by kind.
      let hit = false;
      if (o.kind === 'low') hit = runner.y < 0.55;
      else if (o.kind === 'ac') hit = runner.y < 0.75;
      else if (o.kind === 'high') hit = !runner.isSliding;
      else hit = true; // train / block: no way over or under
      if (hit && !runner.dead) events.push({ type: 'crash', kind: o.kind });
    }
    if (overGap) events.push({ type: 'over-gap' });

    for (const c of this.coins) {
      if (!c.active) continue;
      const rel = this.distance - c.d;
      if (rel > BEHIND) { c.active = false; c.mesh.visible = false; continue; }
      c.mesh.rotation.y += dt * 5;
      // Magnet pulls coins ahead of the runner toward them.
      if (magnetActive && rel > -8 && rel < 1) {
        const target = new THREE.Vector3(rx, runner.y + 1, -this.distance);
        c.mesh.position.lerp(target, Math.min(1, dt * 9));
        c.y = c.mesh.position.y;
      }
      if (Math.abs(rel) < 1.0 &&
          Math.abs(c.mesh.position.x - rx) < (magnetActive ? 2.4 : 1.05) &&
          Math.abs(c.y - (runner.y + 1)) < 1.35) {
        c.active = false; c.mesh.visible = false;
        events.push({ type: 'coin', x: rx, y: c.y });
      }
    }

    for (const p of this.powerups) {
      if (!p.active) continue;
      const rel = this.distance - p.d;
      if (rel > BEHIND) { p.active = false; p.mesh.visible = false; continue; }
      p.mesh.rotation.y += dt * 3;
      p.mesh.position.y = 1.25 + Math.sin(this.distance * 0.5 + p.d) * 0.15;
      if (Math.abs(rel) < 1.1 && p.lane === rLane) {
        p.active = false; p.mesh.visible = false;
        events.push({ type: 'power', kind: p.kind });
      }
    }

    return events;
  }
}

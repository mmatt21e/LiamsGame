/*
 * Canvas renderer: themed terrain tiles, objects, particles, the truck,
 * camera follow and (optional) screen shake. All artwork is procedural.
 */

import { drawVehicle } from './vehicle.js';

const MAX_PARTICLES = 240;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1;
    this.shake = 0;
    this.particles = [];
    this.time = 0;
    this._resizeBound = () => this.resize();
    window.addEventListener('resize', this._resizeBound);
    this.resize();
  }

  destroy() {
    window.removeEventListener('resize', this._resizeBound);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.viewW = w;
    this.viewH = h;
    // Show roughly 11 tiles across on any screen.
    this.zoom = Math.max(0.55, Math.min(1.4, Math.min(w, h) / 620));
  }

  snapTo(x, y) {
    this.camX = x;
    this.camY = y;
  }

  addShake(amount, enabled) {
    if (enabled) this.shake = Math.min(18, this.shake + amount);
  }

  spawn(kind, x, y, opts = {}) {
    if (this.particles.length > MAX_PARTICLES) return;
    const n = opts.count || 6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 80) * (0.4 + Math.random() * 0.8);
      this.particles.push({
        kind,
        x, y,
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        life: opts.life || 0.6,
        maxLife: opts.life || 0.6,
        size: (opts.size || 6) * (0.6 + Math.random() * 0.8),
        color: opts.color || '#c9b28a'
      });
    }
  }

  confetti(x, y) {
    const colors = ['#ff5da2', '#ffd23f', '#3ddc84', '#4fc3f7', '#ff6b1a'];
    for (let i = 0; i < 40; i++) {
      if (this.particles.length > MAX_PARTICLES + 60) break;
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        kind: 'confetti', x, y,
        vx: Math.cos(a) * 220 * Math.random(),
        vy: Math.sin(a) * 220 * Math.random() - 120,
        life: 1.4, maxLife: 1.4,
        size: 5 + Math.random() * 5,
        color: colors[i % colors.length]
      });
    }
  }

  render(track, v, vehicleDef, custom, opts, dt) {
    const ctx = this.ctx;
    this.time += dt;

    // Camera: smooth follow, slightly ahead of the truck.
    const lookAhead = 60;
    const tx = v.x + Math.cos(v.angle) * lookAhead;
    const ty = v.y + Math.sin(v.angle) * lookAhead;
    const lerp = Math.min(1, dt * 5);
    this.camX += (tx - this.camX) * lerp;
    this.camY += (ty - this.camY) * lerp;

    if (this.shake > 0.2) this.shake *= Math.pow(0.001, dt);
    else this.shake = 0;
    const shX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shY = this.shake ? (Math.random() - 0.5) * this.shake : 0;

    const scale = this.dpr * this.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = track.theme.sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale,
      this.canvas.width / 2 - (this.camX + shX) * scale,
      this.canvas.height / 2 - (this.camY + shY) * scale);

    this._drawTerrain(track);
    this._drawObjects(track);
    this._drawParticles(dt, 'under');
    this._drawTruck(track, v, vehicleDef, custom, opts);
    this._drawParticles(dt, 'over');
  }

  _visibleRange(track) {
    const halfW = this.viewW / 2 / this.zoom + track.tileSize;
    const halfH = this.viewH / 2 / this.zoom + track.tileSize;
    return {
      x0: Math.max(0, Math.floor((this.camX - halfW) / track.tileSize)),
      x1: Math.min(track.cols - 1, Math.ceil((this.camX + halfW) / track.tileSize)),
      y0: Math.max(0, Math.floor((this.camY - halfH) / track.tileSize)),
      y1: Math.min(track.rows - 1, Math.ceil((this.camY + halfH) / track.tileSize))
    };
  }

  _drawTerrain(track) {
    const ctx = this.ctx;
    const ts = track.tileSize;
    const th = track.theme;
    const r = this._visibleRange(track);

    for (let cy = r.y0; cy <= r.y1; cy++) {
      for (let cx = r.x0; cx <= r.x1; cx++) {
        const ch = track.base[cy][cx];
        const x = cx * ts, y = cy * ts;
        const seed = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;

        switch (ch) {
          case '#': {
            ctx.fillStyle = th.wall;
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = th.wallTop;
            ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
            break;
          }
          case '.': {
            ctx.fillStyle = th.ground;
            ctx.fillRect(x, y, ts, ts);
            // Sparse deterministic doodads.
            if (seed % 7 === 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.18)';
              ctx.beginPath();
              ctx.arc(x + (seed % ts), y + ((seed >> 3) % ts), 3, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
          case 'M': {
            ctx.fillStyle = '#4e3a20';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = '#3c2c16';
            ctx.beginPath();
            ctx.arc(x + (seed % ts), y + ((seed >> 4) % ts), 8, 0, Math.PI * 2);
            ctx.arc(x + ((seed >> 2) % ts), y + ((seed >> 6) % ts), 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'S': {
            ctx.fillStyle = '#e0c078';
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = 'rgba(160,120,60,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y + ts * 0.3 + (seed % 12));
            ctx.quadraticCurveTo(x + ts / 2, y + ts * 0.2 + (seed % 12), x + ts, y + ts * 0.35 + (seed % 12));
            ctx.stroke();
            break;
          }
          case 'I': {
            ctx.fillStyle = '#bfe6f5';
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + (seed % ts), y + 6);
            ctx.lineTo(x + ((seed >> 3) % ts), y + ts - 6);
            ctx.stroke();
            break;
          }
          case 'B': {
            ctx.fillStyle = th.road;
            ctx.fillRect(x, y, ts, ts);
            // Animated chevrons.
            const pulse = (this.time * 2) % 1;
            ctx.fillStyle = `rgba(80,255,160,${0.5 + 0.4 * Math.sin(pulse * Math.PI * 2)})`;
            for (let i = 0; i < 2; i++) {
              const ox = x + 14 + i * 22;
              ctx.beginPath();
              ctx.moveTo(ox, y + 12);
              ctx.lineTo(ox + 14, y + ts / 2);
              ctx.lineTo(ox, y + ts - 12);
              ctx.lineTo(ox + 6, y + ts / 2);
              ctx.closePath();
              ctx.fill();
            }
            break;
          }
          case 'J': {
            ctx.fillStyle = th.road;
            ctx.fillRect(x, y, ts, ts);
            const grad = ctx.createLinearGradient(x, y, x + ts, y);
            grad.addColorStop(0, 'rgba(0,0,0,0.35)');
            grad.addColorStop(1, 'rgba(255,255,255,0.3)');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 4, y + 8, ts - 8, ts - 16);
            ctx.fillStyle = '#ffd23f';
            ctx.fillRect(x + 4, y + 8, ts - 8, 4);
            ctx.fillRect(x + 4, y + ts - 12, ts - 8, 4);
            break;
          }
          case 'Z': {
            ctx.fillStyle = th.road;
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = 'rgba(180,60,200,0.4)';
            ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('~', x + ts / 2, y + ts / 2 + 7);
            break;
          }
          case 'F': {
            const check = 8;
            for (let iy = 0; iy < ts / check; iy++) {
              for (let ix = 0; ix < ts / check; ix++) {
                ctx.fillStyle = (ix + iy) % 2 === 0 ? '#f5f5f5' : '#141414';
                ctx.fillRect(x + ix * check, y + iy * check, check, check);
              }
            }
            break;
          }
          case 'K': {
            ctx.fillStyle = th.road;
            ctx.fillRect(x, y, ts, ts);
            const hit = track.checkpoints.some((cp) => cp.hit && cp.cells.some((c) => c.cx === cx && c.cy === cy));
            ctx.fillStyle = hit ? 'rgba(61,220,132,0.55)' : 'rgba(255,210,63,0.5)';
            ctx.fillRect(x, y + ts * 0.35, ts, ts * 0.3);
            ctx.fillStyle = hit ? '#0a5' : '#a70';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(hit ? '✓' : '⚑', x + ts / 2, y + ts / 2 + 8);
            break;
          }
          default: {
            // R, D, 1 — road-ish.
            ctx.fillStyle = ch === 'D' ? '#96784e' : th.road;
            ctx.fillRect(x, y, ts, ts);
            // Edge lines where road meets non-road.
            ctx.fillStyle = th.roadEdge;
            if (!isRoad(track, cx, cy - 1)) ctx.fillRect(x, y, ts, 3);
            if (!isRoad(track, cx, cy + 1)) ctx.fillRect(x, y + ts - 3, ts, 3);
            if (!isRoad(track, cx - 1, cy)) ctx.fillRect(x, y, 3, ts);
            if (!isRoad(track, cx + 1, cy)) ctx.fillRect(x + ts - 3, y, 3, ts);
            break;
          }
        }
      }
    }
  }

  _drawObjects(track) {
    const ctx = this.ctx;
    for (const o of track.objects) {
      if (!o.alive && o.type !== 'cone') continue;
      if (!o.alive && o.type === 'cone' && !o.knockDx) continue;
      ctx.save();
      ctx.translate(o.x, o.y);
      switch (o.type) {
        case 'bolt': {
          const bob = Math.sin(this.time * 4 + o.x * 0.05) * 3;
          ctx.translate(0, bob);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(0, 10 - bob, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.rotate(this.time * 2);
          ctx.fillStyle = '#ffd23f';
          hexPath(ctx, 0, 0, 13);
          ctx.fill();
          ctx.strokeStyle = '#a87b00';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = '#a87b00';
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'box': {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(-20, 14, 40, 8);
          ctx.fillStyle = '#c98d4a';
          ctx.fillRect(-20, -20, 40, 40);
          ctx.strokeStyle = '#7a5122';
          ctx.lineWidth = 3;
          ctx.strokeRect(-20, -20, 40, 40);
          ctx.beginPath();
          ctx.moveTo(-20, -20); ctx.lineTo(20, 20);
          ctx.moveTo(20, -20); ctx.lineTo(-20, 20);
          ctx.stroke();
          break;
        }
        case 'cone': {
          if (!o.alive) {
            // Knocked cone slides away and fades (drawn briefly).
            o.knockT = (o.knockT || 0) + 0.05;
            if (o.knockT > 1) { o.knockDx = 0; ctx.restore(); continue; }
            ctx.globalAlpha = 1 - o.knockT;
            ctx.translate(-o.knockDx * o.knockT * 2, -o.knockDy * o.knockT * 2);
            ctx.rotate(o.knockT * 5);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff7a1a';
          ctx.beginPath();
          ctx.moveTo(0, -16); ctx.lineTo(12, 12); ctx.lineTo(-12, 12);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(-7, 0, 14, 5);
          break;
        }
        case 'tires': {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.ellipse(2, 6, 26, 22, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1d1d1d';
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3c3c3c';
          ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#111';
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'hidden': {
          const tw = 0.8 + 0.2 * Math.sin(this.time * 3);
          ctx.scale(tw, tw);
          ctx.fillStyle = '#ffd23f';
          ctx.strokeStyle = '#b8860b';
          ctx.lineWidth = 2;
          starShape(ctx, 0, 0, 18, 5);
          ctx.fill(); ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  _drawTruck(track, v, vehicleDef, custom, opts) {
    const ctx = this.ctx;

    // Shadow on the ground.
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    const shadowScale = 1 + v.z / 600;
    ctx.fillStyle = `rgba(0,0,0,${0.3 / shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32 * shadowScale, 24 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Truck body (raised by z).
    ctx.save();
    ctx.translate(v.x, v.y - v.z * 0.55);
    ctx.rotate(v.angle + (v.airborne ? v.spinWobble : 0));
    const airScale = 1 + Math.min(0.35, v.z / 500);
    const landSquash = v.justLanded > 0 ? 1 - v.justLanded * 0.25 : 1;
    ctx.scale(airScale, airScale * landSquash);
    if (v.bonkFlash > 0 && Math.floor(this.time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }
    drawVehicle(ctx, vehicleDef, custom);
    // Boost flames.
    if (v.boostTime > 0) {
      ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.random() * 100)},30,0.9)`;
      ctx.beginPath();
      ctx.moveTo(-30, -8);
      ctx.lineTo(-30 - 22 - Math.random() * 14, 0);
      ctx.lineTo(-30, 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawParticles(dt, layer) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const isOver = p.kind === 'confetti' || p.kind === 'spark';
      if ((layer === 'over') !== isOver) continue;
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'confetti') p.vy += 300 * dt;
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

const ROAD_SET = new Set(['R', 'D', 'M', 'S', 'I', 'B', 'J', 'Z', 'F', 'K', '1']);
function isRoad(track, cx, cy) {
  if (cy < 0 || cy >= track.rows || cx < 0 || cx >= track.cols) return false;
  return ROAD_SET.has(track.base[cy][cx]);
}

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starShape(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

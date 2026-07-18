/*
 * Procedural monster-truck artwork (top-down view).
 * Draws a truck centred at (0,0) facing +X. The renderer rotates/scales.
 * Also used by garage/customization screens for previews.
 */

import { customOption } from '../data/vehicles.js';

export const TRUCK_LEN = 56;
export const TRUCK_WID = 40;

export function drawVehicle(ctx, vehicleDef, custom, opts = {}) {
  const color = resolve(custom, 'colors', 'color').value || vehicleDef.body.color;
  const cab = vehicleDef.body.cab;
  const glow = resolve(custom, 'glows', 'glow').value || null;
  const wheels = custom ? custom.wheels : 'classic';
  const tires = custom ? custom.tires : 'normal';
  const decal = custom ? custom.decal : 'none';
  const accessory = custom ? custom.accessory : 'none';

  const L = TRUCK_LEN, W = TRUCK_WID;
  const wheelR = tires === 'big' ? 13 : tires === 'slick' ? 9 : 11;

  ctx.save();

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
  }

  // Wheels (4 corners).
  const wx = L * 0.32, wy = W * 0.42;
  for (const [px, py] of [[-wx, -wy], [wx, -wy], [-wx, wy], [wx, wy]]) {
    drawWheel(ctx, px, py, wheelR, wheels);
  }

  // Axles.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-wx, -wy); ctx.lineTo(-wx, wy);
  ctx.moveTo(wx, -wy); ctx.lineTo(wx, wy);
  ctx.stroke();

  // Body by shape.
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2.5;
  const shape = vehicleDef.body.shape;
  ctx.beginPath();
  if (shape === 'sleek') {
    ctx.moveTo(L / 2, 0);
    ctx.lineTo(L * 0.18, -W * 0.34);
    ctx.lineTo(-L / 2 + 4, -W * 0.3);
    ctx.lineTo(-L / 2 + 4, W * 0.3);
    ctx.lineTo(L * 0.18, W * 0.34);
    ctx.closePath();
  } else if (shape === 'chunky') {
    roundRectPath(ctx, -L / 2, -W * 0.38, L, W * 0.76, 7);
  } else {
    roundRectPath(ctx, -L / 2 + 2, -W * 0.34, L - 4, W * 0.68, 10);
  }
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (shape === 'chunky') {
    // Front bumper.
    ctx.fillStyle = '#555';
    ctx.fillRect(L / 2 - 3, -W * 0.4, 6, W * 0.8);
  }

  // Decal (drawn under the cab).
  drawDecal(ctx, decal, L, W);

  // Cab / windshield.
  ctx.fillStyle = cab;
  roundRectPath(ctx, -L * 0.05, -W * 0.22, L * 0.34, W * 0.44, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,235,255,0.85)';
  roundRectPath(ctx, L * 0.2, -W * 0.16, L * 0.09, W * 0.32, 3);
  ctx.fill();

  // Accessory.
  drawAccessory(ctx, accessory, L, W);

  ctx.restore();
}

function resolve(custom, category, field) {
  return customOption(category, custom ? custom[field] : 'default') || { value: null };
}

function drawWheel(ctx, x, y, r, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (style === 'star') {
    ctx.fillStyle = '#ffd23f';
    starPath(ctx, 0, 0, r * 0.5, 5);
    ctx.fill();
  } else if (style === 'spike') {
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
      ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15);
      ctx.stroke();
    }
  } else if (style === 'glowrim') {
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDecal(ctx, decal, L, W) {
  ctx.save();
  if (decal === 'flame') {
    ctx.fillStyle = '#ff8c00';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.42, side * W * 0.24);
      ctx.lineTo(-L * 0.1, side * W * 0.3);
      ctx.lineTo(-L * 0.28, side * W * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  } else if (decal === 'bolt') {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(-L * 0.34, -W * 0.1);
    ctx.lineTo(-L * 0.2, 0);
    ctx.lineTo(-L * 0.28, 0);
    ctx.lineTo(-L * 0.14, W * 0.12);
    ctx.lineTo(-L * 0.22, 0.5);
    ctx.lineTo(-L * 0.3, 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (decal === 'star') {
    ctx.fillStyle = '#fff';
    starPath(ctx, -L * 0.26, 0, W * 0.14, 5);
    ctx.fill();
  } else if (decal === 'stripes') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-L * 0.46, -W * 0.06, L * 0.9, W * 0.045);
    ctx.fillRect(-L * 0.46, W * 0.02, L * 0.9, W * 0.045);
  } else if (decal === 'paw') {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-L * 0.26, 0, W * 0.09, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(-L * 0.26 + W * 0.11, i * W * 0.09, W * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAccessory(ctx, accessory, L, W) {
  ctx.save();
  if (accessory === 'flag') {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-L * 0.44, 0);
    ctx.lineTo(-L * 0.6, 0);
    ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.moveTo(-L * 0.6, 0);
    ctx.lineTo(-L * 0.74, -W * 0.12);
    ctx.lineTo(-L * 0.6, -W * 0.22);
    ctx.closePath();
    ctx.fill();
  } else if (accessory === 'horns') {
    ctx.fillStyle = '#f5f0e6';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(L * 0.34, side * W * 0.2);
      ctx.lineTo(L * 0.52, side * W * 0.4);
      ctx.lineTo(L * 0.4, side * W * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  } else if (accessory === 'lightbar') {
    ctx.fillStyle = '#333';
    ctx.fillRect(L * 0.02, -W * 0.2, 5, W * 0.4);
    const colors = ['#ff5252', '#4fc3f7', '#ffd23f', '#3ddc84'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(L * 0.03, -W * 0.18 + i * W * 0.1, 3, W * 0.07);
    });
  } else if (accessory === 'wing') {
    ctx.fillStyle = '#222';
    ctx.fillRect(-L * 0.5, -W * 0.42, 6, W * 0.84);
    ctx.fillRect(-L * 0.44, -W * 0.3, 4, W * 0.6);
  }
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, cx, cy, r, points) {
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

/* Draw a preview of a truck onto a UI canvas (facing right, centred). */
export function drawVehiclePreview(canvas, vehicleDef, custom, scale = 1.6) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.translate(cssW / 2, cssH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale);
  drawVehicle(ctx, vehicleDef, custom);
  ctx.restore();
}

/*
 * Track parsing: turns a grid of tile characters into a playable world.
 * Works identically for built-in tracks and player-built tracks.
 */

import { CONFIG, TILE } from '../config.js';
import { THEMES } from '../data/tracks.js';

/* Object tiles sit on top of a base surface. */
const OBJECT_BASE = { b: 'R', X: 'R', C: 'R', T: 'R', H: '.' };

/* Surface behaviour per tile char. drag: extra slowdown 0..1, grip: 0..1. */
export const SURFACE = {
  'R': { drag: 0,    grip: 1.0 },
  'D': { drag: 0.12, grip: 0.85 },
  'M': { drag: 0.55, grip: 0.8 },
  'S': { drag: 0.4,  grip: 0.75 },
  'I': { drag: 0,    grip: 0.15 },
  'B': { drag: 0,    grip: 1.0, boost: true },
  'J': { drag: 0,    grip: 1.0, ramp: true },
  'Z': { drag: 0.5,  grip: 1.0 },
  'F': { drag: 0,    grip: 1.0 },
  'K': { drag: 0,    grip: 1.0 },
  '1': { drag: 0,    grip: 1.0 },
  '.': { drag: 0.6,  grip: 0.9, offtrack: true },   // drag scaled by difficulty
  '#': { drag: 1,    grip: 0, wall: true }
};

const ROADISH = new Set(['R', 'D', 'M', 'S', 'I', 'B', 'J', 'Z', 'F', 'K', '1']);

export function parseTrack(def) {
  const grid = def.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const ts = CONFIG.tileSize;

  const base = [];            // 2D base terrain chars
  const objects = [];
  let start = null;
  const checkpointCells = [];
  const finishCells = [];

  for (let cy = 0; cy < rows; cy++) {
    const rowChars = [];
    for (let cx = 0; cx < cols; cx++) {
      const ch = grid[cy][cx];
      const wx = (cx + 0.5) * ts;
      const wy = (cy + 0.5) * ts;
      if (ch === TILE.BOLT) {
        objects.push({ type: 'bolt', x: wx, y: wy, r: 22, alive: true });
        rowChars.push(OBJECT_BASE[ch]);
      } else if (ch === TILE.BOX) {
        objects.push({ type: 'box', x: wx, y: wy, r: 26, alive: true });
        rowChars.push(OBJECT_BASE[ch]);
      } else if (ch === TILE.CONE) {
        objects.push({ type: 'cone', x: wx, y: wy, r: 18, alive: true });
        rowChars.push(OBJECT_BASE[ch]);
      } else if (ch === TILE.TIRES) {
        objects.push({ type: 'tires', x: wx, y: wy, r: 28, alive: true });
        rowChars.push(OBJECT_BASE[ch]);
      } else if (ch === TILE.HIDDEN) {
        objects.push({ type: 'hidden', x: wx, y: wy, r: 26, alive: true });
        rowChars.push(OBJECT_BASE[ch]);
      } else if (ch === TILE.START) {
        start = { x: wx, y: wy, cx, cy };
        rowChars.push(ch);
      } else {
        if (ch === TILE.CHECKPOINT) checkpointCells.push({ cx, cy });
        if (ch === TILE.FINISH) finishCells.push({ cx, cy });
        rowChars.push(ch);
      }
    }
    base.push(rowChars);
  }

  if (!start) {
    // Defensive: custom data is validated upstream, but never crash.
    start = { x: 1.5 * ts, y: 1.5 * ts, cx: 1, cy: 1 };
  }

  // Start facing: point toward the longest run of road tiles.
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let bestDir = [1, 0];
  let bestRun = -1;
  for (const [dx, dy] of dirs) {
    let run = 0;
    for (let i = 1; i <= 4; i++) {
      const ch = charAt(base, start.cx + dx * i, start.cy + dy * i);
      if (ROADISH.has(ch)) run++;
      else break;
    }
    if (run > bestRun) { bestRun = run; bestDir = [dx, dy]; }
  }
  const startAngle = Math.atan2(bestDir[1], bestDir[0]);

  // Group touching checkpoint cells into gates (flood fill).
  const checkpoints = groupCells(checkpointCells);

  return {
    def,
    id: def.id,
    name: def.name,
    freeDrive: !!def.freeDrive,
    parSeconds: def.parSeconds || 0,
    theme: THEMES[def.theme] || THEMES.backyard,
    cols, rows,
    width: cols * ts,
    height: rows * ts,
    base,
    objects,
    start: { x: start.x, y: start.y, angle: startAngle },
    checkpoints: checkpoints.map((cells) => ({ cells, hit: false })),
    finishCells,
    tileSize: ts
  };
}

function charAt(base, cx, cy) {
  if (cy < 0 || cy >= base.length || cx < 0 || cx >= base[0].length) return '#';
  return base[cy][cx];
}

export function terrainAt(track, x, y) {
  const cx = Math.floor(x / track.tileSize);
  const cy = Math.floor(y / track.tileSize);
  return charAt(track.base, cx, cy);
}

export function surfaceAt(track, x, y) {
  return SURFACE[terrainAt(track, x, y)] || SURFACE['.'];
}

export function isWallCell(track, cx, cy) {
  return charAt(track.base, cx, cy) === '#';
}

export function cellOf(track, x, y) {
  return { cx: Math.floor(x / track.tileSize), cy: Math.floor(y / track.tileSize) };
}

function groupCells(cells) {
  const key = (c) => c.cx + ',' + c.cy;
  const remaining = new Map(cells.map((c) => [key(c), c]));
  const groups = [];
  while (remaining.size) {
    const [firstKey, first] = remaining.entries().next().value;
    remaining.delete(firstKey);
    const group = [first];
    const queue = [first];
    while (queue.length) {
      const c = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (c.cx + dx) + ',' + (c.cy + dy);
        if (remaining.has(k)) {
          const n = remaining.get(k);
          remaining.delete(k);
          group.push(n);
          queue.push(n);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/* Reset per-race state (object aliveness, checkpoint hits) without re-parsing. */
export function resetTrackState(track) {
  for (const o of track.objects) { o.alive = true; o.knockedAt = 0; }
  for (const cp of track.checkpoints) cp.hit = false;
}

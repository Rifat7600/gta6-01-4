// Old Town city layout: a rainy riverside grid city, generated deterministically.
// Roads on a 320px pitch, blocks between them, a river along the east edge with
// one bridge, a plaza, a park and a dock strip. No network, no assets.
import { mulberry32, clamp } from './util.js';

export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const ROAD_W = 80;
export const PITCH = 320;

export const ROAD_X = [40, 360, 680, 1000, 1320, 1640, 1960, 2280];
export const ROAD_Y = [40, 360, 680, 1000, 1320, 1640];

// River band on the east edge; the y=1000 road crosses it on a bridge.
export const RIVER_X0 = 2440;
export const RIVER_X1 = 2560;
export const BRIDGE_Y0 = 960;
export const BRIDGE_Y1 = 1040;

const ROOF_COLORS = ['#7a5a44', '#5d6b7a', '#6b5d4f', '#4f5d54', '#74604e', '#5a4f63'];
const BRICK = ['#8a6a52', '#77584a', '#6e5f52', '#84705a'];

export function buildCity() {
  const rng = mulberry32(20261123);
  const buildings = [];
  const trees = [];
  const blocks = [];
  // Block columns: [80,320] [400,640] [720,960] [1040,1280] [1360,1600] [1680,1920] [2000,2240] [2320,2440]
  // Block rows:    [80,320] [400,640] [720,960] [1040,1280] [1360,1600] [1680,1920]
  const colX = [80, 400, 720, 1040, 1360, 1680, 2000, 2320];
  const colW = [240, 240, 240, 240, 240, 240, 240, 120];
  const rowY = [80, 400, 720, 1040, 1360, 1680];
  const rowH = [240, 240, 240, 240, 240, 240];
  // Special blocks: plaza (col 3, row 2), park (col 5, row 4), dock strip (col 7).
  const plaza = { x: 1040, y: 720, w: 240, h: 240 };
  const park = { x: 1680, y: 1360, w: 240, h: 240 };
  for (let ci = 0; ci < colX.length; ci++) {
    for (let ri = 0; ri < rowY.length; ri++) {
      const bx = colX[ci], by = rowY[ri], bw = colW[ci], bh = rowH[ri];
      blocks.push({ x: bx, y: by, w: bw, h: bh });
      const isPlaza = ci === 3 && ri === 2;
      const isPark = ci === 5 && ri === 4;
      const isDock = ci === 7;
      if (isPlaza || isPark || isDock) {
        if (isPark) {
          for (let t = 0; t < 14; t++) {
            trees.push({
              x: bx + 24 + rng() * (bw - 48),
              y: by + 24 + rng() * (bh - 48),
              r: 10 + rng() * 8,
            });
          }
        }
        continue;
      }
      // One or two buildings per block, leaving a courtyard gap.
      const n = rng() < 0.45 ? 2 : 1;
      if (n === 1) {
        const w = bw - 36 - rng() * 30, h = bh - 36 - rng() * 30;
        buildings.push({
          x: bx + 18 + rng() * (bw - w - 36), y: by + 18 + rng() * (bh - h - 36),
          w, h, color: ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)],
          wall: BRICK[Math.floor(rng() * BRICK.length)], hgt: 18 + rng() * 26,
        });
      } else {
        const w1 = bw * 0.52 - 20, h1 = bh - 36;
        const w2 = bw * 0.42 - 20, h2 = bh * 0.55;
        buildings.push({
          x: bx + 14, y: by + 18, w: w1, h: h1,
          color: ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)],
          wall: BRICK[Math.floor(rng() * BRICK.length)], hgt: 20 + rng() * 22,
        });
        buildings.push({
          x: bx + bw - w2 - 14, y: by + 18, w: w2, h: h2,
          color: ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)],
          wall: BRICK[Math.floor(rng() * BRICK.length)], hgt: 14 + rng() * 18,
        });
      }
    }
  }
  return { buildings, trees, blocks, plaza, park };
}

export function isOnRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function isWater(x, y) {
  if (x < RIVER_X0 || x >= RIVER_X1) return false;
  // The bridge deck carries the y=1000 road over the river.
  if (y >= BRIDGE_Y0 && y <= BRIDGE_Y1) return false;
  return true;
}

export function inWorld(x, y) {
  return x >= 8 && x <= WORLD_W - 8 && y >= 8 && y <= WORLD_H - 8;
}

// True when a circle of radius r at (x,y) overlaps a building, water or the edge.
export function hitsSolid(city, x, y, r) {
  if (!inWorld(x, y)) return true;
  if (isWater(x, y)) return true;
  for (const b of city.buildings) {
    const nx = clamp(x, b.x, b.x + b.w);
    const ny = clamp(y, b.y, b.y + b.h);
    const dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Nearest intersection (road crossing) to a point.
export function nearestIntersection(x, y) {
  let bx = ROAD_X[0], by = ROAD_Y[0], bd = Infinity;
  for (const rx of ROAD_X) for (const ry of ROAD_Y) {
    const d = (rx - x) * (rx - x) + (ry - y) * (ry - y);
    if (d < bd) { bd = d; bx = rx; by = ry; }
  }
  return { x: bx, y: by };
}

export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const rx = ROAD_X[Math.floor(rng() * ROAD_X.length)];
    return { x: rx, y: 40 + rng() * (WORLD_H - 80) };
  }
  const ry = ROAD_Y[Math.floor(rng() * ROAD_Y.length)];
  return { x: 40 + rng() * (WORLD_W - 80), y: ry };
}

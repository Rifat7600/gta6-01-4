// Shared helpers for Old Town. No dependencies.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
export function pushCircleOutOfRect(c) {
  // c: {x, y, r} mutated in place. Returns true if it was inside a rect.
  return false;
}
// Resolve a circle against an AABB: push it out along the smallest axis.
// Returns the penetration depth, 0 when there is no overlap.
export function resolveCircleRect(c, rx, ry, rw, rh) {
  const nx = clamp(c.x, rx, rx + rw);
  const ny = clamp(c.y, ry, ry + rh);
  let dx = c.x - nx, dy = c.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return 0;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    const push = c.r - d;
    c.x += (dx / d) * push;
    c.y += (dy / d) * push;
    return push;
  }
  // Center inside the rect: push out along the smallest penetration axis.
  const left = c.x - rx, right = rx + rw - c.x;
  const top = c.y - ry, bottom = ry + rh - c.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) c.x = rx - c.r;
  else if (m === right) c.x = rx + rw + c.r;
  else if (m === top) c.y = ry - c.r;
  else c.y = ry + rh + c.r;
  return m + c.r;
}
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
export function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}
export function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m + ':' + String(r).padStart(2, '0');
}

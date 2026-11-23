// Traffic cars and pedestrians for Old Town.
import { G } from './state.js';
import { mulberry32, clamp, dist, angleDiff, pick } from './util.js';
import { ROAD_X, ROAD_Y, isWater, hitsSolid, randomRoadPoint, nearestIntersection } from './city.js';
import { makeCar, nextCarColor } from './player.js';

const rng = mulberry32(777);
const PED_COLORS = ['#e74c3c', '#f1c40f', '#ecf0f1', '#1abc9c', '#e67e22', '#9b59b6', '#3498db', '#fd79a8'];

export function spawnTraffic(count) {
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    const car = makeCar(p.x, p.y, 0, { color: nextCarColor() });
    car.speed = 110 + rng() * 50;
    // Pick a road axis and direction.
    car.route = { axis: rng() < 0.5 ? 'x' : 'y', dir: rng() < 0.5 ? 1 : -1 };
    car.angle = car.route.axis === 'x' ? (car.route.dir > 0 ? 0 : Math.PI) : (car.route.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    G.cars.push(car);
  }
}

export function spawnParked(count) {
  // Parked cars along road edges so the player can always find one to steal.
  const spots = [
    [680, 92], [1000, 92], [1320, 92], [360, 412], [1640, 412], [680, 732],
    [1320, 732], [1960, 732], [360, 1052], [1000, 1052], [1640, 1372], [680, 1692],
    [1320, 1692], [2280, 412], [2280, 1372], [360, 732],
  ];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const [x, y] = spots[i];
    const car = makeCar(x, y, rng() < 0.5 ? 0 : Math.PI / 2, { parked: true, color: nextCarColor() });
    car.wasParked = true;
    G.cars.push(car);
  }
}

export function spawnPeds(count) {
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    // Nudge onto the sidewalk next to the road.
    const px = p.x + (rng() < 0.5 ? -52 : 52);
    const py = p.y + (rng() < 0.5 ? -52 : 52);
    if (hitsSolid(G.city, px, py, 10)) continue;
    G.peds.push({
      x: px, y: py, angle: rng() * Math.PI * 2, speed: 34 + rng() * 22,
      color: PED_COLORS[Math.floor(rng() * PED_COLORS.length)],
      state: 'walk', stateT: 0, down: false, downT: 0,
    });
  }
}

export function spawnCashPickups() {
  const spots = [
    [400, 200], [1160, 200], [2000, 200], [200, 680], [1480, 680],
    [400, 1160], [1480, 1160], [2000, 1480], [680, 1480], [1160, 1680],
  ];
  for (const [x, y] of spots) {
    G.pickups.push({ x, y, amount: 25, taken: false, respawn: 0 });
  }
}

function trafficSteer(car, dt) {
  // Drive along the current road axis; at an intersection, maybe turn.
  const speed = car.speed;
  if (car.route.axis === 'x') {
    const targetAngle = car.route.dir > 0 ? 0 : Math.PI;
    car.angle += clamp(angleDiff(car.angle, targetAngle), -1.6 * dt, 1.6 * dt);
    car.x += Math.cos(car.angle) * speed * dt;
    car.y += Math.sin(car.angle) * speed * dt;
    // Snap back toward the road center line.
    const ry = nearestIntersection(car.x, car.y).y;
    car.y += (ry - car.y) * 0.4 * dt;
    // At an intersection, chance to turn onto the cross road.
    const ix = nearestIntersection(car.x, car.y).x;
    if (Math.abs(car.x - ix) < 6 && Math.abs(car.y - ry) < 6 && rng() < 0.008) {
      car.route = { axis: 'y', dir: rng() < 0.5 ? 1 : -1 };
    }
  } else {
    const targetAngle = car.route.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.angle += clamp(angleDiff(car.angle, targetAngle), -1.6 * dt, 1.6 * dt);
    car.x += Math.cos(car.angle) * speed * dt;
    car.y += Math.sin(car.angle) * speed * dt;
    const rx = nearestIntersection(car.x, car.y).x;
    car.x += (rx - car.x) * 0.4 * dt;
    const iy = nearestIntersection(car.x, car.y).y;
    if (Math.abs(car.y - iy) < 6 && Math.abs(car.x - rx) < 6 && rng() < 0.008) {
      car.route = { axis: 'x', dir: rng() < 0.5 ? 1 : -1 };
    }
  }
  // Keep inside the world; bounce at edges by reversing route.
  if (car.x < 60 || car.x > 2500 || car.y < 60 || car.y > 1860) {
    car.route.dir *= -1;
    car.x = clamp(car.x, 60, 2500);
    car.y = clamp(car.y, 60, 1860);
  }
}

export function updateTraffic(dt) {
  const p = G.player;
  for (const car of G.cars) {
    if (car.parked) continue;
    // Slow down if the player is right ahead.
    let target = 110 + (car.baseSpeed || 0);
    if (!car.baseSpeed) car.baseSpeed = 30 + rng() * 40;
    target = 110 + car.baseSpeed;
    const dPlayer = dist(car.x, car.y, p.x, p.y);
    const ahead = Math.cos(car.angle) * (p.x - car.x) + Math.sin(car.angle) * (p.y - car.y);
    if (dPlayer < 90 && ahead > 0) target = 20;
    car.speed += clamp(target - car.speed, -160 * dt, 90 * dt);
    trafficSteer(car, dt);
  }
  // Car-car separation (cheap: only vs player car + police).
  const all = [...G.cars, ...G.police];
  if (p.car) all.push(p.car);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 30 && d > 0.01) {
        const push = (30 - d) / 2;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        a.speed *= 0.96; b.speed *= 0.96;
      }
    }
  }
}

export function updatePeds(dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.down) {
      ped.downT -= dt;
      if (ped.downT <= 0) { ped.down = false; ped.state = 'flee'; ped.stateT = 2.5; }
      continue;
    }
    // Flee if the player is driving fast nearby or shooting.
    const d = dist(ped.x, ped.y, p.x, p.y);
    const threat = (!p.onFoot && Math.abs(p.speed) > 120 && d < 130) || (G.shotsFired && d < 260);
    if (threat && ped.state !== 'flee') { ped.state = 'flee'; ped.stateT = 2.5; }
    if (ped.state === 'flee') {
      ped.stateT -= dt;
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle = away;
      const nx = ped.x + Math.cos(away) * 120 * dt;
      const ny = ped.y + Math.sin(away) * 120 * dt;
      if (!hitsSolid(G.city, nx, ped.y, 10)) ped.x = nx;
      if (!hitsSolid(G.city, ped.x, ny, 10)) ped.y = ny;
      if (ped.stateT <= 0) ped.state = 'walk';
    } else {
      ped.stateT -= dt;
      if (ped.stateT <= 0) {
        ped.stateT = 2 + rng() * 4;
        ped.angle = Math.floor(rng() * 4) * (Math.PI / 2);
      }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      if (!hitsSolid(G.city, nx, ped.y, 10)) ped.x = nx; else ped.angle += Math.PI / 2;
      if (!hitsSolid(G.city, ped.x, ny, 10)) ped.y = ny; else ped.angle += Math.PI / 2;
    }
    // Hit by a fast car -> knocked down, wanted up.
    if (!p.onFoot && Math.abs(p.speed) > 70 && d < 26) {
      ped.down = true; ped.downT = 3;
      p.speed *= 0.82;
      if (G.crimeCooldown <= 0) {
        G.wanted = clamp(G.wanted + 1, 0, 5);
        G.crimeCooldown = 1.0;
      }
    }
  }
  G.shotsFired = false;
}

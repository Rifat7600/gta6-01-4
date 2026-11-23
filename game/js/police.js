// Police pursuit and the wanted system for Old Town.
import { G, toast } from './state.js';
import { clamp, dist, angleDiff, angleTo, mulberry32 } from './util.js';
import { ROAD_X, ROAD_Y, randomRoadPoint, hitsSolid } from './city.js';
import { makeCar, damagePlayer } from './player.js';
import { AudioSys } from './audio.js';

const rng = mulberry32(4242);

export function wantedTarget() {
  return G.wanted; // one police car per star
}

export function spawnPolice() {
  const p = G.player;
  const spot = randomRoadPoint(rng);
  // Spawn on a road, at least 500px from the player when possible.
  let x = spot.x, y = spot.y;
  if (dist(x, y, p.x, p.y) < 500) {
    x = clamp(p.x + (rng() < 0.5 ? -620 : 620), 60, 2500);
    y = clamp(p.y + (rng() < 0.5 ? -420 : 420), 60, 1860);
    // Snap to nearest road.
    let bx = ROAD_X[0], bd = Infinity;
    for (const rx of ROAD_X) { const d = Math.abs(rx - x); if (d < bd) { bd = d; bx = rx; } }
    x = bx;
  }
  const car = makeCar(x, y, angleTo(x, y, p.x, p.y), { isPolice: true, color: '#20242c' });
  car.speed = 200;
  car.ramCooldown = 0;
  G.police.push(car);
}

export function updatePolice(dt) {
  const p = G.player;
  // Maintain the target count.
  const target = wantedTarget();
  if (G.police.length < target && G.state === 'playing') {
    if (Math.random() < dt * 1.2) spawnPolice();
  }
  if (G.wanted === 0) {
    // Despawn police that are far away once the heat is off.
    G.police = G.police.filter((c) => dist(c.x, c.y, p.x, p.y) < 700);
  }
  const maxSpeed = 330 + G.wanted * 26;
  for (const car of G.police) {
    car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
    // Pursuit: aim at the player's predicted position.
    const px = p.x + Math.cos(p.angle) * (p.speed || 0) * 0.35;
    const py = p.y + Math.sin(p.angle) * (p.speed || 0) * 0.35;
    const want = angleTo(car.x, car.y, px, py);
    car.angle += clamp(angleDiff(car.angle, want), -2.4 * dt, 2.4 * dt);
    const d = dist(car.x, car.y, p.x, p.y);
    const desired = d > 90 ? maxSpeed : maxSpeed * 0.55;
    car.speed += clamp(desired - car.speed, -300 * dt, 260 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // Police drive through the city like everyone else (buildings block them).
    if (!hitsSolid(G.city, nx, car.y, 15)) car.x = nx;
    else car.speed *= 0.6;
    if (!hitsSolid(G.city, car.x, ny, 15)) car.y = ny;
    else car.speed *= 0.6;
    // Ram the player.
    if (d < 34 && car.ramCooldown <= 0) {
      car.ramCooldown = 1.1;
      AudioSys.crash(false);
      if (p.onFoot) {
        damagePlayer(14);
        if (G.state === 'playing') toast('The police grabbed you — run!');
      } else if (p.car) {
        p.car.hp -= 9;
        p.car.speed *= 0.55;
        car.speed *= 0.5;
        if (p.car.hp <= 0) toast('Your car is wrecked — get out!');
      }
    }
    // Busted: a police car touching the player on foot ends the run.
    if (p.onFoot && d < 26 && G.state === 'playing') {
      G.state = 'busted';
      G.stats.busted += 1;
      p.money = Math.max(0, p.money - 200);
    }
  }
}

export function updateWanted(dt) {
  G.crimeCooldown = Math.max(0, G.crimeCooldown - dt);
  if (G.wanted <= 0) return;
  const p = G.player;
  let nearest = Infinity;
  for (const c of G.police) nearest = Math.min(nearest, dist(c.x, c.y, p.x, p.y));
  if (nearest > 560) {
    G.wantedTimer += dt;
    if (G.wantedTimer > 9) {
      G.wantedTimer = 0;
      G.wanted = Math.max(0, G.wanted - 1);
      if (G.wanted === 0) toast('You lost them. The heat is off.');
    }
  } else {
    G.wantedTimer = 0;
  }
}

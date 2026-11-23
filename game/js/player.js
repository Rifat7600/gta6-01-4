// The player: on-foot movement and car driving physics for Old Town.
import { G } from './state.js';
import { Input } from './input.js';
import { clamp, angleDiff, dist } from './util.js';
import { hitsSolid, isWater } from './city.js';
import { AudioSys } from './audio.js';

export const CAR_COLORS = ['#c0392b', '#2e6fb0', '#d8a03c', '#7d8a99', '#4a9e6a', '#8e44ad', '#d35400'];
export const POLICE_COLOR = '#20242c';

let colorIdx = 0;
export function nextCarColor() {
  const c = CAR_COLORS[colorIdx % CAR_COLORS.length];
  colorIdx += 1;
  return c;
}

export function makeCar(x, y, angle, opts) {
  const o = opts || {};
  return {
    x, y, angle: angle || 0, speed: 0,
    color: o.color || nextCarColor(),
    parked: !!o.parked, model: o.model || 'sedan',
    hp: o.hp || 100, isPolice: !!o.isPolice,
    target: null, wait: 0, route: o.route || null,
    down: false, downTimer: 0,
  };
}

// Move a car with arcade physics. Returns impact speed if it hit something hard.
export function driveCar(car, dt, input, isPlayer) {
  const accel = isPlayer ? 300 : 200;
  const maxSpeed = isPlayer ? 440 : 400;
  const maxReverse = 150;
  if (input.forward) car.speed += accel * dt;
  if (input.back) car.speed -= (car.speed > 0 ? 380 : 200) * dt;
  if (input.handbrake) car.speed -= Math.sign(car.speed) * 520 * dt;
  if (!input.forward && !input.back) {
    car.speed -= Math.sign(car.speed) * 140 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -maxReverse, maxSpeed);
  const steerAuthority = clamp(Math.abs(car.speed) / 110, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += input.steer * 2.7 * steerAuthority * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Collision with buildings / water / world edge.
  const before = car.speed;
  if (hitsSolid(G.city, nx, ny, 15)) {
    // Try sliding along one axis.
    if (!hitsSolid(G.city, nx, car.y, 15)) { car.x = nx; }
    else if (!hitsSolid(G.city, car.x, ny, 15)) { car.y = ny; }
    else {
      if (Math.abs(car.speed) > 130) AudioSys.crash(true);
      car.speed *= -0.25;
    }
    if (Math.abs(before) > 200) {
      car.hp -= Math.abs(before) * 0.04;
      if (isPlayer) damagePlayer(Math.abs(before) * 0.02);
    }
  } else {
    car.x = nx; car.y = ny;
  }
  return 0;
}

export function damagePlayer(amount) {
  const p = G.player;
  if (p.hurtCooldown > 0) return;
  p.hp -= amount;
  p.hurtCooldown = 0.6;
  if (p.hp <= 0) {
    p.hp = 0;
    G.state = 'wasted';
    G.stats.wasted += 1;
  }
}

export function updatePlayer(dt) {
  const p = G.player;
  p.hurtCooldown = Math.max(0, p.hurtCooldown - dt);
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  if (G.state !== 'playing') return;

  if (p.onFoot) {
    const a = Input.axis();
    const sp = 175;
    let mx = a.x, my = a.y;
    if (mx !== 0 && my !== 0) { mx *= 0.7071; my *= 0.7071; }
    const nx = p.x + mx * sp * dt;
    const ny = p.y + my * sp * dt;
    if (!hitsSolid(G.city, nx, p.y, 13)) p.x = nx;
    if (!hitsSolid(G.city, p.x, ny, 13)) p.y = ny;
    if (mx !== 0 || my !== 0) p.angle = Math.atan2(my, mx);
    p.speed = (mx !== 0 || my !== 0) ? sp : 0;
  } else if (p.car) {
    const a = Input.axis();
    // Staged scenes (?scene=) cruise forward until the player takes the wheel,
    // so screenshots catch the car moving instead of parked.
    const keysDown = Input.down('w') || Input.down('W') || Input.down('s') || Input.down('S')
      || Input.down('a') || Input.down('A') || Input.down('d') || Input.down('D')
      || Input.down('ArrowUp') || Input.down('ArrowDown') || Input.down('ArrowLeft') || Input.down('ArrowRight');
    const cruise = !!G.scene && G.scene !== 'foot' && !keysDown;
    driveCar(p.car, dt, {
      forward: a.y < 0 || cruise, back: a.y > 0, steer: a.x,
      handbrake: Input.down(' '),
    }, true);
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle; p.speed = p.car.speed;
    // Car destroyed -> forced out on foot.
    if (p.car.hp <= 0) {
      p.car.hp = 0;
      exitCar(true);
    }
  }
  // Health regen when calm.
  if (G.wanted === 0 && p.hp > 0 && p.hp < 100) p.hp = Math.min(100, p.hp + 2.5 * dt);
}

export function nearestCar(maxDist) {
  const p = G.player;
  let best = null, bd = maxDist;
  for (const c of G.cars) {
    if (c.isPolice) continue;
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(car) {
  const p = G.player;
  const idx = G.cars.indexOf(car);
  if (idx >= 0) G.cars.splice(idx, 1);
  p.car = car;
  p.onFoot = false;
  p.car.parked = false;
  if (!car.stolen) {
    car.stolen = true;
    G.stats.stolen += 1;
    addWanted(1, 'Car stolen');
  }
  AudioSys.blip(520);
}

export function exitCar(broken) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  p.car = null;
  p.onFoot = true;
  // Step out to the side of the car.
  const sx = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
  const sy = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
  if (!hitsSolid(G.city, sx, sy, 13) && !isWater(sx, sy)) { p.x = sx; p.y = sy; }
  else { p.x = car.x - Math.cos(car.angle + Math.PI / 2) * 26; p.y = car.y - Math.sin(car.angle + Math.PI / 2) * 26; }
  car.speed = 0;
  car.parked = true;
  G.cars.push(car);
  if (broken) {
    p.hp = Math.max(20, p.hp - 10);
  }
}

export function addWanted(n, why) {
  if (G.crimeCooldown > 0 && n <= 1) return;
  G.wanted = clamp(G.wanted + n, 0, 5);
  G.wantedTimer = 0;
  if (n > 0) G.crimeCooldown = 1.0;
}

export function tryEnterCar() {
  const p = G.player;
  if (!p.onFoot) { exitCar(false); return; }
  const car = nearestCar(46);
  if (car) enterCar(car);
}

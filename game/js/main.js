// Old Town — main loop, wiring, combat, camera and save handling.
import { G, toast, loadSave, writeSave } from './state.js';
import { Input } from './input.js';
import { clamp, dist } from './util.js';
import { WORLD_W, WORLD_H } from './city.js';
import { AudioSys } from './audio.js';
import { updatePlayer, tryEnterCar, addWanted } from './player.js';
import { spawnTraffic, spawnParked, spawnPeds, spawnCashPickups, updateTraffic, updatePeds } from './traffic.js';
import { updatePolice, updateWanted } from './police.js';
import { MISSIONS, startMission, updateMissions, failMission } from './missions.js';
import { applyScene } from './scenes.js';
import { render } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

Input.init(canvas);

function initWorld() {
  const save = loadSave();
  G.save = save;
  if (save) {
    G.player.money = save.money || 60;
    G.missionsDone = Array.isArray(save.done) ? save.done : [];
  }
  spawnTraffic(14);
  spawnParked(12);
  spawnPeds(22);
  spawnCashPickups();
}

function respawn() {
  const p = G.player;
  const wasWasted = G.state === 'wasted';
  p.x = 680; p.y = 680; p.angle = 0; p.speed = 0;
  p.hp = 100;
  p.onFoot = true; p.car = null;
  G.wanted = 0;
  G.police.length = 0;
  G.camera.x = p.x; G.camera.y = p.y;
  if (wasWasted) p.money = Math.max(0, p.money - 150);
  G.state = 'playing';
  toast(wasWasted ? 'Back on your feet. Stay out of trouble.' : 'Free to go. The PD is watching, though.');
}

function updateCamera(dt) {
  const p = G.player;
  const tx = clamp(p.x, 640, WORLD_W - 640);
  const ty = clamp(p.y, 360, WORLD_H - 360);
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
}

function updatePickups(dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) pk.taken = false;
      continue;
    }
    if (dist(p.x, p.y, pk.x, pk.y) < 26) {
      pk.taken = true; pk.respawn = 60;
      p.money += pk.amount;
      toast('Found $' + pk.amount + ' in the gutter.');
      AudioSys.blip(780);
    }
  }
}

function doPunch() {
  const p = G.player;
  if (p.punchCooldown > 0) return;
  p.punchCooldown = 0.45;
  const range = 46;
  // Nearest pedestrian in front.
  let best = null, bd = range;
  for (const pd of G.peds) {
    if (pd.down) continue;
    const d = dist(p.x, p.y, pd.x, pd.y);
    if (d < bd) { bd = d; best = pd; }
  }
  if (best) {
    best.down = true; best.downT = 2.5;
    addWanted(1, 'Assault');
    toast('You knocked someone down. The law noticed.');
    return;
  }
  // Whiff: small whoosh, nothing hit.
  AudioSys.blip(220);
}

function doShoot() {
  const p = G.player;
  if (p.shootCooldown > 0 || p.ammo <= 0) {
    if (p.ammo <= 0) toast('Out of ammo — find a pickup.');
    return;
  }
  p.shootCooldown = 0.35;
  p.ammo -= 1;
  G.shotsFired = true;
  AudioSys.shot();
  // Aim from the player toward the mouse (screen -> world).
  const wx = G.camera.x - 640 + Input.mouse.x;
  const wy = G.camera.y - 360 + Input.mouse.y;
  const aim = Math.atan2(wy - p.y, wx - p.x);
  const range = 340;
  // Best target along the aim ray.
  let best = null, bestScore = Infinity;
  const consider = (x, y, kind, ref) => {
    const dx = x - p.x, dy = y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range || d < 4) return;
    const ang = Math.atan2(dy, dx);
    let diff = Math.abs(ang - aim);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const perp = d * Math.sin(diff);
    if (perp < 20 && d < bestScore) { bestScore = d; best = { kind, ref }; }
  };
  for (const pd of G.peds) if (!pd.down) consider(pd.x, pd.y, 'ped', pd);
  for (const c of G.police) consider(c.x, c.y, 'police', c);
  for (const c of G.cars) consider(c.x, c.y, 'car', c);
  if (!best) return;
  if (best.kind === 'ped') {
    best.ref.down = true; best.ref.downT = 3;
    addWanted(1, 'Shooting');
  } else if (best.kind === 'police') {
    const car = best.ref;
    car.hp = (car.hp || 100) - 30;
    addWanted(1, 'Shot at police');
    if (car.hp <= 0) {
      const idx = G.police.indexOf(car);
      if (idx >= 0) G.police.splice(idx, 1);
      toast('Police car disabled!');
      addWanted(1, 'Police car destroyed');
    }
  } else if (best.kind === 'car') {
    best.ref.hp = (best.ref.hp || 100) - 30;
    if (best.ref.hp <= 0) toast('You wrecked that car.');
  }
}

function handleKeys() {
  if (Input.wasPressed('Enter')) {
    if (G.state === 'menu') {
      AudioSys.init();
      G.state = 'playing';
      if (!G.mission && G.missionsDone.length === 0) startMission(0);
      toast('Welcome to Old Town. Press 1-5 for jobs.', 4);
    } else if (G.state === 'wasted' || G.state === 'busted') {
      respawn();
    }
  }
  if (Input.wasPressed('p') || Input.wasPressed('P')) {
    if (G.state === 'playing') G.state = 'paused';
    else if (G.state === 'paused') G.state = 'playing';
  }
  if (Input.wasPressed('m') || Input.wasPressed('M')) {
    const m = AudioSys.toggleMute();
    toast(m ? 'Sound off' : 'Sound on');
  }
  if (G.state !== 'playing') return;
  if (Input.wasPressed('e') || Input.wasPressed('E')) tryEnterCar();
  if (Input.wasPressed('r') || Input.wasPressed('R')) {
    if (G.mission) {
      const idx = G.mission.index;
      G.mission = null;
      startMission(idx);
    }
  }
  for (let i = 0; i < 5; i++) {
    if (Input.wasPressed(String(i + 1))) {
      if (!G.mission) startMission(i);
    }
  }
  if (Input.wasPressed('f') || Input.wasPressed('F')) doPunch();
  if (Input.mouse.clicked) {
    // Click shoots when the player has a pistol, punches on foot up close.
    const wx = G.camera.x - 640 + Input.mouse.x;
    const wy = G.camera.y - 360 + Input.mouse.y;
    const d = dist(G.player.x, G.player.y, wx, wy);
    if (d < 46 && G.player.onFoot) doPunch();
    else doShoot();
  }
}

let last = performance.now();
let prevState = 'menu';

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  handleKeys();
  if (G.state === 'playing') {
    G.time += dt;
    G.flash = 0;
    const cyc = G.time % 9;
    if (cyc < 0.25) G.flash = 0.55 * (1 - cyc / 0.25);
    updatePlayer(dt);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateWanted(dt);
    updateMissions(dt);
    updatePickups(dt);
    updateCamera(dt);
    // Toast timers.
    for (const t of G.toasts) t.t -= dt;
    G.toasts = G.toasts.filter((t) => t.t > 0);
    // Audio.
    const p = G.player;
    AudioSys.setEngine(p.car ? clamp(Math.abs(p.speed) / 440, 0, 1) : 0, !!p.car);
    const policeNear = G.police.some((c) => dist(c.x, c.y, p.x, p.y) < 700);
    AudioSys.setSiren(G.wanted > 0 && policeNear, dt);
    // Ammo pickups: pistol ammo at the plaza kiosk every so often.
    if (G.player.ammo < 6 && Math.floor(G.time) % 45 === 0 && Math.floor((G.time - dt)) % 45 !== 0) {
      G.player.ammo += 6;
      toast('Picked up ammo at the kiosk. +6');
    }
  }
  if (prevState !== G.state && G.state === 'playing' && (prevState === 'wasted' || prevState === 'busted')) {
    writeSave();
  }
  prevState = G.state;
  render(ctx);
  Input.endFrame();
  requestAnimationFrame(frame);
}

initWorld();
// Scene presets for screenshots (?scene=cover|chase|mission|foot) skip the menu.
const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
if (scene) {
  AudioSys.init();
  applyScene(scene);
}
requestAnimationFrame(frame);

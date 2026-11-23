// The single shared game state for Old Town. Every module imports this one
// object, so there are no circular imports.
import { buildCity } from './city.js';

export const G = {
  state: 'menu', // menu | playing | paused | wasted | busted
  time: 0,
  city: buildCity(),
  player: {
    x: 680, y: 1000, angle: 0, speed: 0, hp: 100,
    onFoot: true, car: null, money: 60, ammo: 12,
    hurtCooldown: 0, punchCooldown: 0, shootCooldown: 0,
  },
  cars: [],       // traffic + parked cars (not the player's car while driving)
  peds: [],       // pedestrians
  police: [],     // police cars
  wanted: 0,
  wantedTimer: 0,
  crimeCooldown: 0,
  mission: null,  // { index, step, timer, passenger, startedAt }
  missionsDone: [],
  toasts: [],     // { text, t }
  pickups: [],    // cash bundles {x,y,amount,taken,respawn}
  camera: { x: 680, y: 1000 },
  save: null,     // loaded save data
  scene: null,    // ?scene= preset name
  muted: false,
  stats: { stolen: 0, busted: 0, wasted: 0 },
  flash: 0,       // lightning flash 0..1
  rainSeed: 7,
};

export function toast(text, dur) {
  G.toasts.push({ text, t: dur || 3.2 });
  if (G.toasts.length > 3) G.toasts.shift();
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem('oldtown-save-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function writeSave() {
  try {
    window.localStorage.setItem('oldtown-save-v1', JSON.stringify({
      money: G.player.money,
      done: G.missionsDone,
    }));
  } catch (e) { /* storage unavailable */ }
}

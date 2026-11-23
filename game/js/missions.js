// Missions for Old Town: a small story arc across the rainy riverside city.
import { G, toast, writeSave } from './state.js';
import { dist, clamp } from './util.js';
import { makeCar } from './player.js';
import { AudioSys } from './audio.js';

export const MISSIONS = [
  {
    id: 1, title: 'First Errand', reward: 150,
    brief: 'Steal any car and drive to the docks on the east bridge.',
    steps: [
      { type: 'goto', x: 2380, y: 1000, r: 70, text: 'Drive to the docks (east bridge)' },
    ],
  },
  {
    id: 2, title: 'The Pickup', reward: 250,
    brief: 'Pick up Mara at the old plaza, then drive her to the safehouse.',
    steps: [
      { type: 'goto', x: 1160, y: 840, r: 55, text: 'Pick up Mara at the plaza', pickup: true },
      { type: 'goto', x: 360, y: 1320, r: 70, text: 'Drive Mara to the safehouse' },
    ],
  },
  {
    id: 3, title: 'Hot Pursuit', reward: 400,
    brief: 'The law is on you. Stay ahead of the police for 45 seconds.',
    startWanted: 3,
    steps: [
      { type: 'survive', t: 45, text: 'Escape the police' },
    ],
  },
  {
    id: 4, title: 'The Delivery', reward: 500,
    brief: 'Grab the package uptown, then cross the river bridge in 75 seconds.',
    steps: [
      { type: 'goto', x: 680, y: 360, r: 55, text: 'Collect the package' },
      { type: 'goto', x: 2380, y: 1000, r: 70, text: 'Deliver across the bridge', time: 75 },
    ],
  },
  {
    id: 5, title: 'Old Town Heist', reward: 800,
    brief: 'Steal the gold coupe from the plaza and bring it to the garage.',
    startWanted: 2,
    steps: [
      { type: 'steal', x: 1160, y: 840, r: 60, text: 'Steal the gold coupe' },
      { type: 'goto', x: 1960, y: 360, r: 70, text: 'Bring it to the garage' },
    ],
  },
];

export function missionUnlocked(i) {
  if (i === 0) return true;
  return G.missionsDone.includes(MISSIONS[i - 1].id);
}

export function startMission(i) {
  if (!missionUnlocked(i)) { toast('Finish the previous job first.'); return false; }
  const m = MISSIONS[i];
  G.mission = { index: i, step: 0, timer: 0, passenger: false, stepTime: 0 };
  if (m.startWanted) G.wanted = Math.max(G.wanted, m.startWanted);
  if (i === 4) spawnHeistCar();
  toast('Job started: ' + m.title + ' — ' + m.brief, 4.5);
  AudioSys.blip(740);
  return true;
}

function spawnHeistCar() {
  // A gold coupe waits at the plaza for mission 5.
  if (G.cars.some((c) => c.heist)) return;
  const car = makeCar(1160, 840, Math.PI / 2, { parked: true, color: '#d4af37' });
  car.heist = true;
  car.wasParked = true;
  G.cars.push(car);
}

export function currentStep() {
  if (!G.mission) return null;
  return MISSIONS[G.mission.index].steps[G.mission.step] || null;
}

export function missionTarget() {
  const s = currentStep();
  if (!s || s.type === 'survive') return null;
  return { x: s.x, y: s.y };
}

export function failMission(why) {
  if (!G.mission) return;
  const title = MISSIONS[G.mission.index].title;
  G.mission = null;
  toast('Job failed: ' + title + ' — ' + why, 4);
}

export function completeMission() {
  const m = MISSIONS[G.mission.index];
  G.mission = null;
  G.player.money += m.reward;
  if (!G.missionsDone.includes(m.id)) G.missionsDone.push(m.id);
  writeSave();
  toast('Job done: ' + m.title + ' — paid $' + m.reward + '!', 4.5);
  AudioSys.blip(880); setTimeout(() => AudioSys.blip(990), 140);
}

export function updateMissions(dt) {
  if (!G.mission) return;
  const m = MISSIONS[G.mission.index];
  const s = currentStep();
  if (!s) { completeMission(); return; }
  const p = G.player;
  G.mission.stepTime += dt;
  if (s.type === 'goto') {
    if (s.time !== undefined) {
      s.left = (s.left === undefined ? s.time : s.left) - dt;
      if (s.left <= 0) { failMission('Out of time.'); return; }
    }
    if (dist(p.x, p.y, s.x, s.y) < s.r) {
      if (s.pickup) { G.mission.passenger = true; toast('Mara is in the car. Go!'); AudioSys.blip(660); }
      else AudioSys.blip(660);
      G.mission.step += 1;
      G.mission.stepTime = 0;
      if (!currentStep()) completeMission();
    }
  } else if (s.type === 'steal') {
    if (!p.onFoot && p.car && p.car.heist) {
      G.mission.step += 1;
      G.mission.stepTime = 0;
      toast('You have the coupe. Lose the heat and get to the garage!');
    }
  } else if (s.type === 'survive') {
    if (G.wanted >= 2) {
      s.left = (s.left === undefined ? s.t : s.left) - dt;
      if (s.left <= 0) { completeMission(); return; }
    }
  }
  // Mission fails if the player is wasted or busted (handled by state change).
  if (G.state === 'wasted' || G.state === 'busted') {
    G.mission = null;
  }
}

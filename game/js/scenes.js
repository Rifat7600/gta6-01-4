// Deterministic scene presets for screenshots: ?scene=cover|chase|mission|foot
// Each sets up an exact, readable moment of the game.
import { G } from './state.js';
import { makeCar } from './player.js';
import { startMission } from './missions.js';
import { spawnPolice } from './police.js';

export function applyScene(name) {
  const p = G.player;
  G.scene = name;
  G.state = 'playing';
  if (name === 'cover') {
    // Driving down the main avenue in the rain, traffic around, first job on.
    const car = makeCar(680, 1000, 0, { color: '#c0392b' });
    car.speed = 210;
    p.car = car; p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0; p.speed = 210;
    G.wanted = 0;
    startMission(0);
  } else if (name === 'chase') {
    // Three stars, three police cars closing in on a fast getaway.
    const car = makeCar(1000, 1000, 0, { color: '#2e6fb0' });
    car.speed = 330;
    p.car = car; p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0; p.speed = 330;
    G.wanted = 3;
    for (let i = 0; i < 3; i++) spawnPolice();
    // Pull the police in close behind for the shot.
    G.police.forEach((c, i) => {
      c.x = 1000 - 130 - i * 70;
      c.y = 1000 + (i - 1) * 60;
      c.angle = 0; c.speed = 330;
    });
  } else if (name === 'mission') {
    // Mid-job: driving Mara to the safehouse, one patrol in the distance.
    // Start far enough out that the job is still in progress at screenshot time.
    const car = makeCar(2080, 1320, Math.PI, { color: '#d8a03c' });
    car.speed = 190;
    p.car = car; p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = Math.PI; p.speed = 190;
    G.wanted = 1;
    // Staged mid-job state: Mara aboard, heading for the safehouse.
    // (Set directly — mission 2 is locked in real play until job 1 is done.)
    G.mission = { index: 1, step: 1, timer: 0, passenger: true, stepTime: 0 };
    spawnPolice();
    G.police[0].x = 1960; G.police[0].y = 1000; G.police[0].speed = 200;
  } else if (name === 'foot') {
    // On foot at the old plaza, one star, a patrol closing in, pedestrians around.
    p.x = 1160; p.y = 840; p.angle = -Math.PI / 2; p.onFoot = true; p.car = null;
    p.speed = 0;
    G.wanted = 1;
    spawnPolice();
    // Park the patrol far enough out that it is closing in, not yet on the player.
    G.police[0].x = 680; G.police[0].y = 360; G.police[0].speed = 150;
  }
  G.camera.x = p.x;
  G.camera.y = p.y;
}

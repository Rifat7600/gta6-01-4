// All drawing for Old Town: the rainy city, cars, people, HUD and screens.
import { G } from './state.js';
import { WORLD_W, WORLD_H, ROAD_X, ROAD_Y, ROAD_W, RIVER_X0, RIVER_X1, BRIDGE_Y0, BRIDGE_Y1 } from './city.js';
import { clamp, dist, fmtMoney, fmtTime } from './util.js';
import { MISSIONS, missionTarget, currentStep } from './missions.js';

const VIEW_W = 1280, VIEW_H = 720;
const RAIN_N = 130;
const rainDrops = [];
for (let i = 0; i < RAIN_N; i++) {
  rainDrops.push({ x: (i * 97.3) % 1280, y: (i * 57.7) % 720, l: 10 + (i % 5) * 3, s: 520 + (i % 7) * 40 });
}

function drawCar(ctx, x, y, angle, color, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-19, -11, 38, 24);
  // Wheels.
  ctx.fillStyle = '#111';
  ctx.fillRect(-14, -13, 9, 5); ctx.fillRect(6, -13, 9, 5);
  ctx.fillRect(-14, 8, 9, 5); ctx.fillRect(6, 8, 9, 5);
  // Body.
  ctx.fillStyle = color;
  roundRect(ctx, -18, -10, 36, 20, 5); ctx.fill();
  // Roof + windshield.
  ctx.fillStyle = 'rgba(20,28,38,0.85)';
  roundRect(ctx, -4, -8, 12, 16, 3); ctx.fill();
  ctx.fillStyle = 'rgba(180,210,235,0.55)';
  ctx.fillRect(8, -7, 3, 14);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(17, -8, 2, 4); ctx.fillRect(17, 4, 2, 4);
  // Taillights.
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-19, -8, 2, 4); ctx.fillRect(-19, 4, 2, 4);
  if (o.police) {
    // Black-and-white doors.
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-4, -10, 12, 20);
    ctx.fillStyle = '#20242c';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('PD', -1, 3);
    // Light bar, flashing with time.
    const t = G.time;
    ctx.fillStyle = Math.floor(t * 3) % 2 === 0 ? '#ff2e2e' : '#2e7bff';
    ctx.fillRect(-8, -12, 5, 4);
    ctx.fillStyle = Math.floor(t * 3) % 2 === 0 ? '#2e7bff' : '#ff2e2e';
    ctx.fillRect(3, -12, 5, 4);
  }
  if (o.heist) {
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('$', -2, 3);
  }
  if (o.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-6, -4 + Math.sin(G.time * 6) * 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWorld(ctx) {
  const cam = G.camera;
  const ox = cam.x - VIEW_W / 2, oy = cam.y - VIEW_H / 2;
  ctx.save();
  ctx.translate(-ox, -oy);
  // Ground.
  ctx.fillStyle = '#262b26';
  ctx.fillRect(ox - 40, oy - 40, VIEW_W + 80, VIEW_H + 80);
  // Blocks (sidewalk / ground between roads).
  ctx.fillStyle = '#31362f';
  for (const b of G.city.blocks) ctx.fillRect(b.x, b.y, b.w, b.h);
  // Park.
  const park = G.city.park;
  ctx.fillStyle = '#2c4a2e';
  ctx.fillRect(park.x, park.y, park.w, park.h);
  // Plaza paving.
  const plaza = G.city.plaza;
  ctx.fillStyle = '#4a4640';
  ctx.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
  ctx.strokeStyle = '#5d574e';
  ctx.lineWidth = 2;
  ctx.strokeRect(plaza.x + 8, plaza.y + 8, plaza.w - 16, plaza.h - 16);
  // Fountain.
  ctx.fillStyle = '#2e6f8e';
  ctx.beginPath(); ctx.arc(plaza.x + 120, plaza.y + 120, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7fb6cf';
  ctx.beginPath(); ctx.arc(plaza.x + 120, plaza.y + 120, 18, 0, Math.PI * 2); ctx.fill();
  // River.
  ctx.fillStyle = '#1d3a4d';
  ctx.fillRect(RIVER_X0, oy - 40, RIVER_X1 - RIVER_X0, VIEW_H + 80);
  ctx.fillStyle = 'rgba(127,182,207,0.25)';
  for (let i = 0; i < 6; i++) {
    const yy = oy + ((i * 173 + G.time * 22) % (VIEW_H + 80)) - 40;
    ctx.fillRect(RIVER_X0 + 14 + (i % 3) * 30, yy, 34, 3);
  }
  // Bridge deck.
  ctx.fillStyle = '#4a4f55';
  ctx.fillRect(RIVER_X0 - 40, BRIDGE_Y0, RIVER_X1 - RIVER_X0 + 40, BRIDGE_Y1 - BRIDGE_Y0);
  // Roads.
  ctx.fillStyle = '#3a3f45';
  for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2, oy - 40, ROAD_W, VIEW_H + 80);
  for (const ry of ROAD_Y) ctx.fillRect(ox - 40, ry - ROAD_W / 2, VIEW_W + 80, ROAD_W);
  // Road center dashes.
  ctx.strokeStyle = 'rgba(201,162,39,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  for (const rx of ROAD_X) {
    ctx.beginPath(); ctx.moveTo(rx, oy - 40); ctx.lineTo(rx, oy + VIEW_H + 40); ctx.stroke();
  }
  for (const ry of ROAD_Y) {
    ctx.beginPath(); ctx.moveTo(ox - 40, ry); ctx.lineTo(ox + VIEW_W + 40, ry); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Wet shine on roads.
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2 + 8, oy - 40, 6, VIEW_H + 80);
  // Buildings.
  for (const b of G.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    // Lit windows in the rain.
    ctx.fillStyle = '#ffd98a';
    const cols = Math.max(1, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + b.x) % 3 === 0) {
        ctx.fillRect(b.x + 8 + i * 26, b.y + 8 + j * 26, 8, 10);
      }
    }
  }
  // Trees.
  for (const t of G.city.trees) {
    ctx.fillStyle = '#1e3d22';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f6b34';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // Cash pickups.
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(G.time * 3 + pk.x) * 3;
    ctx.fillStyle = '#2fae4e';
    ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8f5e9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', pk.x, pk.y + bob + 4);
    ctx.textAlign = 'left';
  }
  // Mission marker.
  const tgt = missionTarget();
  if (tgt) {
    const pulse = 1 + Math.sin(G.time * 5) * 0.15;
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,217,77,0.25)';
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 6, 0, Math.PI * 2); ctx.fill();
    // Beacon.
    ctx.fillStyle = 'rgba(255,217,77,0.10)';
    ctx.fillRect(tgt.x - 3, tgt.y - 260, 6, 260);
  }
  // Parked + traffic cars.
  for (const c of G.cars) drawCar(ctx, c.x, c.y, c.angle, c.color, { heist: c.heist, smoke: c.hp < 35 });
  // Police cars.
  for (const c of G.police) drawCar(ctx, c.x, c.y, c.angle, '#20242c', { police: true });
  // Pedestrians.
  for (const pd of G.peds) {
    ctx.fillStyle = pd.down ? '#888' : pd.color;
    ctx.beginPath(); ctx.arc(pd.x, pd.y, pd.down ? 7 : 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(pd.x, pd.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    if (pd.state === 'flee') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(pd.x, pd.y, 12, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Player.
  const p = G.player;
  if (p.onFoot) {
    ctx.fillStyle = '#27ae60';
    ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
    ctx.stroke();
  } else if (p.car) {
    drawCar(ctx, p.car.x, p.car.y, p.car.angle, p.car.color, { heist: p.car.heist, smoke: p.car.hp < 35 });
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.car.x, p.car.y, 24, 0, Math.PI * 2); ctx.stroke();
  }
  // Rain streaks (screen-space, drawn in world space for simplicity).
  ctx.strokeStyle = 'rgba(180,200,220,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of rainDrops) {
    const rx = ox + ((r.x + G.time * 60) % (VIEW_W + 40)) - 20;
    const ry = oy + ((r.y + G.time * r.s) % (VIEW_H + 40)) - 20;
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 3, ry + r.l);
  }
  ctx.stroke();
  // Lightning flash.
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.10).toFixed(3) + ')';
    ctx.fillRect(ox - 40, oy - 40, VIEW_W + 80, VIEW_H + 80);
  }
  ctx.restore();
}

function drawMinimap(ctx) {
  const mw = 186, mh = 138, mx = VIEW_W - mw - 14, my = 14;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(10,14,18,0.78)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.strokeStyle = '#5a6b7a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.save();
  ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
  ctx.fillStyle = '#232a24';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#3a3f45';
  for (const rx of ROAD_X) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of ROAD_Y) ctx.fillRect(mx, my + ry * sy - 1, mw, 2);
  ctx.fillStyle = '#1d3a4d';
  ctx.fillRect(mx + RIVER_X0 * sx, my, (RIVER_X1 - RIVER_X0) * sx, mh);
  ctx.fillStyle = '#2c4a2e';
  ctx.fillRect(mx + G.city.park.x * sx, my + G.city.park.y * sy, G.city.park.w * sx, G.city.park.h * sy);
  const tgt = missionTarget();
  if (tgt) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(mx + tgt.x * sx, my + tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#9aa5b1';
  for (const c of G.cars) { ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 2, 2); }
  for (const c of G.police) {
    ctx.fillStyle = Math.floor(G.time * 3) % 2 === 0 ? '#ff2e2e' : '#2e7bff';
    ctx.beginPath(); ctx.arc(mx + c.x * sx, my + c.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  const p = G.player;
  ctx.fillStyle = '#27ae60';
  ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawHUD(ctx) {
  const p = G.player;
  drawMinimap(ctx);
  // Wanted stars.
  ctx.font = 'bold 26px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 18 + i * 30, 40);
  }
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(16, 52, 150, 14);
  ctx.fillStyle = p.hp > 40 ? '#27ae60' : '#c0392b';
  ctx.fillRect(16, 52, 150 * clamp(p.hp / 100, 0, 1), 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.hp), 20, 63);
  // Money + ammo.
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#7dff9b';
  ctx.fillText(fmtMoney(p.money), 16, 92);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText('Ammo ' + p.ammo + (p.car ? '   Car ' + Math.ceil(p.car.hp) + '%' : ''), 16, 112);
  // Mission objective.
  const m = G.mission;
  if (m) {
    const def = MISSIONS[m.index];
    const step = currentStep();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(16, VIEW_H - 74, 560, 58);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(def.title + '  —  $' + def.reward, 28, VIEW_H - 52);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    let obj = step ? step.text : '';
    if (step && step.type === 'survive') obj += ' — ' + Math.ceil(step.left === undefined ? step.t : step.left) + 's';
    if (step && step.time !== undefined && step.left !== undefined) obj += ' — ' + Math.ceil(step.left) + 's left';
    ctx.fillText(obj, 28, VIEW_H - 32);
    if (m.passenger) ctx.fillText('Passenger aboard', 28, VIEW_H - 16);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(16, VIEW_H - 46, 430, 30);
    ctx.fillStyle = '#ddd';
    ctx.font = '13px sans-serif';
    ctx.fillText('Press 1-5 to start a job — or just explore Old Town', 28, VIEW_H - 26);
  }
  // Speed.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(p.speed) * 0.24) + ' mph', VIEW_W - 20, VIEW_H - 20);
    ctx.textAlign = 'left';
  }
  // Toasts.
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  G.toasts.forEach((t, i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(t.text).width + 28;
    ctx.fillRect((VIEW_W - w) / 2, 150 + i * 34, w, 26);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(t.text, VIEW_W / 2, 168 + i * 34);
  });
  ctx.textAlign = 'left';
  // Controls hint (first seconds of play).
  if (G.time < 14 && G.state === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD drive / walk   E steal car   F / click fight   Space handbrake   P pause   M mute', 16, VIEW_H - 92);
  }
}

export function render(ctx) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (G.state === 'menu') {
    drawWorld(ctx);
    drawMenu(ctx);
    return;
  }
  drawWorld(ctx);
  drawHUD(ctx);
  if (G.state === 'paused') drawPaused(ctx);
  if (G.state === 'wasted') drawEnd(ctx, 'WASTED', 'The hospital patched you up. Bill: $150. Press ENTER to get up.');
  if (G.state === 'busted') drawEnd(ctx, 'BUSTED', 'The Old Town PD let you walk — after a $200 fine. Press ENTER to go free.');
}

function drawMenu(ctx) {
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('OLD TOWN', VIEW_W / 2, 150);
  ctx.fillStyle = '#9fc3e8';
  ctx.font = 'italic 20px sans-serif';
  ctx.fillText('A rainy riverside city. One wheelman. Five jobs.', VIEW_W / 2, 186);
  ctx.fillStyle = '#ddd';
  ctx.font = '15px sans-serif';
  ctx.fillText('Ray Calloway is back in the Old Town, and Mara Voss has work for him.', VIEW_W / 2, 224);
  ctx.fillText('Steal cars, outrun the police, run the jobs — and try not to get caught.', VIEW_W / 2, 248);
  ctx.font = 'bold 17px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('JOBS  (press 1-5 in game)', VIEW_W / 2, 300);
  ctx.font = '14px sans-serif';
  MISSIONS.forEach((m, i) => {
    const done = G.missionsDone.includes(m.id);
    const unlocked = i === 0 || G.missionsDone.includes(MISSIONS[i - 1].id);
    ctx.fillStyle = done ? '#7dff9b' : unlocked ? '#eee' : '#777';
    ctx.fillText((i + 1) + '. ' + m.title + ' — $' + m.reward + (done ? '  ✓ done' : unlocked ? '' : '  (locked)'), VIEW_W / 2, 326 + i * 24);
  });
  ctx.fillStyle = '#bbb';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move / drive    E steal & exit car    F / click punch & shoot    Space handbrake', VIEW_W / 2, 480);
  ctx.fillText('P pause    M mute    R retry job    Your progress saves automatically', VIEW_W / 2, 504);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(G.save ? 'Press ENTER to continue' : 'Press ENTER to start', VIEW_W / 2, 560);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8,10,16,0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 300);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ddd';
  ctx.fillText('Press P to resume.  Jobs done: ' + G.missionsDone.length + ' / ' + MISSIONS.length + '   •   ' + fmtMoney(G.player.money), VIEW_W / 2, 340);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, title, sub) {
  ctx.fillStyle = 'rgba(20,4,6,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = title === 'WASTED' ? '#ff5a4e' : '#7fb6cf';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, VIEW_W / 2, 320);
  ctx.fillStyle = '#eee';
  ctx.font = '16px sans-serif';
  ctx.fillText(sub, VIEW_W / 2, 360);
  ctx.textAlign = 'left';
}

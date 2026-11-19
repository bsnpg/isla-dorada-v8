// Shot staging for Isla Dorada V8: four frozen scenes mirroring Karimbu's
// structure with our own content. main.js calls stageShot(G, name) when the
// page is opened with ?shot=<name>, then paints twice and sets
// window.__shotReady. Staging only positions state (player, car, traffic,
// police, missions, HUD values) — it never copies Karimbu's names, text,
// code or assets, and never imports the old repo.
//
// Shots:
//   chase  — beachfront avenue at ~110 km/h, low close cam, police ahead,
//            heli in open sky, palms + beach + sea, warm sunset.
//   onfoot — Old Town market plaza, over-the-shoulder behind Wowo, stalls,
//            string lights, crowd, a downed gunman, a tracer.
//   stats  — the 3-column map/stats screen in a staged mid-game state.
//   title  — title panorama, high orbit over the detailed city at sunset.
import * as THREE from 'three';
import { setWanted } from './police.js';
import { spawnGunmen, damageEnemy } from './combat.js';

function setStats(G, { money, rep, health, armour, wanted }) {
  if (money !== undefined) G.money = money;
  if (rep !== undefined) {
    G.rep = rep;
    if (G.progression) G.progression.addRep(G, 0); // refresh rank from rep
  }
  if (health !== undefined) G.health = health;
  if (armour !== undefined) G.armour = armour;
  if (wanted !== undefined) G.wanted = wanted;
  if (G.hud && G.hud.toast) G.hud.toast.style.display = 'none';
}

function forceMinimap(G) {
  // renderHUD draws the minimap every 6th call; the frozen shot only calls
  // it once, so prime the tick.
  if (G.hud) G.hud._mmTick = 5;
}

function showHUD(G) {
  if (G.hud && G.hud.root) G.hud.root.style.display = '';
}

function hideHUD(G) {
  if (G.hud && G.hud.root) G.hud.root.style.display = 'none';
}

function placeTrafficCar(G, index, x, z, heading) {
  const c = G.traffic && G.traffic.cars[index];
  if (!c) return;
  c.pos.set(x, 0, z);
  c.mesh.position.copy(c.pos);
  c.mesh.rotation.y = heading;
}

function placePed(G, index, x, z, heading) {
  const p = G.traffic && G.traffic.peds[index];
  if (!p) return;
  p.pos.set(x, 0, z);
  p.mesh.position.copy(p.pos);
  p.mesh.rotation.y = heading;
}

function placePoliceCar(G, index, x, z, heading, status) {
  const u = G.police && G.police.cars[index];
  if (!u) return;
  u.active = true;
  u.pos.set(x, 0, z);
  u.mesh.visible = true;
  u.mesh.position.copy(u.pos);
  u.mesh.rotation.y = heading;
  if (status) u.status = status;
}

// updatePolice rebuilds the IDPD response list every live step, but a frozen
// shot never steps — rebuild it here from the staged units so the HUD panel
// matches the wanted stars instead of reading "No units responding".
function syncPoliceUnits(G) {
  const P = G.police;
  if (!P) return;
  const hero = (G.player && G.player.pos) || (G.car && G.car.pos) || new THREE.Vector3();
  const dist = (p) => Math.round(Math.hypot(p.x - hero.x, p.z - hero.z));
  const units = [];
  for (const u of P.cars) {
    if (!u.active) continue;
    units.push({ id: u.id || 'UNIT', dist: dist(u.pos), status: u.status || 'PURSUIT', kind: 'car' });
  }
  for (const u of P.foot) {
    if (!u.active) continue;
    units.push({ id: u.id || 'FOOT', dist: dist(u.pos), status: 'FOOT CHASE', kind: 'foot' });
  }
  if (P.heli.active) {
    units.push({ id: 'KITE-1', dist: dist(P.heli.pos), status: 'AIR UNIT', kind: 'heli' });
  }
  P.units = units;
}

function placeFootUnit(G, index, x, z, heading) {
  const u = G.police && G.police.foot[index];
  if (!u) return;
  u.active = true;
  u.id = `FOOT-${index + 1}`;
  u.pos.set(x, 0, z);
  u.mesh.visible = true;
  u.mesh.position.copy(u.pos);
  u.mesh.rotation.y = heading;
}

function stageChase(G) {
  // Beachfront avenue (x = 150 road), hero GT heading north (-z) at 110 km/h.
  const car = G.car;
  const P = G.player;
  car.pos.set(150, 0, 40);
  car.heading = Math.PI;
  car.mesh.rotation.y = Math.PI;
  car.speed = 30.5; // 110 km/h
  car.damage = 62;
  car.mesh.position.copy(car.pos);
  if (G.vehicle) G.vehicle.camPos = null; // chase cam snaps behind the car
  P.onFoot = false;
  P.pos.set(150, 0, 40);
  P.heading = Math.PI;
  if (P.mesh) { P.mesh.visible = false; P.mesh.position.copy(P.pos); }

  // Mid-chase state: Job 4, the courier run; 3 stars, heli up.
  setStats(G, { money: 18450, rep: 3900, health: 72, armour: 55 });
  G.missions.current = G.missions.jobs[3];
  G.missions.stageIndex = 0;
  G.missions.beacon.visible = false;
  setWanted(G, 3);
  // Police ahead on the avenue, closing in.
  placePoliceCar(G, 0, 147, 24, Math.PI, 'RAMMING');
  placePoliceCar(G, 1, 153, 8, Math.PI, 'PURSUIT');
  placePoliceCar(G, 2, 148, -12, Math.PI, 'PURSUIT');
  // Foot units would clutter the road in this frame; keep them parked.
  for (const u of G.police.foot) { u.active = false; u.mesh.visible = false; }
  // Heli in open sky ahead-left, searchlight on the avenue.
  const heli = G.police.heli;
  heli.active = true;
  heli.pos.set(138, 24, -6);
  heli.mesh.visible = true;
  heli.mesh.position.copy(heli.pos);
  heli.mesh.rotation.y = Math.atan2(150 - 138, 40 - (-6));
  // Traffic ahead on the same road + a couple of cars on the cross street.
  placeTrafficCar(G, 0, 147, 18, Math.PI);
  placeTrafficCar(G, 1, 153, -4, Math.PI);
  placeTrafficCar(G, 2, 147, -46, Math.PI);
  placeTrafficCar(G, 3, 120, 22, 0);
  placeTrafficCar(G, 4, 120, -18, Math.PI);
  // Pedestrians on the beach sidewalk.
  placePed(G, 0, 143, 26, 0);
  placePed(G, 1, 143, 8, Math.PI);
  placePed(G, 2, 157, -8, 0);
  placePed(G, 3, 143, -22, Math.PI);
  syncPoliceUnits(G);

  G.showDialogue('MARA', 'The courier is running the Causeway with the fake tape — stay on him, Wowo.');
  showHUD(G);
  forceMinimap(G);
}

function stageOnFoot(G) {
  // Old Town market plaza (-120, 120): Wowo in the open north-east quadrant
  // of the plaza (the x = -120 and z = 120 roads cross the plaza, so the
  // quadrants between them are the clear market ground), facing north-west
  // into the market; camera over his shoulder behind him.
  const P = G.player;
  P.onFoot = true;
  P.pos.set(-110, 0, 108);
  P.heading = Math.atan2(-12, -6);
  P.weapon = 1; // Pistol
  if (P.mesh) {
    P.mesh.visible = true;
    P.mesh.position.copy(P.pos);
    P.mesh.rotation.y = P.heading;
  }
  if (G.car) {
    // The hero car waits parked on the plaza's south road.
    G.car.pos.set(-120, 0, 146);
    G.car.heading = Math.PI / 2;
    G.car.mesh.rotation.y = Math.PI / 2;
    G.car.mesh.position.copy(G.car.pos);
    G.car.speed = 0;
  }

  // Job 2, stage 2: Braga's men in the market.
  setStats(G, { money: 7270, rep: 1875, health: 95, armour: 27 });
  G.missions.current = G.missions.jobs[1];
  G.missions.stageIndex = 1;
  G.missions.stageProgress = 1; // one gunman already down
  G.missions.beacon.visible = false; // the pillar would dominate the frame;
  // the mission panel + dialogue already carry the objective.
  setWanted(G, 2);
  // Two IDPD cars closing in on the east road, foot units at the plaza's
  // north edge — visible, out of the main sightline.
  placePoliceCar(G, 0, -80, 108, 0, 'PURSUIT');
  placePoliceCar(G, 1, -80, 132, Math.PI, 'EN ROUTE');
  for (const u of G.police.cars.slice(2)) { u.active = false; u.mesh.visible = false; }
  placeFootUnit(G, 0, -136, 100, Math.atan2(P.pos.x + 136, P.pos.z - 100));
  placeFootUnit(G, 1, -100, 100, Math.atan2(P.pos.x + 100, P.pos.z - 100));
  for (const u of G.police.foot.slice(2)) { u.active = false; u.mesh.visible = false; }
  syncPoliceUnits(G);

  // Three gunmen on the clear plaza ground: one down, two standing.
  const spawned = spawnGunmen(G, 3, new THREE.Vector3(-120, 0, 116));
  const spots = [
    { x: -116, z: 97, down: true },
    { x: -132, z: 100, down: false },
    { x: -104, z: 98, down: false },
  ];
  spawned.forEach((e, i) => {
    const s = spots[i % spots.length];
    e.pos.set(s.x, 0, s.z);
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.set(0, Math.atan2(P.pos.x - s.x, P.pos.z - s.z), 0);
    if (s.down) damageEnemy(G, e, 999); // falls flat, stays (frozen frame)
  });
  // A tracer from Wowo's pistol toward the far standing gunman.
  const from = P.pos.clone(); from.y += 1.45;
  const to = new THREE.Vector3(-132, 1.2, 100);
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const tracer = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, len),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95 }),
  );
  tracer.position.copy(from).addScaledVector(dir, 0.5);
  tracer.lookAt(to);
  G.scene.add(tracer);
  // Crowd: shoppers on the clear plaza ground ahead of Wowo (north of him,
  // so they are in frame — the camera sits south-east of him).
  const crowd = [
    [-130, 104, 0.5], [-100, 102, 2.8], [-118, 102, 1.5], [-136, 106, 0.2],
    [-102, 104, 1.0], [-126, 104, 2.0], [-120, 100, 0.0], [-108, 100, 3.0],
  ];
  crowd.forEach(([x, z, h], i) => placePed(G, i, x, z, h));
  // A second row of shoppers fills the mid-ground between Wowo and the gunmen.
  const crowd2 = [
    [-118, 106, 0], [-104, 106, 1], [-122, 100, 2],
    [-112, 104, 0.5], [-134, 102, 1.5], [-106, 104, 2.5],
  ];
  crowd2.forEach(([x, z, h], i) => placePed(G, 9 + i, x, z, h));
  placePed(G, 8, -107, 105, Math.atan2(-3, -9)); // Mara, at Wowo's shoulder

  G.showDialogue('MARA', 'Braga’s men are in the aisles — keep the stalls between you and them.');
  showHUD(G);
  forceMinimap(G);

  // Over-the-shoulder camera, owned by this shot (runShot must not run the
  // chase cam over it). Staged a touch further back than the live camera so
  // Wowo reads full-body in the frame.
  G._shotCam = 'manual';
  const fx = Math.sin(P.heading);
  const fz = Math.cos(P.heading);
  G.camera.position.set(P.pos.x - fx * 4.0, P.pos.y + 2.0, P.pos.z - fz * 4.0);
  G.camera.lookAt(P.pos.x + fx * 4.5, P.pos.y + 1.0, P.pos.z + fz * 4.5);
}

function stageStats(G) {
  // A staged mid-game state: 5 jobs done, Job 6 current, idols + career
  // numbers filled in, then the 3-column map/stats screen.
  setStats(G, { money: 18450, rep: 3900, health: 100, armour: 0, wanted: 0 });
  const M = G.missions;
  M.done = [1, 2, 3, 4, 5];
  M.unlocked = 6;
  M.ratings = { 1: 'GOLD', 2: 'SILVER', 3: 'GOLD', 4: 'BRONZE', 5: 'SILVER' };
  M.current = M.jobs[5];
  M.stageIndex = 0;
  M.beacon.visible = false;
  const P = G.progression;
  if (P) {
    P.carsStolen = 41;
    P.copsEscaped = 12;
    P.distanceDriven = 48200;
    P.racesWon = 1;
    P.abilitiesUsed = 38;
    P.idolsFound = 12;
    P.idols.forEach((idol, i) => { if (i < 12) { idol.found = true; idol.mesh.visible = false; } });
    P.skills.Driving.xp = 320; P.skills.Driving.level = 4;
    P.skills.Aim.xp = 150; P.skills.Aim.level = 2;
    P.seenDistricts = ['Casino Row', 'Old Town', 'Harbor', 'Marina', 'Beachfront', 'Causeway'];
    P.districtsSeen = 6;
  }
  G.player.pos.set(120, 0, 40);
  G.waypoint = { x: -100, z: -180 };
  if (G.combat) G.combat.kills = 23;
  G._shotCam = 'manual';
  hideHUD(G);
  if (G.screens) G.screens.openMap(G);
}

function stageTitle(G) {
  // Title panorama: high orbit over the detailed city at sunset. The
  // orbit itself runs in updateScreens from _titleAngle.
  setStats(G, { money: 1250, rep: 0, health: 100, armour: 0, wanted: 0 });
  G._shotCam = 'manual';
  hideHUD(G);
  if (G.screens) {
    G.screens._titleAngle = 0.6;
    G.screens.showTitle(G);
  }
}

export function stageShot(G, name) {
  // Reset the pieces every shot touches so staging is deterministic.
  if (G.combat) {
    for (const e of G.combat.enemies) { e.active = false; e.dead = false; e.mesh.visible = false; }
  }
  if (G.police) {
    for (const u of G.police.cars) { u.active = false; u.mesh.visible = false; }
    for (const u of G.police.foot) { u.active = false; u.mesh.visible = false; }
    G.police.heli.active = false;
    G.police.heli.mesh.visible = false;
  }
  if (G.hud && G.hud.toast) G.hud.toast.style.display = 'none';
  if (name === 'onfoot') stageOnFoot(G);
  else if (name === 'stats') stageStats(G);
  else if (name === 'title') stageTitle(G);
  else stageChase(G); // 'chase' and any unknown name
}

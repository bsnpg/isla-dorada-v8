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

// Staging props: fire, smoke, blast, drops and floating labels. All static
// meshes/sprites, placed by the shot stagers below; the frozen shot never
// steps the loop, so they hold exactly as placed.
function label(G, text, x, y, z, color, s) {
  const c = document.createElement('canvas');
  const m = document.createElement('canvas').getContext('2d');
  m.font = 'bold 40px system-ui, sans-serif';
  c.width = Math.min(512, Math.ceil(m.measureText(text).width) + 24); c.height = 64;
  const x2 = c.getContext('2d');
  x2.font = 'bold 40px system-ui, sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
  x2.lineWidth = 8; x2.strokeStyle = 'rgba(0,0,0,.85)'; x2.strokeText(text, c.width / 2, 32);
  x2.fillStyle = color || '#ffd34d'; x2.fillText(text, c.width / 2, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sp.scale.set(3.4 * (s || 1) * (c.width / 256), 0.85 * (s || 1), 1); sp.position.set(x, y, z); G.scene.add(sp);
  return sp;
}
function fireAt(G, x, z, s) {
  const g = new THREE.Group();
  const cone = (r, h, c, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(px, py, pz); g.add(m);
  };
  cone(1.1 * s, 2.2 * s, 0xff5a1a, 0, 1.1 * s, 0);
  cone(0.8 * s, 1.7 * s, 0xffc21a, 0.3 * s, 0.85 * s, 0.2 * s);
  cone(0.7 * s, 1.4 * s, 0xff8c2a, -0.3 * s, 0.7 * s, -0.2 * s);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.1 * s, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.55, depthWrite: false }));
  smoke.position.set(0, 3.2 * s, 0); smoke.scale.y = 1.6; g.add(smoke);
  const l = new THREE.PointLight(0xff8c2a, 2.5, 12 * s); l.position.set(0, 1.5 * s, 0); g.add(l);
  g.position.set(x, 0, z); G.scene.add(g);
}
function blastAt(G, x, y, z, r) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8c2a, transparent: true, opacity: 0.85, depthWrite: false }));
  m.position.set(x, y, z); G.scene.add(m);
  const l = new THREE.PointLight(0xff8c2a, 3, 20); l.position.set(x, y, z); G.scene.add(l);
}
function dropAt(G, x, z, kind, text) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.55), new THREE.MeshBasicMaterial({ color: kind === 'cash' ? 0x2ec46a : 0x3d7bd9 }));
  m.position.y = 0.12; g.add(m);
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff7e8 }));
  m2.position.y = 0.22; g.add(m2);
  g.position.set(x, 0, z); g.rotation.y = 0.5; G.scene.add(g);
  if (text) label(G, text, x, 1.5, z, kind === 'cash' ? '#7dff9a' : '#9fd8ff', 0.8);
}
function runPose(p) {
  const u = p.mesh.userData;
  if (!u || !u.legL) return;
  u.legL.rotation.x = 0.7; u.legR.rotation.x = -0.7;
  u.armL.rotation.x = -1.1; u.armR.rotation.x = 0.9;
  p.mesh.rotation.x = 0.12;
}
function flipCar(G, index, x, z, heading) {
  const c = G.traffic && G.traffic.cars[index];
  if (!c) return;
  c.pos.set(x, 1.45, z);
  c.mesh.position.copy(c.pos);
  c.mesh.rotation.set(0, heading, Math.PI); // on its roof, wheels up
}
function shrinkPalms(G) {
  // The beach palms beside the avenue grow huge canopies that crowd the
  // top-right of the chase frame; shrink the ones along the chase corridor,
  // hardest for the ones right beside the camera.
  const g = G.world && G.world.group;
  if (!g) return;
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isInstancedMesh || !o.geometry) return;
    // Palm canopies are cones; palm trunks are the 4.6-tall cylinders
    // (lamp poles are 5.2 tall and must stay).
    const gp = o.geometry.parameters || {};
    const isPalm = o.geometry.type === 'ConeGeometry' || (o.geometry.type === 'CylinderGeometry' && gp.height === 4.6);
    if (!isPalm) return;
    for (let i = 0; i < o.count; i += 1) {
      o.getMatrixAt(i, m4); m4.decompose(p, q, s);
      if (p.x > 120 && p.z > -55 && p.z < 55) {
        const k = p.z > 20 && p.z < 55 ? 0.3 : 0.55;
        m4.compose(p, q, s.multiplyScalar(k)); o.setMatrixAt(i, m4);
      }
    }
    o.instanceMatrix.needsUpdate = true;
  });
}

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
  u.id = u.id || `UNIT ${20 + index * 13}`;
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
  car.damage = 88; // engine smoking hard
  car.mesh.position.copy(car.pos);
  if (car.smoke) { car.smoke.material.opacity = 0.7; car.smoke.scale.set(2.4, 2.4, 1); car.smoke.position.set(0, 1.8, -1.2); }
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
  // The courier, dead ahead with his red marker: the quarry car.
  const M = G.missions;
  M.targetCar.visible = true;
  M.targetCar.position.set(150, 0, -28);
  M.targetCar.rotation.y = Math.PI;
  M.target = { mesh: M.targetCar, pos: new THREE.Vector3(150, 0, -28), line: { axis: 'z', at: 150 }, dir: -1, speed: 11, baseSpeed: 11, isTarget: true, hp: 100 };
  if (G.traffic) G.traffic.cars.push(M.target);
  // Police: two in pursuit right ahead, two more sideways as a roadblock,
  // one flanking past it.
  placePoliceCar(G, 0, 147.5, 30, Math.PI, 'RAMMING');
  placePoliceCar(G, 1, 152.5, 22, Math.PI, 'PURSUIT');
  placePoliceCar(G, 2, 147.3, 12, Math.PI / 2, 'ROADBLOCK');
  placePoliceCar(G, 3, 152.7, 12, -Math.PI / 2, 'ROADBLOCK');
  placePoliceCar(G, 4, 154, -52, Math.PI, 'FLANKING');
  for (const u of G.police.cars.slice(5)) { u.active = false; u.mesh.visible = false; }
  for (const u of G.police.foot) { u.active = false; u.mesh.visible = false; }
  // Heli low and close on the left, searchlight cone on the avenue.
  const heli = G.police.heli;
  heli.active = true;
  heli.pos.set(141, 15, -4);
  heli.mesh.visible = true;
  heli.mesh.position.copy(heli.pos);
  heli.mesh.rotation.y = Math.atan2(150 - 141, 40 - (-4));
  heli.mesh.scale.setScalar(1.5);
  if (heli.mesh.userData.cone) heli.mesh.userData.cone.material.opacity = 0.5;
  // Dense traffic in both lanes, all the way down the avenue.
  placeTrafficCar(G, 0, 152.5, 34, Math.PI);
  placeTrafficCar(G, 1, 147.5, 18, Math.PI);
  placeTrafficCar(G, 2, 147.5, 4, Math.PI);
  placeTrafficCar(G, 3, 147.5, -34, Math.PI);
  placeTrafficCar(G, 4, 152.5, -46, Math.PI);
  placeTrafficCar(G, 5, 147.5, -56, Math.PI);
  placeTrafficCar(G, 6, 120, 18, 0);
  placeTrafficCar(G, 7, 120, -14, Math.PI);
  // Two flipped cars wrecked on the road's edges, where the lane traffic
  // ahead cannot hide them; tall fires on each read over the traffic.
  flipCar(G, 8, 143, 26, Math.PI / 2);
  flipCar(G, 9, 157, 2, -Math.PI / 2);
  fireAt(G, 143, 26, 1.6);
  fireAt(G, 157, 2, 1.4);
  fireAt(G, 153.5, 12, 0.7);
  blastAt(G, 147, 1.6, -10, 2.0);
  // Drops scattered on the road.
  dropAt(G, 148.5, 32, 'cash', '$250');
  dropAt(G, 152, 24, 'ammo', 'SMG +30');
  dropAt(G, 147, 8, 'cash', '$500');
  dropAt(G, 153, -4, 'ammo', 'RIFLE +30');
  // Peds fleeing up the road away from the chase, mid-stride.
  const flee = [
    [146, 30], [154, 28], [148, 24], [155, 20], [145, 16], [156, 12],
    [146, 8], [154, 2], [148, -4], [155, -12], [144, -16], [157, -22],
  ];
  flee.forEach(([x, z], i) => { placePed(G, i, x, z, Math.PI); runPose(G.traffic.peds[i]); });
  placePed(G, 12, 158, 26, Math.PI); runPose(G.traffic.peds[12]);
  placePed(G, 13, 158, 8, Math.PI); runPose(G.traffic.peds[13]);
  placePed(G, 14, 158, -14, Math.PI); runPose(G.traffic.peds[14]);
  placePed(G, 15, 143, 34, Math.PI); runPose(G.traffic.peds[15]);
  shrinkPalms(G);
  syncPoliceUnits(G);

  G.showDialogue('MARA', 'The courier is running the Causeway with the fake tape — stay on him, Wowo.');
  showHUD(G);
  forceMinimap(G);
}

function stageOnFoot(G) {
  // Old Town market plaza (-120, 120): Wowo on the clear ground between the
  // stall rows, facing WEST down the open strip toward the gunmen. The
  // camera sits over his shoulder but offset to his right and further back,
  // so the crosshair (screen centre) lands on the gunman, never on Wowo —
  // and there is no tracer. No stall stands between camera and target.
  const P = G.player;
  P.onFoot = true;
  P.pos.set(-104, 0, 116);
  P.heading = -Math.PI / 2; // facing west, down the clear strip
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
  // Two IDPD cars at the plaza's west road, foot units at the plaza's
  // north edge — visible, out of the main sightline.
  placePoliceCar(G, 0, -120, 96, 0, 'PURSUIT');
  placePoliceCar(G, 1, -120, 136, Math.PI, 'EN ROUTE');
  for (const u of G.police.cars.slice(2)) { u.active = false; u.mesh.visible = false; }
  placeFootUnit(G, 0, -136, 100, Math.atan2(P.pos.x + 136, P.pos.z - 100));
  placeFootUnit(G, 1, -100, 100, Math.atan2(P.pos.x + 100, P.pos.z - 100));
  for (const u of G.police.foot.slice(2)) { u.active = false; u.mesh.visible = false; }
  syncPoliceUnits(G);

  // Four gunmen: one down in the open, three standing (the nearest is the
  // crosshair's target).
  const spawned = spawnGunmen(G, 4, new THREE.Vector3(-120, 0, 116));
  const spots = [
    { x: -112, z: 118, down: true },
    { x: -118, z: 116, down: false },
    { x: -126, z: 114, down: false },
    { x: -110, z: 120, down: false },
  ];
  spawned.forEach((e, i) => {
    const s = spots[i % spots.length];
    e.pos.set(s.x, 0, s.z);
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.set(0, Math.atan2(P.pos.x - s.x, P.pos.z - s.z), 0);
    if (s.down) damageEnemy(G, e, 999); // falls flat, stays (frozen frame)
  });
  // The market is on fire: a stall ablaze, an explosion mid-plaza, flames.
  fireAt(G, -132, 115, 1.2);
  fireAt(G, -128, 119, 0.9);
  blastAt(G, -128, 1.4, 113, 1.3);
  label(G, '-220 BAZOOKA HIT', -126, 4.2, 114, '#ffd34d', 0.75);
  label(G, '-34', -119, 3.0, 116, '#ff8c6a', 0.7);
  label(G, 'GUNMAN DOWN', -111, 2.3, 118, '#ffffff', 0.7);
  label(G, '-12', -126, 2.6, 114, '#ff8c6a', 0.65);
  // Drops on the ground, spread along the strip so the labels don't pile up.
  dropAt(G, -108, 113, 'cash', '$250');
  dropAt(G, -118, 120, 'ammo', 'PISTOL +24');
  dropAt(G, -124, 113, 'cash', '$500');
  dropAt(G, -112, 121, 'ammo', 'SMG +30');
  // A fleeing crowd: shoppers running away from the blast, mid-stride.
  const crowd = [
    [-134, 118], [-136, 113], [-130, 120], [-128, 122], [-122, 122],
    [-118, 121], [-114, 124], [-106, 122], [-106, 118], [-134, 123],
    [-126, 124], [-116, 124], [-110, 124], [-138, 116], [-106, 112], [-132, 112],
  ];
  crowd.forEach(([x, z], i) => {
    const h = Math.atan2(x - -124, z - 117); // away from the blast
    placePed(G, i, x, z, h);
    runPose(G.traffic.peds[i]);
  });
  placePed(G, 16, -107, 118, Math.atan2(3, 2)); // Mara, at Wowo's shoulder

  G.showDialogue('MARA', 'Braga’s men are in the aisles — the market’s on fire, keep the stalls between you and them.');
  showHUD(G);
  forceMinimap(G);

  // Over-the-shoulder camera, offset to Wowo's right so he sits left of
  // frame and the centre ray meets the gunman, not his head. Staged further
  // back than the live camera so Wowo reads full-body, not oversized.
  G._shotCam = 'manual';
  const fx = Math.sin(P.heading);
  const fz = Math.cos(P.heading);
  const rx = Math.cos(P.heading);
  const rz = -Math.sin(P.heading);
  G.camera.position.set(P.pos.x - fx * 4.5 + rx * 1.7, P.pos.y + 2.0, P.pos.z - fz * 4.5 + rz * 1.7);
  G.camera.lookAt(-118, 1.25, 116);
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
    P.properties = ['garage'];
    G.time = 2 * 3600 + 3 * 60 + 40; // 02:03:40 played
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

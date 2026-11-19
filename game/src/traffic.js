// traffic.js — Isla Dorada V8: ambient traffic cars + pedestrians.
// Fresh code. Cars run waypoint loops on the road grid; pedestrians walk the
// sidewalks and FLEE from gunfire, explosions and wanted heat.
import * as THREE from 'three';
import * as CFG from './config.js';

const PALETTE = CFG.PALETTE || {};
const GRID = (CFG.GAME && CFG.GAME.roadGrid) || { spacing: 40, half: 160 };

const CAR_COLORS = [0xd94f3d, 0x3d7bd9, 0xe8b93c, 0x3fae6a, 0xe8e4da, 0x7a4fd0, 0x2b2f36, 0xd97ab0];
const SHIRT_COLORS = [0xe8e4da, 0xd94f3d, 0x3d7bd9, 0xe8b93c, 0x3fae6a, 0x7a4fd0, 0xff8c42, 0x2ec4b6];

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function makeTrafficCar(color) {
  const g = new THREE.Group();
  const body = box(2.0, 0.62, 4.2, color, 0, 0.55, 0);
  const cabin = box(1.7, 0.55, 2.1, 0x22303c, 0, 1.1, -0.2);
  g.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.34, wz);
    g.add(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), headMat);
    h.position.set(hx, 0.6, 2.12);
    g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a1e });
  for (const tx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), tailMat);
    t.position.set(tx, 0.62, -2.12);
    g.add(t);
  }
  g.userData.headMat = headMat;
  return g;
}

function makePedestrian(shirt) {
  const g = new THREE.Group();
  const skin = [0xc98d64, 0x8a5a3b, 0xe8b98a, 0x6e4426][Math.floor(Math.random() * 4)];
  g.add(box(0.42, 0.55, 0.24, shirt, 0, 1.05, 0)); // torso
  g.add(box(0.34, 0.34, 0.3, skin, 0, 1.55, 0)); // head
  const legL = box(0.16, 0.55, 0.18, 0x2b2f36, -0.12, 0.28, 0);
  const legR = box(0.16, 0.55, 0.18, 0x2b2f36, 0.12, 0.28, 0);
  const armL = box(0.13, 0.5, 0.13, shirt, -0.3, 1.05, 0);
  const armR = box(0.13, 0.5, 0.13, shirt, 0.3, 1.05, 0);
  g.add(legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, phase: Math.random() * Math.PI * 2 };
  return g;
}

// Road centrelines for the default grid; the sibling's world may supply its own.
function gridLines() {
  const lines = [];
  for (let v = -GRID.half; v <= GRID.half; v += GRID.spacing) {
    lines.push({ axis: 'x', at: v });
    lines.push({ axis: 'z', at: v });
  }
  return lines;
}

export function initTraffic(G) {
  const scene = G.scene;
  const lines = (G.world && G.world.roads) || gridLines();
  const cars = [];
  // Traffic cars are stealable (E), so each one carries the fields driving
  // needs: a VEHICLES def (cycled sedan/taxi/van/muscle), heading, damage,
  // and the wheel/smoke slots updateDriving touches.
  const CAR_DEFS = ['sedan', 'taxi', 'van', 'muscle'];
  for (let i = 0; i < 14; i += 1) {
    const mesh = makeTrafficCar(CAR_COLORS[i % CAR_COLORS.length]);
    scene.add(mesh);
    const line = lines[i % lines.length];
    const along = (Math.random() * 2 - 1) * GRID.half;
    const lane = (i % 2 === 0 ? 1.6 : -1.6);
    const pos = line.axis === 'x'
      ? new THREE.Vector3(along, 0, line.at + lane)
      : new THREE.Vector3(line.at + lane, 0, along);
    cars.push({
      mesh, line, dir: Math.random() < 0.5 ? 1 : -1,
      speed: 7 + Math.random() * 5, baseSpeed: 7 + Math.random() * 5,
      pos, stopped: 0, isTarget: false, hp: 100,
      def: (CFG.VEHICLES || {})[CAR_DEFS[i % CAR_DEFS.length]] || { topSpeed: 26, accel: 10, brake: 26, reverseSpeed: 8, handling: 0.8 },
      defName: CAR_DEFS[i % CAR_DEFS.length],
      heading: 0, damage: 0, wheels: [], frontPivots: [], smoke: null, nitro: false,
    });
    mesh.position.copy(pos);
  }
  const peds = [];
  for (let i = 0; i < 26; i += 1) {
    const mesh = makePedestrian(SHIRT_COLORS[i % SHIRT_COLORS.length]);
    scene.add(mesh);
    const line = lines[(i * 3 + 1) % lines.length];
    const along = (Math.random() * 2 - 1) * GRID.half;
    const side = (i % 2 === 0 ? 5.2 : -5.2);
    const pos = line.axis === 'x'
      ? new THREE.Vector3(along, 0, line.at + side)
      : new THREE.Vector3(line.at + side, 0, along);
    peds.push({
      mesh, line, side, dir: Math.random() < 0.5 ? 1 : -1,
      speed: 1.1 + Math.random() * 0.7, pos,
      fleeing: false, fleeTimer: 0, fleeDir: new THREE.Vector3(1, 0, 0),
    });
    mesh.position.copy(pos);
  }
  G.traffic = { cars, peds, lines, panic: 0 };
  return G.traffic;
}

function carAheadBlocked(G, car, look) {
  const p = car.pos;
  const forward = car.line.axis === 'x'
    ? new THREE.Vector3(car.dir, 0, 0)
    : new THREE.Vector3(0, 0, car.dir);
  for (const other of G.traffic.cars) {
    if (other === car) continue;
    const d = new THREE.Vector3().subVectors(other.pos, p);
    if (d.length() > look || d.length() < 0.5) continue;
    if (d.dot(forward) > 0.7) return true;
  }
  // Do not drive through the hero (on foot or in a car).
  const hero = G.player && G.player.pos;
  if (hero) {
    const d = new THREE.Vector3().subVectors(hero, p);
    if (d.length() < look && d.dot(forward) > 0.6) return true;
  }
  if (G.car && G.car.pos) {
    const d = new THREE.Vector3().subVectors(G.car.pos, p);
    if (d.length() < look && d.dot(forward) > 0.6) return true;
  }
  return false;
}

export function updateTraffic(G, dt) {
  const T = G.traffic;
  if (!T) return;
  const playerPos = (G.player && G.player.pos) || new THREE.Vector3();
  const danger = (G.combat && G.combat.lastShotAt > 0 && (G.time - G.combat.lastShotAt) < 4)
    || (G.combat && G.combat.lastExplosionAt > 0 && (G.time - G.combat.lastExplosionAt) < 5)
    || (G.wanted || 0) >= 2;
  T.panic = danger ? 1 : Math.max(0, T.panic - dt * 0.25);

  for (const car of T.cars) {
    if (car.isTarget) continue; // mission-owned target cars are driven by missions.js
    if (car === G.car && G.player && !G.player.onFoot) {
      // The player is driving this car: driving owns pos/heading, traffic
      // only syncs the mesh — never auto-drive it along its line.
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;
      continue;
    }
    const blocked = carAheadBlocked(G, car, 7);
    car.stopped = blocked ? Math.min(car.stopped + dt, 1) : Math.max(car.stopped - dt * 2, 0);
    const speed = car.baseSpeed * (1 - car.stopped * 0.9) * (danger ? 1.35 : 1);
    if (car.line.axis === 'x') {
      car.pos.x += car.dir * speed * dt;
      if (car.pos.x > GRID.half) { car.pos.x = -GRID.half; }
      if (car.pos.x < -GRID.half) { car.pos.x = GRID.half; }
      car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.pos.z += car.dir * speed * dt;
      if (car.pos.z > GRID.half) { car.pos.z = -GRID.half; }
      if (car.pos.z < -GRID.half) { car.pos.z = GRID.half; }
      car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
      car.heading = car.dir > 0 ? 0 : Math.PI;
    }
    car.mesh.position.copy(car.pos);
  }

  for (const ped of T.peds) {
    const toPlayer = new THREE.Vector3().subVectors(ped.pos, playerPos);
    const nearDanger = toPlayer.length() < 26 && danger;
    if (nearDanger && !ped.fleeing) {
      ped.fleeing = true;
      ped.fleeTimer = 2 + Math.random() * 3;
      ped.fleeDir.copy(toPlayer.normalize());
      // Flee along the sidewalk axis so peds scatter down the street, not into walls.
      if (Math.abs(ped.fleeDir.x) > Math.abs(ped.fleeDir.z)) ped.fleeDir.z = 0;
      else ped.fleeDir.x = 0;
      ped.fleeDir.normalize();
    }
    if (ped.fleeing) {
      ped.fleeTimer -= dt;
      ped.pos.addScaledVector(ped.fleeDir, 4.2 * dt);
      ped.mesh.rotation.y = Math.atan2(ped.fleeDir.x, ped.fleeDir.z);
      if (ped.fleeTimer <= 0) ped.fleeing = false;
    } else {
      const step = ped.dir * ped.speed * dt;
      if (ped.line.axis === 'x') {
        ped.pos.x += step;
        if (ped.pos.x > GRID.half) ped.dir = -1;
        if (ped.pos.x < -GRID.half) ped.dir = 1;
        ped.mesh.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        ped.pos.z += step;
        if (ped.pos.z > GRID.half) ped.dir = -1;
        if (ped.pos.z < -GRID.half) ped.dir = 1;
        ped.mesh.rotation.y = ped.dir > 0 ? 0 : Math.PI;
      }
    }
    // Keep peds inside the island.
    ped.pos.x = Math.max(-GRID.half, Math.min(GRID.half, ped.pos.x));
    ped.pos.z = Math.max(-GRID.half, Math.min(GRID.half, ped.pos.z));
    ped.mesh.position.copy(ped.pos);
    // Walk-cycle swing.
    const u = ped.mesh.userData;
    const swing = Math.sin((G.time || 0) * (ped.fleeing ? 11 : 6) + u.phase) * (ped.fleeing ? 0.7 : 0.45);
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;
  }
}

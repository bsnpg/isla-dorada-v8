import * as THREE from 'three';
import * as CFG from './config.js';

const WANTED_NAMES = ['CLEAN', 'SUSPECT', 'WANTED', 'MANHUNT', 'LOCKDOWN', 'CITYWIDE ALERT'];
const UNIT_PREFIX = ['CORAL', 'REEF', 'TIDE', 'SURF'];

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function makePoliceCar() {
  const g = new THREE.Group();
  g.add(box(2.0, 0.6, 4.2, 0xf2f2ee, 0, 0.55, 0));
  g.add(box(1.7, 0.5, 2.0, 0x22303c, 0, 1.05, -0.2));
  g.add(box(1.9, 0.22, 0.9, 0x1d4fd7, 0, 0.62, 0.4)); // IDPD door band
  const bar = box(1.1, 0.14, 0.4, 0x22303c, 0, 1.42, -0.2);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.36), new THREE.MeshBasicMaterial({ color: 0xff2a1e }));
  red.position.set(-0.28, 1.52, -0.2);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.36), new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
  blue.position.set(0.28, 1.52, -0.2);
  g.add(bar, red, blue);
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
  g.userData = { red, blue };
  return g;
}

function makeFootUnit() {
  const g = new THREE.Group();
  const navy = 0x1d2b4a;
  g.add(box(0.48, 0.62, 0.28, navy, 0, 1.05, 0));
  g.add(box(0.3, 0.3, 0.28, 0xc98d64, 0, 1.58, 0));
  g.add(box(0.36, 0.1, 0.32, navy, 0, 1.78, 0));
  const legL = box(0.17, 0.72, 0.2, 0x141a26, -0.12, 0.36, 0);
  const legR = box(0.17, 0.72, 0.2, 0x141a26, 0.12, 0.36, 0);
  g.add(legL, legR);
  g.userData = { legL, legR, phase: Math.random() * 6 };
  return g;
}

function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x22303c }),
  );
  body.scale.set(1, 0.85, 1.6);
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9fd8e8 }),
  );
  glass.position.set(0, 0.1, 1.1);
  glass.scale.set(1, 0.7, 0.8);
  g.add(glass);
  const rotor = box(5.4, 0.08, 0.3, 0x14161a, 0, 1.15, 0);
  const tail = box(0.3, 0.3, 2.6, 0x22303c, 0, 0.1, -2.2);
  g.add(rotor, tail);
  const coneGeo = new THREE.ConeGeometry(2.6, 14, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff6c8, transparent: true, opacity: 0.16,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, -7.5, 1.2);
  cone.rotation.x = Math.PI; // apex up at the heli, wide end down
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 2.2, 40, 0.35, 0.5, 1);
  spot.position.set(0, -0.5, 1);
  g.add(spot);
  spot.target.position.set(0, -14, 3);
  g.add(spot.target);
  g.userData = { rotor, cone, spot };
  return g;
}

export function initPolice(G) {
  const cars = [];
  for (let i = 0; i < 6; i += 1) {
    const mesh = makePoliceCar();
    mesh.visible = false;
    G.scene.add(mesh);
    cars.push({
      mesh, active: false, id: '', status: 'PARKED',
      pos: new THREE.Vector3(), speed: 0, heading: 0,
      ramTimer: 0, stuckTimer: 0,
    });
  }
  const foot = [];
  for (let i = 0; i < 6; i += 1) {
    const mesh = makeFootUnit();
    mesh.visible = false;
    G.scene.add(mesh);
    foot.push({ mesh, active: false, id: '', pos: new THREE.Vector3(), speed: 4.4, shootTimer: 2, walkPhase: 0 });
  }
  const heliMesh = makeHeli();
  heliMesh.visible = false;
  G.scene.add(heliMesh);
  const heli = { mesh: heliMesh, active: false, pos: new THREE.Vector3(), angle: 0 };
  G.police = { cars, foot, heli, units: [], cooldown: 0, lastLevel: 0 };
  G.wanted = G.wanted ?? 0;
  return G.police;
}

function unitId(i) {
  return `${UNIT_PREFIX[i % UNIT_PREFIX.length]}-${10 + Math.floor(Math.random() * 89)}`;
}

function spawnCarUnit(G, i, heroPos) {
  const u = G.police.cars[i];
  if (u.active) return;
  const angle = Math.random() * Math.PI * 2;
  const dist = 30 + Math.random() * 25;
  u.pos.set(heroPos.x + Math.cos(angle) * dist, 0, heroPos.z + Math.sin(angle) * dist);
  u.id = unitId(i);
  u.status = 'EN ROUTE';
  u.active = true;
  u.speed = 0;
  u.mesh.visible = true;
  u.mesh.position.copy(u.pos);
}

function spawnFootUnit(G, i, heroPos) {
  const u = G.police.foot[i];
  if (u.active) return;
  const angle = Math.random() * Math.PI * 2;
  u.pos.set(heroPos.x + Math.cos(angle) * 12, 0, heroPos.z + Math.sin(angle) * 12);
  u.id = `FOOT-${i + 1}`;
  u.active = true;
  u.mesh.visible = true;
  u.mesh.position.copy(u.pos);
}

export function setWanted(G, level) {
  const P = G.police;
  if (!P) return;
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  const prev = G.wanted || 0;
  G.wanted = clamped;
  const heroPos = (G.player && G.player.pos) || (G.car && G.car.pos) || new THREE.Vector3();
  const wantCars = clamped === 0 ? 0 : clamped === 1 ? 1 : clamped === 2 ? 2 : clamped === 3 ? 3 : clamped === 4 ? 4 : 5;
  const wantFoot = clamped >= 2 ? Math.min(4, clamped) : 0;
  const wantHeli = clamped >= 3;
  let activeCars = 0;
  for (let i = 0; i < P.cars.length; i += 1) {
    if (i < wantCars) { spawnCarUnit(G, i, heroPos); activeCars += 1; }
    else if (P.cars[i].active) {
      P.cars[i].active = false;
      P.cars[i].mesh.visible = false;
      P.cars[i].status = 'PARKED';
    }
  }
  for (let i = 0; i < P.foot.length; i += 1) {
    if (i < wantFoot) spawnFootUnit(G, i, heroPos);
    else if (P.foot[i].active) { P.foot[i].active = false; P.foot[i].mesh.visible = false; }
  }
  if (wantHeli && !P.heli.active) {
    P.heli.active = true;
    P.heli.mesh.visible = true;
    P.heli.pos.set(heroPos.x + 20, 26, heroPos.z + 20);
  } else if (!wantHeli && P.heli.active) {
    P.heli.active = false;
    P.heli.mesh.visible = false;
  }
  if (clamped > prev && G.hud && G.hud.flashToast) {
    G.hud.flashToast(G, `IDPD ${WANTED_NAMES[clamped]} — ${'★'.repeat(clamped)}`);
  }
  if (G.audio && G.audio.playSiren) G.audio.playSiren(clamped > 0);
}

function heroTargetPos(G) {
  if (G.car && G.car.mesh && G.player && !G.player.onFoot) return G.car.pos;
  return (G.player && G.player.pos) || new THREE.Vector3();
}

export function updatePolice(G, dt) {
  const P = G.police;
  if (!P) return;
  const wanted = G.wanted || 0;
  const target = heroTargetPos(G);
  const heroSpeed = (G.car && !G.player.onFoot) ? (G.car.speed || 0) : (G.player ? G.player.speed : 0);

  P.cooldown -= dt;
  if (wanted > 0 && P.cooldown <= 0 && heroSpeed < 2 && !(G.combat && (G.time - G.combat.lastShotAt) < 5)) {
    P.cooldown = 8;
    setWanted(G, wanted - 1);
  }

  const units = [];
  for (const u of P.cars) {
    if (!u.active) continue;
    const to = new THREE.Vector3().subVectors(target, u.pos);
    to.y = 0;
    const dist = to.length();
    const flank = heroSpeed > 14 && u === P.cars[1];
    if (dist > 45) u.status = 'EN ROUTE';
    else if (flank) u.status = 'FLANKING';
    else if (dist < 7) u.status = 'RAMMING';
    else u.status = 'PURSUIT';
    const chaseSpeed = u.status === 'RAMMING' ? 19 : u.status === 'FLANKING' ? 17 : 15;
    let dir = to.normalize();
    if (u.status === 'FLANKING') {
      const ahead = target.clone().addScaledVector(
        new THREE.Vector3(Math.sin(G.player?.heading || 0), 0, Math.cos(G.player?.heading || 0)), 12,
      );
      dir = new THREE.Vector3().subVectors(ahead, u.pos).normalize();
    }
    u.heading = Math.atan2(dir.x, dir.z);
    u.pos.addScaledVector(dir, chaseSpeed * dt);
    u.mesh.position.copy(u.pos);
    u.mesh.rotation.y = u.heading;
    const blink = Math.floor((G.time || 0) * 6) % 2 === 0;
    u.mesh.userData.red.material.color.setHex(blink ? 0xff2a1e : 0x551111);
    u.mesh.userData.blue.material.color.setHex(blink ? 0x223366 : 0x2a6bff);
    if (dist < 3.4) {
      if (G.car && !G.player.onFoot && G.car.damage !== undefined) {
        G.car.damage = Math.min(100, (G.car.damage || 0) + 6);
      } else if (G.player) {
        G.player.hurt(8);
      }
      if (G.combat) G.combat.shake = Math.max(G.combat.shake, 0.5);
      u.pos.addScaledVector(dir, -4 * dt * 10);
    }
    units.push({ id: u.id, dist: Math.round(dist), status: u.status, kind: 'car' });
  }

  for (const u of P.foot) {
    if (!u.active) continue;
    const to = new THREE.Vector3().subVectors(target, u.pos);
    to.y = 0;
    const dist = to.length();
    if (dist > 2.4) {
      u.pos.addScaledVector(to.normalize(), u.speed * dt);
      u.walkPhase += dt * 8;
    }
    u.mesh.position.copy(u.pos);
    u.mesh.rotation.y = Math.atan2(to.x, to.z);
    u.mesh.userData.legL.rotation.x = Math.sin(u.walkPhase) * 0.5;
    u.mesh.userData.legR.rotation.x = -Math.sin(u.walkPhase) * 0.5;
    u.shootTimer -= dt;
    if (dist < 26 && u.shootTimer <= 0) {
      u.shootTimer = 2.2 + Math.random();
      if (G.player && Math.random() < 0.4) G.player.hurt(5);
    }
    units.push({ id: u.id, dist: Math.round(dist), status: 'FOOT CHASE', kind: 'foot' });
  }

  if (P.heli.active) {
    P.heli.angle += dt * 0.25;
    const hx = target.x + Math.cos(P.heli.angle) * 22;
    const hz = target.z + Math.sin(P.heli.angle) * 22;
    P.heli.pos.set(hx, 24 + Math.sin((G.time || 0) * 0.8) * 1.5, hz);
    P.heli.mesh.position.copy(P.heli.pos);
    P.heli.mesh.rotation.y = Math.atan2(target.x - hx, target.z - hz);
    P.heli.mesh.userData.rotor.rotation.y += dt * 22;
    const spot = P.heli.mesh.userData.spot;
    spot.target.position.set(target.x - hx, -24, target.z - hz);
    units.push({ id: 'KITE-1', dist: Math.round(Math.hypot(hx - target.x, hz - target.z)), status: 'AIR UNIT', kind: 'heli' });
  }

  P.units = units;
}

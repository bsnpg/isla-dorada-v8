// player.js — Isla Dorada V8: Wowo on foot.
// Fresh code. Box-built hero (~1.9 units tall), WASD relative to camera,
// mouse-drag steering, over-the-shoulder camera, E enter/exit car, jetpack.
import * as THREE from 'three';
import * as CFG from './config.js';

const KEYS = (CFG.KEYS) || {};
const WALK_SPEED = 6.5;
const RUN_SPEED = 9.5;
const GRAVITY = 22;

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function buildWowo() {
  const g = new THREE.Group();
  const skin = 0xc98d64;
  const jacket = 0xd94f3d; // Wowo's red casino-driver jacket
  const pants = 0x2b3440;
  // Legs
  const legL = box(0.17, 0.78, 0.2, pants, -0.11, 0.39, 0);
  const legR = box(0.17, 0.78, 0.2, pants, 0.11, 0.39, 0);
  // Torso + jacket details
  const torso = box(0.52, 0.62, 0.28, jacket, 0, 1.09, 0);
  const shirt = box(0.3, 0.5, 0.05, 0xe8e4da, 0, 1.1, 0.15);
  // Arms
  const armL = box(0.14, 0.6, 0.16, jacket, -0.35, 1.08, 0);
  const armR = box(0.14, 0.6, 0.16, jacket, 0.35, 1.08, 0);
  // Head + cap
  const head = box(0.3, 0.3, 0.28, skin, 0, 1.62, 0);
  const cap = box(0.34, 0.1, 0.32, 0x1d2b3a, 0, 1.8, 0);
  const brim = box(0.3, 0.05, 0.16, 0x1d2b3a, 0, 1.76, 0.2);
  // Jetpack: two tanks + nozzle bar on the back
  const tankL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10),
    new THREE.MeshLambertMaterial({ color: 0x8a94a6 }),
  );
  tankL.position.set(-0.16, 1.12, -0.22);
  const tankR = tankL.clone();
  tankR.position.x = 0.16;
  const nozzle = box(0.4, 0.08, 0.1, 0x2b2f36, 0, 0.82, -0.22);
  g.add(legL, legR, torso, shirt, armL, armR, head, cap, brim, tankL, tankR, nozzle);
  g.userData = { legL, legR, armL, armR, tankL, tankR };
  return g;
}

export function initPlayer(G) {
  const mesh = buildWowo();
  G.scene.add(mesh);
  const spawn = (G.world && G.world.playerSpawn) || new THREE.Vector3(0, 0, 8);
  const player = {
    mesh, pos: spawn.clone(), heading: Math.PI, speed: 0,
    onFoot: true, vy: 0, grounded: true, jetpack: 100,
    weapon: 0, ammo: {},
    nearCar: null,
    hurtFlash: 0, walkPhase: 0,
  };
  // Starting ammo: Fists/Pistol infinite reserve, others starter mags.
  // Ammo slots follow WEAPON_DEFS order (config slot 0 = Fists).
  player.ammo = {
    0: { mag: Infinity, reserve: Infinity },
    1: { mag: 12, reserve: 60 },
    2: { mag: 30, reserve: 120 },
    3: { mag: 6, reserve: 30 },
    4: { mag: 30, reserve: 90 },
    5: { mag: 1, reserve: 6 },
  };
  player.hurt = (amount) => {
    if ((G.mode || 'play') !== 'play') return;
    let rest = amount;
    if ((G.armour || 0) > 0) {
      const absorbed = Math.min(G.armour, rest * 0.6);
      G.armour -= absorbed;
      rest -= absorbed;
    }
    G.health = Math.max(0, (G.health ?? 100) - rest);
    player.hurtFlash = 1;
    if (G.audio && G.audio.playHurt) G.audio.playHurt();
    if (G.health <= 0) {
      G.mode = 'dead';
      if (G.screens && G.screens.showDead) G.screens.showDead(G);
    }
  };
  G.player = player;
  // Input is owned by main.js (the Input instance on G.input): this module
  // reads G.input.keys / consumeMouse() and adds NO listeners of its own,
  // so E (vehicle.js) and the mode keys (main.js) each have exactly one owner.
  // Mouse look: pointer-lock deltas when locked, drag deltas while button 0
  // is held; consumeMouse() drains every frame so deltas never accumulate.
  return player;
}

function collide(G, pos, radius) {
  // Keep Wowo out of building AABBs supplied by world.js.
  const boxes = (G.world && G.world.colliders) || [];
  for (const b of boxes) {
    const minX = b.minX ?? b.x - (b.hx ?? b.w / 2);
    const maxX = b.maxX ?? b.x + (b.hx ?? b.w / 2);
    const minZ = b.minZ ?? b.z - (b.hz ?? b.d / 2);
    const maxZ = b.maxZ ?? b.z + (b.hz ?? b.d / 2);
    if (pos.x > minX - radius && pos.x < maxX + radius && pos.z > minZ - radius && pos.z < maxZ + radius) {
      // Push out along the smallest penetration axis.
      const pushL = pos.x - (minX - radius);
      const pushR = (maxX + radius) - pos.x;
      const pushB = pos.z - (minZ - radius);
      const pushF = (maxZ + radius) - pos.z;
      const m = Math.min(pushL, pushR, pushB, pushF);
      if (m === pushL) pos.x = minX - radius;
      else if (m === pushR) pos.x = maxX + radius;
      else if (m === pushB) pos.z = minZ - radius;
      else pos.z = maxZ + radius;
    }
  }
  const b = (G.world && G.world.bounds) || { minX: -200, maxX: 215, minZ: -200, maxZ: 200 };
  pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
  pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
}

export function updatePlayer(G, dt) {
  const P = G.player;
  if (!P) return;
  const keys = (G.input && G.input.keys) || new Set();

  if (!P.onFoot) {
    // In a car: hide the on-foot mesh, camera is owned by vehicle.js.
    // (E enter/exit is owned by vehicle.js updateDriving, not here.)
    P.mesh.visible = false;
    return;
  }
  P.mesh.visible = true;

  // Mouse look: pointer-lock deltas when locked, drag deltas while button 0
  // is held. consumeMouse() drains every frame.
  if (G.input && G.input.consumeMouse) {
    const m = G.input.consumeMouse();
    const locked = G.input.mouse ? G.input.mouse.locked : false;
    const dragging = G.input.mouseDown ? G.input.mouseDown(0) : false;
    if ((locked || dragging) && m.dx !== 0) P.heading -= m.dx * 0.0042;
  }

  // WASD relative to camera yaw (camera sits behind the heading).
  let fx = 0;
  let fz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) fz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) fz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
  const moving = fx !== 0 || fz !== 0;
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = run ? RUN_SPEED : WALK_SPEED;
  if (moving) {
    const len = Math.hypot(fx, fz);
    const nx = fx / len;
    const nz = fz / len;
    const sin = Math.sin(P.heading);
    const cos = Math.cos(P.heading);
    // Forward is -Z rotated by heading; right is +X rotated by heading.
    const wx = (-nz * sin + nx * cos);
    const wz = (-nz * cos - nx * sin);
    P.pos.x += wx * speed * dt;
    P.pos.z += wz * speed * dt;
    P.speed = speed;
    // Face the movement direction while running: the model's visual facing
    // is (sin heading, cos heading), so heading = atan2(wx, wz).
    const targetHeading = Math.atan2(wx, wz);
    let diff = targetHeading - P.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    P.heading += diff * Math.min(1, dt * 10);
    P.walkPhase += dt * speed * 1.6;
    if (G.progression) G.progression._footDist = (G.progression._footDist || 0) + speed * dt;
  } else {
    P.speed = 0;
  }

  // --- jetpack ---------------------------------------------------------------
  const wantJet = keys.has('Space');
  if (wantJet && P.jetpack > 0) {
    P.vy = 7.5;
    P.jetpack = Math.max(0, P.jetpack - 26 * dt);
    P.grounded = false;
    if (G.audio && G.audio.playJet) G.audio.playJet(dt);
  } else {
    P.vy -= GRAVITY * dt;
  }
  P.pos.y += P.vy * dt;
  if (P.pos.y <= 0) {
    P.pos.y = 0;
    P.vy = 0;
    P.grounded = true;
    P.jetpack = Math.min(100, P.jetpack + 30 * dt);
  }

  collide(G, P.pos, 0.5);

  // Nearest car for the E prompt: any traffic car, the hero car, or the car
  // the player last drove (G.car may be a stolen traffic car by now).
  P.nearCar = null;
  let best = 3.2;
  const consider = (c) => {
    if (!c || !c.pos) return;
    const d = Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z);
    if (d < best) { best = d; P.nearCar = c; }
  };
  if (G.traffic) for (const c of G.traffic.cars) consider(c);
  if (G.vehicle && G.vehicle.hero) consider(G.vehicle.hero);
  if (G.car) consider(G.car);

  // Mesh pose + walk cycle.
  P.mesh.position.copy(P.pos);
  P.mesh.rotation.y = P.heading;
  const u = P.mesh.userData;
  const swing = moving ? Math.sin(P.walkPhase) * 0.55 : 0;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.7;
  u.armR.rotation.x = swing * 0.7;
  // Jetpack flame glow while thrusting.
  const thrusting = wantJet && P.jetpack > 0;
  u.tankL.material.emissive = new THREE.Color(thrusting ? 0xff7a1a : 0x000000);
  u.tankR.material.emissive = new THREE.Color(thrusting ? 0xff7a1a : 0x000000);

  // --- over-the-shoulder camera ---------------------------------------------
  // Camera sits BEHIND the hero (opposite his facing) and looks forward past
  // him, so W walks away from the camera and we see his back.
  const cam = G.camera;
  if (cam && (G.mode === 'play' || G.mode === undefined)) {
    const behind = 3.2;
    const up = 1.8;
    const cx = P.pos.x - Math.sin(P.heading) * behind;
    const cz = P.pos.z - Math.cos(P.heading) * behind;
    const target = new THREE.Vector3(cx, P.pos.y + up, cz);
    cam.position.lerp(target, Math.min(1, dt * 8));
    const look = new THREE.Vector3(
      P.pos.x + Math.sin(P.heading) * 4,
      P.pos.y + 1.35,
      P.pos.z + Math.cos(P.heading) * 4,
    );
    cam.lookAt(look);
  }

  if (P.hurtFlash > 0) P.hurtFlash = Math.max(0, P.hurtFlash - dt * 2);
}

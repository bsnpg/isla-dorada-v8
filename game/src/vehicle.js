// Driving: the hero car, arcade handling, collisions and the low close chase
// camera. The car is built from boxes with a glossy windshield, emissive lights,
// a spoiler, mirrors and spinning wheels. Forward is +z rotated by heading:
// forward = (sin(heading), 0, cos(heading)).
import * as THREE from 'three';
import { KEYS, VEHICLES } from './config.js';
import { clamp, lerp } from './random.js';

const CAR_RADIUS = 1.7; // collision circle around the car centre
const CAM_BACK = 6.2; // chase cam metres behind the car
const CAM_UP = 2.5; // chase cam metres above the car
const CAM_FOV_BASE = 62;
const CAM_FOV_FAST = 70;

function makeSmokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(120, 120, 120, 0.9)');
  grad.addColorStop(1, 'rgba(120, 120, 120, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

let smokeTexture = null;

/** Build a detailed car from boxes and add it to the scene. */
export function makeCar(G, defName, x, z, heading) {
  const def = VEHICLES[defName] || VEHICLES.sedan;
  const group = new THREE.Group();
  group.name = `car-${defName}`;
  group.position.set(x, 0, z);
  group.rotation.y = heading || 0;

  const paint = new THREE.MeshStandardMaterial({
    color: def.color, metalness: 0.55, roughness: 0.35, flatShading: true,
  });
  const glass = new THREE.MeshStandardMaterial({ color: 0x11151c, metalness: 0.9, roughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.8, roughness: 0.3 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe9a8, emissiveIntensity: 1.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xcc0000, emissiveIntensity: 1.4 });

  function part(w, h, d, mat, px, py, pz, rx = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(px, py, pz);
    if (rx) mesh.rotation.x = rx;
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  const tall = defName === 'van';
  // Body: low wide slab + cabin. Front is +z.
  part(1.9, tall ? 1.15 : 0.55, 4.4, paint, 0, tall ? 0.9 : 0.55, 0);
  part(1.65, tall ? 0.7 : 0.5, tall ? 2.6 : 2.3, paint, 0, tall ? 1.75 : 1.05, tall ? -0.4 : -0.2);
  // Dark glossy windshield + rear glass, slanted.
  part(1.5, 0.06, 0.95, glass, 0, tall ? 1.7 : 1.12, 0.95, -0.45);
  part(1.5, 0.06, 0.8, glass, 0, tall ? 1.7 : 1.12, -1.25, 0.45);
  // Headlights, grille, bumpers, tail lights.
  part(0.35, 0.15, 0.08, headMat, -0.6, 0.62, 2.21);
  part(0.35, 0.15, 0.08, headMat, 0.6, 0.62, 2.21);
  part(1.0, 0.18, 0.06, dark, 0, 0.5, 2.21);
  part(1.95, 0.18, 0.15, dark, 0, 0.32, 2.25);
  part(1.95, 0.18, 0.15, dark, 0, 0.32, -2.25);
  part(0.4, 0.14, 0.08, tailMat, -0.6, 0.65, -2.21);
  part(0.4, 0.14, 0.08, tailMat, 0.6, 0.65, -2.21);
  // Mirrors.
  part(0.18, 0.12, 0.3, paint, -1.02, 1.05, 0.7);
  part(0.18, 0.12, 0.3, paint, 1.02, 1.05, 0.7);

  if (defName === 'aureaGT' || defName === 'muscle') {
    // Rear spoiler on two supports.
    part(1.7, 0.06, 0.4, paint, 0, 1.28, -2.0);
    part(0.08, 0.22, 0.08, dark, -0.6, 1.15, -2.0);
    part(0.08, 0.22, 0.08, dark, 0.6, 1.15, -2.0);
  }
  if (defName === 'police') {
    // IDPD light bar: red + blue halves.
    const red = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x0044ff, emissiveIntensity: 2 });
    part(0.6, 0.12, 0.3, red, -0.32, 1.38, -0.2);
    part(0.6, 0.12, 0.3, blue, 0.32, 1.38, -0.2);
    part(1.92, 0.08, 1.4, dark, 0, 0.86, 1.1); // black hood accent
  }
  if (defName === 'taxi') {
    part(0.7, 0.16, 0.3, headMat, 0, 1.38, -0.2); // roof sign
  }

  // Wheels: 4 cylinders in steer pivots at the front, fixed at the rear.
  const wheelGeo = new THREE.CylinderGeometry(tall ? 0.42 : 0.36, tall ? 0.42 : 0.36, 0.26, 12);
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8);
  const wheels = [];
  const frontPivots = [];
  for (const [wx, wz, front] of [[-0.95, 1.45, true], [0.95, 1.45, true], [-0.95, -1.45, false], [0.95, -1.45, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, tall ? 0.42 : 0.36, wz);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, chrome);
    hub.rotation.z = Math.PI / 2;
    pivot.add(wheel);
    pivot.add(hub);
    group.add(pivot);
    wheels.push(wheel);
    if (front) frontPivots.push(pivot);
  }

  // Damage smoke, from the engine bay (front). Hidden until damage is high.
  if (!smokeTexture) smokeTexture = makeSmokeTexture();
  const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTexture, transparent: true, opacity: 0, depthWrite: false,
  }));
  smoke.position.set(0, 1.1, 1.4);
  smoke.scale.set(1, 1, 1);
  group.add(smoke);

  G.scene.add(group);
  const car = {
    mesh: group,
    def,
    defName,
    pos: group.position, // alias: mesh.position, so G.car.pos is live
    heading: heading || 0,
    speed: 0,
    steer: 0,
    damage: 0,
    wheels,
    frontPivots,
    smoke,
    nitro: false,
  };
  return car;
}

/** Spawn the hero Aurea GT and set up driving state. */
export function initDriving(G) {
  const hero = makeCar(G, 'aureaGT', 120, 40, Math.PI); // beachfront road, facing north
  G.car = hero;
  G.vehicle = {
    hero,
    current: null, // the car the player is driving right now (hero only, for now)
    camPos: null, // smoothed chase-cam position; null = snap on first frame
    camFov: CAM_FOV_BASE,
    nitroActive: false,
  };
  return G.vehicle;
}

function hasUpgrade(G, id) {
  // Upgrades live on G.upgrades.owned (main.js; save.js persists it) and are
  // mirrored onto G.progression.upgrades (same array); accept either shape.
  const up = (G.upgrades && G.upgrades.owned) || (G.progression && G.progression.upgrades);
  if (!up) return false;
  return Array.isArray(up) ? up.includes(id) : !!up[id];
}

function collideCircle(G, pos, radius) {
  // Circle vs every building/stall AABB: push out, report impact speed.
  const colliders = (G.world && G.world.colliders) || [];
  let hit = 0;
  for (const c of colliders) {
    const nx = clamp(pos.x, c.minX, c.maxX);
    const nz = clamp(pos.z, c.minZ, c.maxZ);
    let dx = pos.x - nx;
    let dz = pos.z - nz;
    let dist = Math.hypot(dx, dz);
    if (dist >= radius) continue;
    if (dist < 0.001) {
      // Centre inside the box: push out along the smallest penetration axis.
      const pushes = [
        [pos.x - c.minX, -1, 0], [c.maxX - pos.x, 1, 0],
        [pos.z - c.minZ, 0, -1], [c.maxZ - pos.z, 0, 1],
      ];
      pushes.sort((a, b) => a[0] - b[0]);
      const [, px, pz] = pushes[0];
      pos.x += px * (radius + 0.05);
      pos.z += pz * (radius + 0.05);
      hit = Math.max(hit, 1);
      continue;
    }
    dx /= dist;
    dz /= dist;
    const push = radius - dist;
    pos.x += dx * push;
    pos.z += dz * push;
    hit = Math.max(hit, 1);
  }
  return hit;
}

/** Enter a car: hide the player mesh, hand control to the car. */
export function enterCar(G, car) {
  const target = car || G.car;
  if (!target || !G.player) return;
  if (G.progression && G.vehicle && target !== G.vehicle.hero) {
    G.progression.carsStolen = (G.progression.carsStolen || 0) + 1;
  }
  G.player.onFoot = false;
  if (G.player.mesh) G.player.mesh.visible = false;
  G.vehicle.current = target;
  G.car = target;
  if (G.input) G.input.clearPressed();
}

/** Exit the hero car: place the player on the driver's side, show the mesh. */
export function exitCar(G) {
  const car = G.car;
  if (!car || !G.player) return;
  const rightX = Math.cos(car.heading);
  const rightZ = -Math.sin(car.heading);
  G.player.onFoot = true;
  if (G.player.mesh) {
    G.player.mesh.visible = true;
    G.player.mesh.position.set(car.pos.x + rightX * 2.4, 0, car.pos.z + rightZ * 2.4);
  }
  if (G.player.pos) {
    G.player.pos.set(car.pos.x + rightX * 2.4, 0, car.pos.z + rightZ * 2.4);
  }
  G.player.heading = car.heading;
  car.speed = 0;
  G.vehicle.current = null;
  if (G.input) G.input.clearPressed();
}

/** Arcade driving + E to enter/exit. Runs every fixed step while mode is 'play'. */
export function updateDriving(G, dt) {
  const input = G.input;
  const car = G.car;
  if (!input || !car || !G.player) return;

  // E: get in when on foot and close to a car (the player's nearCar scan
  // covers traffic cars as well as the hero car), get out when driving.
  // This is the ONLY owner of E — player.js only scans for the prompt.
  if (input.justPressed('KeyE')) {
    if (G.player.onFoot) {
      if (G.player.nearCar) enterCar(G, G.player.nearCar);
      else {
        const dx = car.pos.x - (G.player.pos ? G.player.pos.x : 0);
        const dz = car.pos.z - (G.player.pos ? G.player.pos.z : 0);
        if (Math.hypot(dx, dz) < 4.5) enterCar(G, car);
      }
    } else {
      exitCar(G);
    }
  }
  if (G.player.onFoot) return;

  const def = car.def;
  // Driving skill is stored by name ('Driving', level 1 at start) in
  // progression.skills; only levels above 1 add speed.
  const drv = (G.progression && G.progression.skills && G.progression.skills.Driving) || null;
  const drivingSkill = drv ? Math.max(0, (drv.level || 1) - 1) : 0;
  const topSpeed = def.topSpeed * (hasUpgrade(G, 'engine2') ? 1.15 : 1) * (1 + drivingSkill * 0.02);
  const handling = def.handling * (hasUpgrade(G, 'tires') ? 1.15 : 1);

  const fwd = input.anyDown(KEYS.forward);
  const back = input.anyDown(KEYS.back);
  const left = input.anyDown(KEYS.left);
  const right = input.anyDown(KEYS.right);
  const handbrake = input.anyDown(KEYS.handbrake);
  const wantNitro = input.anyDown(KEYS.nitro) && hasUpgrade(G, 'nitro');
  car.nitro = wantNitro && car.speed > 5;
  G.vehicle.nitroActive = car.nitro;

  const accel = def.accel * (car.nitro ? 1.9 : 1);
  const maxSpeed = topSpeed * (car.nitro ? 1.3 : 1);

  if (fwd) car.speed += accel * dt;
  if (back) {
    if (car.speed > 0.5) car.speed -= def.brake * dt; // brake
    else car.speed -= def.accel * 0.6 * dt; // reverse
  }
  if (!fwd && !back) {
    // Engine drag + rolling resistance.
    car.speed -= car.speed * 0.8 * dt + Math.sign(car.speed) * 1.2 * dt;
    if (Math.abs(car.speed) < 0.2) car.speed = 0;
  }
  if (handbrake) {
    car.speed *= Math.max(0, 1 - 3.2 * dt);
  }
  car.speed = clamp(car.speed, -def.reverseSpeed, maxSpeed);

  // Steering: sharper at low speed, looser at top speed; flips in reverse.
  const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
  const steerRate = handbrake ? 6 : 4;
  car.steer = lerp(car.steer, steerTarget, Math.min(1, steerRate * dt));
  const speedRatio = clamp(Math.abs(car.speed) / topSpeed, 0, 1);
  const steerAuthority = lerp(1.0, 0.35, speedRatio);
  car.heading += car.steer * 1.9 * steerAuthority * handling * Math.sign(car.speed || 1) * dt * (car.speed === 0 ? 0 : 1);

  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.pos.x += fx * car.speed * dt;
  car.pos.z += fz * car.speed * dt;
  car.mesh.rotation.y = car.heading;

  // Collisions: buildings and stalls push the car out; hard hits dent it.
  const speedBefore = Math.abs(car.speed);
  if (collideCircle(G, car.pos, CAR_RADIUS) && speedBefore > 6) {
    const dmg = (speedBefore - 6) * 0.9 * (hasUpgrade(G, 'armour') ? 0.5 : 1);
    car.damage = clamp(car.damage + dmg, 0, 100);
    car.speed *= 0.45;
  }
  // World bounds.
  const b = (G.world && G.world.bounds) || { minX: -200, maxX: 215, minZ: -200, maxZ: 200 };
  if (car.pos.x < b.minX || car.pos.x > b.maxX || car.pos.z < b.minZ || car.pos.z > b.maxZ) {
    car.pos.x = clamp(car.pos.x, b.minX, b.maxX);
    car.pos.z = clamp(car.pos.z, b.minZ, b.maxZ);
    car.speed *= 0.5;
  }

  // Wheels spin with speed; front wheels yaw with the steering.
  const wheelSpin = (car.speed * dt) / 0.36;
  for (const wheel of car.wheels) wheel.rotation.x += wheelSpin;
  for (const pivot of car.frontPivots) pivot.rotation.y = car.steer * 0.42;

  // Damage smoke: thick grey puffs once the car is badly dented.
  const smokeLevel = clamp((car.damage - 55) / 45, 0, 1);
  if (car.smoke) {
    car.smoke.material.opacity = smokeLevel * (0.55 + 0.3 * Math.sin((G.time || 0) * 9));
    const s = 1 + smokeLevel * (1.6 + 0.5 * Math.sin((G.time || 0) * 7));
    car.smoke.scale.set(s, s, 1);
  }
}

/**
 * Low close chase camera: ~6.2 m behind the car, ~2.5 m up, looking slightly
 * ahead of it, so the car fills about a quarter of the frame height. FOV
 * widens from 62 to ~70 at top speed (plus a nitro kick). The camera never
 * sinks inside a building: if the smoothed position lands in an AABB it is
 * lifted above that building's roof.
 */
export function updateChaseCam(G, dt) {
  const car = G.car;
  const camera = G.camera;
  if (!car || !camera) return;
  const v = G.vehicle || {};
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);

  const desired = new THREE.Vector3(
    car.pos.x - fx * CAM_BACK,
    CAM_UP,
    car.pos.z - fz * CAM_BACK,
  );
  if (!v.camPos) {
    v.camPos = desired.clone();
  } else {
    const k = 1 - Math.exp(-7 * dt);
    v.camPos.lerp(desired, k);
  }
  // Never clip a building: lift the camera above any roof it would sit inside.
  const colliders = (G.world && G.world.colliders) || [];
  for (const c of colliders) {
    if (v.camPos.x > c.minX - 0.5 && v.camPos.x < c.maxX + 0.5
      && v.camPos.z > c.minZ - 0.5 && v.camPos.z < c.maxZ + 0.5
      && v.camPos.y < c.h + 1.2) {
      v.camPos.y = c.h + 1.2;
    }
  }
  if (v.camPos.y < 1.2) v.camPos.y = 1.2;

  camera.position.copy(v.camPos);
  camera.lookAt(car.pos.x + fx * 7, 1.1, car.pos.z + fz * 7);

  const speedRatio = clamp(Math.abs(car.speed) / Math.max(1, car.def.topSpeed), 0, 1);
  const targetFov = CAM_FOV_BASE + (CAM_FOV_FAST - CAM_FOV_BASE) * speedRatio + (car.nitro ? 4 : 0);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov = lerp(camera.fov, targetFov, Math.min(1, 5 * dt));
    camera.updateProjectionMatrix();
  }
  v.camFov = camera.fov;
}

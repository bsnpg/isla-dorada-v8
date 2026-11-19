// combat.js — Isla Dorada V8: weapons, gunmen, tracers, explosions.
// Fresh code. Five weapons from WEAPONS (config) with mag/reserve ammo,
// R reload, 1-5 switch, click-to-shoot, tracers, muzzle flash, bazooka blast.
import * as THREE from 'three';
import * as CFG from './config.js';

const FALLBACK_WEAPONS = [
  { name: 'Pistol', damage: 25, mag: 12, reserve: 120, rate: 0.28, auto: false, range: 60, spread: 0.01 },
  { name: 'SMG', damage: 14, mag: 30, reserve: 180, rate: 0.09, auto: true, range: 55, spread: 0.05 },
  { name: 'Shotgun', damage: 16, mag: 6, reserve: 36, rate: 0.85, auto: false, range: 28, spread: 0.12, pellets: 6 },
  { name: 'Rifle', damage: 40, mag: 20, reserve: 100, rate: 0.16, auto: true, range: 90, spread: 0.015 },
  { name: 'Bazooka', damage: 120, mag: 1, reserve: 6, rate: 1.4, auto: false, range: 80, spread: 0.005, explosive: true },
];
// Normalize config weapons (config uses fireRate = shots/sec, no spread;
// slot 0 is Fists, a melee weapon) into the fields combat uses.
function normalizeWeapons(raw) {
  const spreadFor = (name) => (name === 'Shotgun' ? 0.12 : name === 'SMG' ? 0.05 : name === 'Rifle' ? 0.015 : name === 'Bazooka' ? 0.005 : 0.01);
  return raw.map((w) => ({
    name: w.name,
    damage: w.damage ?? 10,
    mag: w.mag ?? Infinity,
    reserve: w.reserve ?? Infinity,
    rate: w.rate ?? (w.fireRate ? 1 / w.fireRate : 0.3),
    auto: !!w.auto,
    range: w.range ?? 50,
    spread: w.spread ?? spreadFor(w.name),
    pellets: w.pellets || 1,
    explosive: !!w.explosive,
    melee: w.name === 'Fists' || (w.range ?? 99) <= 3,
  }));
}
export const WEAPON_DEFS = (CFG.WEAPONS && CFG.WEAPONS.length) ? normalizeWeapons(CFG.WEAPONS) : FALLBACK_WEAPONS;
const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function makeGunman() {
  const g = new THREE.Group();
  const shirt = [0x3a3f4a, 0x5a2e2e, 0x2e4a3a, 0x4a3a5a][Math.floor(Math.random() * 4)];
  const skin = 0xc98d64;
  g.add(box(0.46, 0.6, 0.26, shirt, 0, 1.05, 0));
  g.add(box(0.32, 0.32, 0.3, skin, 0, 1.58, 0));
  g.add(box(0.36, 0.08, 0.34, 0x1d1d22, 0, 1.78, 0)); // cap
  const legL = box(0.17, 0.72, 0.2, 0x23262c, -0.12, 0.36, 0);
  const legR = box(0.17, 0.72, 0.2, 0x23262c, 0.12, 0.36, 0);
  const gun = box(0.08, 0.1, 0.55, 0x14161a, 0.2, 1.15, 0.3);
  g.add(legL, legR, gun);
  g.userData = { legL, legR, phase: Math.random() * 6 };
  return g;
}

function makePickup(kind) {
  const g = new THREE.Group();
  if (kind === 'cash') {
    g.add(box(0.5, 0.08, 0.3, 0x2ec46a, 0, 0.25, 0));
    g.add(box(0.4, 0.1, 0.22, 0xe8f5d0, 0, 0.27, 0));
  } else {
    g.add(box(0.14, 0.14, 0.7, 0x14161a, 0, 0.3, 0));
    g.add(box(0.5, 0.1, 0.16, 0x3d7bd9, 0, 0.3, 0));
  }
  const light = new THREE.PointLight(kind === 'cash' ? 0x2ec46a : 0x3d7bd9, 0.6, 4);
  light.position.y = 0.6;
  g.add(light);
  return g;
}

export function initCombat(G) {
  const state = {
    enemies: [], tracers: [], flashes: [], pickups: [], particles: [],
    firing: false, mouseDown: false, lastShotAt: -100, lastExplosionAt: -100,
    cooldown: 0, reloadTimer: 0, reloading: false, shake: 0,
    kills: 0, shotsFired: 0, shotsHit: 0,
  };
  for (let i = 0; i < 8; i += 1) {
    const mesh = makeGunman();
    mesh.visible = false;
    G.scene.add(mesh);
    state.enemies.push({
      mesh, active: false, hp: 100, pos: new THREE.Vector3(),
      shootTimer: 1 + Math.random(), speed: 3.2 + Math.random(), dead: false,
      fallTimer: 0, walkPhase: 0,
    });
  }
  G.combat = state;

  const canvas = G.canvas || document.getElementById('game');
  const onDown = (e) => { if (e.button === 0) state.mouseDown = true; };
  const onUp = () => { state.mouseDown = false; };
  window.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', (e) => {
    if (!G.player) return;
    const idx = WEAPON_KEYS.indexOf(e.code);
    if (idx >= 0 && idx < WEAPON_DEFS.length) {
      G.player.weapon = idx;
      state.reloading = false;
      if (G.audio && G.audio.playClick) G.audio.playClick();
    }
    if (e.code === 'KeyR') startReload(G);
  });
  return state;
}

function startReload(G) {
  const C = G.combat;
  const P = G.player;
  if (!C || !P || C.reloading) return;
  const def = WEAPON_DEFS[P.weapon];
  const ammo = P.ammo[P.weapon];
  if (!ammo || ammo.mag === Infinity || ammo.mag >= def.mag || ammo.reserve <= 0) return;
  C.reloading = true;
  C.reloadTimer = 1.1;
  if (G.audio && G.audio.playReload) G.audio.playReload();
}

function spawnTracer(G, from, to, color = 0xffe9a8) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.1) return;
  const geo = new THREE.BoxGeometry(0.05, 0.05, len);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.lookAt(to);
  G.scene.add(m);
  G.combat.tracers.push({ mesh: m, life: 0.09 });
}

function muzzleFlash(G, pos) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 1 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat);
  m.position.copy(pos);
  G.scene.add(m);
  G.combat.flashes.push({ mesh: m, life: 0.06 });
}

export function explodeAt(G, pos, radius, damage) {
  const C = G.combat;
  C.lastExplosionAt = G.time || 0;
  C.shake = 1;
  // Blast sphere + debris particles.
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8c2a, transparent: true, opacity: 0.9 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
  sphere.position.copy(pos);
  G.scene.add(sphere);
  C.particles.push({ mesh: sphere, life: 0.45, max: radius, kind: 'blast' });
  for (let i = 0; i < 14; i += 1) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff5a1a : 0x3a3a3a }),
    );
    p.position.copy(pos);
    G.scene.add(p);
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
    C.particles.push({ mesh: p, life: 0.7, vel: dir.multiplyScalar(9 + Math.random() * 8), kind: 'debris' });
  }
  const light = new THREE.PointLight(0xff8c2a, 3, 18);
  light.position.copy(pos);
  G.scene.add(light);
  C.particles.push({ mesh: light, life: 0.3, kind: 'light' });
  if (G.audio && G.audio.playExplosion) G.audio.playExplosion();
  // Damage enemies, the hero, nearby traffic and the hero car.
  for (const e of C.enemies) {
    if (!e.active || e.dead) continue;
    if (e.pos.distanceTo(pos) < radius) damageEnemy(G, e, damage);
  }
  if (G.player && G.player.pos.distanceTo(pos) < radius * 0.8) {
    G.player.hurt(Math.round(damage * 0.4));
  }
  if (G.traffic) {
    for (const car of G.traffic.cars) {
      if (car.pos.distanceTo(pos) < radius) car.hp = (car.hp ?? 100) - damage;
    }
  }
}

export function damageEnemy(G, enemy, amount) {
  if (!enemy.active || enemy.dead) return;
  enemy.hp -= amount;
  // Hit flash: tint the torso red briefly.
  enemy.mesh.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissive) {
      child.material.emissive = new THREE.Color(0x881111);
      setTimeout(() => { if (child.material) child.material.emissive = new THREE.Color(0x000000); }, 90);
    }
  });
  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.fallTimer = 1.6;
    enemy.mesh.rotation.x = -Math.PI / 2;
    enemy.mesh.position.y = 0.35;
    G.combat.kills += 1;
    if (G.progression) G.progression._kills = (G.progression._kills || 0) + 1;
    // Drop cash, sometimes a weapon pickup.
    dropPickup(G, enemy.pos.clone(), Math.random() < 0.65 ? 'cash' : 'weapon');
    if (G.audio && G.audio.playKill) G.audio.playKill();
  }
}

function dropPickup(G, pos, kind) {
  const mesh = makePickup(kind);
  mesh.position.copy(pos);
  G.scene.add(mesh);
  G.combat.pickups.push({ mesh, kind, pos: pos.clone(), life: 25, weapon: kind === 'weapon' ? 1 + Math.floor(Math.random() * 3) : 0 });
}

export function spawnGunmen(G, count, nearPos) {
  const C = G.combat;
  if (!C) return [];
  const spawned = [];
  for (const e of C.enemies) {
    if (spawned.length >= count) break;
    if (e.active && !e.dead) continue;
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 12;
    e.pos.set(nearPos.x + Math.cos(angle) * dist, 0, nearPos.z + Math.sin(angle) * dist);
    e.hp = 100;
    e.active = true;
    e.dead = false;
    e.fallTimer = 0;
    e.shootTimer = 1.2 + Math.random();
    e.mesh.visible = true;
    e.mesh.rotation.set(0, 0, 0);
    e.mesh.position.copy(e.pos);
    spawned.push(e);
  }
  return spawned;
}

function tryShoot(G, dt) {
  const C = G.combat;
  const P = G.player;
  if (!P || !P.onFoot || (G.mode !== 'play' && G.mode !== undefined)) return;
  const def = WEAPON_DEFS[P.weapon];
  const ammo = P.ammo[P.weapon];
  if (C.cooldown > 0 || C.reloading) return;
  const wantFire = def.auto ? C.mouseDown : C.mouseDown && !C._clicked;
  if (!wantFire) return;
  C._clicked = true;
  if (ammo && ammo.mag !== Infinity && ammo.mag <= 0) {
    if (G.audio && G.audio.playDry) G.audio.playDry();
    startReload(G);
    return;
  }
  C.cooldown = def.rate;
  C.lastShotAt = G.time || 0;
  C.shotsFired += 1;
  if (ammo && ammo.mag !== Infinity) ammo.mag -= 1;

  // Melee (Fists): no tracer, hit the nearest enemy inside arm's reach.
  if (def.melee) {
    let best = null;
    let bestDist = def.range;
    for (const e of C.enemies) {
      if (!e.active || e.dead) continue;
      const d = e.pos.distanceTo(P.pos);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    if (best) { damageEnemy(G, best, def.damage); C.shotsHit += 1; }
    if (G.audio && G.audio.playShot) G.audio.playShot(P.weapon);
    return;
  }
  const origin = P.pos.clone();
  origin.y += 1.45;
  const heading = P.heading;
  // Shots fly along the hero's visual facing: (sin heading, cos heading),
  // the same convention driving and the on-foot camera use.
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const pellets = def.pellets || 1;
  let hitAny = false;
  for (let i = 0; i < pellets; i += 1) {
    const dir = forward.clone();
    dir.x += (Math.random() - 0.5) * def.spread * 2;
    dir.z += (Math.random() - 0.5) * def.spread * 2;
    dir.y += (Math.random() - 0.5) * def.spread;
    dir.normalize();
    // Nearest enemy inside a narrow cone along the shot.
    let best = null;
    let bestDist = def.range;
    for (const e of C.enemies) {
      if (!e.active || e.dead) continue;
      const to = new THREE.Vector3().subVectors(e.pos.clone().setY(1.2), origin);
      const dist = to.length();
      if (dist > def.range) continue;
      if (to.normalize().dot(dir) < 0.965) continue;
      if (dist < bestDist) { bestDist = dist; best = e; }
    }
    const end = origin.clone().addScaledVector(dir, best ? bestDist : def.range);
    spawnTracer(G, origin.clone().addScaledVector(forward, 0.6), end);
    if (best) {
      hitAny = true;
      if (def.explosive) explodeAt(G, end, 7, def.damage);
      else damageEnemy(G, best, def.damage);
    } else if (def.explosive) {
      explodeAt(G, end, 7, def.damage);
    }
  }
  if (hitAny) {
    C.shotsHit += 1;
    if (G.progression) G.progression._aimHits = (G.progression._aimHits || 0) + 1;
  }
  muzzleFlash(G, origin.clone().addScaledVector(forward, 0.7));
  C.shake = Math.max(C.shake, def.explosive ? 0.9 : 0.12);
  if (G.audio && G.audio.playShot) G.audio.playShot(P.weapon);
  if (ammo && ammo.mag === 0) startReload(G);
}

export function updateCombat(G, dt) {
  const C = G.combat;
  const P = G.player;
  if (!C) return;
  if (!C.mouseDown) C._clicked = false;
  if (C.cooldown > 0) C.cooldown -= dt;
  if (C.reloading) {
    C.reloadTimer -= dt;
    if (C.reloadTimer <= 0) {
      C.reloading = false;
      const def = WEAPON_DEFS[P.weapon];
      const ammo = P.ammo[P.weapon];
      if (ammo && ammo.mag !== Infinity) {
        const need = def.mag - ammo.mag;
        const take = Math.min(need, ammo.reserve);
        ammo.mag += take;
        ammo.reserve -= take;
      }
    }
  }
  if ((G.mode === 'play' || G.mode === undefined) && P && P.onFoot) tryShoot(G, dt);

  // Enemies: approach, shoot, fall, despawn.
  const heroPos = P ? P.pos : new THREE.Vector3();
  for (const e of C.enemies) {
    if (!e.active) continue;
    if (e.dead) {
      e.fallTimer -= dt;
      if (e.fallTimer <= 0) {
        e.active = false;
        e.mesh.visible = false;
      }
      continue;
    }
    const toHero = new THREE.Vector3().subVectors(heroPos, e.pos);
    toHero.y = 0;
    const dist = toHero.length();
    if (dist > 2.2 && dist < 70) {
      e.pos.addScaledVector(toHero.normalize(), e.speed * dt);
      e.walkPhase += dt * 7;
    }
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.y = Math.atan2(toHero.x, toHero.z);
    const u = e.mesh.userData;
    const swing = Math.sin(e.walkPhase) * 0.45;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    // Shoot at the hero when close enough.
    e.shootTimer -= dt;
    if (dist < 34 && e.shootTimer <= 0 && (G.mode === 'play' || G.mode === undefined)) {
      e.shootTimer = 1.4 + Math.random() * 1.2;
      const from = e.pos.clone(); from.y = 1.3;
      const to = heroPos.clone(); to.y = 1.2;
      spawnTracer(G, from, to, 0xff6a5a);
      if (Math.random() < 0.55) P.hurt(6 + Math.floor(Math.random() * 5));
      if (G.audio && G.audio.playEnemyShot) G.audio.playEnemyShot();
    }
  }

  // Pickups: bob, spin, collect on proximity.
  for (let i = C.pickups.length - 1; i >= 0; i -= 1) {
    const pk = C.pickups[i];
    pk.life -= dt;
    pk.mesh.rotation.y += dt * 2;
    pk.mesh.position.y = pk.pos.y + Math.sin((G.time || 0) * 3) * 0.08 + 0.1;
    const d = P ? Math.hypot(pk.pos.x - P.pos.x, pk.pos.z - P.pos.z) : 999;
    if ((d < 1.6 && P.onFoot) || pk.life <= 0) {
      if (d < 1.6 && P.onFoot) {
        if (pk.kind === 'cash') {
          const amount = 80 + Math.floor(Math.random() * 120);
          G.money = (G.money || 0) + amount;
          if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `+$${amount} picked up`);
        } else {
          const w = WEAPON_DEFS[pk.weapon];
          const ammo = P.ammo[pk.weapon];
          if (ammo) ammo.reserve += w.mag * 2;
          if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `${w.name} ammo +${w.mag * 2}`);
        }
        if (G.audio && G.audio.playPickup) G.audio.playPickup();
      }
      G.scene.remove(pk.mesh);
      C.pickups.splice(i, 1);
    }
  }

  // Tracers / flashes / particles fade out.
  for (let i = C.tracers.length - 1; i >= 0; i -= 1) {
    const t = C.tracers[i];
    t.life -= dt;
    if (t.life <= 0) { G.scene.remove(t.mesh); C.tracers.splice(i, 1); }
  }
  for (let i = C.flashes.length - 1; i >= 0; i -= 1) {
    const f = C.flashes[i];
    f.life -= dt;
    f.mesh.scale.multiplyScalar(1.4);
    if (f.life <= 0) { G.scene.remove(f.mesh); C.flashes.splice(i, 1); }
  }
  for (let i = C.particles.length - 1; i >= 0; i -= 1) {
    const p = C.particles[i];
    p.life -= dt;
    if (p.kind === 'blast') {
      const k = 1 - p.life / 0.45;
      p.mesh.scale.setScalar(1 + k * p.max);
      p.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
    } else if (p.kind === 'debris') {
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 14 * dt;
      if (p.mesh.position.y < 0.1) p.mesh.position.y = 0.1;
    } else if (p.kind === 'light') {
      p.mesh.intensity = Math.max(0, p.life * 10);
    }
    if (p.life <= 0) { G.scene.remove(p.mesh); C.particles.splice(i, 1); }
  }
  // Camera shake decays; the renderer/camera owner applies G.combat.shake.
  if (C.shake > 0) C.shake = Math.max(0, C.shake - dt * 2.2);
}

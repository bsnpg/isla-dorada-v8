// progression.js — Isla Dorada V8: REP/ranks, Dorada Idols, skills,
// properties, side jobs. Fresh code.
import * as THREE from 'three';
import * as CFG from './config.js';

const RANKS = [
  { name: 'ROOKIE', at: 0 },
  { name: 'WHEELMAN', at: 500 },
  { name: 'FIXER', at: 1500 },
  { name: 'SHOT CALLER', at: 3500 },
  { name: 'ISLAND KING', at: 7000 },
  { name: 'KING OF DORADA', at: 12000 },
];

const SKILL_NAMES = ['Driving', 'Aim', 'Influence', 'Stamina', 'Stealth', 'Street Sense'];

const PROPERTIES = (CFG.PROPERTIES) || [
  { id: 'boathouse', name: 'Marina Boathouse', price: 4000, income: 60 },
  { id: 'apartment', name: 'Casino Row Apartment', price: 9000, income: 140 },
  { id: 'shophouse', name: 'Old Town Shophouse', price: 15000, income: 240 },
];

// 20 hidden idol spots spread across the island.
const IDOL_SPOTS = [
  [-140, 140], [-120, -40], [-100, 100], [-80, -120], [-60, 20], [-40, 140],
  [-20, -60], [0, 100], [20, -140], [40, 40], [60, -100], [80, 120],
  [100, -20], [120, 60], [140, -120], [140, 140], [-140, -140], [60, 140],
  [-20, 120], [120, -140],
];

function makeIdolMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0x553300 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.25, 8), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
  base.position.y = 0.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat);
  head.position.y = 0.65;
  head.scale.set(1, 1.25, 0.8);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0x14100c }));
  eyes.position.set(0, 0.72, 0.24);
  g.add(base, head, eyes);
  const light = new THREE.PointLight(0xffd34d, 0.7, 6);
  light.position.y = 1;
  g.add(light);
  return g;
}

export function initProgression(G) {
  const idols = [];
  for (const [x, z] of IDOL_SPOTS) {
    const mesh = makeIdolMesh();
    mesh.position.set(x, 0, z);
    G.scene.add(mesh);
    idols.push({ mesh, pos: new THREE.Vector3(x, 0, z), found: false });
  }
  const skills = {};
  for (const name of SKILL_NAMES) skills[name] = { xp: 0, level: 1 };
  const P = {
    rankName: 'ROOKIE', prevRankAt: 0, nextRankAt: 500,
    idols, idolsFound: 0,
    skills, properties: [], upgrades: [],
    sideJob: null, sideJobTimer: 0,
    carsStolen: 0, copsEscaped: 0, distanceDriven: 0, racesWon: 0,
    abilitiesUsed: 0, districtsSeen: 1, seenDistricts: [],
    incomeTimer: 0,
    _footDist: 0, _kills: 0, _aimHits: 0, _lastWanted: 0,
    addRep,
  };
  G.progression = P;
  G.rep = G.rep ?? 0;
  return P;
}

function rankFor(rep) {
  let cur = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i += 1) {
    if (rep >= RANKS[i].at) {
      cur = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  return { cur, next };
}

export function addRep(G, amount) {
  const P = G.progression;
  if (!P) return;
  G.rep = (G.rep || 0) + amount;
  const { cur, next } = rankFor(G.rep);
  if (cur.name !== P.rankName) {
    P.rankName = cur.name;
    if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `Rank up — you are now ${cur.name}!`);
    if (G.audio && G.audio.playSting) G.audio.playSting();
  }
  P.prevRankAt = cur.at;
  P.nextRankAt = next ? next.at : cur.at + 5000;
}

function gainSkill(G, name, amount) {
  const P = G.progression;
  if (!P) return;
  const s = P.skills[name];
  if (!s) return;
  s.xp += amount;
  const level = 1 + Math.floor(s.xp / 100);
  if (level > s.level) {
    s.level = level;
    if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `${name} leveled up — level ${level}`);
  }
}

export function buyProperty(G, id) {
  const P = G.progression;
  const def = PROPERTIES.find((p) => p.id === id);
  if (!P || !def) return false;
  if (P.properties.includes(id)) return false;
  if ((G.money || 0) < def.price) return false;
  G.money -= def.price;
  P.properties.push(id);
  const income = def.income ?? 0;
  if (G.hud && G.hud.flashToast) G.hud.flashToast(G, income > 0 ? `${def.name} bought — earns $${income}/min` : `${def.name} bought`);
  return true;
}

export function startSideJob(G, kind) {
  const P = G.progression;
  if (!P || P.sideJob) return false;
  const jobs = {
    taxi: { label: 'Taxi fare — drop the passenger at Casino Row', spot: new THREE.Vector3(0, 0, -40), payout: 250, time: 90 },
    delivery: { label: 'Delivery — take the package to East Docks', spot: new THREE.Vector3(110, 0, -90), payout: 300, time: 100 },
    race: { label: 'Street race — beat the rival to the Marina', spot: new THREE.Vector3(-120, 0, 60), payout: 800, time: 75 },
  };
  const job = jobs[kind];
  if (!job) return false;
  P.sideJob = { kind, ...job, timer: job.time };
  if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `Side job started: ${job.label}`);
  if (G.missions && G.missions.beacon) {
    G.missions.beacon.visible = true;
    G.missions.beacon.position.copy(job.spot);
  }
  return true;
}

export function updateProgression(G, dt) {
  const P = G.progression;
  if (!P) return;
  const heroPos = (G.player && G.player.pos) || new THREE.Vector3();

  // Rank bookkeeping.
  const { cur, next } = rankFor(G.rep || 0);
  P.rankName = cur.name;
  P.prevRankAt = cur.at;
  P.nextRankAt = next ? next.at : cur.at + 5000;

  // Dorada Idols: collect on proximity.
  for (const idol of P.idols) {
    if (idol.found) continue;
    idol.mesh.rotation.y += dt * 1.5;
    idol.mesh.position.y = Math.sin((G.time || 0) * 2 + idol.pos.x) * 0.15;
    if (Math.hypot(heroPos.x - idol.pos.x, heroPos.z - idol.pos.z) < 2.2) {
      idol.found = true;
      idol.mesh.visible = false;
      P.idolsFound += 1;
      G.money = (G.money || 0) + 500;
      addRep(G, 50);
      if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `Dorada Idol found (${P.idolsFound}/20) — +$500 · +50 REP`);
      if (G.audio && G.audio.playPickup) G.audio.playPickup();
    }
  }

  // Skill XP trickle: driving while fast, aim on hits, stamina on foot.
  const speedKmh = G.car && !G.player.onFoot ? Math.abs(G.car.speed || 0) * 3.6 : 0;
  if (speedKmh > 60) gainSkill(G, 'Driving', dt * 2);
  if (G.player && G.player.onFoot && (G.player.speed || 0) > 0) gainSkill(G, 'Stamina', dt * 1.2);
  if (P._aimHits > 0) { gainSkill(G, 'Aim', P._aimHits * 4); P._aimHits = 0; }
  if (P._kills > 0) { gainSkill(G, 'Street Sense', P._kills * 6); P._kills = 0; }
  if (P._footDist > 50) { gainSkill(G, 'Stealth', 2); P._footDist = 0; }

  // Property income, once a minute.
  P.incomeTimer += dt;
  if (P.incomeTimer >= 60) {
    P.incomeTimer = 0;
    let income = 0;
    for (const id of P.properties) {
      const def = PROPERTIES.find((p) => p.id === id);
      if (def && def.income) income += def.income;
    }
    if (income > 0) {
      G.money = (G.money || 0) + income;
      if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `Property income +$${income}`);
    }
  }

  // Side jobs: reach the spot before the timer runs out.
  if (P.sideJob) {
    const job = P.sideJob;
    job.timer -= dt;
    const d = Math.hypot(heroPos.x - job.spot.x, heroPos.z - job.spot.z);
    if (d < 6) {
      G.money = (G.money || 0) + job.payout;
      addRep(G, 25);
      if (job.kind === 'race') P.racesWon += 1;
      if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `Side job done — +$${job.payout}`);
      if (G.missions && G.missions.beacon && !(G.missions.current)) G.missions.beacon.visible = false;
      P.sideJob = null;
    } else if (job.timer <= 0) {
      if (G.hud && G.hud.flashToast) G.hud.flashToast(G, 'Side job failed — the customer walked away');
      if (G.missions && G.missions.beacon && !(G.missions.current)) G.missions.beacon.visible = false;
      P.sideJob = null;
    }
  }

  // Cops escaped: wanted drops to zero while it was high.
  if ((P._lastWanted || 0) >= 2 && (G.wanted || 0) === 0) P.copsEscaped += 1;
  P._lastWanted = G.wanted || 0;

  // Distance driven.
  if (G.car && !G.player.onFoot) P.distanceDriven += Math.abs(G.car.speed || 0) * dt;

  // Districts seen (for the map checklist): rects are minX/maxX/minZ/maxZ.
  const districts = (CFG.DISTRICTS) || [];
  if (districts.length) {
    for (const d of districts) {
      const inside = d.minX !== undefined
        ? (heroPos.x >= d.minX && heroPos.x <= d.maxX && heroPos.z >= d.minZ && heroPos.z <= d.maxZ)
        : (Math.hypot(heroPos.x - d.x, heroPos.z - d.z) < d.r);
      if (inside && !P.seenDistricts.includes(d.name)) P.seenDistricts.push(d.name);
    }
    P.districtsSeen = Math.max(1, P.seenDistricts.length);
  }
}

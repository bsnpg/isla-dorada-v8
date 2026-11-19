import * as THREE from 'three';
import * as CFG from './config.js';
import { spawnGunmen } from './combat.js';
import { setWanted } from './police.js';

const FALLBACK_MISSIONS = [
  { name: 'Pendaratan', payout: 800, rep: 120 },
  { name: 'Cari Saksi', payout: 1200, rep: 150 },
  { name: 'Curi Bukti', payout: 1600, rep: 180 },
  { name: 'Kejar-kejaran Causeway', payout: 2200, rep: 220 },
  { name: 'Gudang Senjata', payout: 2600, rep: 260 },
  { name: 'Konfrontasi', payout: 3200, rep: 300 },
  { name: 'Bukti Terakhir', payout: 4000, rep: 360 },
  { name: 'Bebas', payout: 6000, rep: 500 },
];
const MISSION_DEFS = (CFG.MISSIONS && CFG.MISSIONS.length >= 8) ? CFG.MISSIONS : FALLBACK_MISSIONS;

const SPOTS = {
  dock: new THREE.Vector3(120, 0, 150),
  market: new THREE.Vector3(-120, 0, 120),
  casino: new THREE.Vector3(0, 0, -40),
  causeway: new THREE.Vector3(-100, 0, -180),
  warehouse: new THREE.Vector3(120, 0, -90),
  precinct: new THREE.Vector3(-40, 0, -110),
  rooftop: new THREE.Vector3(80, 0, 110),
  courthouse: new THREE.Vector3(0, 0, 130),
  marina: new THREE.Vector3(-120, 0, 60),
  oldtown: new THREE.Vector3(80, 0, 20),
};

function stage(kind, spot, opts = {}) {
  return { kind, spot, ...opts };
}

function buildJobs() {
  return [
    {
      n: 1, name: 'Pendaratan', code: 'JOB 01',
      intro: ['MARA', 'Wowo, the ferry drops you at the old dock. Walk to the yellow beacon — nobody here knows your face yet. Keep it that way.'],
      stages: [
        stage('reach', SPOTS.dock, { label: 'Reach the old dock', hint: 'Follow the yellow beacon' }),
        stage('reach', SPOTS.market, { label: 'Meet Mara at the market', hint: 'She has your first lead' }),
      ],
      outro: ['MARA', 'Braga framed you with a doctored casino tape. One witness saw the real one. We start there.'],
    },
    {
      n: 2, name: 'Cari Saksi', code: 'JOB 02',
      intro: ['WOWO', 'A witness in Old Town saw Braga swap the tapes. I need his words before Braga’s men get to him first.'],
      stages: [
        stage('reach', SPOTS.oldtown, { label: 'Reach the witness flat', hint: 'Old Town, second floor' }),
        stage('defeat', SPOTS.oldtown, { label: 'Drive off Braga’s men', count: 3, hint: 'They came to silence him' }),
        stage('reach', SPOTS.marina, { label: 'Escort the witness to the marina', hint: 'Keep him breathing' }),
      ],
      outro: ['WITNESS', 'I saw Braga hand the fake tape to the pit boss. I will say it in court — if I live that long.'],
    },
    {
      n: 3, name: 'Curi Bukti', code: 'JOB 03',
      intro: ['RICO', 'The real tape is in the casino vault office. Cameras, guards, one very grumpy safe. You in?'],
      stages: [
        stage('reach', SPOTS.casino, { label: 'Slip into Casino Dorada', hint: 'Side door, Rico disabled the alarm' }),
        stage('defeat', SPOTS.casino, { label: 'Clear the vault guards', count: 4, hint: 'Quiet is optional now' }),
        stage('reach', SPOTS.rooftop, { label: 'Get the tape to the rooftop drop', hint: 'Luna is waiting with a scooter' }),
      ],
      outro: ['LUNA', 'Got it. The real tape, time-stamped, Braga’s gloves all over it. This is the one.'],
    },
    {
      n: 4, name: 'Kejar-kejaran Causeway', code: 'JOB 04',
      intro: ['MARA', 'Braga’s courier is running the causeway with a copy of the fake tape. Catch that car — do NOT let it reach the pier.'],
      stages: [
        stage('chase', SPOTS.causeway, { label: 'Chase the courier car', hint: 'Stay on him — ram him off the road' }),
        stage('reach', SPOTS.marina, { label: 'Bring the tape to the marina', hint: 'Mara has a boat ready' }),
      ],
      outro: ['MARA', 'Two tapes now, and the courier sang like a radio. Braga’s net is closing — on him.'],
    },
    {
      n: 5, name: 'Gudang Senjata', code: 'JOB 05',
      intro: ['KIKO', 'Braga’s crew stashes their hardware in the east warehouse. Hit it, take what burns, leave nothing they can use.'],
      stages: [
        stage('reach', SPOTS.warehouse, { label: 'Reach the east warehouse', hint: 'Kiko marked the weak door' }),
        stage('defeat', SPOTS.warehouse, { label: 'Clear the warehouse crew', count: 5, hint: 'They will not share' }),
        stage('reach', SPOTS.dock, { label: 'Dump the evidence at the dock', hint: 'The harbour master owes Mara' }),
      ],
      outro: ['RICO', 'Their whole stash, gone in one night. Braga’s men are carrying sticks now. Beautiful.'],
    },
    {
      n: 6, name: 'Konfrontasi', code: 'JOB 06',
      intro: ['WOWO', 'Braga wants a meeting at the precinct. Fine. I will give him one — on my terms, in front of his own men.'],
      stages: [
        stage('reach', SPOTS.precinct, { label: 'Walk into the precinct yard', hint: 'No running. Let them see you' }),
        stage('defeat', SPOTS.precinct, { label: 'Stand your ground', count: 4, hint: 'Braga sent his enforcers' }),
      ],
      outro: ['BRAGA', 'You think a tape clears you? I own this island, driver. Enjoy your little victories.'],
    },
    {
      n: 7, name: 'Bukti Terakhir', code: 'JOB 07',
      intro: ['LUNA', 'One last piece: Braga’s ledger, in the rooftop safe above the market. Kiko says the roof is watched. Of course it is.'],
      stages: [
        stage('reach', SPOTS.rooftop, { label: 'Climb to the market rooftop', hint: 'Use the jetpack if you have to' }),
        stage('defeat', SPOTS.rooftop, { label: 'Hold the roof', count: 3, hint: 'They want that ledger back' }),
        stage('reach', SPOTS.courthouse, { label: 'Deliver the ledger to the courthouse', hint: 'This is the one that ends it' }),
      ],
      outro: ['LUNA', 'Ledger, tapes, witness, courier. Braga has nothing left to hide behind. Tomorrow, court.'],
    },
    {
      n: 8, name: 'Bebas', code: 'JOB 08',
      intro: ['MARA', 'Court day. Braga’s last play is a hit squad on the courthouse steps. Get there alive, Wowo. Then walk out a free man.'],
      stages: [
        stage('defeat', SPOTS.courthouse, { label: 'Stop the hit squad', count: 6, hint: 'They are Braga’s last card' }),
        stage('reach', SPOTS.courthouse, { label: 'Walk into the courthouse', hint: 'Head high. Name clear.' }),
      ],
      outro: ['MARA', 'Not guilty. The whole island heard it. Wowo — you are free. Casino Dorada owes you a job, and I owe you a drink.'],
    },
  ];
}

function makeBeacon(G) {
  const group = new THREE.Group();
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.25, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8 }),
  );
  cyl.position.y = 0.15;
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.y = 13;
  const light = new THREE.PointLight(0xffd34d, 1.4, 22);
  light.position.y = 2;
  group.add(cyl, pillar, light);
  group.visible = false;
  G.scene.add(group);
  return group;
}

function makeTargetCar(G) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.2), new THREE.MeshLambertMaterial({ color: 0x8a1a1a }));
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), new THREE.MeshLambertMaterial({ color: 0x22303c }));
  cabin.position.set(0, 1.1, -0.2);
  g.add(body, cabin);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2a1e }),
  );
  marker.position.y = 2.6;
  marker.rotation.x = Math.PI;
  g.add(marker);
  g.visible = false;
  G.scene.add(g);
  return g;
}

export function initMissions(G) {
  const jobs = buildJobs();
  G.missions = {
    jobs, current: null, stageIndex: 0, stageTimer: 0, stageProgress: 0,
    done: [], ratings: {}, unlocked: 1,
    beacon: makeBeacon(G), targetCar: makeTargetCar(G),
    target: null, targetHp: 100, chaseHold: 0,
  };
  return G.missions;
}

export function startMission(G, n) {
  const M = G.missions;
  if (!M) return false;
  if (n < 1 || n > 8) return false;
  if (n > M.unlocked) return false;
  if (M.current) return false;
  const job = M.jobs[n - 1];
  M.current = job;
  M.stageIndex = 0;
  M.stageTimer = 0;
  M.stageProgress = 0;
  M.target = null;
  M.chaseHold = 0;
  setupStage(G);
  const [speaker, text] = job.intro;
  if (G.hud && G.hud.showDialogue) G.hud.showDialogue(G, speaker, text);
  if (G.audio && G.audio.playSting) G.audio.playSting();
  return true;
}

function setupStage(G) {
  const M = G.missions;
  const job = M.current;
  const st = job.stages[M.stageIndex];
  M.stageTimer = st.timeLimit || 0;
  M.stageProgress = 0;
  M.target = null;
  if (st.kind === 'reach') {
    M.beacon.visible = true;
    M.beacon.position.copy(st.spot);
  } else {
    M.beacon.visible = false;
  }
  if (st.kind === 'defeat') {
    const near = (G.player && G.player.pos) || st.spot;
    spawnGunmen(G, st.count || 3, st.spot.clone ? st.spot : near);
    M.beacon.visible = true;
    M.beacon.position.copy(st.spot);
  }
  if (st.kind === 'chase') {
    M.targetCar.visible = true;
    M.targetCar.position.copy(st.spot);
    M.targetHp = 100;
    M.chaseHold = 0;
    const courier = {
      mesh: M.targetCar, pos: st.spot.clone(), line: { axis: 'x', at: st.spot.z },
      dir: 1, speed: 11, baseSpeed: 11, isTarget: true, hp: 100,
    };
    M.target = courier;
    if (G.traffic) G.traffic.cars.push(courier);
    if (G.hud && G.hud.flashToast) G.hud.flashToast(G, 'Target marked in red — stay on him!');
  }
  if (G.hud && G.hud.flashToast) {
    G.hud.flashToast(G, `${job.code} · Stage ${M.stageIndex + 1}/${job.stages.length} — ${st.label}`);
  }
}

function completeStage(G) {
  const M = G.missions;
  M.stageIndex += 1;
  if (M.stageIndex >= M.current.stages.length) completeJob(G);
  else setupStage(G);
}

function completeJob(G) {
  const M = G.missions;
  const job = M.current;
  const def = MISSION_DEFS[job.n - 1] || {};
  const payout = def.payout || 1000;
  const rep = def.rep || 100;
  G.money = (G.money || 0) + payout;
  G.rep = (G.rep || 0) + rep;
  if (G.progression) G.progression.addRep(G, rep);
  M.done.push(job.n);
  M.ratings[job.n] = 'GOLD';
  M.unlocked = Math.max(M.unlocked, Math.min(8, job.n + 1));
  M.beacon.visible = false;
  M.targetCar.visible = false;
  if (M.target && G.traffic) {
    const idx = G.traffic.cars.indexOf(M.target);
    if (idx >= 0) G.traffic.cars.splice(idx, 1);
  }
  M.target = null;
  M.current = null;
  M.stageIndex = 0;
  const [speaker, text] = job.outro;
  if (G.hud && G.hud.showDialogue) G.hud.showDialogue(G, speaker, text);
  if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `${job.name} complete — +$${payout} · +${rep} REP`);
  if (G.audio && G.audio.playSting) G.audio.playSting();
  setWanted(G, Math.max(0, (G.wanted || 0) - 1));
}

function failJob(G, reason) {
  const M = G.missions;
  const job = M.current;
  M.beacon.visible = false;
  M.targetCar.visible = false;
  if (M.target && G.traffic) {
    const idx = G.traffic.cars.indexOf(M.target);
    if (idx >= 0) G.traffic.cars.splice(idx, 1);
  }
  M.target = null;
  M.current = null;
  M.stageIndex = 0;
  if (G.hud && G.hud.flashToast) G.hud.flashToast(G, `${job.name} failed — ${reason}. Try again from the map.`);
  if (G.hud && G.hud.showDialogue) G.hud.showDialogue(G, 'MARA', 'That one slipped. Shake it off — we run it back when you are ready.');
}

export function updateMissions(G, dt) {
  const M = G.missions;
  if (!M || !M.current) return;
  if (G.mode !== 'play' && G.mode !== undefined) return;
  const job = M.current;
  const st = job.stages[M.stageIndex];
  if (!st) return;
  if (M.stageTimer > 0) {
    M.stageTimer -= dt;
    if (M.stageTimer <= 0) { failJob(G, 'time ran out'); return; }
  }
  if (M.beacon.visible) {
    const s = 1 + Math.sin((G.time || 0) * 4) * 0.12;
    M.beacon.scale.set(s, 1, s);
    M.beacon.rotation.y += dt;
  }
  const heroPos = (G.player && G.player.pos) || new THREE.Vector3();
  const carPos = (G.car && G.car.pos) || heroPos;
  const near = (p, r) => Math.hypot(heroPos.x - p.x, heroPos.z - p.z) < r
    || Math.hypot(carPos.x - p.x, carPos.z - p.z) < r;

  if (st.kind === 'reach') {
    if (near(st.spot, 6)) completeStage(G);
  } else if (st.kind === 'defeat') {
    const alive = (G.combat ? G.combat.enemies.filter((e) => e.active && !e.dead).length : 0);
    M.stageProgress = (st.count || 3) - alive;
    if (alive === 0) completeStage(G);
  } else if (st.kind === 'chase') {
    const t = M.target;
    if (!t) { completeStage(G); return; }
    t.pos.x += t.dir * t.speed * dt;
    if (t.pos.x > 150) t.dir = -1;
    if (t.pos.x < -150) t.dir = 1;
    t.mesh.position.copy(t.pos);
    t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const d = Math.min(
      Math.hypot(heroPos.x - t.pos.x, heroPos.z - t.pos.z),
      Math.hypot(carPos.x - t.pos.x, carPos.z - t.pos.z),
    );
    if (d < 10) {
      M.chaseHold += dt;
      if (d < 4 && G.car && !G.player.onFoot) {
        t.hp -= 30 * dt;
        if (G.combat) G.combat.shake = Math.max(G.combat.shake, 0.3);
      }
    } else {
      M.chaseHold = Math.max(0, M.chaseHold - dt);
    }
    M.stageProgress = Math.min(100, Math.round((M.chaseHold / 4) * 100));
    if (M.chaseHold >= 4 || t.hp <= 0) {
      if (G.traffic) {
        const idx = G.traffic.cars.indexOf(t);
        if (idx >= 0) G.traffic.cars.splice(idx, 1);
      }
      t.mesh.visible = false;
      M.target = null;
      completeStage(G);
    } else if (d > 90) {
      failJob(G, 'the courier got away');
    }
  }
}

import * as CFG from './config.js';
import { saveGame, loadGame, hasSave } from './save.js';

const CSS = `
#screens-root{position:fixed;inset:0;z-index:10;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;color:#f2ede4}
#screens-root .screen{position:absolute;inset:0;display:none;pointer-events:auto}
#screens-root .screen.show{display:block}
#screens-root .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,6,.25),rgba(10,8,6,.72))}
#screens-root .inner{position:relative;height:100%;padding:28px 36px;box-sizing:border-box;overflow:auto}
#screens-root h1.logo{font-size:84px;line-height:.9;margin:0;font-weight:900;letter-spacing:2px;background:linear-gradient(180deg,#ffd34d,#ff5a3c);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 4px 0 rgba(0,0,0,.25)}
#screens-root .sub{font-size:24px;letter-spacing:6px;color:#5eead4;font-weight:800;margin-top:2px}
#screens-root .tagline{font-size:16px;color:#f2ede4;margin:10px 0 18px;max-width:520px}
#screens-root .menu button{display:block;background:transparent;border:0;color:#f2ede4;font-size:26px;font-weight:800;text-align:left;padding:6px 12px;cursor:pointer;letter-spacing:1px}
#screens-root .menu button:hover,#screens-root .menu button.sel{background:#ff5a3c;color:#fff}
#screens-root .chars{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
#screens-root .char{width:170px;background:rgba(20,16,12,.78);border:1px solid rgba(255,211,77,.3);border-radius:10px;padding:10px}
#screens-root .char .face{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#14100c;margin-bottom:6px}
#screens-root .char .nm{font-weight:900;font-size:14px}
#screens-root .char .role{font-size:11px;color:#5eead4}
#screens-root .char .bio{font-size:12px;color:#d8cfc0;margin-top:4px;line-height:1.35}
#screens-root .slots{position:absolute;right:36px;top:150px;width:340px;display:flex;flex-direction:column;gap:10px}
#screens-root .slot{background:rgba(20,16,12,.8);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:10px 12px;font-size:13px}
#screens-root .slot b{font-size:14px}
#screens-root .cols{display:grid;grid-template-columns:280px 1fr 300px;gap:18px;height:100%}
#screens-root .col{background:rgba(20,16,12,.82);border:1px solid rgba(255,211,77,.25);border-radius:12px;padding:14px;overflow:auto}
#screens-root .col h2{margin:0 0 10px;font-size:18px;letter-spacing:1px;color:#ffd34d}
#screens-root .statgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
#screens-root .statgrid b{font-size:20px;display:block;color:#5eead4}
#screens-root .btn{background:#ff5a3c;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-weight:800;cursor:pointer;font-size:14px}
#screens-root .btn.ghost{background:rgba(255,255,255,.12)}
#screens-root .tabs{display:flex;gap:14px;font-size:15px;font-weight:800;margin-bottom:12px}
#screens-root .tabs span{cursor:pointer;color:#c9b98a}
#screens-root .tabs span.on{color:#ff5a3c;border-bottom:3px solid #ff5a3c}
#screens-root #map-canvas{width:100%;border-radius:10px;background:#1a2b3a;display:block}
#screens-root .upg{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;margin:6px 0;font-size:13px}
#screens-root .upg.owned{border:1px solid #2ec46a}
#screens-root .controls-list{font-size:13px;line-height:1.8;columns:2}
#screens-root .dead-title{font-size:64px;font-weight:900;color:#ff5a3c}
#screens-root .joblist{font-size:12px;line-height:1.6}
#screens-root #screen-map .col h2{margin:0 0 6px;font-size:16px}
#screens-root .joblist .done{color:#2ec46a}
#screens-root .joblist .cur{color:#ffd34d;font-weight:800}
#screens-root .joblist .pay{color:#5eead4;float:right}
#screens-root .legend{font-size:10px;line-height:1.5;columns:3}
#screens-root #screen-map .bar{margin:2px 0 4px}
#screens-root #screen-map .inner{padding:10px 24px}
#screens-root #screen-map .tabs{margin-bottom:8px}
#screens-root #screen-map .col{padding:12px}
#screens-root .skillrow{display:flex;justify-content:space-between;font-size:12px;padding:1px 0}
#screens-root .skillrow .bonus{color:#5eead4}
#screens-root .bar{height:8px;background:rgba(255,255,255,.18);border-radius:4px;overflow:hidden;margin:3px 0 8px}
#screens-root .bar i{display:block;height:100%;background:#ffd34d;border-radius:4px}
#screens-root .jobbox{background:rgba(255,211,77,.1);border:1px solid rgba(255,211,77,.4);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.5}
#screens-root .jobbox b{color:#ffd34d}
`;

const CHARS = [
  { name: 'WOWO', role: 'Driver · Ex-Sergeant', color: '#d94f3d', bio: 'Dishonorably discharged after Braga doctored a casino tape. Drives for Casino Dorada by day, clears his name by night.' },
  { name: 'OFFICER BRAGA', role: 'IDPD · The Frame', color: '#2a6bff', bio: 'A decorated officer with a second ledger. He built the case against Wowo — and he will bury anyone who reads it.' },
  { name: 'MARA', role: 'Getaway Driver', color: '#5eead4', bio: 'Knows every alley on the island and every cop’s shift pattern. She was the first to believe Wowo was innocent.' },
  { name: 'RICO SALAS', role: 'Mechanic', color: '#ffd34d', bio: 'Can rebuild a gearbox with a paperclip and a prayer. His garage is the crew’s only safe room.' },
  { name: 'LUNA VELAS', role: 'Fixer', color: '#ff8c6a', bio: 'Trades in secrets and second chances. Found the real casino tape — and the nerve to use it.' },
  { name: 'KIKO TAN', role: 'Lookout', color: '#7a4fd0', bio: 'Sees the whole island from the rooftops. Nothing moves on Isla Dorada without Kiko knowing first.' },
];

const UPGRADES = (CFG.UPGRADES) || [
  { id: 'engine', name: 'Turbo Engine', price: 1500, desc: '+25% top speed' },
  { id: 'armour', name: 'Armour Plating', price: 1200, desc: 'Car takes half damage' },
  { id: 'tires', name: 'Grip Tires', price: 800, desc: 'Sharper handling' },
  { id: 'nitro', name: 'Nitro Kit', price: 2000, desc: 'Shift boost — tap Shift twice' },
  { id: 'paint', name: 'Sunset Paint', price: 500, desc: 'A fresh coat, no cops notice' },
];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function completionPct(G) {
  const done = (G.missions && G.missions.done.length) || 0;
  const idols = (G.progression && G.progression.idolsFound) || 0;
  const races = (G.progression && G.progression.racesWon) || 0;
  return Math.round(((done / 8) * 0.55 + (idols / 20) * 0.3 + Math.min(races, 4) / 4 * 0.15) * 1000) / 10;
}

export function initScreens(G) {
  const root = document.getElementById('screens-root') || (() => {
    const r = document.createElement('div');
    r.id = 'screens-root';
    document.body.appendChild(r);
    return r;
  })();
  root.innerHTML = '';
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const title = el('div', 'screen'); title.id = 'screen-title';
  title.innerHTML = `<div class="scrim"></div><div class="inner">
    <h1 class="logo">ISLA<br>DORADA</h1>
    <div class="sub">8 JOBS TO CLEAR HIS NAME</div>
    <div class="tagline">One framed driver. One island that never sleeps. Take the wheel, run the jobs, and make Officer Braga pay for the tape that stole your life.</div>
    <div class="menu">
      <button id="btn-continue">CONTINUE</button>
      <button id="btn-new">NEW GAME</button>
      <button id="btn-how">HOW TO PLAY</button>
    </div>
    <div class="chars">${CHARS.map((c) => `<div class="char"><div class="face" style="background:${c.color}">${c.name[0]}</div><div class="nm">${c.name}</div><div class="role">${c.role}</div><div class="bio">${c.bio}</div></div>`).join('')}</div>
    <div class="slots" id="title-slots"></div>
    <div class="controls-list" id="howto" style="display:none;margin-top:16px;background:rgba(20,16,12,.8);padding:12px;border-radius:10px">
      <b>WASD</b> move / drive &nbsp; <b>Mouse drag</b> look &nbsp; <b>Click</b> shoot &nbsp; <b>1–5</b> weapons &nbsp; <b>R</b> reload<br>
      <b>E</b> enter / leave car &nbsp; <b>Space</b> jetpack &nbsp; <b>Shift</b> sprint / boost<br>
      <b>Z / X / C</b> crew abilities &nbsp; <b>M</b> map &nbsp; <b>G</b> garage &nbsp; <b>P / Esc</b> pause
    </div>
  </div>`;

  const map = el('div', 'screen'); map.id = 'screen-map';
  map.innerHTML = `<div class="scrim"></div><div class="inner" style="padding:14px 24px">
    <div class="tabs"><span class="on">MAP</span><span>STORY</span><span>STATS</span><span>CREW</span><span>SAVE</span><span id="map-close" style="margin-left:auto;cursor:pointer">✕ CLOSE (M)</span></div>
    <div class="cols" style="grid-template-columns:600px 1fr 300px">
      <div class="col"><h2>ISLA DORADA — CITY MAP</h2><canvas id="map-canvas" width="560" height="430"></canvas><div style="font-size:12px;color:#c9b98a;margin-top:6px">Click the map to set a waypoint · Gold markers are job beacons</div></div>
      <div class="col"><h2>CURRENT JOB</h2><div id="map-job"></div><h2 style="margin-top:12px">JOBS</h2><div id="map-jobs" class="joblist"></div><h2 style="margin-top:12px">CAREER</h2><div class="statgrid" id="map-career"></div><h2 style="margin-top:12px">LEGEND</h2><div id="map-legend" class="legend"></div></div>
      <div class="col"><h2>COLLECTIBLES — DORADA IDOLS</h2><div id="map-collect"></div><h2 style="margin-top:12px">SKILLS</h2><div id="map-skills"></div><h2 style="margin-top:12px">PROPERTIES</h2><div id="map-props"></div><h2 style="margin-top:12px">GARAGE</h2><div id="map-garage"></div><h2 style="margin-top:12px">SAVE SLOTS</h2><div id="map-slots"></div></div>
    </div>
  </div>`;

  const garage = el('div', 'screen'); garage.id = 'screen-garage';
  garage.innerHTML = `<div class="scrim"></div><div class="inner">
    <h1 style="font-size:40px;margin:0">RICO'S GARAGE</h1>
    <div style="color:#5eead4;font-weight:700">DORADA GT · your ride, your rules</div>
    <div id="garage-car" style="margin:12px 0;font-size:14px;color:#d8cfc0"></div>
    <div id="garage-upgrades" style="max-width:560px"></div>
    <button class="btn ghost" id="garage-close" style="margin-top:10px">CLOSE (G)</button>
  </div>`;

  const pause = el('div', 'screen'); pause.id = 'screen-pause';
  pause.innerHTML = `<div class="scrim"></div><div class="inner" style="text-align:center;padding-top:18vh">
    <h1 style="font-size:56px;margin:0">PAUSED</h1>
    <div style="margin:14px 0;color:#c9b98a">The island waits. Braga does not.</div>
    <button class="btn" id="btn-resume">RESUME</button>
    <button class="btn ghost" id="btn-quit-title">SAVE &amp; TITLE</button>
  </div>`;

  const dead = el('div', 'screen'); dead.id = 'screen-dead';
  dead.innerHTML = `<div class="scrim"></div><div class="inner" style="text-align:center;padding-top:18vh">
    <div class="dead-title">BUSTED</div>
    <div style="margin:12px 0;font-size:17px">Wowo went down on the streets of Isla Dorada.<br>The name is still dirty — unless you run it back.</div>
    <button class="btn" id="btn-retry">RUN IT BACK</button>
    <button class="btn ghost" id="btn-dead-title">TITLE SCREEN</button>
  </div>`;

  root.append(title, map, garage, pause, dead);
  const S = { root, title, map, garage, pause, dead, _titleAngle: 0 };
  G.screens = S;

  const showOnly = (node) => {
    for (const s of [title, map, garage, pause, dead]) s.classList.toggle('show', s === node);
  };
  S._showOnly = showOnly;
  S.showTitle = (g) => { showOnly(title); G.mode = 'title'; refreshTitleSlots(g); };
  S.openMap = (g) => { showOnly(map); G.mode = 'map'; refreshMap(g); };
  S.closeMap = (g) => { showOnly(null); G.mode = 'play'; };
  S.openGarage = (g) => { showOnly(garage); G.mode = 'garage'; refreshGarage(g); };
  S.closeGarage = (g) => { showOnly(null); G.mode = 'play'; };
  S.showPause = (g) => { showOnly(pause); G.mode = 'paused'; };
  S.showDead = (g) => { showOnly(dead); /* G.mode already 'dead' */ };
  S.hideAll = () => showOnly(null);

  title.querySelector('#btn-continue').addEventListener('click', () => {
    if (hasSave()) loadGame(G);
    showOnly(null);
    G.mode = 'play';
    if (G.missions && !G.missions.current && (G.missions.done || []).length === 0) G.startMission(1);
  });
  title.querySelector('#btn-new').addEventListener('click', () => {
    showOnly(null);
    G.mode = 'play';
    if (G.missions && G.missions.jobs) {
      G.money = 500; G.rep = 0; G.health = 100; G.armour = 0;
      G.missions.done = []; G.missions.unlocked = 1; G.missions.current = null;
    }
    if (G.hud && G.hud.showDialogue) G.hud.showDialogue(G, 'MARA', 'Welcome back to the island, Wowo. Job one is waiting at the dock.');
    if (G.missions) G.startMission(1);
  });
  title.querySelector('#btn-how').addEventListener('click', () => {
    const h = title.querySelector('#howto');
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
  });
  map.querySelector('#map-close').addEventListener('click', () => S.closeMap(G));
  garage.querySelector('#garage-close').addEventListener('click', () => S.closeGarage(G));
  pause.querySelector('#btn-resume').addEventListener('click', () => { showOnly(null); G.mode = 'play'; });
  pause.querySelector('#btn-quit-title').addEventListener('click', () => { saveGame(G); S.showTitle(G); });
  dead.querySelector('#btn-retry').addEventListener('click', () => {
    G.health = 100; G.armour = 0;
    if (G.player) { G.player.pos.set(0, 0, 8); G.player.onFoot = true; G.player.mesh.visible = true; }
    if (G.police) import('./police.js').then((m) => m.setWanted(G, 0));
    showOnly(null);
    G.mode = 'play';
  });
  dead.querySelector('#btn-dead-title').addEventListener('click', () => S.showTitle(G));

  const mc = map.querySelector('#map-canvas');
  mc.addEventListener('click', (e) => {
    const r = mc.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 415 - 200;
    const z = ((e.clientY - r.top) / r.height) * 400 - 200;
    G.waypoint = { x, z };
    if (G.hud && G.hud.flashToast) G.hud.flashToast(G, 'Waypoint set');
    refreshMap(G);
  });


  function refreshTitleSlots(g) {
    const slot = title.querySelector('#title-slots');
    const saved = hasSave();
    slot.innerHTML = saved
      ? `<div class="slot"><b>SLOT 1 · SAVED GAME</b><br>${completionPct(g)}% complete · $${Math.floor(g.money || 0).toLocaleString('en-US')} · ${g.time ? new Date().toLocaleTimeString() : ''}</div>`
      : `<div class="slot"><b>SLOT 1 · EMPTY</b><br>Start a new game to save your run</div>`
      + `<div class="slot"><b>SLOT 2 · EMPTY</b></div><div class="slot"><b>SLOT 3 · EMPTY</b></div>`;
  }

  const SKILL_BONUS = { Driving: '+12% top speed', Aim: '+10% damage', Influence: '+5% payout', Stamina: '+20 max HP', Stealth: '-10% detection', 'Street Sense': '+10% cash' };
  const LANDMARKS = [
    ['CASINO DORADA', 0, -65, '#ffd34d'], ['IDPD STATION', 40, -40, '#9fd8ff'],
    ['GAS STATION', 20, 20, '#ff8c42'], ['FERRIS WHEEL', -160, 40, '#ffd34d'],
    ['BOARDWALK', -170, 70, '#5eead4'], ['BEACH', 165, 60, '#f0d49a'],
    ['IMPOUND', -100, 60, '#ff8c6a'], ['RESTAURANT', -60, 80, '#ff8c6a'],
    ['GARAGE', 40, 80, '#c9b98a'], ['MARINA', 100, 140, '#5eead4'],
    ['WAREHOUSE', 40, 140, '#ff8c42'], ['HARBOR', 0, 160, '#9fd8ff'],
    ['CAUSEWAY', 0, -180, '#ff5a3c'],
  ];

  function refreshMap(g) {
    const pct = completionPct(g);
    const M = g.missions || {};
    const P = g.progression || {};
    const done = M.done || [];
    const cur = M.current;
    const jobEl = map.querySelector('#map-job');
    if (cur) {
      const def = (CFG.MISSIONS && CFG.MISSIONS[cur.n - 1]) || {};
      const st = cur.stages[M.stageIndex];
      const d = st && st.spot && g.player ? Math.round(Math.hypot(st.spot.x - g.player.pos.x, st.spot.z - g.player.pos.z)) : 0;
      const obj = (def.objective || '').slice(0, 85);
      jobEl.innerHTML = `<div class="jobbox"><b>JOB ${cur.n} — ${cur.name}</b><br>${obj}${(def.objective || '').length > 85 ? '…' : ''}<br>STAGE ${M.stageIndex + 1}/${cur.stages.length} · GPS ${d} m · PAYOUT $${(def.payout || 0).toLocaleString('en-US')}</div>`;
    } else {
      jobEl.innerHTML = `<div class="jobbox">No active job — pick one from the list.</div>`;
    }
    map.querySelector('#map-jobs').innerHTML = (M.jobs || []).map((j) => {
      const def = (CFG.MISSIONS && CFG.MISSIONS[j.n - 1]) || {};
      const isDone = done.includes(j.n);
      const isCur = cur && cur.n === j.n;
      const mark = isDone ? '✓' : isCur ? '▶' : '·';
      const cls = isDone ? 'done' : isCur ? 'cur' : '';
      return `<div class="${cls}">${mark} JOB ${j.n} — ${j.name}<span class="pay">$${(def.payout || 0).toLocaleString('en-US')}</span></div>`;
    }).join('');
    const t = Math.floor(g.time || 0);
    const hh = String(Math.floor(t / 3600)).padStart(2, '0');
    const mm = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    map.querySelector('#map-career').innerHTML = `
      <div><b>${P.carsStolen || 0}</b>CARS STOLEN</div>
      <div><b>${P.copsEscaped || 0}</b>IDPD ESCAPES</div>
      <div><b>${done.length} / 8</b>JOBS DONE</div>
      <div><b>${hh}:${mm}:${ss}</b>PLAY TIME</div>
      <div><b>$${Math.floor(g.money || 0).toLocaleString('en-US')}</b>CASH</div>
      <div><b>${'★'.repeat(g.wanted || 0) || '—'}</b>WANTED</div>`;
    map.querySelector('#map-legend').innerHTML = [
      ['◆', 'JOB — CURRENT', '#ffd34d'], ['●', 'JOB — NEXT', '#fff'], ['●', 'JOB — DONE', '#2ec46a'],
      ['◆', 'CASINO DORADA', '#ffd34d'], ['◆', 'MARINA', '#5eead4'], ['◆', 'WAREHOUSE', '#ff8c42'],
      ['◆', 'IMPOUND', '#ff8c6a'], ['◆', 'HARBOR', '#9fd8ff'], ['◆', 'BOARDWALK', '#5eead4'],
      ['◆', 'BEACH', '#f0d49a'], ['◆', 'GAS STATION', '#ff8c42'], ['◆', 'RESTAURANT', '#ff8c6a'],
      ['◆', 'GARAGE', '#c9b98a'], ['◆', 'FERRIS WHEEL', '#ffd34d'], ['◆', 'CAUSEWAY', '#ff5a3c'],
      ['▲', 'YOU — PLAYER', '#fff'], ['◆', 'DORADA IDOL', '#ffd34d'], ['▣', 'PROPERTY — OWNED', '#2ec46a'],
    ].map(([s, n, c]) => `<div><span style="color:${c}">${s}</span> ${n}</div>`).join('');
    const idols = P.idolsFound || 0;
    const rankName = P.rankName || 'ROOKIE';
    const nextAt = P.nextRankAt || 500;
    const prevAt = P.prevRankAt || 0;
    const repPct = Math.max(0, Math.min(100, ((g.rep || 0) - prevAt) / Math.max(1, nextAt - prevAt) * 100));
    const rep = g.rep || 0;
    const lv = rep >= 12000 ? 6 : rep >= 7000 ? 5 : rep >= 3500 ? 4 : rep >= 1500 ? 3 : rep >= 500 ? 2 : 1;
    map.querySelector('#map-collect').innerHTML = `
      <div style="font-size:12px">Found <span class="bar"><i style="width:${(idols / 20) * 100}%"></i></span>${idols} / 20</div>
      <div style="font-size:12px">REP — LV ${lv} · ${rankName}<span class="bar"><i style="width:${repPct}%"></i></span>${Math.floor(rep).toLocaleString('en-US')} / ${nextAt.toLocaleString('en-US')} XP</div>`;
    const skills = P.skills || {};
    map.querySelector('#map-skills').innerHTML = Object.keys(skills).map((n) => {
      const lv = (skills[n] && skills[n].level) || 1;
      const dots = '●'.repeat(Math.min(5, lv)) + '○'.repeat(Math.max(0, 5 - Math.min(5, lv)));
      return `<div class="skillrow"><span>${n} ${dots}</span><span class="bonus">${SKILL_BONUS[n] || ''}</span></div>`;
    }).join('');
    const owned = P.properties || [];
    const props = CFG.PROPERTIES || [];
    map.querySelector('#map-props').innerHTML = props.map((p) => {
      const has = owned.includes(p.id);
      return `<div class="upg ${has ? 'owned' : ''}" style="padding:4px 8px;margin:2px 0"><div><b>${p.name}</b></div>${has ? '<span style="color:#2ec46a">OWNED ✓</span>' : `<span style="color:#ffd34d">BUY $${p.price.toLocaleString('en-US')}</span>`}</div>`;
    }).join('');
    const upOwned = (g.upgrades && g.upgrades.owned) || P.upgrades || [];
    map.querySelector('#map-garage').innerHTML = UPGRADES.map((u) => {
      const has = upOwned.includes(u.id);
      return `<div class="upg ${has ? 'owned' : ''}" style="padding:4px 8px;margin:2px 0"><div><b>${u.name}</b></div>${has ? '<span style="color:#2ec46a">OWNED</span>' : `<span style="color:#ffd34d">$${u.price.toLocaleString('en-US')}</span>`}</div>`;
    }).join('');
    map.querySelector('#map-slots').innerHTML = [1, 2, 3].map((n) => `<div style="font-size:13px;margin:2px 0">${n} · ${pct}% · ${n === 1 && hasSave() ? 'Saved' : 'Empty'} <button class="btn" data-slot="${n}" style="padding:4px 10px">SAVE</button></div>`).join('');
    map.querySelectorAll('#map-slots .btn').forEach((b) => b.addEventListener('click', () => { saveGame(G); refreshMap(G); }));
    drawMapCanvas(g, map.querySelector('#map-canvas'));
  }

  function drawMapCanvas(g, canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const toX = (x) => ((x + 200) / 415) * W;
    const toY = (z) => ((z + 200) / 400) * H;
    ctx.fillStyle = '#1a2b3a'; ctx.fillRect(0, 0, W, H);
    const DC = [
      ['CASINO ROW', -60, 60, -110, -10, '#7a3a6b'],
      ['PALM HEIGHTS', -170, -60, -170, -10, '#3a6b3a'],
      ['OLD TOWN', -170, -60, -10, 170, '#6b4a2a'],
      ['HARBOR', -60, 60, 90, 190, '#3a3a6b'],
      ['MARINA', 60, 150, 90, 190, '#2a6b6b'],
      ['BEACHFRONT', 60, 172, -170, 90, '#8a7a3a'],
      ['CAUSEWAY', -170, 170, -190, -170, '#6b3a3a'],
    ];
    for (const [n, x0, x1, z0, z1, c] of DC) ctx.fillStyle = c, ctx.fillRect(toX(x0), toY(z0), toX(x1) - toX(x0), toY(z1) - toY(z0));
    ctx.fillStyle = 'rgba(20,30,44,.35)';
    const cw = (40 / 415) * W - 12;
    const ch = (40 / 400) * H - 12;
    for (let x = -200; x < 200; x += 40) {
      for (let z = -200; z < 200; z += 40) {
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        ctx.fillRect(toX(x + 6), toY(z + 6), cw, ch);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3;
    for (const v of [-160, -120, -80, -40, 0, 40, 80, 120, 150]) {
      ctx.beginPath(); ctx.moveTo(toX(v), 0); ctx.lineTo(toX(v), H); ctx.stroke();
    }
    for (const v of [-160, -120, -80, -40, 0, 40, 80, 120, 160]) {
      ctx.beginPath(); ctx.moveTo(0, toY(v)); ctx.lineTo(W, toY(v)); ctx.stroke();
    }
    const LAB = { 'CASINO ROW': [-40, -30], 'PALM HEIGHTS': [-115, -90], 'OLD TOWN': [-115, 120], HARBOR: [-30, 110], MARINA: [130, 110], BEACHFRONT: [130, 30], CAUSEWAY: [-140, -180] };
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    for (const [n, x0, x1, z0, z1] of DC) { const [lx, lz] = LAB[n]; ctx.fillText(n, toX(lx) - 32, toY(lz)); }
    ctx.font = 'bold 10px sans-serif';
    for (const [n, x, z, c] of LANDMARKS) {
      const mx = toX(x);
      const my = toY(z);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(mx, my - 5); ctx.lineTo(mx + 5, my); ctx.lineTo(mx, my + 5); ctx.lineTo(mx - 5, my); ctx.closePath(); ctx.fill();
      const w = ctx.measureText(n).width;
      ctx.fillStyle = 'rgba(10,8,6,.78)'; ctx.fillRect(mx + 7, my - 8, w + 6, 13);
      ctx.fillStyle = '#fff'; ctx.fillText(n, mx + 10, my + 2);
    }
    if (g.missions) {
      for (const job of g.missions.jobs) {
        const done = g.missions.done.includes(job.n);
        const spot = job.stages[0].spot;
        ctx.fillStyle = done ? '#2ec46a' : '#ffd34d';
        ctx.beginPath(); ctx.arc(toX(spot.x), toY(spot.z), 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#14100c'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(job.n), toX(spot.x) - 3, toY(spot.z) + 4);
      }
    }
    if (g.waypoint && g.player) {
      ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(toX(g.player.pos.x), toY(g.player.pos.z)); ctx.lineTo(toX(g.waypoint.x), toY(g.waypoint.z)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff5a3c';
      ctx.beginPath(); ctx.arc(toX(g.waypoint.x), toY(g.waypoint.z), 6, 0, Math.PI * 2); ctx.fill();
    }
    if (g.player) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(toX(g.player.pos.x), toY(g.player.pos.z), 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function refreshGarage(g) {
    const owned = (g.upgrades && g.upgrades.owned) || (g.progression && g.progression.upgrades) || [];
    garage.querySelector('#garage-car').textContent = `DORADA GT · Damage ${Math.round((g.car && g.car.damage) || 0)}% · Upgrades owned: ${owned.length ? owned.join(', ') : 'none yet'}`;
    garage.querySelector('#garage-upgrades').innerHTML = UPGRADES.map((u) => {
      const has = owned.includes(u.id);
      return `<div class="upg ${has ? 'owned' : ''}"><div><b>${u.name}</b><br><span style="color:#c9b98a">${u.desc}</span></div>${has ? '<span style="color:#2ec46a">OWNED</span>' : `<button class="btn" data-upg="${u.id}">$${u.price}</button>`}</div>`;
    }).join('');
    garage.querySelectorAll('[data-upg]').forEach((b) => b.addEventListener('click', () => {
      const u = UPGRADES.find((x) => x.id === b.dataset.upg);
      if (!u) return;
      if ((g.money || 0) < u.price) {
        if (g.hud && g.hud.flashToast) g.hud.flashToast(G, 'Not enough cash for that upgrade');
        return;
      }
      g.money -= u.price;
      g.upgrades = g.upgrades || { owned: [] };
      g.upgrades.owned.push(u.id);
      if (g.progression) {
        if (!g.progression.upgrades) g.progression.upgrades = g.upgrades.owned;
        else if (g.progression.upgrades !== g.upgrades.owned && !g.progression.upgrades.includes(u.id)) g.progression.upgrades.push(u.id);
      }
      if (g.car) g.car.upgrades = g.upgrades.owned;
      if (g.hud && g.hud.flashToast) g.hud.flashToast(G, `${u.name} installed`);
      refreshGarage(g);
    }));
  }

  S._refreshMap = refreshMap;
  S._refreshGarage = refreshGarage;
  S._refreshTitleSlots = refreshTitleSlots;
  return S;
}

export function showTitle(G) { if (G.screens) G.screens.showTitle(G); }
export function openMap(G) { if (G.screens) G.screens.openMap(G); }
export function closeMap(G) { if (G.screens) G.screens.closeMap(G); }
export function openGarage(G) { if (G.screens) G.screens.openGarage(G); }
export function closeGarage(G) { if (G.screens) G.screens.closeGarage(G); }

export function updateScreens(G, dt) {
  const S = G.screens;
  if (!S) return;
  if (G.mode === 'title' && G.camera && G.scene) {
    S._titleAngle += dt * 0.045;
    const r = 95;
    const a = S._titleAngle;
    G.camera.position.set(Math.cos(a) * r, 26 + Math.sin(a * 0.7) * 6, Math.sin(a) * r);
    G.camera.lookAt(0, 6, 0);
  }
}

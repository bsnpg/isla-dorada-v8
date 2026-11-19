// hud.js — Isla Dorada V8: the full in-game HUD.
// Fresh CSS + DOM, built at runtime under #hud-root. Dense designed HUD:
// mission panel, IDPD response list, money/wanted/clock, rank bar, weapon
// slots, crew cards, circular minimap, vitals, speed, dialogue, crosshair.
import * as CFG from './config.js';
import { WEAPON_DEFS } from './combat.js';

const CSS = `
#hud-root{position:fixed;inset:0;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;color:#f2ede4;z-index:5}
#hud-root .panel{background:rgba(20,16,12,.72);border:1px solid rgba(255,211,77,.25);border-radius:10px;padding:8px 12px;backdrop-filter:blur(2px)}
#hud-mission{position:absolute;top:12px;left:12px;width:330px}
#hud-mission .jobcode{color:#ffd34d;font-weight:800;letter-spacing:1px;font-size:12px}
#hud-mission .jobname{font-size:19px;font-weight:800;line-height:1.15}
#hud-mission .stage{font-size:12px;color:#9fd8e8;margin-top:2px}
#hud-mission .obj{font-size:13px;margin-top:4px}
#hud-mission .next{font-size:12px;color:#c9b98a}
#hud-mission .timer{color:#ff8c6a;font-weight:700}
#hud-police{position:absolute;top:150px;left:12px;width:250px;font-size:12px}
#hud-police h3{margin:0 0 4px;color:#ff8c6a;font-size:12px;letter-spacing:1px}
#hud-police .unit{display:flex;justify-content:space-between;padding:1px 0}
#hud-police .unit .st{color:#ffd34d}
#hud-tr{position:absolute;top:12px;right:12px;text-align:right;text-shadow:0 2px 4px rgba(0,0,0,.75);background:rgba(20,16,12,.6);border:1px solid rgba(255,211,77,.25);border-radius:10px;padding:8px 12px}
#hud-money{font-size:30px;font-weight:900;color:#5eead4;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#hud-clock{font-size:14px;color:#f2ede4}
#hud-stars{font-size:22px;letter-spacing:2px;color:#ffd34d}
#hud-stars .off{color:rgba(255,255,255,.25)}
#hud-rank{margin-top:4px;font-size:12px}
#hud-rankbar{height:8px;background:rgba(255,255,255,.18);border-radius:4px;overflow:hidden;margin-top:2px}
#hud-rankfill{height:100%;background:linear-gradient(90deg,#ffd34d,#ff8c2a);width:0%}
#hud-weapons{position:absolute;top:168px;right:12px;display:flex;gap:6px}
#hud-weapons .slot{width:64px;text-align:center;background:rgba(20,16,12,.72);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px 2px;font-size:11px}
#hud-weapons .slot.on{border-color:#ffd34d;box-shadow:0 0 0 2px rgba(255,211,77,.5)}
#hud-weapons .slot .k{color:#ffd34d;font-weight:800}
#hud-weapons .slot .ammo{font-size:12px;font-weight:700}
#hud-crew{position:absolute;top:256px;right:12px;width:210px;display:flex;flex-direction:column;gap:6px}
#hud-crew .card{display:flex;gap:8px;align-items:center;background:rgba(20,16,12,.72);border:1px solid rgba(94,234,212,.35);border-radius:10px;padding:6px 8px}
#hud-crew .card.ready{border-color:#5eead4}
#hud-crew .card.cd{opacity:.55}
#hud-crew .face{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#14100c;flex:none}
#hud-crew .nm{font-size:13px;font-weight:800}
#hud-crew .ab{font-size:11px;color:#9fd8e8}
#hud-crew .key{margin-left:auto;font-size:11px;color:#ffd34d;font-weight:800}
#hud-minimap-wrap{position:absolute;left:12px;bottom:64px}
#hud-minimap{border-radius:50%;border:3px solid rgba(255,211,77,.6);background:#1a2b3a;display:block}
#hud-district{position:absolute;left:12px;bottom:222px;font-size:15px;font-weight:800;text-shadow:0 2px 4px #000}
#hud-district small{display:block;font-size:11px;color:#c9d4de;font-weight:400}
#hud-vitals{position:absolute;left:172px;bottom:64px;width:190px;font-size:12px}
#hud-vitals .bar{height:10px;background:rgba(255,255,255,.18);border-radius:5px;overflow:hidden;margin:2px 0 6px}
#hud-vitals .fill{height:100%}
#hud-speed{position:absolute;right:16px;bottom:52px;text-align:right;text-shadow:0 2px 6px #000}
#hud-speed .num{font-size:56px;font-weight:900;line-height:.9}
#hud-speed .unit{font-size:13px;color:#c9d4de}
#hud-speed .veh{font-size:14px;color:#5eead4;font-weight:800}
#hud-speed .dmg{font-size:12px;color:#ff8c6a}
#hud-speed .radio{font-size:12px;color:#ffd34d}
#hud-dialogue{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:560px;max-width:80vw;display:none;background:rgba(20,16,12,.85);border:1px solid rgba(255,211,77,.4);border-radius:12px;padding:10px 14px}
#hud-dialogue .spk{color:#5eead4;font-weight:900;font-size:13px;letter-spacing:1px}
#hud-dialogue .txt{font-size:15px;margin-top:2px}
#hud-crosshair{position:absolute;left:50%;top:50%;width:22px;height:22px;transform:translate(-50%,-50%);display:none}
#hud-crosshair::before,#hud-crosshair::after{content:'';position:absolute;background:#ffd34d}
#hud-crosshair::before{left:10px;top:0;width:2px;height:22px}
#hud-crosshair::after{top:10px;left:0;width:22px;height:2px}
#hud-prompt{position:absolute;left:50%;top:62%;transform:translateX(-50%);background:rgba(20,16,12,.85);border:1px solid #ffd34d;border-radius:8px;padding:6px 12px;font-size:14px;font-weight:700;display:none}
#hud-toast{position:absolute;left:50%;top:84px;transform:translateX(-50%);background:rgba(20,16,12,.85);border:1px solid #5eead4;border-radius:8px;padding:6px 14px;font-size:14px;font-weight:700;display:none}
#hud-jet{position:absolute;left:172px;bottom:16px;width:190px;font-size:11px}
#hud-jet .bar{height:6px;background:rgba(255,255,255,.18);border-radius:3px;overflow:hidden}
#hud-jet .fill{height:100%;background:#ff8c2a}
`;

const CREW = [
  { id: 'mara', name: 'MARA', ability: 'Getaway', key: 'Z', color: '#5eead4', cd: 45, desc: 'Swap plates — drop 1 wanted star' },
  { id: 'rico', name: 'RICO', ability: 'Quick Fix', key: 'X', color: '#ffd34d', cd: 60, desc: 'Field repair — fix the car' },
  { id: 'kiko', name: 'KIKO', ability: 'Eyes Out', key: 'C', color: '#ff8c6a', cd: 40, desc: 'Spotter — reveal job markers' },
];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function districtAt(G, x, z) {
  const districts = (CFG.DISTRICTS) || [
    { name: 'Marina Bay', x: -120, z: 60, r: 55 },
    { name: 'Casino Row', x: 0, z: -40, r: 50 },
    { name: 'Old Town', x: 90, z: 20, r: 45 },
    { name: 'Causeway', x: -100, z: -20, r: 45 },
    { name: 'Market Quarter', x: 48, z: 60, r: 45 },
    { name: 'East Docks', x: 110, z: -90, r: 50 },
  ];
  for (const d of districts) {
    if (d.minX !== undefined) {
      if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return d.name;
    } else if (Math.hypot(x - d.x, z - d.z) < d.r) return d.name;
  }
  return 'Isla Dorada';
}

export function initHUD(G) {
  const root = document.getElementById('hud-root') || (() => {
    const r = document.createElement('div');
    r.id = 'hud-root';
    document.body.appendChild(r);
    return r;
  })();
  root.innerHTML = '';
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const mission = el('div', 'panel'); mission.id = 'hud-mission';
  mission.innerHTML = `<div class="jobcode">FREE ROAM</div><div class="jobname">Isla Dorada</div><div class="stage">No active job — open the map (M) to start one</div><div class="obj">Explore, collect Dorada Idols, build REP</div><div class="next"></div>`;
  const police = el('div', 'panel'); police.id = 'hud-police';
  police.innerHTML = `<h3>IDPD RESPONSE</h3><div class="units">No units responding</div>`;
  const tr = el('div'); tr.id = 'hud-tr';
  tr.innerHTML = `<div id="hud-money">$0</div><div id="hud-clock">18:00</div><div id="hud-stars"></div><div id="hud-rank"><span id="hud-rankname">ROOKIE</span> · <span id="hud-rep">0 RP</span><div id="hud-rankbar"><div id="hud-rankfill"></div></div></div>`;
  const weapons = el('div'); weapons.id = 'hud-weapons';
  WEAPON_DEFS.forEach((w, i) => {
    const s = el('div', 'slot');
    s.id = `hud-wslot-${i}`;
    s.innerHTML = `<div class="k">${i + 1}</div><div>${w.name.toUpperCase()}</div><div class="ammo">—</div>`;
    weapons.appendChild(s);
  });
  const crew = el('div'); crew.id = 'hud-crew';
  CREW.forEach((c) => {
    const card = el('div', 'card ready');
    card.id = `hud-crew-${c.id}`;
    card.innerHTML = `<div class="face" style="background:${c.color}">${c.name[0]}</div><div><div class="nm">${c.name}</div><div class="ab">${c.ability}</div></div><div class="key">${c.key}</div>`;
    card.title = c.desc;
    crew.appendChild(card);
  });
  const district = el('div'); district.id = 'hud-district';
  const mmWrap = el('div'); mmWrap.id = 'hud-minimap-wrap';
  const mm = document.createElement('canvas');
  mm.id = 'hud-minimap';
  mm.width = 150; mm.height = 150;
  mmWrap.appendChild(mm);
  const vitals = el('div', 'panel'); vitals.id = 'hud-vitals';
  vitals.innerHTML = `HEALTH <span id="hud-hp-n">100</span><div class="bar"><div class="fill" id="hud-hp" style="background:#2ec46a;width:100%"></div></div>ARMOUR <span id="hud-ar-n">0</span><div class="bar"><div class="fill" id="hud-ar" style="background:#3d7bd9;width:0%"></div></div>`;
  const jet = el('div'); jet.id = 'hud-jet';
  jet.innerHTML = `JETPACK<div class="bar"><div class="fill" id="hud-jetfill" style="width:100%"></div></div>`;
  const speed = el('div'); speed.id = 'hud-speed';
  speed.innerHTML = `<div class="num">0</div><div class="unit">KM/H</div><div class="veh"></div><div class="dmg"></div><div class="radio">♪ RADIO SOL 92.5</div>`;
  const dialogue = el('div'); dialogue.id = 'hud-dialogue';
  dialogue.innerHTML = `<div class="spk"></div><div class="txt"></div>`;
  const cross = el('div'); cross.id = 'hud-crosshair';
  const prompt = el('div'); prompt.id = 'hud-prompt';
  const toast = el('div'); toast.id = 'hud-toast';

  root.append(mission, police, tr, weapons, crew, district, mmWrap, vitals, jet, speed, dialogue, cross, prompt, toast);

  const state = {
    root, mission, police, tr, weapons, crew, district, mm, mmCtx: mm.getContext('2d'),
    vitals, jet, speed, dialogue, cross, prompt, toast,
    _cache: {}, _toastTimer: 0, _dlgTimer: 0,
    crewCd: { mara: 0, rico: 0, kiko: 0 },
    _mmTick: 0,
  };
  G.hud = state;
  // Attach the helpers other modules call as G.hud.flashToast / showDialogue.
  state.flashToast = (g, text) => flashToast(g, text);
  state.showDialogue = (g, speaker, text) => showDialogue(g, speaker, text);
  state.renderHUD = (g) => renderHUD(g);
  G.crew = G.crew || { mara: { cd: 0 }, rico: { cd: 0 }, kiko: { cd: 0 } };

  // Crew abilities: Z / X / C.
  window.addEventListener('keydown', (e) => {
    if ((G.mode !== 'play' && G.mode !== undefined) || e.repeat) return;
    const key = e.code;
    const use = (id, fn) => {
      if (state.crewCd[id] > 0) return;
      fn();
      state.crewCd[id] = CREW.find((c) => c.id === id).cd;
      if (G.crew && G.crew[id]) G.crew[id].cd = state.crewCd[id];
    };
    if (key === 'KeyZ') use('mara', () => {
      if ((G.wanted || 0) > 0 && G.police) {
        import('./police.js').then((m) => m.setWanted(G, G.wanted - 1));
        flashToast(G, 'Mara swapped the plates — heat down');
      }
    });
    if (key === 'KeyX') use('rico', () => {
      if (G.car) { G.car.damage = 0; flashToast(G, 'Rico patched the car up'); }
    });
    if (key === 'KeyC') use('kiko', () => {
      if (G.missions && G.missions.beacon) {
        G.missions.beacon.visible = true;
        flashToast(G, 'Kiko marked the job beacon');
      }
    });
  });
  return state;
}

export function showDialogue(G, speaker, text) {
  const H = G.hud;
  if (!H) return;
  H.dialogue.style.display = 'block';
  H.dialogue.querySelector('.spk').textContent = speaker;
  H.dialogue.querySelector('.txt').textContent = text;
  H._dlgTimer = 6;
}

export function flashToast(G, text) {
  const H = G.hud;
  if (!H) return;
  H.toast.textContent = text;
  H.toast.style.display = 'block';
  H._toastTimer = 3.5;
}

function setText(H, key, node, value) {
  if (H._cache[key] !== value) {
    H._cache[key] = value;
    node.textContent = value;
  }
}

function drawMinimap(G) {
  const H = G.hud;
  const ctx = H.mmCtx;
  if (!ctx) return;
  const S = 150;
  const R = 170; // world units shown across the minimap
  const px = (G.player && G.player.pos) || { x: 0, z: 0 };
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#1a2b3a'; ctx.fillRect(0, 0, S, S);
  // Sea + land block.
  ctx.fillStyle = '#24404f'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#3a4a3a';
  const toMap = (x, z) => [S / 2 + ((x - px.x) / R) * S, S / 2 + ((z - px.z) / R) * S];
  // Roads: the real centrelines (N-S roads at x -160..150, E-W at z -160..160).
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
  for (const v of [-160, -120, -80, -40, 0, 40, 80, 120, 150]) {
    const [ax, ay] = toMap(v, -200);
    const [bx, by] = toMap(v, 200);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  for (const v of [-160, -120, -80, -40, 0, 40, 80, 120, 160]) {
    const [cx, cy] = toMap(-200, v);
    const [dx, dy] = toMap(215, v);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
  }
  // Mission beacon.
  if (G.missions && G.missions.current) {
    const st = G.missions.current.stages[G.missions.stageIndex];
    const spot = st && st.spot;
    if (spot) {
      const [mx, my] = toMap(spot.x, spot.z);
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Police dots.
  if (G.police) {
    ctx.fillStyle = '#ff5a4a';
    for (const u of G.police.units || []) {
      // Units carry no world pos here; approximate from distance ring — skip if unknown.
    }
    for (const car of G.police.cars || []) {
      if (!car.active) continue;
      const [mx, my] = toMap(car.pos.x, car.pos.z);
      ctx.fillStyle = '#2a6bff';
      ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Player arrow (centre, rotated by heading).
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate((G.player ? G.player.heading : 0) + Math.PI);
  ctx.fillStyle = '#f2ede4';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#f2ede4'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('N', S / 2 - 4, 12);
  ctx.restore();
}

export function renderHUD(G) {
  const H = G.hud;
  if (!H) return;
  const dt = 1 / 60;
  if (H._toastTimer > 0) { H._toastTimer -= dt; if (H._toastTimer <= 0) H.toast.style.display = 'none'; }
  if (H._dlgTimer > 0) { H._dlgTimer -= dt; if (H._dlgTimer <= 0) H.dialogue.style.display = 'none'; }
  for (const c of CREW) {
    if (H.crewCd[c.id] > 0) H.crewCd[c.id] = Math.max(0, H.crewCd[c.id] - dt);
    if (G.crew && G.crew[c.id]) G.crew[c.id].cd = H.crewCd[c.id];
    const card = document.getElementById(`hud-crew-${c.id}`);
    if (card) {
      const cd = Math.ceil(H.crewCd[c.id]);
      card.classList.toggle('ready', cd === 0);
      card.classList.toggle('cd', cd > 0);
      const keyEl = card.querySelector('.key');
      if (keyEl) keyEl.textContent = cd > 0 ? `${cd}s` : c.key;
    }
  }

  // Money / clock / stars / rank.
  setText(H, 'money', H.tr.querySelector('#hud-money'), `$${Math.floor(G.money || 0).toLocaleString('en-US')}`);
  const hours = 18 + Math.floor((G.time || 0) / 3600);
  const mins = Math.floor(((G.time || 0) % 3600) / 60);
  setText(H, 'clock', H.tr.querySelector('#hud-clock'), `${String(hours % 24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  const wanted = G.wanted || 0;
  const starsEl = H.tr.querySelector('#hud-stars');
  const starsHtml = Array.from({ length: 5 }, (_, i) => `<span class="${i < wanted ? '' : 'off'}">★</span>`).join('');
  if (H._cache.stars !== starsHtml) { H._cache.stars = starsHtml; starsEl.innerHTML = starsHtml; }
  const rankName = (G.progression && G.progression.rankName) || 'ROOKIE';
  const rep = G.rep || 0;
  setText(H, 'rankname', H.tr.querySelector('#hud-rankname'), rankName);
  setText(H, 'rep', H.tr.querySelector('#hud-rep'), `${Math.floor(rep).toLocaleString('en-US')} RP`);
  const nextAt = (G.progression && G.progression.nextRankAt) || 500;
  const prevAt = (G.progression && G.progression.prevRankAt) || 0;
  const fill = H.tr.querySelector('#hud-rankfill');
  const pct = Math.max(0, Math.min(100, ((rep - prevAt) / Math.max(1, nextAt - prevAt)) * 100));
  if (H._cache.rankfill !== pct) { H._cache.rankfill = pct; fill.style.width = `${pct}%`; }

  // Mission panel.
  const M = G.missions;
  if (M && M.current) {
    const job = M.current;
    const st = job.stages[M.stageIndex];
    const timer = M.stageTimer > 0 ? ` · <span class="timer">${Math.ceil(M.stageTimer)}s</span>` : '';
    const html = `<div class="jobcode">MISSION ${job.n} · ${job.code}</div><div class="jobname">${job.name.toUpperCase()}</div><div class="stage">STAGE ${M.stageIndex + 1}/${job.stages.length} · ${st.label}${timer}</div><div class="obj">${st.hint || ''}${st.kind === 'defeat' ? ` — ${M.stageProgress}/${st.count || 3} down` : ''}${st.kind === 'chase' ? ` — hold ${M.stageProgress}%` : ''}</div><div class="next">NEXT ${M.stageIndex + 1 < job.stages.length ? job.stages[M.stageIndex + 1].label : 'Finish the job'}</div>`;
    if (H._cache.mission !== html) { H._cache.mission = html; H.mission.innerHTML = html; }
  } else {
    const html = `<div class="jobcode">FREE ROAM</div><div class="jobname">Isla Dorada</div><div class="stage">No active job — open the map (M) to start one</div><div class="obj">Explore, collect Dorada Idols, build REP</div><div class="next">${M && M.unlocked <= 8 ? `Next job: ${M.jobs[M.unlocked - 1].name}` : 'All 8 jobs done — the island is yours'}</div>`;
    if (H._cache.mission !== html) { H._cache.mission = html; H.mission.innerHTML = html; }
  }

  // IDPD response list.
  const units = (G.police && G.police.units) || [];
  const pHtml = units.length === 0
    ? `<h3>IDPD RESPONSE</h3><div class="units">No units responding</div>`
    : `<h3>IDPD RESPONSE · ${units.length} UNIT${units.length > 1 ? 'S' : ''}</h3>` + units.slice(0, 6).map((u) => `<div class="unit"><span>${u.id}</span><span class="st">${u.status}</span><span>${u.dist} m</span></div>`).join('') + (units.length > 6 ? `<div class="unit"><span>+${units.length - 6} more</span></div>` : '');
  if (H._cache.police !== pHtml) { H._cache.police = pHtml; H.police.innerHTML = pHtml; }

  // Weapon slots.
  WEAPON_DEFS.forEach((w, i) => {
    const slot = document.getElementById(`hud-wslot-${i}`);
    if (!slot) return;
    const ammo = G.player && G.player.ammo ? G.player.ammo[i] : null;
    const ammoTxt = !ammo ? '—' : ammo.mag === Infinity ? '∞' : `${ammo.mag}/${ammo.reserve}`;
    const key = `${i}-${ammoTxt}-${G.player ? G.player.weapon : -1}`;
    if (H._cache[`w${i}`] !== key) {
      H._cache[`w${i}`] = key;
      slot.classList.toggle('on', !!G.player && G.player.weapon === i);
      slot.querySelector('.ammo').textContent = ammoTxt;
    }
  });

  // District + vitals + jetpack.
  const px = G.player ? G.player.pos.x : 0;
  const pz = G.player ? G.player.pos.z : 0;
  const dName = districtAt(G, px, pz);
  if (H._cache.district !== dName) {
    H._cache.district = dName;
    H.district.innerHTML = `${dName.toUpperCase()}<small>Isla Dorada · Sunset District</small>`;
  }
  const hp = Math.round(G.health ?? 100);
  const ar = Math.round(G.armour ?? 0);
  setText(H, 'hpn', H.vitals.querySelector('#hud-hp-n'), String(hp));
  setText(H, 'arn', H.vitals.querySelector('#hud-ar-n'), String(ar));
  const hpFill = H.vitals.querySelector('#hud-hp');
  if (H._cache.hp !== hp) { H._cache.hp = hp; hpFill.style.width = `${hp}%`; }
  const arFill = H.vitals.querySelector('#hud-ar');
  if (H._cache.ar !== ar) { H._cache.ar = ar; arFill.style.width = `${Math.min(100, ar)}%`; }
  const jetFill = H.jet.querySelector('#hud-jetfill');
  const jetPct = G.player ? Math.round(G.player.jetpack) : 100;
  if (H._cache.jet !== jetPct) { H._cache.jet = jetPct; jetFill.style.width = `${jetPct}%`; }

  // Speed / vehicle / radio.
  const inCar = G.player && !G.player.onFoot && G.car;
  const kmh = inCar ? Math.round(Math.abs(G.car.speed || 0) * 3.6) : Math.round(Math.abs((G.player && G.player.speed) || 0) * 3.6);
  setText(H, 'speed', H.speed.querySelector('.num'), String(kmh));
  setText(H, 'veh', H.speed.querySelector('.veh'), inCar ? (G.car.def?.name || 'DORADA GT').toUpperCase() : (G.player ? 'ON FOOT' : ''));
  const dmg = inCar ? `${Math.round(G.car.damage || 0)}% DENTED` : '';
  setText(H, 'dmg', H.speed.querySelector('.dmg'), dmg);
  const radio = (CFG.RADIO && (CFG.RADIO.name || CFG.RADIO.station)) || 'RADIO SOL 92.5';
  setText(H, 'radio', H.speed.querySelector('.radio'), `♪ ${radio}`);

  // Crosshair on foot only; E prompt near a car, or to leave a parked car.
  // No "leave" prompt at speed — nobody bails out at 110 km/h.
  H.cross.style.display = (G.player && G.player.onFoot && (G.mode === 'play' || G.mode === undefined)) ? 'block' : 'none';
  if (G.player && G.player.onFoot && G.player.nearCar) {
    H.prompt.style.display = 'block';
    H.prompt.textContent = 'E — STEAL CAR';
  } else if (G.player && !G.player.onFoot && G.car && Math.abs(G.car.speed || 0) < 1.5) {
    H.prompt.style.display = 'block';
    H.prompt.textContent = 'E — LEAVE CAR';
  } else {
    H.prompt.style.display = 'none';
  }

  // Minimap at ~10 Hz.
  H._mmTick += 1;
  if (H._mmTick % 6 === 0) drawMinimap(G);
}

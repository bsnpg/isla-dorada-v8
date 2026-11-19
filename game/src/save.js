// save.js — Isla Dorada V8: localStorage save/load.
// Key 'isla-dorada-v8'. Stores money, REP, health, position, story progress,
// idols, skills, properties, upgrades and clock. Tolerant of missing fields.
import * as CFG from './config.js';

export const SAVE_KEY = (CFG.SAVE_KEY) || 'isla-dorada-v8';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(G) {
  try {
    const data = {
      version: 1,
      savedAt: Date.now(),
      money: G.money || 0,
      rep: G.rep || 0,
      health: G.health ?? 100,
      armour: G.armour || 0,
      wanted: G.wanted || 0,
      time: G.time || 0,
      player: G.player ? {
        x: G.player.pos.x, y: G.player.pos.y, z: G.player.pos.z,
        heading: G.player.heading, weapon: G.player.weapon,
        ammo: G.player.ammo, jetpack: G.player.jetpack,
      } : null,
      missions: G.missions ? {
        done: G.missions.done || [],
        unlocked: G.missions.unlocked || 1,
        ratings: G.missions.ratings || {},
      } : null,
      progression: G.progression ? {
        idolsFound: G.progression.idols.map((i) => i.found),
        skills: Object.fromEntries(Object.entries(G.progression.skills).map(([k, v]) => [k, v.xp])),
        properties: G.progression.properties || [],
        carsStolen: G.progression.carsStolen || 0,
        copsEscaped: G.progression.copsEscaped || 0,
        distanceDriven: G.progression.distanceDriven || 0,
        racesWon: G.progression.racesWon || 0,
      } : null,
      upgrades: (G.upgrades && G.upgrades.owned) || [],
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(G) {
  let data = null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    data = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!data || data.version !== 1) return false;
  G.money = data.money ?? 0;
  G.rep = data.rep ?? 0;
  G.health = data.health ?? 100;
  G.armour = data.armour ?? 0;
  G.wanted = 0; // never load in with heat — fresh start on the streets
  G.time = data.time ?? 0;
  if (data.player && G.player) {
    G.player.pos.set(data.player.x ?? 0, data.player.y ?? 0, data.player.z ?? 8);
    G.player.heading = data.player.heading ?? Math.PI;
    G.player.weapon = data.player.weapon ?? 0;
    if (data.player.ammo) G.player.ammo = data.player.ammo;
    G.player.jetpack = data.player.jetpack ?? 100;
    G.player.mesh.position.copy(G.player.pos);
  }
  if (data.missions && G.missions) {
    G.missions.done = data.missions.done || [];
    G.missions.unlocked = data.missions.unlocked || 1;
    G.missions.ratings = data.missions.ratings || {};
    G.missions.current = null;
  }
  if (data.progression && G.progression) {
    const P = G.progression;
    (data.progression.idolsFound || []).forEach((found, i) => {
      if (found && P.idols[i]) {
        P.idols[i].found = true;
        P.idols[i].mesh.visible = false;
        P.idolsFound += 1;
      }
    });
    for (const [name, xp] of Object.entries(data.progression.skills || {})) {
      if (P.skills[name]) {
        P.skills[name].xp = xp;
        P.skills[name].level = 1 + Math.floor(xp / 100);
      }
    }
    P.properties = data.progression.properties || [];
    P.carsStolen = data.progression.carsStolen || 0;
    P.copsEscaped = data.progression.copsEscaped || 0;
    P.distanceDriven = data.progression.distanceDriven || 0;
    P.racesWon = data.progression.racesWon || 0;
  }
  G.upgrades = { owned: data.upgrades || [] };
  if (G.progression) G.progression.upgrades = G.upgrades.owned;
  if (G.police) {
    // Heat is reset above; make sure no units linger from the old session.
    import('./police.js').then((m) => m.setWanted(G, 0));
  }
  return true;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

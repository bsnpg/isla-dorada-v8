// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. Modes: title, play, map, garage, paused, dead.
// ?seed=N fixes the city layout. ?shot=<name> (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from 'three';
import { GAME, KEYS, MISSIONS } from './config.js';
import { Input } from './input.js';
import { mulberry32 } from './random.js';
import { buildCity, updateCity, buildSky, buildLights, updateSky, districtAt } from './world.js';
import { makeCar, initDriving, updateDriving, enterCar, exitCar, updateChaseCam } from './vehicle.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { initPlayer, updatePlayer } from './player.js';
import { initCombat, updateCombat } from './combat.js';
import { initPolice, updatePolice, setWanted } from './police.js';
import { initMissions, updateMissions, startMission } from './missions.js';
import { initHUD, renderHUD, showDialogue, flashToast } from './hud.js';
import { initScreens, showTitle, openMap, closeMap, openGarage, closeGarage, updateScreens } from './screens.js';
import { initProgression, updateProgression } from './progression.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { initAudio, updateAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const STEP = GAME.step;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(120, 4, 52);

const G = {
  renderer,
  scene,
  camera,
  clock: new THREE.Clock(),
  input: null,
  mode: 'title',
  time: 0,
  money: GAME.startMoney,
  wanted: 0,
  rep: 0,
  repLevel: 1,
  health: GAME.startHealth,
  armour: 0,
  player: null,
  car: null,
  seed,
  rng: mulberry32(seed),
  missions: null,
  world: null,
  vehicle: null,
  traffic: null,
  combat: null,
  police: null,
  hud: null,
  screens: null,
  progression: null,
  audio: null,
  sky: null,
  lights: null,
};

// Cross-module helpers, attached so sibling modules can reach each other via G.
G.districtAt = districtAt;
G.setWanted = (level) => setWanted(G, level);
G.startMission = (indexOrMission) => startMission(G, indexOrMission);
G.saveGame = () => saveGame(G);
G.loadGame = () => loadGame(G);
G.hasSave = hasSave();
G.showDialogue = (speaker, text, ms) => showDialogue(G, speaker, text, ms);
G.flashToast = (text) => flashToast(G, text);
G.makeCar = (defName, x, z, heading) => makeCar(G, defName, x, z, heading);
G.enterCar = (car) => enterCar(G, car);
G.exitCar = () => exitCar(G);
G.missionList = MISSIONS;

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

// --- Init, in the agreed order ----------------------------------------------
G.input = new Input(canvas);
G.player = {
  mesh: null,
  pos: new THREE.Vector3(120, 0, 44),
  heading: Math.PI,
  speed: 0,
  onFoot: true,
  weapon: 0,
  ammo: { 0: Infinity, 1: 12 },
  jetpack: 100,
};

buildCity(G);
buildSky(G);
buildLights(G);
initDriving(G);
initTraffic(G);
initPlayer(G);
initCombat(G);
initPolice(G);
initMissions(G);
initHUD(G);
initScreens(G);
initProgression(G);
initAudio(G);
// The canonical upgrades store: G.upgrades.owned, mirrored onto
// G.progression.upgrades (same array) so driving, garage and saves agree.
G.upgrades = { owned: [] };
if (G.progression) G.progression.upgrades = G.upgrades.owned;

window.__game = G;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setMode(next, message) {
  G.mode = next;
  G.input.clearPressed();
  if (message) announce(message);
}

function stepPlay(dt) {
  G.time += dt;
  updateDriving(G, dt);
  updateTraffic(G, dt);
  updatePlayer(G, dt);
  updateCombat(G, dt);
  updatePolice(G, dt);
  updateMissions(G, dt);
  updateCity(G, dt);
  updateSky(G, dt);
  updateProgression(G, dt);
  updateAudio(G, dt);
  if (!G.player.onFoot) updateChaseCam(G, dt);
  renderHUD(G);
  updateScreens(G, dt);
}

function stepAmbient(dt) {
  // Title / paused / map / garage / dead: the city stays alive behind the screens.
  G.time += dt;
  updateCity(G, dt);
  updateSky(G, dt);
  updateScreens(G, dt);
}

function handleModeKeys() {
  const input = G.input;
  const confirm = input.justPressed('Enter') || input.justPressed('Space');
  const pause = input.justPressed('Escape') || input.justPressed('KeyP');
  if (G.mode === 'title') {
    if (confirm) {
      setMode('play', 'Playing. Clear Wowo’s name.');
      // A fresh run starts Job 1 the moment play begins.
      if (G.missions && !G.missions.current && (G.missions.done || []).length === 0) G.startMission(1);
    }
  } else if (G.mode === 'play') {
    if (pause) {
      setMode('paused', 'Paused.');
      if (G.screens) G.screens.showPause(G);
    }
    else if (input.justPressed('KeyM')) { setMode('map'); openMap(G); }
    else if (input.justPressed('KeyG')) { setMode('garage'); openGarage(G); }
  } else if (G.mode === 'map') {
    if (input.justPressed('KeyM') || pause) { closeMap(G); setMode('play'); }
  } else if (G.mode === 'garage') {
    if (input.justPressed('KeyG') || pause) { closeGarage(G); setMode('play'); }
  } else if (G.mode === 'paused') {
    if (pause || confirm) {
      if (G.screens) G.screens.hideAll();
      setMode('play', 'Playing.');
    }
  } else if (G.mode === 'dead') {
    if (confirm) {
      G.health = GAME.startHealth;
      G.wanted = 0;
      if (G.screens) G.screens.hideAll();
      setMode('play', 'Back on your feet. Stay out of trouble.');
    }
  }
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  showTitle(G);
  announce('Isla Dorada. Press Enter to start.');

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'play') setMode('paused', 'Paused.');
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleModeKeys();
    if (G.mode === 'play') {
      while (accumulator >= STEP) {
        stepPlay(STEP);
        accumulator -= STEP;
      }
    } else {
      // Title backdrop: slow orbit around the Casino Dorada.
      if (G.mode === 'title') {
        const t = G.time * 0.05;
        camera.position.set(Math.sin(t) * 90, 26, -65 + Math.cos(t) * 90);
        camera.lookAt(0, 10, -65);
      }
      accumulator = 0;
      stepAmbient(1 / 60);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

function runShot(name) {
  // Frozen screenshot scene: stage it (the integrator's shots.js positions
  // player, car, traffic and police), paint twice, signal the harness.
  // stageShot may set G._shotCam = 'manual' when it owns the camera itself
  // (on-foot / stats / title); otherwise the chase cam frames the car.
  G.mode = 'play';
  G._shotCam = 'chase';
  stageShot(G, name);
  renderHUD(G);
  updateScreens(G, 0);
  if (G._shotCam !== 'manual') {
    updateChaseCam(G, 1 / 60);
    updateChaseCam(G, 1 / 60);
  }
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) runShot(shotName);
else runGame();

export { G };

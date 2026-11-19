// Isla Dorada: the city, the sky and the light. A warm sunset island built from
// flat-shaded boxes: a road grid with double-yellow markings, detailed buildings
// (window grids, rooftop signs with our own names), a beach and sea on the east
// edge, palms, lamps, a market plaza and the Casino Dorada landmark.
// Colliders are axis-aligned boxes in G.world.colliders, shared by driving,
// traffic, player and police.
import * as THREE from 'three';
import { DISTRICTS, GAME, PALETTE, SUN_POSITION } from './config.js';

/** Road centre lines. Roads run between the blocks; the beachfront avenue hugs the sand. */
const ROAD_X = [-160, -120, -80, -40, 0, 40, 80, 120, 150];
const ROAD_Z = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
const ROAD_W = 10;
const CITY_MIN = -200;
const CITY_MAX = 200;

const SIGN_TEXTS = [
  { text: 'CASINO DORADA', bg: '#7a1f3d', fg: '#ffd166' },
  { text: 'HOTEL SOL', bg: '#1f4d6b', fg: '#fff7e8' },
  { text: 'MARINA', bg: '#14607a', fg: '#f0d49a' },
  { text: 'GARAGE', bg: '#333333', fg: '#ff8c42' },
  { text: 'CAFE SOL', bg: '#c96a1e', fg: '#fff7e8' },
  { text: 'MARKET', bg: '#3f7a3a', fg: '#fff7e8' },
  { text: 'IDPD', bg: '#1f2a44', fg: '#9fd8ff' },
  { text: 'CASINO DORADA', bg: '#7a1f3d', fg: '#ffd166' },
];

function makeSignTexture(entry) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = entry.bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = entry.fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = entry.fg;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(0.45, PALETTE.skyMid);
  grad.addColorStop(0.75, PALETTE.skyHorizon);
  grad.addColorStop(1, PALETTE.sunGlow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A flat-shaded box mesh from the shared geometry, castShadow on by default. */
function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Push an AABB collider (plus its height, for camera clamping) into the list. */
function addCollider(list, cx, cz, w, d, h) {
  list.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
}

export function buildCity(G) {
  const rng = G.rng;
  const scene = G.scene;
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const mats = {
    ground: new THREE.MeshLambertMaterial({ color: 0x8a7f6a }),
    sand: new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    sea: new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    seaDeep: new THREE.MeshLambertMaterial({ color: PALETTE.seaDeep }),
    asphalt: new THREE.MeshLambertMaterial({ color: PALETTE.asphalt }),
    sidewalk: new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk }),
    yellow: new THREE.MeshBasicMaterial({ color: PALETTE.asphaltLine }),
    white: new THREE.MeshBasicMaterial({ color: 0xf5f2e8 }),
    palmTrunk: new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk, flatShading: true }),
    palmLeaf: new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf, flatShading: true }),
    lampPole: new THREE.MeshLambertMaterial({ color: 0x2c2c34 }),
    lampHead: new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    stallAwning: new THREE.MeshLambertMaterial({ color: 0xe8542f, flatShading: true }),
    stallAwning2: new THREE.MeshLambertMaterial({ color: 0x2ec4b6, flatShading: true }),
    stallCounter: new THREE.MeshLambertMaterial({ color: 0x9c6644, flatShading: true }),
    bench: new THREE.MeshLambertMaterial({ color: 0x6b4a2f, flatShading: true }),
    hydrant: new THREE.MeshLambertMaterial({ color: 0xc0392b, flatShading: true }),
  };
  const buildingColors = [0xe8b48c, 0xc98d6b, 0xf2d5a0, 0x8fb8c9, 0xd9a066, 0xb98a7a].map(
    (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }),
  );
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a4a42, flatShading: true });

  // --- Ground, sand and sea -------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 480), mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(24, 440), mats.sand);
  sand.rotation.x = -Math.PI / 2;
  // 0.015 sits below the beachfront road (0.02) so the two planes never
  // z-fight where the avenue meets the sand, and above the ground (0).
  sand.position.set(GAME.beachX + 11, 0.015, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(110, 480), mats.sea);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(GAME.seaX + 55, -0.3, 0);
  group.add(sea);
  const seaDeep = new THREE.Mesh(new THREE.PlaneGeometry(110, 480), mats.seaDeep);
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.set(GAME.seaX + 165, -0.6, 0);
  group.add(seaDeep);
  // A pale wave strip where the sea meets the sand; it slides in updateCity().
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(3, 440), mats.white);
  wave.rotation.x = -Math.PI / 2;
  wave.position.set(GAME.seaX + 1, 0.05, 0);
  wave.material = new THREE.MeshBasicMaterial({ color: 0xeaf6f6, transparent: true, opacity: 0.55 });
  group.add(wave);

  // --- Roads, sidewalks and markings ----------------------------------------
  const roadLen = CITY_MAX - CITY_MIN + 40;
  for (const x of ROAD_X) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 5, roadLen), mats.sidewalk);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(x, 0.01, 0);
    walk.receiveShadow = true;
    group.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, roadLen), mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);
    for (const off of [-0.35, 0.35]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, roadLen), mats.yellow);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x + off, 0.03, 0);
      group.add(line);
    }
  }
  for (const z of ROAD_Z) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, ROAD_W + 5), mats.sidewalk);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.01, z);
    walk.receiveShadow = true;
    group.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, ROAD_W), mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    road.receiveShadow = true;
    group.add(road);
    for (const off of [-0.35, 0.35]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, 0.18), mats.yellow);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.03, z + off);
      group.add(line);
    }
  }
  // White lane dashes, one InstancedMesh for the whole city.
  const dashGeo = new THREE.PlaneGeometry(0.16, 2.6);
  const dashTransforms = [];
  const dummy = new THREE.Object3D();
  for (const x of ROAD_X) {
    for (let z = CITY_MIN; z < CITY_MAX; z += 7) {
      for (const off of [-2.6, 2.6]) dashTransforms.push([x + off, 0.035, z, 0]);
    }
  }
  for (const z of ROAD_Z) {
    for (let x = CITY_MIN; x < CITY_MAX; x += 7) {
      for (const off of [-2.6, 2.6]) dashTransforms.push([x, 0.035, z + off, Math.PI / 2]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, mats.white, dashTransforms.length);
  dashTransforms.forEach(([x, y, z, rot], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(-Math.PI / 2, 0, rot);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  });
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  // --- Buildings ------------------------------------------------------------
  // Blocks sit between neighbouring roads. The casino block and the market
  // plaza are kept clear and built by hand below.
  const casinoRect = { minX: -22, maxX: 22, minZ: -82, maxZ: -48 };
  const marketRect = { minX: -142, maxX: -98, minZ: 98, maxZ: 142 };
  const windowTransformsLit = [];
  const windowTransformsDark = [];
  const signTextures = SIGN_TEXTS.map(makeSignTexture);
  let signIndex = 0;
  const buildingList = [];

  function addBuilding(cx, cz, w, d, h, matIndex) {
    const mat = buildingColors[matIndex % buildingColors.length];
    const mesh = box(w, h, d, mat, cx, h / 2, cz);
    group.add(mesh);
    const roof = box(w + 0.4, 0.5, d + 0.4, roofMat, cx, h + 0.25, cz);
    group.add(roof);
    addCollider(colliders, cx, cz, w, d, h);
    buildingList.push({ x: cx, z: cz, w, d, h });
    // Window grid on the two long faces (front +z, back -z).
    const floors = Math.max(1, Math.floor(h / 3.4));
    const cols = Math.max(1, Math.floor(w / 2.8));
    for (let f = 0; f < floors; f += 1) {
      for (let c = 0; c < cols; c += 1) {
        const wx = cx - w / 2 + 1.6 + (c * (w - 3.2)) / Math.max(1, cols - 1);
        const wy = 2.2 + f * 3.4;
        const lit = rng() < 0.45;
        if (lit) {
          windowTransformsLit.push([wx, wy, cz + d / 2 + 0.06, 0]);
          windowTransformsLit.push([wx, wy, cz - d / 2 - 0.06, Math.PI]);
        } else {
          windowTransformsDark.push([wx, wy, cz + d / 2 + 0.06, 0]);
          windowTransformsDark.push([wx, wy, cz - d / 2 - 0.06, Math.PI]);
        }
      }
    }
    return mesh;
  }

  const blockXs = [];
  for (let i = 0; i < ROAD_X.length - 1; i += 1) blockXs.push((ROAD_X[i] + ROAD_X[i + 1]) / 2);
  const blockZs = [];
  for (let i = 0; i < ROAD_Z.length - 1; i += 1) blockZs.push((ROAD_Z[i] + ROAD_Z[i + 1]) / 2);

  for (const bx of blockXs) {
    for (const bz of blockZs) {
      if (bx > casinoRect.minX - 20 && bx < casinoRect.maxX + 20 && bz > casinoRect.minZ - 20 && bz < casinoRect.maxZ + 20) continue;
      if (bx > marketRect.minX - 20 && bx < marketRect.maxX + 20 && bz > marketRect.minZ - 20 && bz < marketRect.maxZ + 20) continue;
      if (bx > 130) continue; // beach strip stays open
      const inCasinoRow = bx > -60 && bx < 60 && bz > -110 && bz < -10;
      const inHarbor = bz > 90;
      const count = rng() < 0.35 ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = 10 + rng() * 9;
        const d = 10 + rng() * 9;
        const h = inHarbor ? 5 + rng() * 5 : inCasinoRow ? 12 + rng() * 22 : 6 + rng() * 14;
        const ox = count === 2 ? (k === 0 ? -7 : 7) : 0;
        const oz = count === 2 ? (k === 0 ? 6 : -6) : 0;
        addBuilding(bx + ox, bz + oz, w, d, h, Math.floor(rng() * buildingColors.length));
      }
    }
  }

  // Window grids: two InstancedMeshes (lit warm, dark glass), one draw call each.
  const windowGeo = new THREE.PlaneGeometry(1.3, 1.7);
  const litMat = new THREE.MeshBasicMaterial({ color: PALETTE.windowLit });
  const darkMat = new THREE.MeshBasicMaterial({ color: PALETTE.windowDark });
  const litMesh = new THREE.InstancedMesh(windowGeo, litMat, Math.max(1, windowTransformsLit.length));
  windowTransformsLit.forEach(([x, y, z, rot], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rot, 0);
    dummy.updateMatrix();
    litMesh.setMatrixAt(i, dummy.matrix);
  });
  litMesh.instanceMatrix.needsUpdate = true;
  group.add(litMesh);
  const darkMesh = new THREE.InstancedMesh(windowGeo, darkMat, Math.max(1, windowTransformsDark.length));
  windowTransformsDark.forEach(([x, y, z, rot], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rot, 0);
    dummy.updateMatrix();
    darkMesh.setMatrixAt(i, dummy.matrix);
  });
  darkMesh.instanceMatrix.needsUpdate = true;
  group.add(darkMesh);

  // Rooftop / front signs with our own names, on the tallest buildings.
  const tall = [...buildingList].sort((a, b) => b.h - a.h).slice(0, SIGN_TEXTS.length);
  const signMats = [];
  for (const b of tall) {
    const tex = signTextures[signIndex % signTextures.length];
    signIndex += 1;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
    signMats.push(mat);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(16, b.w + 2), 4), mat);
    sign.position.set(b.x, b.h + 2.4, b.z + b.d / 2 + 0.1);
    group.add(sign);
    const post = box(0.3, 2.4, 0.3, mats.lampPole, b.x - 4, b.h + 1.2, b.z + b.d / 2 + 0.05);
    group.add(post);
    const post2 = box(0.3, 2.4, 0.3, mats.lampPole, b.x + 4, b.h + 1.2, b.z + b.d / 2 + 0.05);
    group.add(post2);
  }

  // --- Casino Dorada landmark ------------------------------------------------
  const casinoMat = new THREE.MeshLambertMaterial({ color: 0x7a1f3d, flatShading: true });
  const casino = box(36, 24, 26, casinoMat, 0, 12, -65);
  group.add(casino);
  const casinoTop = box(20, 6, 16, new THREE.MeshLambertMaterial({ color: 0xffd166, flatShading: true }), 0, 27, -65);
  group.add(casinoTop);
  const casinoSignMat = new THREE.MeshBasicMaterial({ map: signTextures[0] });
  signMats.push(casinoSignMat);
  const casinoSign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), casinoSignMat);
  casinoSign.position.set(0, 19, -65 + 13.1);
  group.add(casinoSign);
  // Gold entrance canopy + columns.
  const canopy = box(16, 0.8, 6, new THREE.MeshLambertMaterial({ color: 0xffd166, flatShading: true }), 0, 5.5, -65 + 15);
  group.add(canopy);
  for (const cx of [-7, 7]) {
    const col = box(0.8, 5.5, 0.8, new THREE.MeshLambertMaterial({ color: 0xfff7e8 }), cx, 2.75, -65 + 17);
    group.add(col);
  }
  addCollider(colliders, 0, -65, 36, 26, 24);

  // --- Old Town market plaza -------------------------------------------------
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(-120, 0.015, 120);
  plaza.receiveShadow = true;
  group.add(plaza);
  for (let i = 0; i < 8; i += 1) {
    const sx = -136 + (i % 4) * 11;
    const sz = 108 + Math.floor(i / 4) * 22;
    const awningMat = i % 2 === 0 ? mats.stallAwning : mats.stallAwning2;
    const counter = box(3, 1.1, 1.6, mats.stallCounter, sx, 0.55, sz);
    group.add(counter);
    const awning = box(3.6, 0.15, 2.2, awningMat, sx, 2.4, sz);
    group.add(awning);
    for (const [px, pz] of [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]]) {
      group.add(box(0.12, 2.4, 0.12, mats.lampPole, sx + px, 1.2, sz + pz));
    }
    addCollider(colliders, sx, sz, 3.6, 2.2, 2.4);
  }

  // --- Palms: instanced trunks + canopies, along the beach and the avenues ---
  const palmSpots = [];
  for (let z = -170; z <= 170; z += 13) palmSpots.push([155 + (rng() - 0.5) * 4, z + (rng() - 0.5) * 4]);
  for (const x of [-120, -40, 40, 120]) {
    for (let z = -150; z <= 150; z += 40) {
      if (rng() < 0.6) palmSpots.push([x + 8.5, z + (rng() - 0.5) * 6]);
    }
  }
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 4.6, 6);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, mats.palmTrunk, palmSpots.length);
  const canopyGeo = new THREE.ConeGeometry(2.5, 2.2, 7);
  const canopyMesh = new THREE.InstancedMesh(canopyGeo, mats.palmLeaf, palmSpots.length);
  palmSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 2.3, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 5.4, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.updateMatrix();
    canopyMesh.setMatrixAt(i, dummy.matrix);
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.castShadow = true;
  canopyMesh.castShadow = true;
  group.add(trunkMesh);
  group.add(canopyMesh);

  // --- Street lamps, benches, hydrants ---------------------------------------
  const lampSpots = [];
  for (const x of ROAD_X) for (let z = -170; z <= 170; z += 34) lampSpots.push([x + 6.5, z]);
  for (const z of ROAD_Z) for (let x = -170; x <= 130; x += 34) lampSpots.push([x, z + 6.5]);
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 5);
  const poleMesh = new THREE.InstancedMesh(poleGeo, mats.lampPole, lampSpots.length);
  const headGeo = new THREE.SphereGeometry(0.32, 8, 6);
  const headMesh = new THREE.InstancedMesh(headGeo, mats.lampHead, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 2.6, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poleMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 5.3, z);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);
  });
  poleMesh.instanceMatrix.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;
  group.add(poleMesh);
  group.add(headMesh);

  for (let i = 0; i < 10; i += 1) {
    const bx = ROAD_X[Math.floor(rng() * (ROAD_X.length - 1))] + 7.5;
    const bz = -160 + rng() * 320;
    group.add(box(2.2, 0.12, 0.7, mats.bench, bx, 0.55, bz));
    group.add(box(2.2, 0.7, 0.12, mats.bench, bx, 0.9, bz - 0.35));
  }
  for (let i = 0; i < 8; i += 1) {
    const hx = ROAD_X[Math.floor(rng() * (ROAD_X.length - 1))] + 6.8;
    const hz = -160 + rng() * 320;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 8), mats.hydrant);
    hyd.position.set(hx, 0.45, hz);
    hyd.castShadow = true;
    group.add(hyd);
  }

  G.world = {
    group,
    colliders,
    bounds: { minX: CITY_MIN, maxX: 215, minZ: CITY_MIN, maxZ: CITY_MAX },
    buildings: buildingList,
    wave,
    signMats,
    casinoPos: { x: 0, z: -65 },
    marketPos: { x: -120, z: 120 },
    // Wowo spawns beside the parked hero car on the beachfront road.
    playerSpawn: new THREE.Vector3(120, 0, 44),
    // Real road centrelines for traffic (N-S roads run along z, E-W along x).
    roads: [
      ...ROAD_X.map((v) => ({ axis: 'z', at: v })),
      ...ROAD_Z.map((v) => ({ axis: 'x', at: v })),
    ],
  };
  return G.world;
}

/** Sea shimmer + the casino sign's slow neon pulse. Cheap, every frame. */
export function updateCity(G, dt) {
  if (!G.world) return;
  const t = G.time || 0;
  if (G.world.wave) {
    G.world.wave.position.x = GAME.seaX + 1 + Math.sin(t * 0.7) * 0.9;
  }
  if (G.world.signMats && G.world.signMats.length > 0) {
    const pulse = 0.88 + 0.12 * Math.sin(t * 2.2);
    const mat = G.world.signMats[0];
    mat.color.setScalar(pulse);
  }
  void dt;
}

export function buildSky(G) {
  const scene = G.scene;
  const group = new THREE.Group();
  group.name = 'sky';
  scene.add(group);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(620, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false }),
  );
  group.add(dome);

  const dir = SUN_POSITION.direction;
  const sunPos = new THREE.Vector3(dir.x, dir.y, dir.z).normalize().multiplyScalar(520);
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(30, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sun.position.copy(sunPos);
  sun.lookAt(0, 0, 0);
  group.add(sun);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(62, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunGlow, transparent: true, opacity: 0.35, fog: false }),
  );
  glow.position.copy(sunPos).multiplyScalar(0.995);
  glow.lookAt(0, 0, 0);
  group.add(glow);

  // Flat white cloud blobs, three squashed spheres each.
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.85, fog: false });
  const clouds = [];
  const rng = G.rng;
  for (let i = 0; i < 12; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      const s = 9 + rng() * 14;
      puff.scale.set(s, s * 0.32, s * 0.6);
      puff.position.set((p - puffs / 2) * s * 1.1, (rng() - 0.5) * 3, (rng() - 0.5) * 8);
      cloud.add(puff);
    }
    cloud.position.set(-320 + rng() * 640, 70 + rng() * 60, -320 + rng() * 640);
    group.add(cloud);
    clouds.push({ group: cloud, speed: 1.2 + rng() * 1.8 });
  }

  scene.fog = new THREE.Fog(PALETTE.fog, 140, 560);
  G.sky = { group, dome, sun, glow, clouds };
  return G.sky;
}

/** Warm low sun with shadows + hemisphere fill, so the city reads at golden hour. */
export function buildLights(G) {
  const scene = G.scene;
  const dir = SUN_POSITION.direction;
  const sun = new THREE.DirectionalLight(SUN_POSITION.color, SUN_POSITION.intensity);
  sun.position.set(dir.x * 220, dir.y * 220 + 40, dir.z * 220);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -230;
  sun.shadow.camera.right = 230;
  sun.shadow.camera.top = 230;
  sun.shadow.camera.bottom = -230;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x8a6a4a, 0.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffe0b3, 0.35);
  scene.add(ambient);

  G.lights = { sun, hemi, ambient };
  return G.lights;
}

/** Clouds drift slowly across the sunset; the sun stays low and warm. */
export function updateSky(G, dt) {
  if (!G.sky) return;
  for (const cloud of G.sky.clouds) {
    cloud.group.position.x += cloud.speed * dt;
    if (cloud.group.position.x > 340) cloud.group.position.x = -340;
  }
}

/** Which district a world position is in (for the HUD location label). */
export function districtAt(x, z) {
  if (x > GAME.seaX) return 'The Sea';
  for (const d of DISTRICTS) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return d.name;
  }
  return 'Isla Dorada';
}


export const GAME = {
  title: 'Isla Dorada: 8 Jobs to Clear His Name',
  step: 1 / 60,
  worldHalf: 220, // playable city spans roughly [-220, 220] on x and z
  beachX: 150, // sand starts here; the sea is further east
  seaX: 172,
  dayLength: 480, // seconds for a full sun cycle (sunset stays golden, it never goes dark)
  startMoney: 1250,
  startHealth: 100,
  maxWanted: 5,
  saveKey: 'isla-dorada.save.v1',
};

export const STEP = GAME.step;

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  brake: ['KeyS', 'ArrowDown'],
  handbrake: ['Space'],
  nitro: ['ShiftLeft', 'ShiftRight'],
  enterExitCar: ['KeyE'],
  interact: ['KeyE'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  reload: ['KeyR'],
  weaponPrev: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'],
  weaponNext: ['KeyQ'],
  jetpack: ['KeyF'],
  pause: ['Escape', 'KeyP'],
  map: ['KeyM'],
  garage: ['KeyG'],
  confirm: ['Enter', 'Space'],
  radioNext: ['KeyN'],
  phone: ['KeyT'],
};

export const MISSIONS = [
  {
    code: 'M1', name: 'Pendaratan', title: 'Pendaratan',
    stages: ['Reach the Marina docks', 'Meet Mara at the pier', 'Drive Wowo home'],
    objective: 'Land at the Marina and meet Mara — someone framed you, and she knows who.',
    payout: 800, rep: 150,
  },
  {
    code: 'M2', name: 'Cari Saksi', title: 'Cari Saksi',
    stages: ['Find the witness in Old Town', 'Protect the witness', 'Escort them to the safehouse'],
    objective: 'A market vendor saw the real thief. Find them before Rico’s crew does.',
    payout: 1200, rep: 200,
  },
  {
    code: 'M3', name: 'Curi Bukti', title: 'Curi Bukti',
    stages: ['Sneak into the Casino Dorada garage', 'Steal the security ledger', 'Escape without raising the alarm'],
    objective: 'The ledger in the casino garage proves the chips were planted. Steal it.',
    payout: 1800, rep: 250,
  },
  {
    code: 'M4', name: 'Kejar-kejaran Causeway', title: 'Kejar-kejaran Causeway',
    stages: ['Chase the courier down the Causeway', 'Ram the courier off the road', 'Grab the drop bag'],
    objective: 'A courier is moving the planted evidence off the island. Run him down.',
    payout: 2200, rep: 300,
  },
  {
    code: 'M5', name: 'Gudang Senjata', title: 'Gudang Senjata',
    stages: ['Raid the Harbor warehouse', 'Clear the guards', 'Take the weapon crates'],
    objective: 'Rico’s crew is arming up at the Harbor. Hit the warehouse and take their guns.',
    payout: 2600, rep: 350,
  },
  {
    code: 'M6', name: 'Konfrontasi', title: 'Konfrontasi',
    stages: ['Walk into the precinct yard', 'Stand your ground against Braga’s enforcers'],
    objective: 'Braga framed you with a doctored casino tape — now he wants a meeting at the precinct. Walk in on your terms and stand your ground.',
    payout: 3200, rep: 400,
  },
  {
    code: 'M7', name: 'Bukti Terakhir', title: 'Bukti Terakhir',
    stages: ['Climb to the market rooftop', 'Hold the roof', 'Deliver the ledger to the courthouse'],
    objective: 'One last piece: Braga’s ledger, in the rooftop safe above the market. Hold the roof, then get it to the courthouse — this is the one that ends it.',
    payout: 4000, rep: 500,
  },
  {
    code: 'M8', name: 'Bebas', title: 'Bebas',
    stages: ['Drive to Casino Dorada', 'Face the hearing', 'Walk out a free man'],
    objective: 'The hearing is tonight at Casino Dorada. Drive in, show the tape, walk out free.',
    payout: 6000, rep: 800,
  },
];

export const DISTRICTS = [
  { name: 'Casino Row', minX: -60, maxX: 60, minZ: -110, maxZ: -10, vibe: 'Neon, high rollers, trouble', control: 'IDPD patrols heavy' },
  { name: 'Palm Heights', minX: -170, maxX: -60, minZ: -170, maxZ: -10, vibe: 'Quiet villas above the town', control: 'Calm' },
  { name: 'Old Town', minX: -170, maxX: -60, minZ: -10, maxZ: 170, vibe: 'Market stalls and narrow lanes', control: 'Locals watch everything' },
  { name: 'Harbor', minX: -60, maxX: 60, minZ: 90, maxZ: 190, vibe: 'Warehouses, cranes, crates', control: 'Rico’s turf' },
  { name: 'Marina', minX: 60, maxX: 150, minZ: 90, maxZ: 190, vibe: 'Boats, docks, sunset drinks', control: 'Neutral ground' },
  { name: 'Beachfront', minX: 60, maxX: 172, minZ: -170, maxZ: 90, vibe: 'Sand, palms, beach bars', control: 'Tourists and racers' },
  { name: 'Causeway', minX: -170, maxX: 170, minZ: -190, maxZ: -170, vibe: 'The long bridge road out of town', control: 'Open road, fast chases' },
];

export const PALETTE = {
  skyTop: '#2e5fa3',
  skyMid: '#e8804f',
  skyHorizon: '#ffb36b',
  sun: '#ffd166',
  sunGlow: '#ff9e57',
  fog: '#f2a56b',
  sea: '#1f8fa8',
  seaDeep: '#14607a',
  sand: '#f0d49a',
  asphalt: '#3a3a44',
  asphaltLine: '#f7d154',
  sidewalk: '#b8a88f',
  grass: '#7fae5a',
  building: '#e8b48c',
  building2: '#c98d6b',
  building3: '#f2d5a0',
  building4: '#8fb8c9',
  windowLit: '#ffd166',
  windowDark: '#2c3e50',
  palmTrunk: '#8a5a33',
  palmLeaf: '#3f9e4d',
  heroPaint: '#ff6b35',
  policePaint: '#f2f2f2',
  taxiPaint: '#f7c948',
  text: '#fff7e8',
  muted: '#ffd9a0',
  accent: '#ff8c42',
  accent2: '#2ec4b6',
  danger: '#ff4d4d',
  panel: 'rgba(20, 12, 24, 0.72)',
};

export const VEHICLES = {
  aureaGT: {
    name: 'Aurea GT', kind: 'hero', color: 0xff6b35, topSpeed: 42, accel: 16, brake: 34,
    reverseSpeed: 12, handling: 1.0, price: 0, seats: 2, desc: 'Wowo’s sunset-orange coupe. Fast, loud, his.',
  },
  sedan: {
    name: 'Marina Sedan', kind: 'traffic', color: 0x7fb3d5, topSpeed: 26, accel: 10, brake: 26,
    reverseSpeed: 8, handling: 0.8, price: 900, seats: 4, desc: 'A plain four-door. Everywhere.',
  },
  taxi: {
    name: 'Sol Taxi', kind: 'traffic', color: 0xf7c948, topSpeed: 28, accel: 11, brake: 26,
    reverseSpeed: 8, handling: 0.85, price: 1100, seats: 4, desc: 'Yellow cab, always in a hurry.',
  },
  van: {
    name: 'Harbor Van', kind: 'traffic', color: 0x9aa5b1, topSpeed: 22, accel: 8, brake: 24,
    reverseSpeed: 7, handling: 0.7, price: 1400, seats: 2, desc: 'Slow, boxy, full of crates.',
  },
  muscle: {
    name: 'Rukan Pelo GT', kind: 'traffic', color: 0xc0392b, topSpeed: 36, accel: 14, brake: 30,
    reverseSpeed: 10, handling: 0.9, price: 5200, seats: 2, desc: 'A loud beachfront muscle car.',
  },
  police: {
    name: 'IDPD Interceptor', kind: 'police', color: 0xf2f2f2, topSpeed: 38, accel: 15, brake: 36,
    reverseSpeed: 11, handling: 1.05, price: 0, seats: 2, desc: 'Isla Dorada Police Department pursuit car.',
  },
  heli: {
    name: 'IDPD Air Unit', kind: 'heli', color: 0x2c3e50, topSpeed: 30, accel: 12, brake: 20,
    reverseSpeed: 0, handling: 1.0, price: 0, seats: 2, desc: 'Police helicopter. Shows up at 3 stars.',
  },
};

export const WEAPONS = [
  { name: 'Fists', slot: 0, mag: Infinity, reserve: Infinity, damage: 12, range: 2.2, fireRate: 2.2, auto: false },
  { name: 'Pistol', slot: 1, mag: 12, reserve: 60, damage: 22, range: 45, fireRate: 3.5, auto: false },
  { name: 'SMG', slot: 2, mag: 30, reserve: 120, damage: 14, range: 38, fireRate: 9, auto: true },
  { name: 'Shotgun', slot: 3, mag: 6, reserve: 30, damage: 18, range: 18, fireRate: 1.1, auto: false, pellets: 6 },
  { name: 'Rifle', slot: 4, mag: 30, reserve: 90, damage: 34, range: 80, fireRate: 5, auto: true },
  { name: 'Bazooka', slot: 5, mag: 1, reserve: 6, damage: 120, range: 90, fireRate: 0.7, auto: false, explosive: true },
];

export const PROPERTIES = [
  { id: 'garage', name: 'Palm Heights Garage', price: 4500, district: 'Palm Heights', desc: 'Wowo’s garage. Store cars, fit upgrades.' },
  { id: 'safehouse', name: 'Old Town Safehouse', price: 6000, district: 'Old Town', desc: 'A quiet flat above the market. Save and heal here.' },
  { id: 'beachhouse', name: 'Beachfront Bungalow', price: 12000, district: 'Beachfront', desc: 'Sand at the door, sea at the window.' },
];

export const SKILL_DEFS = [
  { id: 'driving', name: 'Driving', desc: 'Better handling, faster top speed, longer nitro.' },
  { id: 'shooting', name: 'Shooting', desc: 'Less recoil, faster reload, steadier aim.' },
  { id: 'stamina', name: 'Stamina', desc: 'Sprint longer, recover faster.' },
  { id: 'jetpack', name: 'Jetpack', desc: 'Longer flight, faster recharge.' },
];

export const UPGRADES = [
  { id: 'nitro', name: 'Nitro Boost', price: 1500, desc: 'Hold Shift for a burst of speed.' },
  { id: 'engine2', name: 'Tuned Engine', price: 2200, desc: '+15% top speed on the Aurea GT.' },
  { id: 'armour', name: 'Armoured Plates', price: 1800, desc: 'Car takes half damage from crashes and bullets.' },
  { id: 'tires', name: 'Grip Tires', price: 900, desc: 'Sharper steering, less slide.' },
  { id: 'repair', name: 'Full Repair', price: 300, desc: 'Fix the Aurea GT back to 0% damage.' },
];

export const RADIO = {
  name: 'RADIO SOL 92.5',
  stations: [
    { id: 'sol', name: 'RADIO SOL 92.5', genre: 'Island Pop', dj: 'Luna Velas' },
    { id: 'mar', name: 'MARINA FM', genre: 'Chill Sunset', dj: 'Kiko Tan' },
    { id: 'idpd', name: 'IDPD BAND', genre: 'Police Scanner', dj: 'Dispatch' },
  ],
};

export const SUN_POSITION = {
  direction: { x: -0.25, y: 0.26, z: -0.93 }, // low in the north sky
  color: 0xffb36b,
  intensity: 2.4,
  elevation: 16, // degrees above the horizon, golden hour
  azimuth: 345, // degrees, north-north-west
};

// audio.js — Isla Dorada V8: tiny WebAudio synth.
// Engine hum (pitch follows speed), gunshots, pickups, stings, explosions.
// No AudioContext until the first user gesture; silent if unavailable.
import * as CFG from './config.js';

export function initAudio(G) {
  const A = {
    ctx: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    _jetTimer: 0, _ready: false,
    playShot, playEnemyShot, playDry, playReload, playClick, playPickup,
    playKill, playSting, playExplosion, playHurt, playSiren, playJet,
  };
  G.audio = A;

  function ensure() {
    if (A.ctx) return A.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      A.ctx = new AC();
      // Engine hum: low sawtooth + gain, pitch driven by updateAudio.
      A.engineOsc = A.ctx.createOscillator();
      A.engineOsc.type = 'sawtooth';
      A.engineOsc.frequency.value = 55;
      A.engineGain = A.ctx.createGain();
      A.engineGain.gain.value = 0;
      const filter = A.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      A.engineOsc.connect(filter);
      filter.connect(A.engineGain);
      A.engineGain.connect(A.ctx.destination);
      A.engineOsc.start();
      // Siren: two-tone triangle, silent until wanted.
      A.sirenOsc = A.ctx.createOscillator();
      A.sirenOsc.type = 'triangle';
      A.sirenOsc.frequency.value = 720;
      A.sirenGain = A.ctx.createGain();
      A.sirenGain.gain.value = 0;
      A.sirenOsc.connect(A.sirenGain);
      A.sirenGain.connect(A.ctx.destination);
      A.sirenOsc.start();
      A._ready = true;
    } catch {
      A.ctx = null;
    }
    return A.ctx;
  }

  // First gesture unlocks audio (autoplay policy).
  const unlock = () => { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  function blip(freq, dur, type, vol, slideTo) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio is best-effort */ }
  }

  function noiseBurst(dur, vol, lowpass) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.2;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* best-effort */ }
  }

  function playShot(weapon) {
    // Weapon slots: 0 Fists, 1 Pistol, 2 SMG, 3 Shotgun, 4 Rifle, 5 Bazooka.
    if (weapon === 5) { noiseBurst(0.5, 0.35, 500); blip(90, 0.4, 'sine', 0.25, 40); }
    else if (weapon === 2) { noiseBurst(0.18, 0.3, 900); blip(160, 0.12, 'square', 0.14, 60); }
    else { noiseBurst(0.08, 0.2, 2200); blip(320, 0.06, 'square', 0.1, 120); }
  }
  function playEnemyShot() { blip(240, 0.07, 'square', 0.05, 90); }
  function playDry() { blip(900, 0.04, 'square', 0.08); }
  function playReload() { blip(500, 0.05, 'square', 0.08); setTimeout(() => blip(700, 0.05, 'square', 0.08), 120); }
  function playClick() { blip(1200, 0.03, 'square', 0.06); }
  function playPickup() { blip(880, 0.09, 'sine', 0.12); setTimeout(() => blip(1318, 0.12, 'sine', 0.12), 90); }
  function playKill() { blip(220, 0.15, 'triangle', 0.12, 110); }
  function playSting() {
    blip(523, 0.14, 'triangle', 0.14);
    setTimeout(() => blip(659, 0.14, 'triangle', 0.14), 140);
    setTimeout(() => blip(784, 0.28, 'triangle', 0.16), 280);
  }
  function playExplosion() { noiseBurst(0.7, 0.4, 400); blip(70, 0.6, 'sine', 0.3, 30); }
  function playHurt() { blip(180, 0.12, 'sawtooth', 0.12, 90); }
  function playJet() {
    // Throttled: at most one jet whoosh per 120 ms.
    const now = performance.now();
    if (now - A._jetTimer < 120) return;
    A._jetTimer = now;
    noiseBurst(0.12, 0.08, 3000);
  }
  function playSiren(on) {
    const ctx = ensure();
    if (!ctx || !A.sirenGain) return;
    try {
      A.sirenGain.gain.setTargetAtTime(on ? 0.03 : 0, ctx.currentTime, 0.2);
      if (on) A.sirenOsc.frequency.setValueAtTime(720, ctx.currentTime);
    } catch { /* best-effort */ }
  }
  return A;
}

export function updateAudio(G, dt) {
  const A = G.audio;
  if (!A || !A.ctx || !A.engineGain) return;
  try {
    const speed = G.car && !G.player.onFoot ? Math.abs(G.car.speed || 0) : 0;
    const target = (G.mode === 'play' && speed > 1) ? 0.05 : 0;
    A.engineGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.1);
    if (A.engineOsc) A.engineOsc.frequency.setTargetAtTime(55 + speed * 4.5, A.ctx.currentTime, 0.08);
    // Siren wail: alternate tone while wanted.
    if (A.sirenOsc && (G.wanted || 0) > 0) {
      const t = (G.time || 0) % 1.2;
      A.sirenOsc.frequency.setTargetAtTime(t < 0.6 ? 720 : 960, A.ctx.currentTime, 0.05);
    }
  } catch { /* best-effort */ }
}

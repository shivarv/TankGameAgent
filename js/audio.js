/* =============================================================
   AUDIO  —  all sounds synthesised via Web Audio API
   No external files required.

   Volume knobs (0–1):
     SoundFX.vol       master volume  (default 0.45)
   Mute:
     SoundFX.muted     toggle with SoundFX.toggleMute()
============================================================= */
export const SoundFX = (() => {

  /* ── state ── */
  let _ctx  = null;
  let muted = false;
  let vol   = 0.45;

  /* throttle: returns false if the same key was played < minMs ago */
  const _last = {};
  function _throttle(key, minMs) {
    const now = Date.now();
    if (_last[key] && now - _last[key] < minMs) return false;
    _last[key] = now;
    return true;
  }

  /* lazy AudioContext (browser autoplay policy: init on first user gesture) */
  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function now() { return ctx().currentTime; }

  /* ── primitive builders ── */

  /**
   * Tone burst: oscillator with exponential frequency sweep + gain decay.
   * @param {number}  freq    start frequency (Hz)
   * @param {string}  type    oscillator type
   * @param {number}  t       AudioContext start time
   * @param {number}  dur     duration (s)
   * @param {number}  v       volume (0–1, pre-master)
   * @param {number}  [fEnd]  end frequency for sweep
   */
  function _osc(freq, type, t, dur, v, fEnd) {
    const c  = ctx();
    const o  = c.createOscillator();
    const g  = c.createGain();
    o.type   = type;
    o.frequency.setValueAtTime(freq, t);
    if (fEnd !== undefined)
      o.frequency.exponentialRampToValueAtTime(Math.max(fEnd, 10), t + dur);
    g.gain.setValueAtTime(v * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.01);
  }

  /**
   * White-noise burst through a low-pass filter.
   * @param {number}  t       AudioContext start time
   * @param {number}  dur     duration (s)
   * @param {number}  v       volume (0–1, pre-master)
   * @param {number}  cutoff  low-pass cutoff frequency (Hz)
   */
  function _noise(t, dur, v, cutoff = 3000) {
    const c   = ctx();
    const sr  = c.sampleRate;
    const len = Math.ceil(sr * dur);
    const buf = c.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src  = c.createBufferSource();
    src.buffer = buf;
    const flt  = c.createBiquadFilter();
    flt.type   = 'lowpass';
    flt.frequency.value = cutoff;
    const g    = c.createGain();
    g.gain.setValueAtTime(v * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.01);
  }

  /* ── public API ── */
  return {

    get vol()       { return vol; },
    set vol(v)      { vol = Math.max(0, Math.min(1, v)); },
    get muted()     { return muted; },
    toggleMute()    { muted = !muted; },

    /* ── player fires ── */
    playerShoot() {
      if (muted) return;
      const t = now();
      _osc(920, 'square',   t,       0.07, 0.22, 190);
      _noise(t,             0.045,   0.18, 9000);
    },

    /* ── enemy fires ── */
    enemyShoot() {
      if (muted || !_throttle('eShoot', 55)) return;
      const t = now();
      _osc(420, 'sawtooth', t,       0.09, 0.16, 95);
      _noise(t,             0.055,   0.12, 2800);
    },

    /* ── bullet hits a steel wall ── */
    wallHit() {
      if (muted || !_throttle('wallHit', 70)) return;
      const t = now();
      _noise(t, 0.08, 0.28, 1800);
      _osc(180, 'sine', t, 0.06, 0.15, 70);
    },

    /* ── bullet hits a brick/stone wall (lower, chunkier crumble) ── */
    brickHit() {
      if (muted || !_throttle('brickHit', 70)) return;
      const t = now();
      _noise(t, 0.22, 0.42, 650);          // earthy low-pass rumble
      _osc(72, 'sine',     t, 0.18, 0.32, 28);  // deep thud
      _noise(t + 0.04, 0.10, 0.18, 2200);  // brief stone-chip crack
    },

    /* ── small explosion (bullet destroyed mid-air / bullet collision) ── */
    smallExplosion() {
      if (muted || !_throttle('sExp', 80)) return;
      const t = now();
      _noise(t, 0.12, 0.32, 1600);
      _osc(110, 'sine', t, 0.09, 0.18, 45);
    },

    /* ── big explosion (enemy killed / player killed) ── */
    bigExplosion() {
      if (muted) return;
      const t = now();
      _noise(t,              0.50, 0.65, 900);
      _osc(68,  'sawtooth',  t,    0.38, 0.38, 22);
      _osc(105, 'sine',      t,    0.32, 0.28, 32);
    },

    /* ── player takes damage ── */
    playerHit() {
      if (muted) return;
      const t = now();
      _noise(t,             0.22, 0.55, 1100);
      _osc(190, 'sine',     t,    0.20, 0.38, 65);
    },

    /* ── power-up collected ── */
    powerup() {
      if (muted) return;
      const t = now();
      [523, 659, 784].forEach((f, i) => {
        _osc(f, 'sine', t + i * 0.07, 0.15, 0.28);
      });
    },

    /* ── power-up collected — MAX stack (higher pitch) ── */
    powerupMax() {
      if (muted) return;
      const t = now();
      [784, 988, 1175].forEach((f, i) => {
        _osc(f, 'sine', t + i * 0.06, 0.12, 0.22);
      });
    },

    /* ── shield absorbs a hit ── */
    shieldAbsorb() {
      if (muted) return;
      const t = now();
      _osc(1350, 'sine',     t,    0.13, 0.30, 480);
      _noise(t,              0.09, 0.18, 7000);
    },

    /* ── last shield stack broken ── */
    shieldBreak() {
      if (muted) return;
      const t = now();
      _osc(650, 'sawtooth',  t,    0.22, 0.32, 90);
      _noise(t,              0.20, 0.32, 2600);
    },

    /* ── wave advance ── */
    waveUp() {
      if (muted) return;
      const t = now();
      [440, 554, 659, 880].forEach((f, i) => {
        _osc(f, 'square', t + i * 0.09, 0.17, 0.13);
      });
    },

    /* ── game over ── */
    gameOver() {
      if (muted) return;
      const t = now();
      [440, 370, 294, 220].forEach((f, i) => {
        _osc(f, 'sawtooth', t + i * 0.20, 0.30, 0.22);
      });
    },
  };
})();

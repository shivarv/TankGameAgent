/* =============================================================
   CONFIG  —  edit this file to tune all gameplay values
============================================================= */

/* ── world ── */
const TILE     = 40;
const MAP_COLS = 18;
const MAP_ROWS = 14;
const W        = MAP_COLS * TILE;   // 720
const H        = MAP_ROWS * TILE;   // 560

/* ── player ── */
const PLAYER_SPEED     = 180;
const PLAYER_ACCEL     = 600;
const PLAYER_DRAG      = 500;
const BULLET_SPEED_P   = 520;
const PLAYER_FIRE_RATE = 250;   // ms between shots (lower = faster)

/* ── enemies (base, scaled per wave) ── */
const MAX_ENEMIES = 8;

/* ── power-ups ── */
const POWERUP_DROP_CHANCE = 0.45;   // probability a slain enemy drops a power-up
const POWERUP_DURATION    = 8000;   // ms timed power-ups last

/* ── colour palette ── */
const COL = {
  FLOOR_A : 0x1a2a1a,
  FLOOR_B : 0x1e2e1e,
  STONE   : 0x8b6343,
  STONE_D : 0x5a3d22,
  STEEL   : 0x7a8090,
  STEEL_D : 0x4a5060,
  STEEL_H : 0xaabbcc,
  P_BODY  : 0x2ecc40,
  P_DARK  : 0x1a7a28,
  P_TURR  : 0x27ae34,
  BULLET_P: 0xffff66,
  TRACK   : 0x1a1a1a,
  WHEEL   : 0x333333,
};

/* ── enemy variant definitions ──────────────────────────────
   minWave   : wave at which this type starts spawning
   hp        : hits to kill (base)
   speed     : acceleration constant
   maxVel    : top movement speed
   fireRate  : ms between shots (higher = slower)
   bulletSpd : enemy bullet speed
   aimAcc    : 0 = blind, 1 = perfect lead-aim
   rotateSp  : turret/body rotate speed (rad per frame step used in RotateTo)
   points    : score awarded on kill
─────────────────────────────────────────────────────────── */
const ENEMY_TYPES = [
  {
    id        : 'scout',
    label     : 'Scout',
    minWave   : 1,
    bodyCol   : 0xe74c3c,
    darkCol   : 0x922b21,
    turrCol   : 0xc0392b,
    trackCol  : 0x1a1a1a,
    hp        : 1,
    speed     : 65,
    maxVel    : 105,
    fireRate  : 2200,
    bulletSpd : 210,
    aimAcc    : 0.35,
    rotateSp  : 0.05,
    points    : 100,
  },
  {
    id        : 'rusher',
    label     : 'Rusher',
    minWave   : 2,
    bodyCol   : 0xe67e22,
    darkCol   : 0xca6f1e,
    turrCol   : 0xd35400,
    trackCol  : 0x5d2f00,
    hp        : 1,
    speed     : 120,
    maxVel    : 165,
    fireRate  : 3000,
    bulletSpd : 180,
    aimAcc    : 0.15,
    rotateSp  : 0.12,
    points    : 150,
  },
  {
    id        : 'soldier',
    label     : 'Soldier',
    minWave   : 3,
    bodyCol   : 0x9b59b6,
    darkCol   : 0x6c3483,
    turrCol   : 0x8e44ad,
    trackCol  : 0x2c1654,
    hp        : 2,
    speed     : 50,
    maxVel    : 82,
    fireRate  : 1500,
    bulletSpd : 260,
    aimAcc    : 0.75,
    rotateSp  : 0.07,
    points    : 220,
  },
  {
    id        : 'sniper',
    label     : 'Sniper',
    minWave   : 4,
    bodyCol   : 0x1abc9c,
    darkCol   : 0x0e6655,
    turrCol   : 0x17a589,
    trackCol  : 0x0a3d30,
    hp        : 1,
    speed     : 38,
    maxVel    : 65,
    fireRate  : 2800,
    bulletSpd : 420,
    aimAcc    : 1.0,
    rotateSp  : 0.09,
    points    : 280,
  },
  {
    id        : 'heavy',
    label     : 'Heavy',
    minWave   : 5,
    bodyCol   : 0x2c3e50,
    darkCol   : 0x1a252f,
    turrCol   : 0x34495e,
    trackCol  : 0x0d1520,
    hp        : 3,
    speed     : 28,
    maxVel    : 55,
    fireRate  : 1100,
    bulletSpd : 310,
    aimAcc    : 1.0,
    rotateSp  : 0.04,
    points    : 380,
  },
];

/* ── power-up definitions ──────────────────────────────────
   timed:false  → instant / one-time effect
   timed:true   → lasts POWERUP_DURATION ms
─────────────────────────────────────────────────────────── */
const POWERUP_TYPES = [
  { id:'health',     label:'+HP',    col:0x2ecc40, timed:false },
  { id:'speed',      label:'SPD',    col:0xf1c40f, timed:true  },
  { id:'rapidfire',  label:'RPD',    col:0xe67e22, timed:true  },
  { id:'shield',     label:'SLD',    col:0x3498db, timed:false },
  { id:'tripleshot', label:'x3',     col:0x9b59b6, timed:true  },
];

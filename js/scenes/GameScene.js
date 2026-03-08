/* =============================================================
   GAME SCENE
============================================================= */
import Phaser from 'phaser';
import {
  TILE, MAP_COLS, MAP_ROWS, W, H,
  PLAYER_SPEED, PLAYER_ACCEL, PLAYER_DRAG, BULLET_SPEED_P, PLAYER_FIRE_RATE,
  MAX_ENEMIES, PLAYER_HP, PLAYER_MAX_HP, PLAYER_HIT_DAMAGE,
  POWERUP_DROP_CHANCE, POWERUP_HEAL_AMOUNT, POWERUP_CAPS, POWERUP_PER_STACK,
  ENEMY_TYPES, POWERUP_TYPES,
} from '../config.js';
import { MAPS, KILLS_PER_MAP } from '../maps.js';
import { SoundFX } from '../audio.js';
import { createTextures } from '../textures.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  /* resume data injected by MapClearScene (or empty on fresh start) */
  init(d) { this._resume = d || {}; }

  /* ══════════════════════════════════════════════════════════
     CREATE
  ══════════════════════════════════════════════════════════ */
  create() {
    const r = this._resume;

    this.score       = r.score    ?? 0;
    this.mapIndex    = r.mapIndex ?? 0;   // 0-based, set by MapClearScene on advance
    this.wave        = this.mapIndex + 1; // drives enemy scaling
    this.playerHp    = r.playerHp ?? PLAYER_HP;
    this.kills       = 0;                 // resets every map
    this.playerAlive = true;
    this.fireAngle   = 0;
    this.controlMode = 'keyboard';
    this._mapAdvancing = false;

    // restore power-up stacks from previous map, or start fresh
    this.stacks = r.stacks
      ? { ...r.stacks }
      : { speed:0, bulletspd:0, rapidfire:0, shield:0, tripleshot:0 };

    createTextures(this);
    this._buildFloor();
    this._buildGroups();
    this._buildMap();
    this._buildPlayer();
    this._buildCollisions();
    this._buildHUD();
    this._buildEmitters();
    this._startSpawner();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    this.input.keyboard.on('keydown-TAB', () => {
      this.controlMode = this.controlMode === 'keyboard' ? 'mouse' : 'keyboard';
    });

    // M key toggles mute
    this.input.keyboard.on('keydown-M', () => {
      SoundFX.toggleMute();
    });

    // P key toggles pause
    this.isPaused = false;
    this.input.keyboard.on('keydown-P', () => this._togglePause());

    // mouse-click fires only in mouse mode
    this.input.on('pointerdown', () => {
      if (this.controlMode !== 'mouse' || !this.playerAlive) return;
      this._tryPlayerFire(this.time.now);
    });

    this.cameras.main.setBounds(0, 0, W, H);
    this.physics.world.setBounds(0, 0, W, H);

    // Fade in from black — makes every map start feel fresh
    this.cameras.main.fadeFrom(700, 0, 0, 0);

    // Dramatic intro banner; blocks gameplay until it clears
    this._gameReady = false;
    this._showMapBanner();
  }

  /* ══════════════════════════════════════════════════════════
     BUILDERS
  ══════════════════════════════════════════════════════════ */
  _buildFloor() {
    for (let r = 0; r < MAP_ROWS; r++)
      for (let c = 0; c < MAP_COLS; c++)
        this.add.image(c*TILE + TILE/2, r*TILE + TILE/2, 'floor').setDepth(-1);
  }

  _buildGroups() {
    this.stoneWalls    = this.physics.add.staticGroup();
    this.steelWalls    = this.physics.add.staticGroup();
    // maxSize caps pool size; objects are recycled via setActive/setVisible
    this.playerBullets = this.physics.add.group({ maxSize: 60 });
    this.enemyBullets  = this.physics.add.group({ maxSize: 80 });
    this.enemies       = this.physics.add.group();
    this.powerups      = this.physics.add.group();
  }

  _buildMap() {
    MAPS[this.mapIndex].layout.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === 'X') {
          const s = this.steelWalls.create(c*TILE + TILE/2, r*TILE + TILE/2, 'steel');
          s.setDepth(1); s.refreshBody();
        } else if (ch === 'S') {
          const s = this.stoneWalls.create(c*TILE + TILE/2, r*TILE + TILE/2, 'stone');
          s.setDepth(1); s.refreshBody();
        }
      });
    });
  }

  _buildPlayer() {
    // Physics chassis — drives movement and collision detection
    this.player = this.physics.add.sprite(W/2, H - TILE*1.8, 'playerChassis');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(PLAYER_DRAG);
    this.player.setMaxVelocity(PLAYER_SPEED);
    this.player.setDepth(5);
    this.player.lastShot = 0;
    this.player.body.setCircle(15, 5, 5);

    // Turret sprite — independent aim rotation, position synced to chassis each frame
    this.playerTurret = this.add.sprite(this.player.x, this.player.y, 'playerTurret')
      .setDepth(6).setOrigin(0.5, 0.5);
    this.playerTurret.turretRecoil = 0;

    this.shieldSprite = this.add.image(0, 0, 'shieldFx')
      .setDepth(7).setVisible(false).setAlpha(0.85);
  }

  _buildCollisions() {
    const { player, enemies, stoneWalls, steelWalls, playerBullets, enemyBullets, powerups } = this;

    this.physics.add.collider(player,  steelWalls);
    this.physics.add.collider(player,  stoneWalls);
    this.physics.add.collider(enemies, steelWalls);
    this.physics.add.collider(enemies, stoneWalls);
    this.physics.add.collider(enemies, enemies);

    this.physics.add.overlap(playerBullets, stoneWalls,   this._onBulletStone,       null, this);
    this.physics.add.overlap(enemyBullets,  stoneWalls,   this._onBulletStone,       null, this);
    this.physics.add.overlap(playerBullets, steelWalls,   this._onBulletSteel,       null, this);
    this.physics.add.overlap(enemyBullets,  steelWalls,   this._onBulletSteel,       null, this);
    this.physics.add.overlap(playerBullets, enemies,      this._onPlayerBulletEnemy, null, this);
    // swap order so callback receives (player, bullet) matching _onEnemyBulletPlayer(player, bullet)
    this.physics.add.overlap(player,        enemyBullets, this._onEnemyBulletPlayer, null, this);
    this.physics.add.overlap(playerBullets, enemyBullets, this._onBulletsCollide,    null, this);
    // swap order so callback receives (player, enemy) matching _onEnemyRam(player, enemy)
    this.physics.add.overlap(player,        enemies,      this._onEnemyRam,          null, this);
    // Note order: (player, powerups) → callback(player, powerup)
    this.physics.add.overlap(player, powerups, this._onPlayerPowerup, null, this);
  }

  /* ══════════════════════════════════════════════════════════
     HUD  — per-effect coloured text, right-side stack panel
  ══════════════════════════════════════════════════════════ */
  _buildHUD() {
    // dark backing panel behind left-side HUD
    this.add.rectangle(0, 0, 168, 128, 0x000000, 0.52)
      .setDepth(49).setScrollFactor(0).setOrigin(0, 0);

    const st = { fontSize:'18px', fontFamily:'monospace', color:'#ffffff', stroke:'#000', strokeThickness:4 };
    this.hudScore = this.add.text(12, 10, 'Score: 0', st).setDepth(50).setScrollFactor(0);
    this.hudWave  = this.add.text(12, 34, 'Map: 1/10', st).setDepth(50).setScrollFactor(0);
    // HP bar
    this.add.rectangle(12, 58, 144, 16, 0x330000).setDepth(50).setScrollFactor(0).setOrigin(0, 0);
    this.hudHpBar  = this.add.rectangle(12, 58, 144, 16, 0x22cc44).setDepth(51).setScrollFactor(0).setOrigin(0, 0);
    this.hudHpText = this.add.text(84, 66, '100%', {
      fontSize:'11px', fontFamily:'monospace', color:'#ffffff', stroke:'#000', strokeThickness:3
    }).setDepth(52).setScrollFactor(0).setOrigin(0.5, 0.5);
    this.hudKills = this.add.text(12, 78, 'Kills: 0/20', {
      fontSize:'12px', fontFamily:'monospace', color:'#ffdd88', stroke:'#000', strokeThickness:3
    }).setDepth(50).setScrollFactor(0);
    this.hudMode  = this.add.text(12, 96, '', {
      fontSize:'12px', fontFamily:'monospace', color:'#aaffaa', stroke:'#000', strokeThickness:3
    }).setDepth(50).setScrollFactor(0);
    this.hudMute  = this.add.text(12, 112, '', {
      fontSize:'12px', fontFamily:'monospace', color:'#888888', stroke:'#000', strokeThickness:3
    }).setDepth(50).setScrollFactor(0);

    // pause overlay
    this.pauseOverlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.6)
      .setDepth(80).setScrollFactor(0).setVisible(false);
    this.pauseText = this.add.text(W/2, H/2, 'PAUSED\n\nP  to resume', {
      fontSize:'32px', fontFamily:'monospace', color:'#ffffff',
      stroke:'#000', strokeThickness:6, align:'center'
    }).setDepth(81).setScrollFactor(0).setOrigin(0.5).setVisible(false);

    // right-side: one coloured text row per powerup type
    const COLS = { speed:'#f39c12', bulletspd:'#e74c3c', rapidfire:'#e67e22', tripleshot:'#bb88ee', shield:'#5dade2' };
    this.hudStacks = {};
    Object.entries(COLS).forEach(([id, col], i) => {
      this.hudStacks[id] = this.add.text(W - 10, 10 + i * 20, '', {
        fontSize:'13px', fontFamily:'monospace', color: col,
        stroke:'#000', strokeThickness:3
      }).setDepth(50).setScrollFactor(0).setOrigin(1, 0);
    });
  }

  _refreshHUD() {
    this.hudScore.setText('Score: ' + this.score);
    this.hudWave.setText (`Map: ${this.mapIndex + 1}/10`);
    this.hudKills.setText(`Kills: ${this.kills}/${KILLS_PER_MAP}`);

    // HP bar (scales against PLAYER_MAX_HP so overheal shows correctly)
    const hpFrac  = Math.max(this.playerHp, 0) / PLAYER_MAX_HP;
    const barW    = Math.max(Math.round(144 * hpFrac), 1);
    const baseFrac = this.playerHp / PLAYER_HP;
    const barCol  = baseFrac > 1 ? 0x44aaff : baseFrac > 0.5 ? 0x22cc44 : baseFrac > 0.25 ? 0xffaa00 : 0xff2222;
    this.hudHpBar.setSize(barW, 16).setFillStyle(barCol);
    this.hudHpText.setText(Math.max(this.playerHp, 0) + '%');

    this.hudMode.setText(
      this.controlMode === 'keyboard' ? '[TAB] KB: move+SPACE' : '[TAB] Mouse: aim+click'
    ).setColor(this.controlMode === 'keyboard' ? '#aaffaa' : '#aaffff');
    this.hudMute.setText(SoundFX.muted ? '[M] Sound: OFF' : '[M] Sound: ON')
      .setColor(SoundFX.muted ? '#ff6666' : '#888888');

    // permanent stacks — just show count, no timer
    const LABELS = { speed:'SPD', bulletspd:'BLT', rapidfire:'ROF', tripleshot:' x3' };
    ['speed', 'bulletspd', 'rapidfire', 'tripleshot'].forEach(id => {
      const n = this.stacks[id];
      this.hudStacks[id].setText(n > 0 ? `${LABELS[id]} ×${n}` : '');
    });
    const sh = this.stacks.shield;
    this.hudStacks.shield.setText(sh > 0 ? `SLD ×${sh}` : '');
  }

  /* ══════════════════════════════════════════════════════════
     SPAWNER
  ══════════════════════════════════════════════════════════ */
  _startSpawner() {
    this.spawnPoints = [
      { x:TILE*1.5,   y:TILE*1.5 },
      { x:W/2,        y:TILE*1.5 },
      { x:W-TILE*1.5, y:TILE*1.5 },
    ];
    this.time.addEvent({ delay:2200, callback:this._spawnEnemy, callbackScope:this, loop:true });
  }

  _pickEnemyType() {
    const available = ENEMY_TYPES.filter(t => this.wave >= t.minWave);
    return Phaser.Utils.Array.GetRandom(available) || ENEMY_TYPES[0];
  }

  _spawnEnemy() {
    if (!this._gameReady) return;
    if (this.kills >= KILLS_PER_MAP) return;   // quota reached — no more spawns
    if (this.enemies.countActive(true) >= MAX_ENEMIES) return;
    if (!this.playerAlive) return;

    const pt   = Phaser.Utils.Array.GetRandom(this.spawnPoints);
    const type = this._pickEnemyType();
    const e    = this.enemies.create(pt.x, pt.y, 'enemy_' + type.id + '_chassis');

    e.setDepth(5).setCollideWorldBounds(true).setDrag(300);
    e.setMaxVelocity(type.maxVel + this.wave * 5);

    e.enemyType = type;
    e.hp        = type.hp;
    e.speed     = type.speed  + this.wave * 4;
    e.fireRate  = Math.max(Math.floor(type.fireRate  - this.wave * 60), Math.floor(type.fireRate  * 0.5));
    e.bulletSpd = Math.min(type.bulletSpd + this.wave * 4, 500);
    e.lastShot  = 0;
    e.body.setCircle(14, 6, 6);

    // Separate turret sprite for independent aiming
    e.turret = this.add.sprite(e.x, e.y, 'enemy_' + type.id + '_turret')
      .setDepth(6).setOrigin(0.5, 0.5);
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE LOOP
  ══════════════════════════════════════════════════════════ */
  update(time) {
    if (this.isPaused) return;
    if (!this._gameReady) return;
    if (!this.playerAlive) return;
    this._movePlayer(time);
    this._updateEnemies(time);
    this._updateBullets(time);
    this._updateShieldSprite();
    this._refreshHUD();
  }

  _togglePause() {
    if (!this.playerAlive) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.tweens.pauseAll();
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
    }
    this.pauseOverlay.setVisible(this.isPaused);
    this.pauseText.setVisible(this.isPaused);
  }

  _updateShieldSprite() {
    const active = this.stacks.shield > 0;
    this.shieldSprite.setVisible(active);
    if (active) this.shieldSprite.setPosition(this.player.x, this.player.y);
  }

  /* ══════════════════════════════════════════════════════════
     PLAYER MOVEMENT & FIRING
  ══════════════════════════════════════════════════════════ */
  _movePlayer(time) {
    const { cursors, wasd, player } = this;
    let ax = 0, ay = 0;

    if (cursors.left.isDown  || wasd.A.isDown) ax = -1;
    if (cursors.right.isDown || wasd.D.isDown) ax =  1;
    if (cursors.up.isDown    || wasd.W.isDown) ay = -1;
    if (cursors.down.isDown  || wasd.S.isDown) ay =  1;
    if (ax !== 0 && ay !== 0) { ax *= Math.SQRT1_2; ay *= Math.SQRT1_2; }

    const speedMult = 1 + this.stacks.speed * POWERUP_PER_STACK.speed;
    player.setMaxVelocity(PLAYER_SPEED * speedMult);
    player.setAcceleration(ax * PLAYER_ACCEL, ay * PLAYER_ACCEL);

    if (this.controlMode === 'mouse') {
      const ptr = this.input.activePointer;
      this.fireAngle = Phaser.Math.RadToDeg(
        Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x)
      );
    } else {
      if (ax !== 0 || ay !== 0)
        this.fireAngle = Phaser.Math.RadToDeg(Math.atan2(ay, ax));
      if (cursors.space.isDown || wasd.SPACE.isDown)
        this._tryPlayerFire(time);
    }

    // Chassis rotates toward movement direction; stays put when idle
    if (ax !== 0 || ay !== 0) {
      const moveRad    = Math.atan2(ay, ax);
      const chassisRad = Phaser.Math.DegToRad(player.angle);
      player.angle = Phaser.Math.RAD_TO_DEG * Phaser.Math.Angle.RotateTo(chassisRad, moveRad, 0.14);
    }

    // Turret independently tracks aim angle with a recoil offset along the barrel axis
    const aimRad    = Phaser.Math.DegToRad(this.fireAngle);
    const turretRad = Phaser.Math.DegToRad(this.playerTurret.angle);
    this.playerTurret.angle = Phaser.Math.RAD_TO_DEG * Phaser.Math.Angle.RotateTo(turretRad, aimRad, 0.18);
    const tRad    = Phaser.Math.DegToRad(this.playerTurret.angle);
    const recoil  = (this.playerTurret.turretRecoil || 0) * 4;
    this.playerTurret.setPosition(
      player.x - Math.cos(tRad) * recoil,
      player.y - Math.sin(tRad) * recoil
    );
  }

  /* effective fire interval in ms (lower = faster) */
  _currentFireRate() {
    const reduction = this.stacks.rapidfire * POWERUP_PER_STACK.rapidfire;
    return Math.max(Math.floor(PLAYER_FIRE_RATE * (1 - reduction)), 60);
  }

  /* effective player bullet speed */
  _currentBulletSpeed() {
    return Math.floor(BULLET_SPEED_P * (1 + this.stacks.bulletspd * POWERUP_PER_STACK.bulletspd));
  }

  _tryPlayerFire(time) {
    const player = this.player;
    if (time <= player.lastShot + this._currentFireRate()) return;

    // Barrel tip in world space
    const rad  = Phaser.Math.DegToRad(this.playerTurret.angle);
    const tipX = this.playerTurret.x + Math.cos(rad) * 18;
    const tipY = this.playerTurret.y + Math.sin(rad) * 18;

    if (this.stacks.tripleshot > 0) {
      this._fireBullet(tipX, tipY, this.fireAngle - 15, 'player');
      this._fireBullet(tipX, tipY, this.fireAngle,      'player');
      this._fireBullet(tipX, tipY, this.fireAngle + 15, 'player');
    } else {
      this._fireBullet(tipX, tipY, this.fireAngle, 'player');
    }

    player.lastShot = time;

    // Recoil: spring turret back 4 px then return to rest
    this.playerTurret.turretRecoil = 1;
    this.tweens.add({ targets: this.playerTurret, turretRecoil: 0, duration: 150, ease: 'Power2Out' });

    // Brief point-light flash at muzzle
    const muzzleLight = this.add.pointlight(tipX, tipY, 0xffbb44, 80, 1.2);
    this.time.delayedCall(80, () => muzzleLight.destroy());

    this.cameras.main.shake(60, 0.006);
    SoundFX.playerShoot();
  }

  /* ══════════════════════════════════════════════════════════
     ENEMY AI
  ══════════════════════════════════════════════════════════ */
  _updateEnemies(time) {
    this.enemies.children.each(e => {
      if (!e.active) return;
      const dx  = this.player.x - e.x;
      const dy  = this.player.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angleRad = Math.atan2(dy, dx);

      e.angle = Phaser.Math.RAD_TO_DEG *
        Phaser.Math.Angle.RotateTo(Phaser.Math.DegToRad(e.angle), angleRad, e.enemyType.rotateSp);

      e.setAcceleration(Math.cos(angleRad) * e.speed * 4, Math.sin(angleRad) * e.speed * 4);

      if (time > e.lastShot + e.fireRate) {
        const acc      = e.enemyType.aimAcc;
        const travelT  = dist / e.bulletSpd;
        const predX    = this.player.x + this.player.body.velocity.x * travelT * acc;
        const predY    = this.player.y + this.player.body.velocity.y * travelT * acc;
        const aimAngle = Phaser.Math.RadToDeg(Math.atan2(predY - e.y, predX - e.x));
        // Spawn from barrel tip
        const eRad = Phaser.Math.DegToRad(aimAngle);
        this._fireBullet(e.x + Math.cos(eRad)*18, e.y + Math.sin(eRad)*18, aimAngle, 'enemy', e.bulletSpd, e.enemyType.damage);
        SoundFX.enemyShoot();
        e.lastShot = time;
      }

      // Sync turret sprite: position on chassis + rotate toward player
      if (e.turret) {
        const turretRad = Phaser.Math.DegToRad(e.turret.angle);
        e.turret.angle  = Phaser.Math.RAD_TO_DEG *
          Phaser.Math.Angle.RotateTo(turretRad, angleRad, e.enemyType.rotateSp * 1.5);
        e.turret.setPosition(e.x, e.y);
      }
    }, this);
  }

  /* ══════════════════════════════════════════════════════════
     PARTICLE EMITTERS  (created once, reused every explosion)
  ══════════════════════════════════════════════════════════ */
  _buildEmitters() {
    const base = { angle:{ min:0, max:360 }, blendMode:Phaser.BlendModes.ADD };

    this._bigSparkFx = this.add.particles(0, 0, 'spark', {
      ...base, speed:{ min:85, max:280 }, scale:{ start:1.2, end:0 }, lifespan:500,
    }).setDepth(12).stop();

    this._smallSparkFx = this.add.particles(0, 0, 'spark', {
      ...base, speed:{ min:45, max:150 }, scale:{ start:0.6, end:0 }, lifespan:220,
    }).setDepth(12).stop();

    this._bigSmokeFx = this.add.particles(0, 0, 'smoke', {
      angle:{ min:0, max:360 }, speed:{ min:20, max:60 },
      scale:{ start:1.5, end:2.5 }, alpha:{ start:0.55, end:0 }, lifespan:700,
    }).setDepth(11).stop();

    this._smallSmokeFx = this.add.particles(0, 0, 'smoke', {
      angle:{ min:0, max:360 }, speed:{ min:15, max:40 },
      scale:{ start:0.8, end:2.0 }, alpha:{ start:0.5, end:0 }, lifespan:350,
    }).setDepth(11).stop();

    // Bullet smoke trail — 1 particle emitted per bullet every 40 ms
    this._trailFx = this.add.particles(0, 0, 'smoke', {
      angle:{ min:0, max:360 }, speed:{ min:4, max:18 },
      scale:{ start:0.18, end:0.55 }, alpha:{ start:0.30, end:0 }, lifespan:200,
    }).setDepth(7).stop();
  }

  /* ══════════════════════════════════════════════════════════
     BULLETS
  ══════════════════════════════════════════════════════════ */
  _fireBullet(x, y, angleDeg, team, customSpeed, damage = PLAYER_HIT_DAMAGE) {
    const isPlayer = team === 'player';
    const speed    = customSpeed ?? (isPlayer ? this._currentBulletSpeed() : 240);
    const group    = isPlayer ? this.playerBullets : this.enemyBullets;
    const tex      = isPlayer ? 'bulletP' : 'bulletE';

    const b = group.get(x, y, tex);
    if (!b) return;
    b.setActive(true).setVisible(true).setTexture(tex).setDepth(8).setAngle(angleDeg);
    b.team      = team;
    b.damage    = damage;
    b.born      = this.time.now;
    b._lastTrail = 0;
    b.body.reset(x, y);
    b.body.setAllowGravity(false);
    this.physics.velocityFromAngle(angleDeg, speed, b.body.velocity);

    // Glow added once per pool slot (persists across recycles)
    if (b.preFX && !b._glow) {
      b._glow = b.preFX.addGlow(isPlayer ? 0xffff44 : 0xff3300, 2, 0, false);
    }

    // Small muzzle flash at spawn point
    const rad   = Phaser.Math.DegToRad(angleDeg);
    const flash = this.add.image(x + Math.cos(rad)*5, y + Math.sin(rad)*5, 'muzzle')
      .setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets:flash, alpha:0, scaleX:2, scaleY:2, duration:80, onComplete:()=>flash.destroy() });
  }

  // return bullet to pool instead of destroying it
  _killBullet(b) {
    if (!b || !b.active) return;
    this._spawnExplosion(b.x, b.y, 'small');
    b.setActive(false).setVisible(false);
    b.body.reset(-200, -200);
  }

  // called each frame to cull out-of-bounds / expired bullets and emit smoke trail
  _updateBullets(time) {
    const cull = b => {
      if (!b.active) return;
      if (time > b.born + 1800 || b.x < -20 || b.x > W+20 || b.y < -20 || b.y > H+20) {
        this._killBullet(b);
        return;
      }
      if (time > (b._lastTrail || 0) + 40) {
        this._trailFx.explode(1, b.x, b.y);
        b._lastTrail = time;
      }
    };
    this.playerBullets.children.each(cull);
    this.enemyBullets.children.each(cull);
  }

  /* ══════════════════════════════════════════════════════════
     POWER-UPS
  ══════════════════════════════════════════════════════════ */
  _spawnPowerUp(x, y) {
    if (Math.random() >= POWERUP_DROP_CHANCE) return;
    const type = Phaser.Utils.Array.GetRandom(POWERUP_TYPES);

    const pu = this.physics.add.image(x, y, 'powerup_' + type.id);
    pu.setDepth(4);
    pu.body.setAllowGravity(false);
    pu.body.setImmovable(true);
    pu.powerupType = type;
    this.powerups.add(pu);

    this.tweens.add({ targets:pu, scaleX:1.22, scaleY:1.22, yoyo:true, repeat:-1, duration:600, ease:'Sine.easeInOut' });
    this.tweens.add({ targets:pu, angle:360, duration:3500, repeat:-1, ease:'Linear' });
    this.time.delayedCall(12000, () => { if (pu.active) pu.destroy(); });
  }

  /* callback order: (player, powerup) — overlap set up as (player, powerups, ...) */
  _onPlayerPowerup(player, pu) {
    if (!pu.active) return;
    const id = pu.powerupType.id;
    pu.destroy();
    SoundFX.powerup();

    // ── health: restore/overheal HP (caps at PLAYER_MAX_HP) ──
    if (id === 'health') {
      if (this.playerHp >= PLAYER_MAX_HP) {
        SoundFX.powerupMax();
        this._flashMsg('HP MAX!', '#44ffaa');
        return;
      }
      const before = this.playerHp;
      this.playerHp = Math.min(this.playerHp + POWERUP_HEAL_AMOUNT, PLAYER_MAX_HP);
      const gained  = this.playerHp - before;
      const over    = this.playerHp > PLAYER_HP ? '  [OVERHEAL]' : '';
      this._flashMsg(`+${gained}% HP${over}`, '#2ecc40');
      return;
    }

    // ── consumable: shield ──
    if (id === 'shield') {
      const prev = this.stacks.shield;
      this.stacks.shield = Math.min(prev + 1, POWERUP_CAPS.shield);
      const suffix = prev >= POWERUP_CAPS.shield ? ' (MAX)' : ` ×${this.stacks.shield}`;
      this._flashMsg('SHIELD' + suffix, '#5dade2');
      return;
    }

    // ── permanent stackable effects ──
    const prev  = this.stacks[id];
    const atCap = prev >= POWERUP_CAPS[id];
    this.stacks[id] = Math.min(prev + 1, POWERUP_CAPS[id]);

    const MSGS = { speed:'SPEED UP', bulletspd:'SHOTS FASTER', rapidfire:'RAPID FIRE', tripleshot:'TRIPLE SHOT' };
    const COLS = { speed:'#f39c12', bulletspd:'#e74c3c',      rapidfire:'#e67e22',    tripleshot:'#bb88ee' };
    if (atCap) SoundFX.powerupMax();
    this._flashMsg(MSGS[id] + (atCap ? ' (MAX)' : ` ×${this.stacks[id]}`), COLS[id]);
  }

  /* consume one shield stack; called before _playerHit */
  _absorbWithShield() {
    this.stacks.shield = Math.max(this.stacks.shield - 1, 0);
    if (this.stacks.shield > 0) {
      SoundFX.shieldAbsorb();
      this._flashMsg(`SHIELD ×${this.stacks.shield}`, '#5dade2');
    } else {
      SoundFX.shieldBreak();
      this._flashMsg('SHIELD GONE!', '#5dade2');
    }
    this.cameras.main.shake(80, 0.01);
  }

  _flashMsg(text, color) {
    const msg = this.add.text(W/2, H/2 - 60, text, {
      fontSize:'28px', fontFamily:'monospace', color,
      stroke:'#000', strokeThickness:5
    }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets:msg, alpha:0, y:msg.y - 40, duration:1000, onComplete:()=>msg.destroy() });
  }

  /* ══════════════════════════════════════════════════════════
     EXPLOSIONS
  ══════════════════════════════════════════════════════════ */
  _spawnExplosion(x, y, size = 'big') {
    const big = size === 'big';

    // pooled emitters — explode() fires a one-shot burst at (x, y)
    if (big) {
      this._bigSparkFx.explode(18, x, y);
      this._bigSmokeFx.explode(8,  x, y);
    } else {
      this._smallSparkFx.explode(6, x, y);
      this._smallSmokeFx.explode(3, x, y);
    }

    // shockwave ring — expands and fades
    const ring = this.add.image(x, y, 'shockwave')
      .setDepth(13).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9).setScale(0.15);
    this.tweens.add({
      targets: ring,
      scale: big ? 4 : 2,
      alpha: 0,
      duration: big ? 380 : 200,
      ease: 'Power2Out',
      onComplete: () => ring.destroy(),
    });

    if (big) this.cameras.main.shake(120, 0.014);
  }

  /* ══════════════════════════════════════════════════════════
     COLLISION CALLBACKS
  ══════════════════════════════════════════════════════════ */
  _onBulletStone(bullet, stone) {
    if (!bullet.active || !stone.active) return;
    SoundFX.brickHit();
    this._killBullet(bullet);
    this._spawnExplosion(stone.x, stone.y, 'small');
    stone.destroy();
  }

  _onBulletSteel(bullet) {
    if (!bullet.active) return;
    SoundFX.wallHit();
    this._spawnExplosion(bullet.x, bullet.y, 'small');
    this._killBullet(bullet);
  }

  _onPlayerBulletEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    if (bullet.team !== 'player') return;
    this._killBullet(bullet);
    enemy.hp--;
    if (enemy.hp <= 0) {
      SoundFX.bigExplosion();
      this._spawnExplosion(enemy.x, enemy.y, 'big');
      this._spawnPowerUp(enemy.x, enemy.y);
      this.score += enemy.enemyType.points * this.wave;
      this.kills++;
      if (enemy.turret) { enemy.turret.destroy(); enemy.turret = null; }
      enemy.destroy();
      this._checkMapAdvance();
    } else {
      enemy.setTint(0xffffff);
      if (enemy.turret) enemy.turret.setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if (enemy.active) { enemy.clearTint(); if (enemy.turret) enemy.turret.clearTint(); }
      });
    }
  }

  _onEnemyBulletPlayer(player, bullet) {
    if (!bullet.active || !player.active) return;
    if (bullet.team !== 'enemy') return;
    const dmg = bullet.damage ?? PLAYER_HIT_DAMAGE;
    this._killBullet(bullet);
    if (this.stacks.shield > 0) this._absorbWithShield();
    else this._playerHit(dmg);
  }

  _onBulletsCollide(b1, b2) {
    if (!b1.active || !b2.active) return;
    if (b1.team === b2.team) return;
    this._spawnExplosion((b1.x+b2.x)/2, (b1.y+b2.y)/2, 'small');
    b1.destroy(); b2.destroy();
  }

  _onEnemyRam(player, enemy) {
    if (!player.active || !enemy.active) return;
    const dmg = enemy.enemyType.damage ?? PLAYER_HIT_DAMAGE;
    this._spawnExplosion(enemy.x, enemy.y, 'big');
    this._spawnPowerUp(enemy.x, enemy.y);
    this.score += enemy.enemyType.points * this.wave;
    this.kills++;
    if (enemy.turret) { enemy.turret.destroy(); enemy.turret = null; }
    enemy.destroy();
    this._checkMapAdvance();
    if (this.stacks.shield > 0) this._absorbWithShield();
    else this._playerHit(dmg);
  }

  /* ══════════════════════════════════════════════════════════
     MAP PROGRESSION
  ══════════════════════════════════════════════════════════ */
  _checkMapAdvance() {
    if (this.kills < KILLS_PER_MAP) return;
    if (this.enemies.countActive(true) > 0) return;  // wait for last tank to die
    if (this._mapAdvancing) return;
    this._mapAdvancing = true;

    SoundFX.waveUp();

    if (this.mapIndex >= MAPS.length - 1) {
      // All maps cleared — victory!
      this.time.delayedCall(900, () => {
        this.scene.start('GameOverScene', { score: this.score, map: MAPS.length, victory: true });
      });
    } else {
      // Brief pause then hand off to MapClearScene
      this.time.delayedCall(900, () => {
        this.cameras.main.fade(400, 0, 0, 0, false, (_cam, progress) => {
          if (progress >= 1) {
            this.scene.start('MapClearScene', {
              clearedMapIndex : this.mapIndex,
              nextMapIndex    : this.mapIndex + 1,
              score           : this.score,
              playerHp        : Math.max(this.playerHp, 1),
              stacks          : { ...this.stacks },
            });
          }
        });
      });
    }
  }

  _showMapBanner() {
    const mapDef = MAPS[this.mapIndex];
    const cx = W / 2, cy = H / 2;
    const D   = 55;   /* depth above everything */

    /* full black cover */
    const cover = this.add.rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0).setDepth(D).setAlpha(1);

    /* mission number — small label */
    const lbl = this.add.text(cx, cy - 72,
      `MISSION  ${this.mapIndex + 1}  /  ${MAPS.length}`, {
        fontSize:'15px', fontFamily:'monospace', color:'#445544',
      }).setOrigin(0.5).setDepth(D+1).setAlpha(0);

    /* map name — punches in */
    const name = this.add.text(cx, cy - 20, mapDef.name.toUpperCase(), {
      fontSize:'46px', fontFamily:'monospace',
      color:'#ffff00', stroke:'#000', strokeThickness:10,
      shadow:{ offsetX:0, offsetY:0, color:'#ffff00', blur:20, fill:false },
    }).setOrigin(0.5).setDepth(D+1).setScale(0.5).setAlpha(0);

    /* objective */
    const obj = this.add.text(cx, cy + 38,
      `Eliminate  ${KILLS_PER_MAP}  enemy units`, {
        fontSize:'16px', fontFamily:'monospace',
        color:'#88ffaa', stroke:'#000', strokeThickness:4,
      }).setOrigin(0.5).setDepth(D+1).setAlpha(0);

    /* expanding rule */
    const rule = this.add.rectangle(cx, cy + 66, 0, 2, 0xffff00)
      .setOrigin(0.5).setDepth(D+1);

    /* stagger in */
    this.tweens.add({ targets:lbl,  alpha:1, duration:250, delay:300 });
    this.tweens.add({ targets:name, alpha:1, scaleX:1, scaleY:1, duration:320, delay:500, ease:'Back.Out' });
    this.tweens.add({ targets:obj,  alpha:1, duration:250, delay:820 });
    this.tweens.add({ targets:rule, width:320, duration:350, delay:820, ease:'Power2' });

    /* dismiss — cover fades out, gameplay unlocks */
    const dismiss = () => {
      this._gameReady = true;
      [cover, lbl, name, obj, rule].forEach(o =>
        this.tweens.add({ targets:o, alpha:0, duration:400,
          onComplete: () => { if (o.active) o.destroy(); } })
      );
    };

    /* auto-dismiss after 2.4 s, or immediately on Space/click */
    this.time.delayedCall(2400, dismiss);
    this.time.delayedCall(900, () => {
      this.input.keyboard.once('keydown-SPACE', dismiss);
      this.input.once('pointerdown', dismiss);
    });
  }

  /* ══════════════════════════════════════════════════════════
     PLAYER LIFE / DEATH
  ══════════════════════════════════════════════════════════ */
  _playerHit(dmg = PLAYER_HIT_DAMAGE) {
    if (!this.playerAlive) return;
    this.playerHp -= dmg;
    SoundFX.playerHit();
    // shake intensity scales with hit damage; subtle red tint feedback
    const shakeAmt = 0.006 + (dmg / 100) * 0.010;
    this.cameras.main.shake(120, shakeAmt);
    this.cameras.main.flash(60, 255, 0, 0, false);
    this.player.setTint(0xff6666);
    this.playerTurret.setTint(0xff6666);
    this.time.delayedCall(180, () => {
      if (this.player.active) { this.player.clearTint(); this.playerTurret.clearTint(); }
    });
    if (this.playerHp <= 0) this._playerDie();
  }

  _playerDie() {
    if (!this.playerAlive) return;
    this.playerAlive = false;
    SoundFX.bigExplosion();
    this.time.delayedCall(400, () => SoundFX.gameOver());
    this._spawnExplosion(this.player.x, this.player.y, 'big');
    this.player.setActive(false).setVisible(false);
    this.playerTurret.setVisible(false);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', { score:this.score, map:this.mapIndex + 1 });
    });
  }
}

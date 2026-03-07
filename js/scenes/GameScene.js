/* =============================================================
   GAME SCENE
============================================================= */
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  /* ══════════════════════════════════════════════════════════
     CREATE
  ══════════════════════════════════════════════════════════ */
  create() {
    this.score       = 0;
    this.wave        = 1;
    this.lives       = 3;
    this.kills       = 0;
    this.playerAlive = true;
    this.fireAngle   = 0;
    this.controlMode = 'keyboard';  // 'keyboard' | 'mouse'

    // stacks[id] = current active stack count (0 = inactive)
    this.stacks   = { speed:0, bulletspd:0, rapidfire:0, shield:0, tripleshot:0 };
    // stackEnd[id] = ms timestamp when a timed effect expires (0 = not running)
    this.stackEnd = { speed:0, bulletspd:0, rapidfire:0, tripleshot:0 };

    createTextures(this);
    this._buildFloor();
    this._buildGroups();
    this._buildMap();
    this._buildPlayer();
    this._buildCollisions();
    this._buildHUD();
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
    this.playerBullets = this.physics.add.group({ runChildUpdate:true });
    this.enemyBullets  = this.physics.add.group({ runChildUpdate:true });
    this.enemies       = this.physics.add.group();
    this.powerups      = this.physics.add.group();
  }

  _buildMap() {
    const L = [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X..SS....X..SS...X',
      'X..SS....X..SS...X',
      'X........X.......X',
      'X....XX..........X',
      'X....XX...SS.....X',
      'X.........SS.....X',
      'X...SS....X......X',
      'X...SS....X..XX..X',
      'X........XX..XX..X',
      'X..SS............X',
      'X..SS............X',
      'XXXXXXXXXXXXXXXXXX',
    ];
    L.forEach((row, r) => {
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
    this.player = this.physics.add.sprite(W/2, H - TILE*1.8, 'playerTank');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(PLAYER_DRAG);
    this.player.setMaxVelocity(PLAYER_SPEED);
    this.player.setDepth(5);
    this.player.lastShot = 0;
    this.player.hp = 3;
    this.player.body.setSize(34, 34);

    this.shieldSprite = this.add.image(0, 0, 'shieldFx')
      .setDepth(6).setVisible(false).setAlpha(0.85);
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
    const st = { fontSize:'18px', fontFamily:'monospace', color:'#ffffff', stroke:'#000', strokeThickness:4 };
    this.hudScore = this.add.text(12, 10, 'Score: 0',   st).setDepth(50).setScrollFactor(0);
    this.hudWave  = this.add.text(12, 34, 'Wave:  1',   st).setDepth(50).setScrollFactor(0);
    this.hudLives = this.add.text(12, 58, 'Lives: +++', st).setDepth(50).setScrollFactor(0);
    this.hudMode  = this.add.text(12, 82, '', {
      fontSize:'12px', fontFamily:'monospace', color:'#aaffaa', stroke:'#000', strokeThickness:3
    }).setDepth(50).setScrollFactor(0);
    this.hudMute  = this.add.text(12, 99, '', {
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
    const now = this.time.now;
    this.hudScore.setText('Score: ' + this.score);
    this.hudWave.setText ('Wave:  ' + this.wave);
    this.hudLives.setText('Lives: ' + Array(this.lives + 1).join('+ ').trim());
    this.hudMode.setText(
      this.controlMode === 'keyboard' ? '[TAB] KB: move+SPACE' : '[TAB] Mouse: aim+click'
    ).setColor(this.controlMode === 'keyboard' ? '#aaffaa' : '#aaffff');
    this.hudMute.setText(SoundFX.muted ? '[M] Sound: OFF' : '[M] Sound: ON')
      .setColor(SoundFX.muted ? '#ff6666' : '#888888');

    // timed effects
    const LABELS = { speed:'SPD', bulletspd:'BLT', rapidfire:'ROF', tripleshot:' x3' };
    ['speed', 'bulletspd', 'rapidfire', 'tripleshot'].forEach(id => {
      const n = this.stacks[id];
      if (n > 0 && this.stackEnd[id] > now) {
        const secs = ((this.stackEnd[id] - now) / 1000).toFixed(1);
        this.hudStacks[id].setText(`${LABELS[id]} ×${n}  ${secs}s`);
      } else {
        this.hudStacks[id].setText('');
      }
    });
    // shield (consumable, no timer)
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
    if (this.enemies.countActive(true) >= MAX_ENEMIES) return;
    if (!this.playerAlive) return;

    const pt   = Phaser.Utils.Array.GetRandom(this.spawnPoints);
    const type = this._pickEnemyType();
    const e    = this.enemies.create(pt.x, pt.y, 'enemy_' + type.id);

    e.setDepth(5).setCollideWorldBounds(true).setDrag(300);
    e.setMaxVelocity(type.maxVel + this.wave * 5);

    e.enemyType = type;
    e.hp        = type.hp;
    e.speed     = type.speed  + this.wave * 4;
    e.fireRate  = Math.max(Math.floor(type.fireRate  - this.wave * 60), Math.floor(type.fireRate  * 0.5));
    e.bulletSpd = Math.min(type.bulletSpd + this.wave * 4, 500);
    e.lastShot  = 0;
    e.body.setSize(32, 32);
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE LOOP
  ══════════════════════════════════════════════════════════ */
  update(time) {
    if (this.isPaused) return;
    if (!this.playerAlive) return;
    this._tickEffects(time);
    this._movePlayer(time);
    this._updateEnemies(time);
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

  /* expire timed effects whose timer has elapsed */
  _tickEffects(time) {
    for (const key of ['speed', 'bulletspd', 'rapidfire', 'tripleshot']) {
      if (this.stacks[key] > 0 && this.stackEnd[key] <= time)
        this.stacks[key] = 0;
    }
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

    const aimRad = Phaser.Math.DegToRad(this.fireAngle);
    const cur    = Phaser.Math.DegToRad(player.angle);
    player.angle = Phaser.Math.RAD_TO_DEG * Phaser.Math.Angle.RotateTo(cur, aimRad, 0.18);
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

    if (this.stacks.tripleshot > 0) {
      this._fireBullet(player.x, player.y, this.fireAngle - 15, 'player');
      this._fireBullet(player.x, player.y, this.fireAngle,      'player');
      this._fireBullet(player.x, player.y, this.fireAngle + 15, 'player');
    } else {
      this._fireBullet(player.x, player.y, this.fireAngle, 'player');
    }

    player.lastShot = time;
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
        this._fireBullet(e.x, e.y, aimAngle, 'enemy', e.bulletSpd);
        SoundFX.enemyShoot();
        e.lastShot = time;
      }
    }, this);
  }

  /* ══════════════════════════════════════════════════════════
     BULLETS
  ══════════════════════════════════════════════════════════ */
  _fireBullet(x, y, angleDeg, team, customSpeed) {
    const isPlayer = team === 'player';
    const speed    = customSpeed ?? (isPlayer ? this._currentBulletSpeed() : 240);
    const group    = isPlayer ? this.playerBullets : this.enemyBullets;

    const b = this.physics.add.image(x, y, isPlayer ? 'bulletP' : 'bulletE');
    b.setDepth(8).setAngle(angleDeg);
    b.team = team;
    b.born = this.time.now;
    group.add(b);
    this.physics.velocityFromAngle(angleDeg, speed, b.body.velocity);
    b.body.setAllowGravity(false);

    const rad   = Phaser.Math.DegToRad(angleDeg);
    const flash = this.add.image(x + Math.cos(rad)*22, y + Math.sin(rad)*22, 'muzzle')
      .setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets:flash, alpha:0, scaleX:2, scaleY:2, duration:80, onComplete:()=>flash.destroy() });

    b.update = () => {
      if (!b.active) return;
      if (this.time.now > b.born + 1800 || b.x < -20 || b.x > W+20 || b.y < -20 || b.y > H+20)
        this._killBullet(b);
    };
  }

  _killBullet(b) {
    if (!b || !b.active) return;
    this._spawnExplosion(b.x, b.y, 'small');
    b.destroy();
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

    this.tweens.add({ targets:pu, scaleX:1.28, scaleY:1.28, yoyo:true, repeat:-1, duration:550, ease:'Sine.easeInOut' });
    this.time.delayedCall(12000, () => { if (pu.active) pu.destroy(); });
  }

  /* callback order: (player, powerup) — overlap set up as (player, powerups, ...) */
  _onPlayerPowerup(player, pu) {
    if (!pu.active) return;
    const id = pu.powerupType.id;
    pu.destroy();
    SoundFX.powerup();

    // ── instant: health ──
    if (id === 'health') {
      this.lives = Math.min(this.lives + 1, POWERUP_CAPS.health);
      this._flashMsg('+1 HP', '#2ecc40');
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

    // ── timed stackable effects ──
    const prev  = this.stacks[id];
    const atCap = prev >= POWERUP_CAPS[id];
    this.stacks[id]   = Math.min(prev + 1, POWERUP_CAPS[id]);
    this.stackEnd[id] = this.time.now + POWERUP_DURATION;  // refresh / start timer

    const MSGS = { speed:'SPEED UP', bulletspd:'SHOTS FASTER', rapidfire:'RAPID FIRE', tripleshot:'TRIPLE SHOT' };
    const COLS = { speed:'#f39c12', bulletspd:'#e74c3c',      rapidfire:'#e67e22',    tripleshot:'#bb88ee' };
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
    const big      = size === 'big';
    const count    = big ? 18 :  6;
    const speed    = big ? 280 : 150;
    const lifespan = big ? 500 : 220;

    const emitter = this.add.particles(x, y, 'spark', {
      speed:{ min:speed*0.3, max:speed }, angle:{ min:0, max:360 },
      scale:{ start:big?1.2:0.6, end:0 }, lifespan, quantity:count,
      blendMode:Phaser.BlendModes.ADD,
    });
    this.time.delayedCall(lifespan+100, () => emitter.destroy());

    const smoke = this.add.particles(x, y, 'smoke', {
      speed:{ min:20, max:60 }, angle:{ min:0, max:360 },
      scale:{ start:big?1.5:0.8, end:2.5 },
      alpha:{ start:0.6, end:0 }, lifespan:big?700:350, quantity:big?8:3,
    });
    this.time.delayedCall(800, () => smoke.destroy());

    if (big) this.cameras.main.shake(120, 0.014);
  }

  /* ══════════════════════════════════════════════════════════
     COLLISION CALLBACKS
  ══════════════════════════════════════════════════════════ */
  _onBulletStone(bullet, stone) {
    if (!bullet.active || !stone.active) return;
    SoundFX.wallHit();
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
      enemy.destroy();
      this._checkWaveAdvance();
    } else {
      enemy.setTint(0xffffff);
      this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    }
  }

  _onEnemyBulletPlayer(player, bullet) {
    if (!bullet.active || !player.active) return;
    if (bullet.team !== 'enemy') return;
    this._killBullet(bullet);
    if (this.stacks.shield > 0) this._absorbWithShield();
    else this._playerHit();
  }

  _onBulletsCollide(b1, b2) {
    if (!b1.active || !b2.active) return;
    if (b1.team === b2.team) return;
    this._spawnExplosion((b1.x+b2.x)/2, (b1.y+b2.y)/2, 'small');
    b1.destroy(); b2.destroy();
  }

  _onEnemyRam(player, enemy) {
    if (!player.active || !enemy.active) return;
    this._spawnExplosion(enemy.x, enemy.y, 'big');
    this._spawnPowerUp(enemy.x, enemy.y);
    this.score += enemy.enemyType.points * this.wave;
    this.kills++;
    enemy.destroy();
    this._checkWaveAdvance();
    if (this.stacks.shield > 0) this._absorbWithShield();
    else this._playerHit();
  }

  /* ══════════════════════════════════════════════════════════
     WAVE PROGRESSION
  ══════════════════════════════════════════════════════════ */
  _checkWaveAdvance() {
    if (this.kills >= this.wave * 5 && this.wave < 10) {
      this.wave++;
      this.kills = 0;
      this._showWaveBanner();
    }
  }

  _showWaveBanner() {
    SoundFX.waveUp();
    const txt = this.add.text(W/2, H/2, `WAVE ${this.wave}`, {
      fontSize:'48px', fontFamily:'monospace',
      color:'#ffff00', stroke:'#000', strokeThickness:8
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.tweens.add({
      targets:txt, alpha:1, y:H/2 - 30, duration:400, ease:'Power2',
      onComplete: () => {
        this.tweens.add({ targets:txt, alpha:0, duration:600, delay:600, onComplete:()=>txt.destroy() });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     PLAYER LIFE / DEATH
  ══════════════════════════════════════════════════════════ */
  _playerHit() {
    if (!this.playerAlive) return;
    this.lives--;
    SoundFX.playerHit();
    this.cameras.main.shake(200, 0.025);
    this.player.setTint(0xff3333);
    this.time.delayedCall(300, () => { if (this.player.active) this.player.clearTint(); });
    if (this.lives <= 0) this._playerDie();
  }

  _playerDie() {
    if (!this.playerAlive) return;
    this.playerAlive = false;
    SoundFX.bigExplosion();
    this.time.delayedCall(400, () => SoundFX.gameOver());
    this._spawnExplosion(this.player.x, this.player.y, 'big');
    this.player.setActive(false).setVisible(false);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', { score:this.score, wave:this.wave });
    });
  }
}

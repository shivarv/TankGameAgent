/* =============================================================
   GAME SCENE
============================================================= */
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  /* ══════════════════════════════════════════════════════════
     INIT / CREATE
  ══════════════════════════════════════════════════════════ */
  create() {
    this.score       = 0;
    this.wave        = 1;
    this.lives       = 3;
    this.kills       = 0;       // kills this wave
    this.playerAlive = true;
    this.fireAngle   = 0;
    this.controlMode = 'keyboard';  // 'keyboard' | 'mouse'

    // active effect end-timestamps (ms); 0 = inactive
    this.effectEnd = { speed:0, rapidfire:0, tripleshot:0 };
    this.shieldActive = false;

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
      this._refreshHUD();
    });

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

    this.physics.add.overlap(playerBullets, stoneWalls,   this._onBulletStone,           null, this);
    this.physics.add.overlap(enemyBullets,  stoneWalls,   this._onBulletStone,           null, this);
    this.physics.add.overlap(playerBullets, steelWalls,   this._onBulletSteel,           null, this);
    this.physics.add.overlap(enemyBullets,  steelWalls,   this._onBulletSteel,           null, this);
    this.physics.add.overlap(playerBullets, enemies,      this._onPlayerBulletEnemy,     null, this);
    this.physics.add.overlap(enemyBullets,  player,       this._onEnemyBulletPlayer,     null, this);
    this.physics.add.overlap(playerBullets, enemyBullets, this._onBulletsCollide,        null, this);
    this.physics.add.overlap(enemies,       player,       this._onEnemyRam,              null, this);
    this.physics.add.overlap(powerups,      player,       this._onPlayerPowerup,         null, this);
  }

  /* ══════════════════════════════════════════════════════════
     HUD
  ══════════════════════════════════════════════════════════ */
  _buildHUD() {
    const st = { fontSize:'18px', fontFamily:'monospace', color:'#ffffff', stroke:'#000', strokeThickness:4 };
    const sm = { fontSize:'13px', fontFamily:'monospace', color:'#aaffaa', stroke:'#000', strokeThickness:3 };
    this.hudScore   = this.add.text(12, 10, 'Score: 0',   st).setDepth(50).setScrollFactor(0);
    this.hudWave    = this.add.text(12, 34, 'Wave:  1',   st).setDepth(50).setScrollFactor(0);
    this.hudLives   = this.add.text(12, 58, 'Lives: +++', st).setDepth(50).setScrollFactor(0);
    this.hudMode    = this.add.text(12, 82, '',           sm).setDepth(50).setScrollFactor(0);
    this.hudEffects = this.add.text(W - 12, 10, '', {
      fontSize:'13px', fontFamily:'monospace', color:'#ffffff',
      stroke:'#000', strokeThickness:3, align:'right'
    }).setDepth(50).setScrollFactor(0).setOrigin(1, 0);
  }

  _refreshHUD() {
    const now = this.time.now;
    this.hudScore.setText('Score: ' + this.score);
    this.hudWave.setText ('Wave:  ' + this.wave);
    this.hudLives.setText('Lives: ' + '+ '.repeat(this.lives).trim());

    if (this.controlMode === 'keyboard') {
      this.hudMode.setText('[TAB] KB: move+SPACE').setColor('#aaffaa');
    } else {
      this.hudMode.setText('[TAB] Mouse: aim+click').setColor('#aaffff');
    }

    const lines = [];
    if (this.effectEnd.speed     > now) lines.push(`SPD  ${((this.effectEnd.speed    -now)/1000).toFixed(1)}s`);
    if (this.effectEnd.rapidfire > now) lines.push(`RPD  ${((this.effectEnd.rapidfire-now)/1000).toFixed(1)}s`);
    if (this.effectEnd.tripleshot> now) lines.push(`x3   ${((this.effectEnd.tripleshot-now)/1000).toFixed(1)}s`);
    if (this.shieldActive)              lines.push('SLD  active');
    this.hudEffects.setText(lines.join('\n'));
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

    e.setDepth(5);
    e.setCollideWorldBounds(true);
    e.setDrag(300);
    e.setMaxVelocity(type.maxVel + this.wave * 5);

    e.enemyType  = type;
    e.hp         = type.hp;
    e.speed      = type.speed  + this.wave * 4;
    e.fireRate   = Math.max(Math.floor(type.fireRate  - this.wave * 60), Math.floor(type.fireRate  * 0.5));
    e.bulletSpd  = Math.min(type.bulletSpd + this.wave * 4, 500);
    e.lastShot   = 0;
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE LOOP
  ══════════════════════════════════════════════════════════ */
  update(time) {
    if (!this.playerAlive) return;
    this._movePlayer(time);
    this._updateEnemies(time);
    this._updateShieldSprite();
    this._refreshHUD();
  }

  _updateShieldSprite() {
    this.shieldSprite.setVisible(this.shieldActive);
    if (this.shieldActive)
      this.shieldSprite.setPosition(this.player.x, this.player.y);
  }

  /* ══════════════════════════════════════════════════════════
     PLAYER MOVEMENT & FIRE
  ══════════════════════════════════════════════════════════ */
  _movePlayer(time) {
    const { cursors, wasd, player } = this;
    let ax = 0, ay = 0;

    if (cursors.left.isDown  || wasd.A.isDown) ax = -1;
    if (cursors.right.isDown || wasd.D.isDown) ax =  1;
    if (cursors.up.isDown    || wasd.W.isDown) ay = -1;
    if (cursors.down.isDown  || wasd.S.isDown) ay =  1;
    if (ax !== 0 && ay !== 0) { ax *= Math.SQRT1_2; ay *= Math.SQRT1_2; }

    const effectiveSpeed = this.effectEnd.speed > time ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    player.setMaxVelocity(effectiveSpeed);
    player.setAcceleration(ax * PLAYER_ACCEL, ay * PLAYER_ACCEL);

    if (this.controlMode === 'mouse') {
      const ptr = this.input.activePointer;
      this.fireAngle = Phaser.Math.RadToDeg(
        Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x)
      );
    } else {
      if (ax !== 0 || ay !== 0)
        this.fireAngle = Phaser.Math.RadToDeg(Math.atan2(ay, ax));
      if ((cursors.space.isDown || wasd.SPACE.isDown))
        this._tryPlayerFire(time);
    }

    // rotate tank to face aim direction
    const aimRad = Phaser.Math.DegToRad(this.fireAngle);
    const cur    = Phaser.Math.DegToRad(player.angle);
    player.angle = Phaser.Math.RAD_TO_DEG * Phaser.Math.Angle.RotateTo(cur, aimRad, 0.18);
  }

  _currentFireRate(time) {
    return this.effectEnd.rapidfire > time ? Math.floor(PLAYER_FIRE_RATE * 0.35) : PLAYER_FIRE_RATE;
  }

  _tryPlayerFire(time) {
    const player = this.player;
    if (time <= player.lastShot + this._currentFireRate(time)) return;

    const tripleActive = this.effectEnd.tripleshot > time;
    if (tripleActive) {
      this._fireBullet(player.x, player.y, this.fireAngle - 15, 'player');
      this._fireBullet(player.x, player.y, this.fireAngle,      'player');
      this._fireBullet(player.x, player.y, this.fireAngle + 15, 'player');
    } else {
      this._fireBullet(player.x, player.y, this.fireAngle, 'player');
    }

    player.lastShot = time;
    this.cameras.main.shake(60, 0.006);
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
        const acc       = e.enemyType.aimAcc;
        const travelT   = dist / e.bulletSpd;
        const predX     = this.player.x + this.player.body.velocity.x * travelT * acc;
        const predY     = this.player.y + this.player.body.velocity.y * travelT * acc;
        const aimAngle  = Phaser.Math.RadToDeg(Math.atan2(predY - e.y, predX - e.x));
        this._fireBullet(e.x, e.y, aimAngle, 'enemy', e.bulletSpd);
        e.lastShot = time;
      }
    }, this);
  }

  /* ══════════════════════════════════════════════════════════
     BULLETS
  ══════════════════════════════════════════════════════════ */
  _fireBullet(x, y, angleDeg, team, customSpeed) {
    const isPlayer = team === 'player';
    const speed    = customSpeed ?? (isPlayer ? BULLET_SPEED_P : 240);
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

    // pulse scale
    this.tweens.add({ targets:pu, scaleX:1.25, scaleY:1.25, yoyo:true, repeat:-1, duration:600, ease:'Sine.easeInOut' });

    // auto-despawn after 12 s
    this.time.delayedCall(12000, () => { if (pu.active) pu.destroy(); });
  }

  _onPlayerPowerup(player, pu) {
    if (!pu.active) return;
    const type = pu.powerupType;
    pu.destroy();

    switch (type.id) {
      case 'health':
        this.lives = Math.min(this.lives + 1, 5);
        this._flashMsg('+1 HP', '#2ecc40');
        break;
      case 'speed':
        this.effectEnd.speed = this.time.now + POWERUP_DURATION;
        this._flashMsg('SPEED UP!', '#f1c40f');
        break;
      case 'rapidfire':
        this.effectEnd.rapidfire = this.time.now + POWERUP_DURATION;
        this._flashMsg('RAPID FIRE!', '#e67e22');
        break;
      case 'shield':
        this.shieldActive = true;
        this._flashMsg('SHIELD ON!', '#3498db');
        break;
      case 'tripleshot':
        this.effectEnd.tripleshot = this.time.now + POWERUP_DURATION;
        this._flashMsg('TRIPLE SHOT!', '#9b59b6');
        break;
    }
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
    this._killBullet(bullet);
    this._spawnExplosion(stone.x, stone.y, 'small');
    stone.destroy();
  }

  _onBulletSteel(bullet) {
    if (!bullet.active) return;
    this._spawnExplosion(bullet.x, bullet.y, 'small');
    this._killBullet(bullet);
  }

  _onPlayerBulletEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    if (bullet.team !== 'player') return;
    this._killBullet(bullet);
    enemy.hp--;
    if (enemy.hp <= 0) {
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
    if (this.shieldActive) {
      this.shieldActive = false;
      this._flashMsg('SHIELD BROKEN!', '#3498db');
      this.cameras.main.shake(80, 0.01);
    } else {
      this._playerHit();
    }
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
    if (this.shieldActive) {
      this.shieldActive = false;
      this._flashMsg('SHIELD BROKEN!', '#3498db');
    } else {
      this._playerHit();
    }
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
    this.cameras.main.shake(200, 0.025);
    this.player.setTint(0xff3333);
    this.time.delayedCall(300, () => { if (this.player.active) this.player.clearTint(); });
    if (this.lives <= 0) this._playerDie();
  }

  _playerDie() {
    if (!this.playerAlive) return;
    this.playerAlive = false;
    this._spawnExplosion(this.player.x, this.player.y, 'big');
    this.player.setActive(false).setVisible(false);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', { score:this.score, wave:this.wave });
    });
  }
}
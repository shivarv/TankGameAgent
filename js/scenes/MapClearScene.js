/* =============================================================
   MAP CLEAR SCENE  — shown between maps with 5-second countdown
============================================================= */
class MapClearScene extends Phaser.Scene {
  constructor() { super('MapClearScene'); }

  init(d) {
    this.clearedIdx = d.clearedMapIndex;
    this.nextIdx    = d.nextMapIndex;
    this.savedScore = d.score;
    this.savedHp    = d.playerHp;
    this.savedStacks = d.stacks;
    this._advanced  = false;
  }

  create() {
    const cx = W / 2, cy = H / 2;
    const cleared = MAPS[this.clearedIdx];
    const next    = MAPS[this.nextIdx];

    /* ── background ── */
    this.add.rectangle(0, 0, W, H, 0x001408).setOrigin(0);

    /* ── decorative top & bottom strips ── */
    this.add.rectangle(cx, 0,   W, 4, 0x44ff88).setOrigin(0.5, 0);
    this.add.rectangle(cx, H,   W, 4, 0x44ff88).setOrigin(0.5, 1);
    this.add.rectangle(cx, H/2, W, 2, 0x224433).setOrigin(0.5);

    /* ── "MAP X CLEARED!" — pop in from below ── */
    const title = this.add.text(cx, cy - 150, `MAP ${this.clearedIdx + 1}  CLEARED!`, {
      fontSize: '50px', fontFamily: 'monospace',
      color: '#ffff44', stroke: '#000', strokeThickness: 10,
    }).setOrigin(0.5).setAlpha(0).setY(cy - 110);

    this.tweens.add({
      targets: title, alpha: 1, y: cy - 150,
      duration: 420, ease: 'Back.Out',
    });

    /* ── cleared map name ── */
    this.add.text(cx, cy - 100, cleared.name, {
      fontSize: '20px', fontFamily: 'monospace', color: '#88ffbb',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0.9);

    /* ── score ── */
    this.add.text(cx, cy - 64, `Score: ${this.savedScore}`, {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    /* ── separator ── */
    this.add.rectangle(cx, cy - 28, 320, 2, 0x335544).setOrigin(0.5);

    /* ── "NEXT MAP" preview ── */
    this.add.text(cx, cy - 10, '─── UP NEXT ───', {
      fontSize: '15px', fontFamily: 'monospace', color: '#556655',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 18,
      `MAP ${this.nextIdx + 1} / ${MAPS.length}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    const nextTitle = this.add.text(cx, cy + 44, next.name, {
      fontSize: '30px', fontFamily: 'monospace', color: '#ffaa44',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: nextTitle, alpha: 1,
      duration: 500, delay: 300, ease: 'Power2',
    });

    this.add.text(cx, cy + 80, `Eliminate ${KILLS_PER_MAP} enemies to advance`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#667766',
    }).setOrigin(0.5);

    /* ── countdown bar ── */
    const BAR_W = 280, BAR_H = 20, BAR_Y = cy + 118;
    this.add.rectangle(cx - BAR_W/2, BAR_Y, BAR_W, BAR_H, 0x1a3320)
      .setOrigin(0, 0.5);
    const bar = this.add.rectangle(cx - BAR_W/2, BAR_Y, BAR_W, BAR_H, 0x44cc66)
      .setOrigin(0, 0.5);

    /* tween bar scaleX 1 → 0 over 5 s, then auto-advance */
    this._barTween = this.tweens.add({
      targets: bar, scaleX: 0,
      duration: 5000, ease: 'Linear',
      onComplete: () => this._advance(),
    });

    /* countdown second text */
    this._secs    = 5;
    this._secText = this.add.text(cx, BAR_Y + 28, 'Starting in 5…', {
      fontSize: '14px', fontFamily: 'monospace', color: '#88aa88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        this._secs--;
        this._secText.setText(this._secs > 0 ? `Starting in ${this._secs}…` : 'Here we go!');
      },
    });

    /* ── blinking "continue" prompt ── */
    const btn = this.add.text(cx, cy + 178, '> SPACE  /  Click to start now <', {
      fontSize: '17px', fontFamily: 'monospace', color: '#ffff00',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: btn, alpha: 0.2, yoyo: true, repeat: -1, duration: 550 });

    /* ── input — small delay so a held key doesn't skip immediately ── */
    this.time.delayedCall(400, () => {
      this.input.keyboard.once('keydown-SPACE', () => this._advance());
      this.input.once('pointerdown', () => this._advance());
    });
  }

  _advance() {
    if (this._advanced) return;
    this._advanced = true;
    this._barTween.stop();

    /* Flash-out transition */
    this.cameras.main.fade(300, 0, 0, 0, false, (_cam, progress) => {
      if (progress >= 1) {
        this.scene.start('GameScene', {
          mapIndex : this.nextIdx,
          score    : this.savedScore,
          playerHp : this.savedHp,
          stacks   : this.savedStacks,
        });
      }
    });
  }
}

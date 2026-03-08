/* =============================================================
   MAP CLEAR SCENE  — two-phase cinematic mission briefing
   Phase 1 (0–2.2s): MISSION COMPLETE stamp + score
   Phase 2 (2.2s+):  tactical briefing panel slides up
============================================================= */
class MapClearScene extends Phaser.Scene {
  constructor() { super('MapClearScene'); }

  init(d) {
    this.clearedIdx  = d.clearedMapIndex;
    this.nextIdx     = d.nextMapIndex;
    this.savedScore  = d.score;
    this.savedHp     = d.playerHp;
    this.savedStacks = d.stacks;
    this._advanced   = false;
    this._barTween   = null;
  }

  create() {
    const cx = W / 2, cy = H / 2;

    /* full black canvas */
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0);

    /* subtle grid overlay */
    const g = this.add.graphics().setAlpha(0.06);
    for (let x = 0; x <= W; x += 40) { g.lineStyle(1, 0x00ff66, 1); g.lineBetween(x, 0, x, H); }
    for (let y = 0; y <= H; y += 40) { g.lineStyle(1, 0x00ff66, 1); g.lineBetween(0, y, W, y); }

    this._buildVictoryStamp(cx, cy);
    this.time.delayedCall(2200, () => this._buildBriefing(cx, cy));

    /* input only accepted after briefing has appeared */
    this.time.delayedCall(2800, () => {
      this.input.keyboard.once('keydown-SPACE', () => this._advance());
      this.input.once('pointerdown',            () => this._advance());
    });
  }

  /* ── Phase 1 ───────────────────────────────────────────── */
  _buildVictoryStamp(cx, cy) {
    /* white punch flash */
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setAlpha(0).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0.7, duration: 70, yoyo: true, ease: 'Power4' });

    /* pulsing halo */
    const halo = this.add.circle(cx, cy - 50, 130, 0x00ff66, 0).setDepth(1);
    this.tweens.add({ targets: halo, fillAlpha: 0.07, yoyo: true, repeat: -1, duration: 750 });

    /* "MISSION COMPLETE" — scale-punch in */
    const stamp = this.add.text(cx, cy - 50, 'MISSION\nCOMPLETE', {
      fontSize: '60px', fontFamily: 'monospace', align: 'center',
      color: '#00ff66', stroke: '#000', strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ff66', blur: 28, fill: false },
    }).setOrigin(0.5).setScale(2.8).setAlpha(0).setDepth(2);

    this.tweens.add({ targets: stamp, alpha: 1, scaleX: 1, scaleY: 1, duration: 380, ease: 'Back.Out' });

    /* map name */
    const mapName = this.add.text(cx, cy + 62,
      `MAP ${this.clearedIdx + 1}  ·  ${MAPS[this.clearedIdx].name.toUpperCase()}`, {
      fontSize: '17px', fontFamily: 'monospace',
      color: '#88ffaa', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);
    this.tweens.add({ targets: mapName, alpha: 1, duration: 280, delay: 420 });

    /* score */
    const sc = this.add.text(cx, cy + 96, `SCORE  ${this.savedScore}`, {
      fontSize: '26px', fontFamily: 'monospace',
      color: '#ffff55', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);
    this.tweens.add({ targets: sc, alpha: 1, duration: 280, delay: 700 });

    /* expanding rule */
    const rule = this.add.rectangle(cx, cy + 130, 0, 2, 0x00ff66).setOrigin(0.5).setDepth(2);
    this.tweens.add({ targets: rule, width: 360, duration: 450, delay: 950, ease: 'Power2' });

    /* "preparing…" blink */
    const prep = this.add.text(cx, cy + 158, 'PREPARING NEXT MISSION…', {
      fontSize: '13px', fontFamily: 'monospace', color: '#336644',
    }).setOrigin(0.5).setAlpha(0).setDepth(2);
    this.tweens.add({ targets: prep, alpha: 1, duration: 250, delay: 1350 });
    this.tweens.add({ targets: prep, alpha: 0.25, yoyo: true, repeat: -1, duration: 480, delay: 1650 });
  }

  /* ── Phase 2 ───────────────────────────────────────────── */
  _buildBriefing(cx, cy) {
    const next   = MAPS[this.nextIdx];
    const PW = 500, PH = 318;
    const TX = cx, TY0 = cy - PH / 2 + 32;   /* top content row inside panel */

    /* panel starts below screen, slides up */
    const startY = H + PH;
    const endY   = cy;

    const panel  = this.add.rectangle(cx, startY, PW, PH, 0x000d05).setOrigin(0.5).setDepth(10);
    const border = this.add.rectangle(cx, startY, PW, PH).setStrokeStyle(2, 0x00ff66)
      .setFillStyle().setOrigin(0.5).setDepth(11);

    this.tweens.add({
      targets: [panel, border], y: endY,
      duration: 480, ease: 'Back.Out(1.2)',
    });

    /* corner brackets — drawn after panel settles */
    this.time.delayedCall(500, () => {
      const acc = this.add.graphics().setDepth(12);
      const px = cx - PW/2, py = endY - PH/2, cl = 20;
      acc.lineStyle(3, 0x00ff66, 1);
      acc.strokePoints([{x:px,y:py+cl},{x:px,y:py},{x:px+cl,y:py}]);
      acc.strokePoints([{x:px+PW-cl,y:py},{x:px+PW,y:py},{x:px+PW,y:py+cl}]);
      acc.strokePoints([{x:px,y:py+PH-cl},{x:px,y:py+PH},{x:px+cl,y:py+PH}]);
      acc.strokePoints([{x:px+PW-cl,y:py+PH},{x:px+PW,y:py+PH},{x:px+PW,y:py+PH-cl}]);
    });

    const fi = (obj, dur, delay=0) =>
      this.tweens.add({ targets:obj, alpha:1, duration:dur, delay });

    /* ── header bar ── */
    this.time.delayedCall(520, () => {
      this.add.rectangle(cx, TY0, PW - 20, 34, 0x002211).setOrigin(0.5).setDepth(12);
      const hdr = this.add.text(TX, TY0,
        `── MISSION  ${this.nextIdx + 1}  /  ${MAPS.length} ──`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#00ff66',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      fi(hdr, 200);
    });

    /* ── map name — dramatic ── */
    this.time.delayedCall(680, () => {
      const nm = this.add.text(TX, TY0 + 52, next.name.toUpperCase(), {
        fontSize: '38px', fontFamily: 'monospace',
        color: '#ff9900', stroke: '#000', strokeThickness: 8,
        shadow: { offsetX:0, offsetY:0, color:'#ff6600', blur:20, fill:false },
      }).setOrigin(0.5).setScale(0.5).setAlpha(0).setDepth(13);
      this.tweens.add({ targets: nm, alpha:1, scaleX:1, scaleY:1, duration:320, ease:'Back.Out' });
    });

    /* ── thin rule ── */
    this.time.delayedCall(940, () => {
      const div = this.add.rectangle(TX, TY0 + 96, 0, 1, 0x1a4428).setOrigin(0.5).setDepth(13);
      this.tweens.add({ targets: div, width: 460, duration: 300, ease:'Power2' });
    });

    /* ── objective ── */
    this.time.delayedCall(1060, () => {
      const lbl = this.add.text(TX, TY0 + 122, 'MISSION OBJECTIVE', {
        fontSize: '11px', fontFamily: 'monospace', color: '#446655',
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      fi(lbl, 200);

      const obj = this.add.text(TX, TY0 + 144, `Eliminate  ${KILLS_PER_MAP}  enemy units`, {
        fontSize: '18px', fontFamily: 'monospace',
        color: '#aaffcc', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      fi(obj, 200, 80);
    });

    /* ── carry-over stats ── */
    this.time.delayedCall(1280, () => {
      const hpPct = Math.round((this.savedHp / PLAYER_HP) * 100);
      this.add.rectangle(TX, TY0 + 186, 460, 28, 0x001508).setOrigin(0.5).setDepth(12);
      const stats = this.add.text(TX, TY0 + 186,
        `HULL  ${hpPct}%    ·    SCORE  ${this.savedScore}`, {
        fontSize: '13px', fontFamily: 'monospace',
        color: '#55cc88', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      fi(stats, 200);
    });

    /* ── countdown bar ── */
    this.time.delayedCall(1480, () => {
      const BAR_W = 420, BAR_H = 14, barY = TY0 + 224;
      this.add.rectangle(cx - BAR_W/2, barY, BAR_W, BAR_H, 0x001508)
        .setOrigin(0, 0.5).setDepth(13);
      const bar = this.add.rectangle(cx - BAR_W/2, barY, BAR_W, BAR_H, 0x00cc44)
        .setOrigin(0, 0.5).setDepth(13);

      this._barTween = this.tweens.add({
        targets: bar, scaleX: 0,
        duration: 5000, ease: 'Linear',
        onComplete: () => this._advance(),
      });

      this._secs    = 5;
      this._secText = this.add.text(cx, barY + 20, 'AUTO-DEPLOY IN  5', {
        fontSize: '11px', fontFamily: 'monospace', color: '#3a6644',
      }).setOrigin(0.5).setDepth(13);

      this.time.addEvent({
        delay: 1000, repeat: 4,
        callback: () => {
          this._secs--;
          if (this._secText?.active)
            this._secText.setText(this._secs > 0 ? `AUTO-DEPLOY IN  ${this._secs}` : 'DEPLOYING…');
        },
      });

      const btn = this.add.text(cx, barY + 42, '[ SPACE  /  CLICK  —  DEPLOY NOW ]', {
        fontSize: '15px', fontFamily: 'monospace',
        color: '#ffff00', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      fi(btn, 300);
      this.tweens.add({ targets: btn, alpha: 0.15, yoyo: true, repeat: -1, duration: 580, delay: 400 });
    });
  }

  /* ── Deploy ─────────────────────────────────────────────── */
  _advance() {
    if (this._advanced) return;
    this._advanced = true;
    if (this._barTween) this._barTween.stop();

    /* white punch → fade to black → start next map */
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff)
      .setOrigin(0).setAlpha(0).setDepth(30);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 80, ease: 'Power4',
      onComplete: () => {
        this.cameras.main.fade(380, 0, 0, 0, false, (_c, p) => {
          if (p >= 1) {
            this.scene.start('GameScene', {
              mapIndex : this.nextIdx,
              score    : this.savedScore,
              playerHp : this.savedHp,
              stacks   : this.savedStacks,
            });
          }
        });
      },
    });
  }
}

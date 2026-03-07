/* =============================================================
   GAME OVER SCENE
============================================================= */
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  init(d) { this.finalScore = d.score || 0; this.wave = d.wave || 1; }

  create() {
    const cx = W/2, cy = H/2;
    this.add.rectangle(0, 0, W, H, 0x100000).setOrigin(0);

    const go = this.add.text(cx, cy - 90, 'GAME OVER', {
      fontSize:'56px', fontFamily:'monospace',
      color:'#ff3333', stroke:'#000', strokeThickness:8
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets:go, alpha:1, duration:600, ease:'Power2' });

    this.add.text(cx, cy, `Score : ${this.finalScore}`, {
      fontSize:'26px', fontFamily:'monospace', color:'#ffffff'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 44, `Wave  : ${this.wave}`, {
      fontSize:'22px', fontFamily:'monospace', color:'#aaaaaa'
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 120, '> SPACE to play again <', {
      fontSize:'20px', fontFamily:'monospace', color:'#ffff00',
      stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({ targets:btn, alpha:0.2, yoyo:true, repeat:-1, duration:600 });

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}

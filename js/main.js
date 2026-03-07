/* =============================================================
   PHASER BOOTSTRAP
============================================================= */
new Phaser.Game({
  type           : Phaser.AUTO,
  width          : W,
  height         : H,
  parent         : 'game-container',
  backgroundColor: '#0d1f0d',
  antialias      : false,
  physics: {
    default: 'arcade',
    arcade : { gravity:{ y:0 }, debug:false }
  },
  scene: [StartScene, GameScene, GameOverScene]
});

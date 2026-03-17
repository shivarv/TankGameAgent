import Phaser from 'phaser';
import { W, H } from './config.js';
import StartScene    from './scenes/StartScene.js';
import GameScene     from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import MapClearScene from './scenes/MapClearScene.js';

new Phaser.Game({
  type           : Phaser.AUTO,
  parent         : 'game-container',
  backgroundColor: '#0d1f0d',
  antialias      : true,
  scale: {
    mode      : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width     : W,
    height    : H,
    max       : { width: W * 2, height: H * 2 },  // cap at 1440×1120
  },
  physics: {
    default: 'arcade',
    arcade : { gravity:{ y:0 }, debug:false }
  },
  scene: [StartScene, GameScene, GameOverScene, MapClearScene],
  callbacks: {
    postBoot: () => { document.getElementById('loading')?.remove(); },
  },
});

import Phaser from 'phaser';
import { W, H } from './config.js';
import StartScene    from './scenes/StartScene.js';
import GameScene     from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import MapClearScene from './scenes/MapClearScene.js';

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
  scene: [StartScene, GameScene, GameOverScene, MapClearScene],
});

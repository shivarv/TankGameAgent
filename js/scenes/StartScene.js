/* =============================================================
   START SCENE
============================================================= */
import Phaser from 'phaser';
import { W, H } from '../config.js';

export default class StartScene extends Phaser.Scene {
  constructor() { super('StartScene'); }

  create() {
    const cx = W/2, cy = H/2;
    this.add.rectangle(0, 0, W, H, 0x0d1f0d).setOrigin(0);

    const title = this.add.text(cx, cy - 120, 'TANK BATTLE', {
      fontSize:'52px', fontFamily:'monospace',
      color:'#2ecc40', stroke:'#000', strokeThickness:8,
      shadow:{ offsetX:4, offsetY:4, color:'#000', blur:0, fill:true }
    }).setOrigin(0.5);
    this.tweens.add({ targets:title, scaleX:1.04, scaleY:1.04, yoyo:true, repeat:-1, duration:900, ease:'Sine.easeInOut' });

    this.add.text(cx, cy - 82, '10 Maps  ·  5 Enemy Types  ·  6 Power-ups', {
      fontSize:'13px', fontFamily:'monospace', color:'#557755'
    }).setOrigin(0.5);

    this.add.text(cx, cy - 8, [
      'MOVE    WASD / Arrow keys',
      'FIRE    SPACE  (keyboard mode)',
      '        Left-click  (mouse mode)',
      'AIM     Mouse cursor  (mouse mode)',
      'TOGGLE  TAB  — switch control mode',
      'PAUSE   P',
    ].join('\n'), {
      fontSize:'14px', fontFamily:'monospace', color:'#ccddcc',
      lineSpacing:6, align:'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 98, [
      'Power-ups drop on kills:',
      '+HP  SPD  RAPID  SHIELD  x3 SHOT',
    ].join('\n'), {
      fontSize:'13px', fontFamily:'monospace', color:'#aaddff', lineSpacing:4, align:'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 145, [
      'Enemy variants unlock as waves progress:',
      'Scout  Rusher  Soldier  Sniper  Heavy',
    ].join('\n'), {
      fontSize:'13px', fontFamily:'monospace', color:'#ffddaa', lineSpacing:4, align:'center'
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 200, '> PRESS SPACE TO START <', {
      fontSize:'20px', fontFamily:'monospace', color:'#ffff00',
      stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({ targets:btn, alpha:0.2, yoyo:true, repeat:-1, duration:600, ease:'Sine.easeInOut' });

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}

/* =============================================================
   START SCENE  —  redesigned
============================================================= */
import Phaser from 'phaser';
import { W, H } from '../config.js';

const ENEMY_DATA = [
  {
    label:    'Scout',
    col:      '#e74c3c',
    wave:     1,
    role:     'Fast Skirmisher',
    desc:     'Closes gaps quickly.\nLow HP — easy to pick off.',
    hp:       1, spd: 3, aim: 2, dmg: 1, fire: 1,
  },
  {
    label:    'Rusher',
    col:      '#e67e22',
    wave:     2,
    role:     'Ramming Charger',
    desc:     'Charges at full speed.\nPoor aim — danger is the impact.',
    hp:       1, spd: 3, aim: 1, dmg: 1, fire: 1,
  },
  {
    label:    'Soldier',
    col:      '#9b59b6',
    wave:     3,
    role:     'Balanced Rifleman',
    desc:     'Steady fire, decent accuracy.\nTakes 2 hits to destroy.',
    hp:       2, spd: 1, aim: 3, dmg: 1, fire: 3,
  },
  {
    label:    'Sniper',
    col:      '#1abc9c',
    wave:     4,
    role:     'Long-Range Assassin',
    desc:     'Perfect aim, lethal bullets.\nSlow moving — keep your distance.',
    hp:       1, spd: 1, aim: 3, dmg: 2, fire: 2,
  },
  {
    label:    'Heavy',
    col:      '#7f8c8d',
    wave:     5,
    role:     'Armoured Behemoth',
    desc:     'Slow but nearly unstoppable.\nHigh HP, rapid fire, perfect aim.',
    hp:       3, spd: 1, aim: 3, dmg: 2, fire: 3,
  },
];

export default class StartScene extends Phaser.Scene {
  constructor() { super('StartScene'); }

  create() {
    const cx = W / 2, cy = H / 2;

    /* ── background ── */
    this.add.rectangle(0, 0, W, H, 0x0a1a0a).setOrigin(0);

    /* subtle grid overlay */
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a3a1a, 0.4);
    for (let x = 0; x <= W; x += 40) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) grid.lineBetween(0, y, W, y);

    this._drawCornerBrackets();

    /* ── top accent bar ── */
    this.add.rectangle(cx, 18, W - 60, 2, 0x2ecc40, 0.6).setOrigin(0.5);
    this.add.text(cx, 18, '◆  TACTICAL WARFARE  ◆', {
      fontSize: '10px', fontFamily: 'monospace', color: '#557755'
    }).setOrigin(0.5);

    /* ── title ── */
    const title = this.add.text(cx, cy - 148, 'TANK\nBATTLE', {
      fontSize: '72px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#2ecc40', stroke: '#0a1a0a', strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 0, color: '#2ecc40', blur: 18, fill: true },
      align: 'center', lineSpacing: -8
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });

    /* tagline */
    this.add.text(cx, cy - 68, 'Survive the waves · Dominate the battlefield', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4a8a4a'
    }).setOrigin(0.5);

    this._divider(cy - 52);

    /* ── two-column info panel ── */
    const colL = cx - 168, colR = cx + 32;
    const rowY  = cy - 36;

    this._sectionLabel(colL, rowY, '[ CONTROLS ]', '#88aa88');
    const controls = [
      ['MOVE',  'WASD / Arrows'],
      ['FIRE',  'SPACE  or  Click'],
      ['AIM',   'Mouse cursor'],
      ['MODE',  'TAB  toggle'],
      ['PAUSE', 'P'],
    ];
    controls.forEach(([key, val], i) => {
      this.add.text(colL,      rowY + 18 + i * 18, key, { fontSize: '12px', fontFamily: 'monospace', color: '#ffdd88' }).setOrigin(0, 0.5);
      this.add.text(colL + 58, rowY + 18 + i * 18, val, { fontSize: '12px', fontFamily: 'monospace', color: '#aaccaa' }).setOrigin(0, 0.5);
    });

    this._sectionLabel(colR, rowY, '[ POWER-UPS ]', '#88aacc');
    const pups = [
      ['+HP', '#2ecc40', 'Restore health'],
      ['SPD', '#f39c12', 'Speed boost'],
      ['ROF', '#e67e22', 'Rapid fire'],
      ['BLT', '#e74c3c', 'Bullet speed'],
      ['SLD', '#3498db', 'Shield block'],
      ['x3',  '#9b59b6', 'Triple shot'],
    ];
    pups.forEach(([label, col, desc], i) => {
      this.add.text(colR,      rowY + 18 + i * 18, label, { fontSize: '12px', fontFamily: 'monospace', color: col, fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.add.text(colR + 40, rowY + 18 + i * 18, desc,  { fontSize: '12px', fontFamily: 'monospace', color: '#aabbcc' }).setOrigin(0, 0.5);
    });

    this._divider(cy + 80);

    /* ── enemy roster ── */
    this._sectionLabel(cx, cy + 96, '[ ENEMY ROSTER ]  —  hover a unit', '#ccaa88');

    const spacing = 120;
    const startX  = cx - (ENEMY_DATA.length - 1) * spacing / 2;

    /* build shared tooltip (hidden) — header + body are separate objects */
    this._ttBg     = this.add.graphics().setDepth(20).setVisible(false);
    this._ttHeader = this.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setDepth(21).setVisible(false);
    this._ttBody   = this.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccddcc', lineSpacing: 3
    }).setDepth(21).setVisible(false);

    ENEMY_DATA.forEach((enemy, i) => {
      const ex = startX + i * spacing;
      this._miniTankIcon(ex, cy + 126, enemy.col);

      this.add.text(ex, cy + 148, enemy.label, {
        fontSize: '11px', fontFamily: 'monospace', color: enemy.col, align: 'center'
      }).setOrigin(0.5);

      /* interactive hit zone over icon + label */
      const zone = this.add.zone(ex, cy + 133, 90, 56).setInteractive();
      zone.on('pointerover', () => this._showTooltip(ex, cy + 108, enemy));
      zone.on('pointerout',  () => this._hideTooltip());
    });

    /* wave hint (shown when no tooltip) */
    this._waveHint = this.add.text(cx, cy + 166, 'unlocks at waves  1 · 2 · 3 · 4 · 5', {
      fontSize: '10px', fontFamily: 'monospace', color: '#445544'
    }).setOrigin(0.5);

    this._divider(cy + 178);

    /* ── start button ── */
    const btn = this.add.text(cx, cy + 204, '▶  PRESS SPACE  OR  TAP TO START  ◀', {
      fontSize: '17px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffff44', stroke: '#0a1a0a', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 0, color: '#ffff00', blur: 10, fill: true }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btn, alpha: 0.15, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });

    /* ── bottom accent bar ── */
    this.add.rectangle(cx, H - 18, W - 60, 2, 0x2ecc40, 0.6).setOrigin(0.5);
    this.add.text(cx, H - 18, 'v1.0  ·  10 MAPS  ·  WAVE SURVIVAL', {
      fontSize: '10px', fontFamily: 'monospace', color: '#335533'
    }).setOrigin(0.5);

    /* ── input ── */
    const startGame = () => this.scene.start('GameScene');
    this.input.keyboard.once('keydown-SPACE', startGame);
    btn.once('pointerdown', startGame);
  }

  /* ─────────────────────────────────────────────────
     Tooltip
  ───────────────────────────────────────────────── */
  _showTooltip(iconX, tipBottomY, enemy) {
    const PAD      = 10;
    const TW       = 220;
    const STRIP_H  = 22;   // colored header strip height
    const LINE_H   = 15;   // approx px per body line (11px font + lineSpacing 3)
    const BODY_LINES = 7;  // role + blank + 2 desc + blank + 2 stat lines
    const TH       = STRIP_H + BODY_LINES * LINE_H + PAD;  // 22 + 105 + 10 = 137

    /* clamp so tooltip never clips screen edge */
    const tx = Phaser.Math.Clamp(iconX - TW / 2, 8, W - TW - 8);
    const ty = tipBottomY - TH - 6;

    const ac = Phaser.Display.Color.HexStringToColor(enemy.col).color;

    /* background + border */
    const g = this._ttBg;
    g.clear();
    g.fillStyle(0x060d06, 0.95);
    g.fillRoundedRect(tx, ty, TW, TH, 5);
    g.lineStyle(1, ac, 0.85);
    g.strokeRoundedRect(tx, ty, TW, TH, 5);
    /* colored header strip */
    g.fillStyle(ac, 0.22);
    g.fillRect(tx + 1, ty + 1, TW - 2, STRIP_H - 1);

    /* header: unit name in strip */
    this._ttHeader
      .setPosition(tx + PAD, ty + 4)
      .setColor(enemy.col)
      .setText(enemy.label.toUpperCase());

    /* body: role + desc + compact stat lines
       Keep stat strings short: max ~26 chars each to stay within TW-PAD*2=200px */
    const bar = (n, max = 3) => '■'.repeat(n) + '□'.repeat(max - n);
    const bodyLines = [
      enemy.role,
      '',
      ...enemy.desc.split('\n'),
      '',
      `HP ${bar(enemy.hp)}  SPD ${bar(enemy.spd)}  AIM ${bar(enemy.aim)}`,
      `DMG ${bar(enemy.dmg)}  ROF ${bar(enemy.fire)}  Wave ${enemy.wave}`,
    ];

    this._ttBody
      .setPosition(tx + PAD, ty + STRIP_H + 4)
      .setWordWrapWidth(TW - PAD * 2)
      .setText(bodyLines);

    g.setVisible(true);
    this._ttHeader.setVisible(true);
    this._ttBody.setVisible(true);
    this._waveHint.setVisible(false);
  }

  _hideTooltip() {
    this._ttBg.setVisible(false);
    this._ttHeader.setVisible(false);
    this._ttBody.setVisible(false);
    this._waveHint.setVisible(true);
  }

  /* ─────────────────────────────────────────────────
     Helpers
  ───────────────────────────────────────────────── */
  _divider(y) {
    const g = this.add.graphics();
    g.lineStyle(1, 0x2ecc40, 0.25);
    g.lineBetween(30, y, W - 30, y);
    this.add.text(30,     y, '◆', { fontSize: '8px', fontFamily: 'monospace', color: '#2e6630' }).setOrigin(0.5);
    this.add.text(W - 30, y, '◆', { fontSize: '8px', fontFamily: 'monospace', color: '#2e6630' }).setOrigin(0.5);
  }

  _sectionLabel(x, y, text, color) {
    this.add.text(x, y, text, { fontSize: '11px', fontFamily: 'monospace', color }).setOrigin(0.5, 1);
  }

  _drawCornerBrackets() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x2ecc40, 0.5);
    const sz = 20, pad = 10;
    g.beginPath(); g.moveTo(pad, pad + sz); g.lineTo(pad, pad); g.lineTo(pad + sz, pad); g.strokePath();
    g.beginPath(); g.moveTo(W - pad - sz, pad); g.lineTo(W - pad, pad); g.lineTo(W - pad, pad + sz); g.strokePath();
    g.beginPath(); g.moveTo(pad, H - pad - sz); g.lineTo(pad, H - pad); g.lineTo(pad + sz, H - pad); g.strokePath();
    g.beginPath(); g.moveTo(W - pad - sz, H - pad); g.lineTo(W - pad, H - pad); g.lineTo(W - pad, H - pad - sz); g.strokePath();
  }

  _miniTankIcon(x, y, color) {
    const g = this.add.graphics();
    const c = Phaser.Display.Color.HexStringToColor(color).color;
    g.fillStyle(c, 1);
    g.fillRect(x - 8, y - 5, 16, 10);   // body
    g.fillRect(x - 3, y - 8, 6, 6);     // turret
    g.fillStyle(c, 0.8);
    g.fillRect(x - 1, y - 14, 3, 8);    // barrel
  }
}

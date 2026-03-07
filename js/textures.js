/* =============================================================
   TEXTURE FACTORY  —  called once at the start of GameScene
============================================================= */
function createTextures(scene) {
  const g = scene.make.graphics({ add: false });

  /* ── floor tile ── */
  g.fillStyle(COL.FLOOR_A); g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(COL.FLOOR_B); g.fillRect(TILE/2, 0, TILE/2, TILE/2);
  g.fillStyle(COL.FLOOR_B); g.fillRect(0, TILE/2, TILE/2, TILE/2);
  g.generateTexture('floor', TILE, TILE); g.clear();

  /* ── stone wall ── */
  const S = TILE;
  g.fillStyle(COL.STONE);   g.fillRect(0, 0, S, S);
  g.fillStyle(COL.STONE_D); g.fillRect(2, 2, S-4, 6);
  g.fillRect(2, S/2, S-4, 4);
  g.fillStyle(0x00000044);  g.fillRect(S-3, 0, 3, S);
  g.fillRect(0, S-3, S, 3);
  g.generateTexture('stone', S, S); g.clear();

  /* ── steel wall ── */
  g.fillStyle(COL.STEEL);   g.fillRect(0, 0, S, S);
  g.fillStyle(COL.STEEL_H); g.fillRect(2, 2, S-4, 3);
  g.fillStyle(COL.STEEL_D); g.fillRect(S-4, 0, 4, S);
  g.fillRect(0, S-4, S, 4);
  [[6,6],[S-6,6],[6,S-6],[S-6,S-6]].forEach(([rx,ry]) => g.fillCircle(rx, ry, 3));
  g.generateTexture('steel', S, S); g.clear();

  /* ── tank sprite builder ── */
  const drawTank = (bodyCol, darkCol, turrCol, trackCol, key) => {
    const TW = 40, TH = 40;
    g.fillStyle(trackCol);
    g.fillRect(0, 0, TW, 8);
    g.fillRect(0, TH-8, TW, 8);
    g.fillStyle(COL.WHEEL);
    for (let i = 0; i < 5; i++) {
      g.fillCircle(4 + i*8, 4,    3);
      g.fillCircle(4 + i*8, TH-4, 3);
    }
    g.fillStyle(bodyCol);  g.fillRect(4, 9, TW-8, TH-18);
    g.fillStyle(darkCol);  g.fillRect(4, 9, TW-8, 3);
    g.fillRect(TW-8, 9, 4, TH-18);
    g.fillStyle(turrCol);  g.fillCircle(TW/2, TH/2, 9);
    g.fillStyle(darkCol);  g.fillRect(TW/2, TH/2-2, 16, 4);
    g.fillStyle(darkCol);  g.fillCircle(TW/2-2, TH/2, 3);
    g.generateTexture(key, TW, TH);
    g.clear();
  };

  drawTank(COL.P_BODY, COL.P_DARK, COL.P_TURR, COL.TRACK, 'playerTank');

  /* one texture per enemy variant */
  ENEMY_TYPES.forEach(t => {
    drawTank(t.bodyCol, t.darkCol, t.turrCol, t.trackCol, 'enemy_' + t.id);
  });

  /* ── player bullet ── */
  g.fillStyle(COL.BULLET_P); g.fillRect(0, 1, 10, 4);
  g.fillStyle(0xffffff);     g.fillRect(0, 2,  3, 2);
  g.generateTexture('bulletP', 10, 6); g.clear();

  /* ── enemy bullet ── */
  g.fillStyle(0xff6644); g.fillRect(0, 1, 10, 4);
  g.fillStyle(0xffaa88); g.fillRect(0, 2,  3, 2);
  g.generateTexture('bulletE', 10, 6); g.clear();

  /* ── muzzle flash ── */
  g.fillStyle(0xffffaa, 0.9); g.fillCircle(8, 8, 8);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(8, 8, 4);
  g.generateTexture('muzzle', 16, 16); g.clear();

  /* ── spark particle ── */
  g.fillStyle(0xff6600); g.fillCircle(6, 6, 6);
  g.generateTexture('spark', 12, 12); g.clear();

  /* ── smoke particle ── */
  g.fillStyle(0x888888, 0.5); g.fillCircle(8, 8, 8);
  g.generateTexture('smoke', 16, 16); g.clear();

  /* ── power-up icons (coloured circles with inner glow) ── */
  POWERUP_TYPES.forEach(pt => {
    const R = 14;
    g.fillStyle(pt.col, 1);    g.fillCircle(R, R, R);
    g.fillStyle(0xffffff, 0.4); g.fillCircle(R-3, R-4, 5);
    g.fillStyle(0x000000, 0.25); g.fillCircle(R+2, R+3, 5);
    g.generateTexture('powerup_' + pt.id, R*2, R*2);
    g.clear();
  });

  /* ── shield ring (drawn around player when active) ── */
  g.lineStyle(3, 0x3498db, 0.9);
  g.strokeCircle(20, 20, 19);
  g.lineStyle(1, 0x7fd3f5, 0.5);
  g.strokeCircle(20, 20, 22);
  g.generateTexture('shieldFx', 40, 40); g.clear();

  g.destroy();
}

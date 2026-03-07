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

  /* ── power-up icons (32×32, unique symbol per type) ── */
  {
    const R = 16;  // half-size; canvas is R*2 × R*2

    // shared helper: draw a shaded circle background
    const bg = col => {
      g.fillStyle(col);         g.fillCircle(R, R, R);
      g.fillStyle(0xffffff, 0.22); g.fillCircle(R-4, R-5, R * 0.38); // highlight
      g.fillStyle(0x000000, 0.20); g.fillCircle(R+3, R+4, R * 0.50); // shadow
    };

    // +HP  — green circle, bold white cross
    bg(0x27ae60);
    g.fillStyle(0xffffff);
    g.fillRect(R-2, R-8, 5, 17);   // vertical arm
    g.fillRect(R-8, R-2, 17, 5);   // horizontal arm
    g.generateTexture('powerup_health', R*2, R*2); g.clear();

    // SPD  — yellow circle, lightning bolt (two parallelograms)
    bg(0xf39c12);
    g.fillStyle(0xffffff);
    // upper half of bolt (leans left going down)
    g.fillPoints([{x:R+5,y:R-10},{x:R-1,y:R-10},{x:R-5,y:R+1},{x:R+1,y:R+1}], true);
    // lower half of bolt
    g.fillPoints([{x:R+5,y:R-1},{x:R-1,y:R-1},{x:R-5,y:R+10},{x:R+1,y:R+10}], true);
    g.generateTexture('powerup_speed', R*2, R*2); g.clear();

    // BLT  — red circle, right-facing thick arrow
    bg(0xe74c3c);
    g.fillStyle(0xffffff);
    g.fillRect(R-10, R-2, 12, 5);                    // shaft
    g.fillTriangle(R+2, R-6, R+11, R+1, R+2, R+7);  // arrowhead
    g.generateTexture('powerup_bulletspd', R*2, R*2); g.clear();

    // ROF  — orange circle, three stacked mini-bullets pointing right
    bg(0xe67e22);
    g.fillStyle(0xffffff);
    [-6, 0, 6].forEach(dy => {
      g.fillRect(R-8, R+dy-1, 10, 3);                         // body
      g.fillTriangle(R+2, R+dy-2, R+8, R+dy+1, R+2, R+dy+3); // tip
    });
    g.generateTexture('powerup_rapidfire', R*2, R*2); g.clear();

    // SLD  — blue circle, white shield silhouette (hollow)
    bg(0x3498db);
    g.fillStyle(0xffffff);
    g.fillRect(R-7, R-9, 15, 12);                    // top rectangle
    g.fillTriangle(R-7, R+3, R+8, R+3, R+1, R+12);  // pointed bottom
    g.fillStyle(0x3498db);                            // punch hole in centre
    g.fillRect(R-5, R-7, 11, 9);
    g.fillTriangle(R-5, R+2, R+6, R+2, R+1, R+9);
    g.generateTexture('powerup_shield', R*2, R*2); g.clear();

    // x3   — purple circle, three diverging arrows
    bg(0x9b59b6);
    g.fillStyle(0xffffff);
    // centre arrow (straight right)
    g.fillRect(R-9, R-1, 10, 3);
    g.fillTriangle(R+1, R-4, R+9, R+1, R+1, R+5);
    // upper-angled arrow (~−22°)
    g.fillPoints([{x:R-9,y:R-4},{x:R-9,y:R-7},{x:R+3,y:R-10},{x:R+3,y:R-7}], true);
    g.fillTriangle(R+3, R-13, R+10, R-8, R+4, R-6);
    // lower-angled arrow (~+22°)
    g.fillPoints([{x:R-9,y:R+4},{x:R-9,y:R+7},{x:R+3,y:R+10},{x:R+3,y:R+7}], true);
    g.fillTriangle(R+3, R+13, R+10, R+8, R+4, R+6);
    g.generateTexture('powerup_tripleshot', R*2, R*2); g.clear();
  }

  /* ── shield ring (shown around player while stacks active) ── */
  g.lineStyle(3, 0x3498db, 0.9); g.strokeCircle(20, 20, 19);
  g.lineStyle(1, 0x7fd3f5, 0.5); g.strokeCircle(20, 20, 22);
  g.generateTexture('shieldFx', 40, 40); g.clear();

  g.destroy();
}

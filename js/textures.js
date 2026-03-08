/* =============================================================
   TEXTURE FACTORY  —  called once at the start of GameScene
============================================================= */
function createTextures(scene) {
  const g = scene.make.graphics({ add: false });

  /* ── floor tile ── */
  g.fillStyle(COL.FLOOR_A); g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(COL.FLOOR_B); g.fillRect(TILE/2, 0, TILE/2, TILE/2);
  g.fillStyle(COL.FLOOR_B); g.fillRect(0, TILE/2, TILE/2, TILE/2);
  g.lineStyle(1, 0x000000, 0.13);
  g.lineBetween(TILE/2, 0, TILE/2, TILE);
  g.lineBetween(0, TILE/2, TILE, TILE/2);
  g.generateTexture('floor', TILE, TILE); g.clear();

  /* ── stone wall ── */
  const S = TILE;
  // mortar background
  g.fillStyle(0x3d2510); g.fillRect(0, 0, S, S);
  // row 1: two bricks (top half)
  g.fillStyle(COL.STONE);   g.fillRect(2,     2, S/2-3,  S/2-3);
  g.fillStyle(0x7a5535);    g.fillRect(S/2+1, 2, S/2-3,  S/2-3);
  // row 2: staggered bricks (bottom half)
  g.fillStyle(COL.STONE_D); g.fillRect(0,         S/2+1, S/4-1,  S/2-3);
  g.fillStyle(COL.STONE);   g.fillRect(S/4+1,     S/2+1, S/2-2,  S/2-3);
  g.fillStyle(0x7a5535);    g.fillRect(S*3/4+1,   S/2+1, S/4-3,  S/2-3);
  // brick top-edge highlights
  g.fillStyle(0xb07048, 0.45);
  g.fillRect(2, 2, S/2-3, 2);
  g.fillRect(S/2+1, 2, S/2-3, 2);
  g.fillRect(S/4+1, S/2+1, S/2-2, 2);
  // outer shadow edges
  g.fillStyle(0x000000, 0.4); g.fillRect(S-3, 0, 3, S); g.fillRect(0, S-3, S, 3);
  g.generateTexture('stone', S, S); g.clear();

  /* ── steel wall ── */
  g.fillStyle(COL.STEEL);   g.fillRect(0, 0, S, S);
  // diamond plate lines
  g.lineStyle(1, COL.STEEL_H, 0.22);
  for (let i = -S; i < S*2; i += 10) {
    g.lineBetween(i, 0, i+S, S);
    g.lineBetween(i+S, 0, i, S);
  }
  // inset weld seam
  g.lineStyle(2, COL.STEEL_D, 0.65); g.strokeRect(4, 4, S-8, S-8);
  // highlight top, shadow right+bottom
  g.fillStyle(COL.STEEL_H); g.fillRect(2, 2, S-4, 3);
  g.fillStyle(COL.STEEL_D); g.fillRect(S-4, 0, 4, S); g.fillRect(0, S-4, S, 4);
  // bolts with specular highlight
  [[6,6],[S-6,6],[6,S-6],[S-6,S-6]].forEach(([rx,ry]) => {
    g.fillStyle(COL.STEEL_D); g.fillCircle(rx, ry, 4);
    g.fillStyle(COL.STEEL_H); g.fillCircle(rx-1, ry-1, 1.5);
  });
  g.generateTexture('steel', S, S); g.clear();

  /* ── tank chassis builder (tracks, hull, wheels — no turret) ── */
  const drawChassis = (bodyCol, darkCol, trackCol, key) => {
    const TW = 40, TH = 40;
    // ground shadow
    g.fillStyle(0x000000, 0.22); g.fillEllipse(TW/2+2, TH/2+3, TW-2, TH-14);
    // tracks
    g.fillStyle(trackCol);
    g.fillRect(0, 0, TW, 8); g.fillRect(0, TH-8, TW, 8);
    // track segment dividers
    g.lineStyle(1, 0x000000, 0.55);
    for (let i = 6; i < TW; i += 7) {
      g.lineBetween(i, 0, i, 7); g.lineBetween(i, TH-8, i, TH-1);
    }
    // road wheels: rim + hub
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x555555); g.fillCircle(4+i*8, 4,    3.5);
      g.fillStyle(COL.WHEEL); g.fillCircle(4+i*8, 4,    2.5);
      g.fillStyle(0x555555); g.fillCircle(4+i*8, TH-4, 3.5);
      g.fillStyle(COL.WHEEL); g.fillCircle(4+i*8, TH-4, 2.5);
    }
    // sloped front plate
    g.fillStyle(bodyCol);
    g.fillPoints([{x:4,y:9},{x:TW-4,y:9},{x:TW-6,y:14},{x:6,y:14}], true);
    // hull body
    g.fillRect(4, 14, TW-8, TH-24);
    // shading
    g.fillStyle(darkCol);
    g.fillRect(4, 14, TW-8, 2);
    g.fillRect(TW-8, 9, 4, TH-18);
    // hull highlight
    g.fillStyle(0xffffff, 0.10); g.fillRect(5, 10, 12, 2);
    // rivets
    [[7,11],[TW-8,11],[7,TH-13],[TW-8,TH-13]].forEach(([rx,ry]) => {
      g.fillStyle(darkCol); g.fillCircle(rx, ry, 1.8);
      g.fillStyle(0xffffff, 0.25); g.fillCircle(rx-0.5, ry-0.5, 0.8);
    });
    g.generateTexture(key, TW, TH); g.clear();
  };

  /* ── tank turret builder (transparent bg, origin at centre 20,20) ── */
  const drawTurret = (turrCol, darkCol, key) => {
    const TW = 40, TH = 40;
    // turret shadow + dome
    g.fillStyle(0x000000, 0.28); g.fillCircle(TW/2+1, TH/2+1, 9.5);
    g.fillStyle(turrCol); g.fillCircle(TW/2, TH/2, 9);
    g.fillStyle(0xffffff, 0.15); g.fillCircle(TW/2-3, TH/2-3, 4);
    // mantlet (barrel mount socket)
    g.fillStyle(darkCol); g.fillCircle(TW/2+5, TH/2, 5.5);
    g.fillStyle(turrCol); g.fillCircle(TW/2+5, TH/2, 4.5);
    // tapered barrel (wide at base, narrow at tip)
    g.fillStyle(darkCol);
    g.fillPoints([
      {x:TW/2+5, y:TH/2-3},  {x:TW-2, y:TH/2-1.5},
      {x:TW-2,   y:TH/2+2.5},{x:TW/2+5, y:TH/2+4}
    ], true);
    // barrel highlight stripe
    g.fillStyle(0xffffff, 0.18); g.fillRect(TW/2+7, TH/2-2, TW/2-12, 1);
    // muzzle brake notches
    g.fillStyle(0x000000, 0.5);
    g.fillRect(TW-5, TH/2-3, 3, 2); g.fillRect(TW-5, TH/2+2, 3, 2);
    // cupola
    g.fillStyle(darkCol); g.fillCircle(TW/2-2, TH/2-2, 3.5);
    g.fillStyle(turrCol); g.fillCircle(TW/2-2, TH/2-2, 2.5);
    g.fillStyle(0xffffff, 0.2); g.fillCircle(TW/2-3, TH/2-3, 1);
    g.generateTexture(key, TW, TH); g.clear();
  };

  drawChassis(COL.P_BODY, COL.P_DARK, COL.TRACK, 'playerChassis');
  drawTurret(COL.P_TURR, COL.P_DARK, 'playerTurret');

  /* one chassis + turret texture per enemy variant */
  ENEMY_TYPES.forEach(t => {
    drawChassis(t.bodyCol, t.darkCol, t.trackCol, 'enemy_' + t.id + '_chassis');
    drawTurret(t.turrCol,  t.darkCol,              'enemy_' + t.id + '_turret');
  });

  /* ── player bullet ── */
  g.fillStyle(0xff9900, 0.3); g.fillEllipse(4, 3, 10, 4);   // glow trail
  g.fillStyle(COL.BULLET_P);  g.fillRect(3, 1, 9, 4);        // body
  g.fillStyle(0xffffff);      g.fillTriangle(12, 1, 12, 5, 16, 3); // nosecone
  g.fillStyle(0xffffff, 0.7); g.fillRect(4, 2, 4, 1);        // core highlight
  g.generateTexture('bulletP', 16, 6); g.clear();

  /* ── enemy bullet ── */
  g.fillStyle(0xaa2200, 0.3); g.fillEllipse(4, 3, 10, 4);
  g.fillStyle(0xff6644);      g.fillRect(3, 1, 9, 4);
  g.fillStyle(0xff9977);      g.fillTriangle(12, 1, 12, 5, 16, 3);
  g.fillStyle(0xffaa88, 0.7); g.fillRect(4, 2, 4, 1);
  g.generateTexture('bulletE', 16, 6); g.clear();

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

    // shared helper: draw a shaded circle background with depth cues
    const bg = col => {
      g.fillStyle(col, 0.30); g.fillCircle(R, R, R+3);      // outer glow
      g.fillStyle(col);       g.fillCircle(R, R, R);          // main circle
      g.lineStyle(2, 0x000000, 0.22); g.strokeCircle(R, R, R-1); // inner bevel
      g.fillStyle(0xffffff, 0.26); g.fillCircle(R-4, R-5, R*0.38); // highlight
      g.fillStyle(0x000000, 0.22); g.fillCircle(R+3, R+4, R*0.50); // shadow
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

  /* ── shockwave ring (explosion effect) ── */
  g.lineStyle(5, 0xffffff, 1.0); g.strokeCircle(24, 24, 22);
  g.lineStyle(2, 0xffaa44, 0.7); g.strokeCircle(24, 24, 18);
  g.generateTexture('shockwave', 48, 48); g.clear();

  /* ── shield ring (shown around player while stacks active) ── */
  g.lineStyle(6, 0x3498db, 0.18); g.strokeCircle(20, 20, 21);  // outer glow
  g.lineStyle(3, 0x3498db, 0.9);  g.strokeCircle(20, 20, 19);  // main ring
  g.lineStyle(1, 0x7fd3f5, 0.55); g.strokeCircle(20, 20, 22);  // inner shimmer
  g.generateTexture('shieldFx', 40, 40); g.clear();

  g.destroy();
}

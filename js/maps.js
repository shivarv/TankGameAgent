/* =============================================================
   MAPS  — 10 hand-crafted layouts, each 18 cols × 14 rows
   X = steel wall (indestructible)
   S = stone wall (destructible)
   . = open floor
   Spawn points (top-left, top-center, top-right) must stay open.
============================================================= */
const KILLS_PER_MAP = 20;

const MAPS = [
  /* ── 1 ── Outpost Alpha ── scattered cover, original layout */
  {
    name: 'Outpost Alpha',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X..SS....X..SS...X',
      'X..SS....X..SS...X',
      'X........X.......X',
      'X....XX..........X',
      'X....XX...SS.....X',
      'X.........SS.....X',
      'X...SS....X......X',
      'X...SS....X..XX..X',
      'X........XX..XX..X',
      'X..SS............X',
      'X..SS............X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 2 ── The Gauntlet ── alternating horizontal steel barriers */
  {
    name: 'The Gauntlet',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X...SS...........X',
      'XXXXXXXXXXX......X',
      'X................X',
      'X......XXXXXXXXXXX',
      'X........SS......X',
      'XXXXXXXXXXX......X',
      'X................X',
      'X......XXXXXXXXXXX',
      'X...........SS...X',
      'X................X',
      'X....SS..........X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 3 ── Stone Garden ── grid of destructible stone pillars */
  {
    name: 'Stone Garden',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X.SS..SS..SS..SS.X',
      'X................X',
      'X.SS..........SS.X',
      'X................X',
      'X....SS....SS....X',
      'X................X',
      'X...SS.......SS..X',
      'X................X',
      'X.SS..........SS.X',
      'X................X',
      'X.SS..SS..SS..SS.X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 4 ── Divided City ── steel column splits map; passage in centre */
  {
    name: 'Divided City',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X.......X........X',
      'X..SS...X....SS..X',
      'X.......X........X',
      'X.......X........X',
      'X.......X........X',
      'X................X',
      'X................X',
      'X.......X........X',
      'X..SS...X....SS..X',
      'X.......X........X',
      'X.......X........X',
      'X.......X........X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 5 ── Steel Fortress ── walled inner compound, side entry */
  {
    name: 'Steel Fortress',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X...XXXXXXXXXX...X',
      'X...X........X...X',
      'X...X..SS....X...X',
      'XXX.X........X.XXX',
      'X...X........X...X',
      'XXX.X........X.XXX',
      'X...X..SS....X...X',
      'X...X........X...X',
      'X...XXXXXXXXXX...X',
      'X................X',
      'X....SS....SS....X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 6 ── Scattered Ruins ── random stone debris */
  {
    name: 'Scattered Ruins',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X.SS.........SS..X',
      'X................X',
      'X.......SS.......X',
      'X..SS.........SS.X',
      'X................X',
      'X....SS....SS....X',
      'X................X',
      'X.SS.........SS..X',
      'X................X',
      'X.......SS.......X',
      'X................X',
      'X..SS.........SS.X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 7 ── Twin Towers ── two steel columns create three lanes */
  {
    name: 'Twin Towers',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X....X......X....X',
      'X....X......X....X',
      'X....X.SS...X....X',
      'X....X......X....X',
      'X....X......X....X',
      'X....X......X....X',
      'X....X......X....X',
      'X....X.SS...X....X',
      'X....X......X....X',
      'X....X......X....X',
      'X....X......X....X',
      'X....X......X....X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 8 ── The Labyrinth ── S-shaped steel walls force zigzag path */
  {
    name: 'The Labyrinth',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X.SS.XXXXXXXXXXX.X',
      'X.SS.X...........X',
      'X....X...SS......X',
      'X....XXXXXXXXXXX.X',
      'X................X',
      'X.XXXXXXXXXXX....X',
      'X..........X.....X',
      'X.XXXXXXXXXXX....X',
      'X................X',
      'X....SS......SS..X',
      'X................X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 9 ── The Arena ── open centre, stone cover on perimeter */
  {
    name: 'The Arena',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X.SS..........SS.X',
      'X................X',
      'X.SS..........SS.X',
      'X................X',
      'X................X',
      'X..SS........SS..X',
      'X................X',
      'X................X',
      'X.SS..........SS.X',
      'X................X',
      'X.SS..........SS.X',
      'X................X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },

  /* ── 10 ── Final Stand ── steel bunkers + stone, maximum tension */
  {
    name: 'Final Stand',
    layout: [
      'XXXXXXXXXXXXXXXXXX',
      'X................X',
      'X.XX..SS..SS..XX.X',
      'X................X',
      'X.XX..........XX.X',
      'X...XXXXXXXXXX...X',
      'X...X........X...X',
      'X...XXXXXXXXXX...X',
      'X.XX..........XX.X',
      'X................X',
      'X.XX..SS..SS..XX.X',
      'X................X',
      'X................X',
      'XXXXXXXXXXXXXXXXXX',
    ],
  },
];

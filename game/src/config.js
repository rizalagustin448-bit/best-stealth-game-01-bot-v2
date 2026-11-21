// Beaconkeeper: The Midnight Light — tuning and floor layouts.
// Every floor is one room of the lighthouse tower, seen from above.
// Walls are solid rectangles; cover zones hide the thief; lamps light the floor;
// the rotating beam sweeps the Lamp Room and the dock.
export const VIEW_W = 960;
export const VIEW_H = 600;

export const TUNING = {
  walkSpeed: 132, // px per second, normal pace (audible)
  sneakSpeed: 74, // Shift: slow and silent
  runSpeed: 178, // double-tap pace is not used; running is the walk key held with Space? no: walk IS the hurry
  playerRadius: 11,
  guardRadius: 13,
  visionRange: 185,
  visionHalfAngle: 0.56, // radians, about 32 degrees each side
  suspicionGainNear: 95, // per second while seen up close
  suspicionGainFar: 42, // per second while seen at range
  suspicionGainLit: 1.6, // multiplier while the thief stands in lamplight or the beam
  suspicionDecay: 26, // per second while unseen
  investigateAt: 55, // suspicion that sends a guard to look
  alarmAt: 100, // suspicion that raises the alarm
  chaseSpeed: 148,
  patrolSpeed: 62,
  investigateSpeed: 96,
  detectRise: 34, // global detection per second during an alarm
  detectDecay: 7, // global detection per second while calm
  noiseWalk: 46, // px radius of footsteps while walking
  noiseSneak: 0,
  noisePebble: 270, // px radius a thrown pebble is heard across
  pebblesStart: 5,
  itemScore: 250,
  floorBonus: 400,
  ghostBonus: 500,
  timeBonusPerSecond: 6,
  parSeconds: [150, 180, 210],
};

function wall(x, y, w, h) {
  return { x, y, w, h };
}
function cover(x, y, w, h, kind) {
  return { x, y, w, h, kind };
}
function lamp(x, y, r) {
  return { x, y, r };
}
function guard(x, y, waypoints, pause = 1.6) {
  return { x, y, waypoints, pause };
}
function item(x, y, name) {
  return { x, y, name, taken: false };
}

export const FLOORS = [
  {
    name: 'Floor 1 — The Boathouse',
    brief:
      'Rain on the shutters, one lamp over the pier. Steal the Tide Chart from the harbormaster desk, then slip out through the rowboat gate. Fog is your friend: guards cannot see into it unless they are close.',
    floorStyle: 'dock',
    playerStart: { x: 70, y: 530 },
    exit: { x: 892, y: 66, w: 52, h: 52, label: 'ROWBOAT GATE' },
    beam: { x: 480, y: 300, length: 420, width: 0.24, speed: 0.45, start: 2.4 },
    bell: { x: 120, y: 90 },
    walls: [
      wall(0, 0, 960, 18), wall(0, 582, 960, 18), wall(0, 0, 18, 600), wall(942, 0, 18, 600),
      wall(240, 0, 18, 150), wall(240, 230, 18, 180), wall(560, 120, 18, 200),
      wall(560, 400, 18, 182), wall(700, 0, 18, 110), wall(120, 420, 200, 18),
      wall(400, 470, 220, 18),
    ],
    cover: [
      cover(60, 200, 120, 90, 'crates'),
      cover(300, 60, 130, 80, 'barrels'),
      cover(620, 180, 150, 90, 'fog'),
      cover(330, 280, 120, 90, 'fog'),
      cover(760, 430, 130, 100, 'crates'),
      cover(640, 60, 60, 40, 'fog'),
    ],
    lamps: [lamp(480, 120, 150), lamp(180, 330, 130), lamp(820, 300, 140)],
    guards: [
      guard(300, 180, [[300, 180], [520, 180], [520, 380], [300, 380]]),
      guard(760, 200, [[760, 200], [880, 200], [880, 480], [700, 480]]),
    ],
    items: [item(880, 90, 'Tide Chart')],
  },
  {
    name: 'Floor 2 — The Keeper’s Quarters',
    brief:
      'Two keepers pace the rug between the bunks, and the warden crosses the hall. The Cipher Wheel sits on the chart table. Ring the hall bell to pull a patrol away — but every bell brings every guard.',
    floorStyle: 'quarters',
    playerStart: { x: 70, y: 90 },
    exit: { x: 892, y: 510, w: 52, h: 52, label: 'STAIRWELL DOWN' },
    beam: { x: 480, y: 300, length: 400, width: 0.22, speed: 0.55, start: 0.6 },
    bell: { x: 480, y: 300 },
    walls: [
      wall(0, 0, 960, 18), wall(0, 582, 960, 18), wall(0, 0, 18, 600), wall(942, 0, 18, 600),
      wall(200, 120, 260, 18), wall(200, 120, 18, 160), wall(700, 300, 18, 200),
      wall(480, 420, 240, 18), wall(120, 420, 18, 162), wall(620, 120, 18, 140),
      wall(330, 330, 180, 18),
    ],
    cover: [
      cover(60, 200, 110, 90, 'wardrobe'),
      cover(260, 170, 130, 90, 'fog'),
      cover(560, 60, 120, 80, 'crates'),
      cover(760, 180, 120, 90, 'fog'),
      cover(240, 470, 150, 80, 'rug'),
      cover(650, 470, 140, 80, 'wardrobe'),
    ],
    lamps: [lamp(300, 300, 150), lamp(700, 150, 140), lamp(480, 500, 140)],
    guards: [
      guard(300, 250, [[300, 250], [560, 250], [560, 380], [300, 380]]),
      guard(800, 350, [[800, 350], [800, 120], [660, 120]]),
      guard(180, 500, [[180, 500], [420, 500], [420, 300], [180, 300]], 2.2),
    ],
    items: [item(880, 90, 'Cipher Wheel'), item(90, 530, 'Brass Key')],
  },
  {
    name: 'Floor 3 — The Lamp Room',
    brief:
      'The great lamp turns above you and its beam sweeps the whole floor. Never stand in the beam. Take the Keeper’s Logbook from the lamp desk, then reach the lamp itself to flash the all-clear signal.',
    floorStyle: 'lamp',
    playerStart: { x: 480, y: 540 },
    exit: { x: 452, y: 40, w: 56, h: 56, label: 'THE GREAT LAMP' },
    beam: { x: 480, y: 300, length: 460, width: 0.3, speed: 0.7, start: 4.2 },
    bell: { x: 880, y: 540 },
    walls: [
      wall(0, 0, 960, 18), wall(0, 582, 960, 18), wall(0, 0, 18, 600), wall(942, 0, 18, 600),
      wall(180, 150, 18, 220), wall(180, 150, 180, 18), wall(600, 430, 18, 152),
      wall(600, 430, 180, 18), wall(760, 120, 18, 180), wall(300, 430, 200, 18),
    ],
    cover: [
      cover(60, 80, 110, 90, 'fog'),
      cover(420, 120, 130, 80, 'fog'),
      cover(820, 220, 100, 90, 'crates'),
      cover(80, 380, 130, 90, 'fog'),
      cover(640, 300, 110, 80, 'crates'),
      cover(260, 200, 90, 70, 'fog'),
    ],
    lamps: [lamp(480, 300, 170), lamp(120, 300, 120), lamp(860, 120, 120)],
    guards: [
      guard(250, 300, [[250, 300], [250, 120], [520, 120], [520, 300]]),
      guard(720, 420, [[720, 420], [720, 220], [880, 220], [880, 480]]),
      guard(480, 180, [[480, 180], [300, 180], [300, 480], [660, 480], [660, 180]], 1.2),
    ],
    items: [item(120, 90, 'Keeper’s Logbook'), item(880, 480, 'Signal Lens')],
  },
];

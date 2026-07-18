/*
 * Built-in tracks. Each grid row must be the same length.
 * Tile legend lives in js/config.js (TILE).
 * Themes control the renderer's colours only — same physics everywhere,
 * except per-tile surfaces (mud, ice, sand…).
 */

export const THEMES = {
  backyard: {
    label: 'Backyard', sky: '#7ec850', ground: '#5aa63c', road: '#8a7a66',
    roadEdge: '#6b5d4d', wall: '#3e6b2a', wallTop: '#548c39', accent: '#ffd23f'
  },
  construction: {
    label: 'Construction Zone', sky: '#c9a227', ground: '#b08d3c', road: '#7a7a7a',
    roadEdge: '#5c5c5c', wall: '#d97706', wallTop: '#f59e0b', accent: '#fbbf24'
  },
  desert: {
    label: 'Desert Canyon', sky: '#e8b96a', ground: '#d9a558', road: '#b3814a',
    roadEdge: '#8f653a', wall: '#a3542d', wallTop: '#c76a3a', accent: '#ff8c42'
  },
  mud: {
    label: 'Mud Arena', sky: '#7a6a4f', ground: '#6d5a3a', road: '#8a7050',
    roadEdge: '#5f4c33', wall: '#4a3a22', wallTop: '#63512f', accent: '#a3e635'
  },
  arctic: {
    label: 'Arctic', sky: '#bfe3f2', ground: '#dfeff7', road: '#aac6d8',
    roadEdge: '#86a8bd', wall: '#7fb2d1', wallTop: '#a8d4ec', accent: '#4fc3f7'
  },
  neon: {
    label: 'Neon Night', sky: '#171233', ground: '#221a4a', road: '#3a2f6b',
    roadEdge: '#5646a8', wall: '#120d26', wallTop: '#2b2052', accent: '#ff5da2'
  },
  volcano: {
    label: 'Volcano', sky: '#4a1f1f', ground: '#5c2a20', road: '#6e564a',
    roadEdge: '#4e3c33', wall: '#e2543a', wallTop: '#ff7a4d', accent: '#ffb347'
  }
};

/*
 * Track list. `adventure: n` puts it on the Adventure Trail in that order.
 * `parSeconds` is a friendly target: finishing under par*multiplier earns stars,
 * but every finish always earns at least one star and bolts.
 */
export const TRACKS = [
  {
    id: 'backyard-1',
    name: 'Backyard Blast',
    emoji: '🏡',
    theme: 'backyard',
    parSeconds: 45,
    adventure: 1,
    blurb: 'A friendly first rumble around the backyard.',
    grid: [
      '########################',
      '#......................#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.1RRbRRRbRRRJRRRbRRRR.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#..................RRR.#',
      '#..H...............RRR.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RRRKRRXRRbRRRJRRRRRR.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RRR..................#',
      '#.RRR..................#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RRRBRRbRRXRRbRRKRRFF.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'construction',
    name: 'Crane Canyon',
    emoji: '🏗️',
    theme: 'construction',
    parSeconds: 55,
    adventure: 2,
    blurb: 'Dodge cones and smash crates in the big dig!',
    grid: [
      '########################',
      '#......................#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#.1DDXDDCDDZDDXDDbDDDD.#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#...................DD.#',
      '#...................DD.#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#.DDbDDKDDXXDDZDDCDDDD.#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#.DD...................#',
      '#.DD.....H.............#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#.DDJDDbDDXDDBDDKDDDFF.#',
      '#.DDDDDDDDDDDDDDDDDDDD.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'desert',
    name: 'Dusty Dune Dash',
    emoji: '🌵',
    theme: 'desert',
    parSeconds: 60,
    adventure: 3,
    blurb: 'Sandy slides and canyon jumps.',
    grid: [
      '########################',
      '#......................#',
      '#.RRRRSSSSRRRRRRSSSRRR.#',
      '#.1RRbSSSSRRJRRSSSbRRR.#',
      '#.RRRRSSSSRRRRRRSSSRRR.#',
      '#....................R.#',
      '#..H................RR.#',
      '#.RRRRRRRSSSSRRRRRRRRR.#',
      '#.RRKRRbRSSSSRRXRRbRRR.#',
      '#.RRRRRRRSSSSRRRRRRRRR.#',
      '#.RR...................#',
      '#.RR...................#',
      '#.RRRRJRRRRSSSRRRRRRRR.#',
      '#.RRRRJRRbRSSSRRKRRBFF.#',
      '#.RRRRJRRRRSSSRRRRRRRR.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'mud-arena',
    name: 'Mud Mayhem Arena',
    emoji: '💩',
    theme: 'mud',
    parSeconds: 65,
    adventure: 4,
    blurb: 'Squelch through the goop — grippy trucks rule here!',
    grid: [
      '########################',
      '#......................#',
      '#.RRRMMMMRRRRMMMMRRRRR.#',
      '#.1RRMMMMbRRRMMMMbRRRR.#',
      '#.RRRMMMMRRRRMMMMRRRRR.#',
      '#....................R.#',
      '#....................R.#',
      '#.RRRRRMMMMMMRRRRRRRRR.#',
      '#.RKRbRMMMMMMRTTRbRRRR.#',
      '#.RRRRRMMMMMMRRRRRRRRR.#',
      '#.RR...................#',
      '#.RR......H............#',
      '#.RRRRMMMRRRRRMMMRRRRR.#',
      '#.RRJRMMMRbXbRMMMKRRFF.#',
      '#.RRRRMMMRRRRRMMMRRRRR.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'arctic',
    name: 'Frosty Peak Freeze',
    emoji: '❄️',
    theme: 'arctic',
    parSeconds: 65,
    adventure: 5,
    blurb: 'Slippery ice! Steer gently and glide to glory.',
    grid: [
      '########################',
      '#......................#',
      '#.RRRIIIIIRRRRIIIIRRRR.#',
      '#.1RRIIIIIbRRJIIIIbRRR.#',
      '#.RRRIIIIIRRRRIIIIRRRR.#',
      '#....................R.#',
      '#..H.................R.#',
      '#.RRRRIIIIIIRRRRIIIIRR.#',
      '#.RKRRIIIIIIbRXRIIIIRR.#',
      '#.RRRRIIIIIIRRRRIIIIRR.#',
      '#.RR...................#',
      '#.RR...................#',
      '#.RRRIIIIRRRRRIIIRRRRR.#',
      '#.RRBIIIIRbRKRIIIRRRFF.#',
      '#.RRRIIIIRRRRRIIIRRRRR.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'neon',
    name: 'Neon Night Loop',
    emoji: '🌃',
    theme: 'neon',
    parSeconds: 50,
    adventure: 6,
    blurb: 'Glowing boost pads under the city lights. Zoom zoom!',
    grid: [
      '########################',
      '#......................#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.1RBRRbRRBRRJRRBRRbRR.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#....................R.#',
      '#....................R.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RKRRBRRbRRXRRBRRbRRR.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RR...................#',
      '#.RR..........H........#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#.RRBRRJRRbRRBRRKRRBFF.#',
      '#.RRRRRRRRRRRRRRRRRRRR.#',
      '#......................#',
      '########################'
    ]
  },
  {
    id: 'volcano',
    name: 'Lava Rock Rally',
    emoji: '🌋',
    theme: 'volcano',
    parSeconds: 75,
    adventure: 7,
    blurb: 'The big one! Narrow paths between the lava rocks.',
    grid: [
      '########################',
      '#......................#',
      '#.RRRRRR##RRRRRR##RRRR.#',
      '#.1RbRRR##RJRRbR##RRRR.#',
      '#.RRRRRR##RRRRRR##RRRR.#',
      '#.####...............R.#',
      '#.####...............R.#',
      '#.RRRRRRSSS##RRRRRRRRR.#',
      '#.RKRRbRSSS##RXXRRbRRR.#',
      '#.RRRRRRSSS##RRRRRRRRR.#',
      '#.RR......##...........#',
      '#.RR..H...##...........#',
      '#.RRRR##RRRRRRMMMRRRRR.#',
      '#.RRJR##RbRRXRMMMKRBFF.#',
      '#.RRRR##RRRRRRMMMRRRRR.#',
      '#......................#',
      '########################'
    ]
  }
];

/* Free Drive playground — no finish line, no timer, just fun. */
export const FREE_DRIVE_TRACK = {
  id: 'free-drive',
  name: 'Garage Playground',
  emoji: '🛠️',
  theme: 'backyard',
  parSeconds: 0,
  freeDrive: true,
  blurb: 'Practice, jump and smash — no timers here!',
  grid: [
    '##########################',
    '#........................#',
    '#.RRRRRRRRRRRRRRRRRRRRRR.#',
    '#.RRJRRbRRBRRRXRRbRRJRRR.#',
    '#.RRRRRRRRRRRRRRRRRRRRRR.#',
    '#.RRRRMMMMRRRRRRIIIIRRRR.#',
    '#.1RRRMMMMRbRXRRIIIIRbRR.#',
    '#.RRRRMMMMRRRRRRIIIIRRRR.#',
    '#.RRRRRRRRRRTTRRRRRRRRRR.#',
    '#.RRbRRSSSSRTTRRBRRbRRRR.#',
    '#.RRRRRSSSSRRRRRRRRRRRRR.#',
    '#.RRRRRRRRRRRRRRRRRRRRHR.#',
    '#.RRJRRXXRRbRRJRRCCRRRRR.#',
    '#.RRRRRRRRRRRRRRRRRRRRRR.#',
    '#........................#',
    '##########################'
  ]
};

export function getTrack(id) {
  if (id === FREE_DRIVE_TRACK.id) return FREE_DRIVE_TRACK;
  return TRACKS.find((t) => t.id === id) || null;
}

export function adventureTracks() {
  return TRACKS.filter((t) => t.adventure).sort((a, b) => a.adventure - b.adventure);
}

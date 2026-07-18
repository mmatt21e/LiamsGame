/*
 * Global configuration and shared constants.
 * The app version comes from js/version.js (loaded before modules).
 */

export const CONFIG = {
  version: (typeof self !== 'undefined' && self.APP_VERSION) || '0.0.0',
  tileSize: 64,          // world units per grid tile
  maxProfiles: 4,
  maxCustomTracks: 20,
  maxNameLength: 12,
  builderCols: 16,
  builderRows: 12,
  saveDebounceMs: 800
};

/*
 * Tile characters used by every track grid (built-in AND custom):
 *   .  ground (grass/offtrack — drivable but slow)
 *   #  wall / barrier (solid)
 *   R  road
 *   D  dirt road (a little slippery)
 *   M  mud (very slow, splashy)
 *   S  sand (slow)
 *   I  ice (very low grip)
 *   B  boost pad
 *   J  jump ramp (launches the truck)
 *   Z  slow zone (sticky patch on the road)
 *   F  finish gate
 *   K  checkpoint gate
 *   1  start position (on road)
 *   b  bolt pickup            (object, sits on road)
 *   X  breakable box          (object, sits on road)
 *   C  traffic cone           (object, sits on road)
 *   T  tire stack — bouncy    (object, sits on road)
 *   H  hidden star bonus      (object, sits on ground off the main path)
 */
export const TILE = {
  GROUND: '.', WALL: '#', ROAD: 'R', DIRT: 'D', MUD: 'M', SAND: 'S',
  ICE: 'I', BOOST: 'B', RAMP: 'J', SLOW: 'Z', FINISH: 'F',
  CHECKPOINT: 'K', START: '1',
  BOLT: 'b', BOX: 'X', CONE: 'C', TIRES: 'T', HIDDEN: 'H'
};

export const DIFFICULTY = {
  easy: {
    id: 'easy',
    label: 'Easy',
    icon: '🙂',
    steerAssist: 0.65,      // pulls steering toward the road centre feel (blends into grip)
    offtrackDrag: 0.45,     // how much off-road slows you (lower = gentler)
    obstacleSlow: 0.4,      // speed lost when bonking obstacles
    recoverSeconds: 1.5,    // auto “back on track” when stuck
    parMultiplier: 1.6,     // more time allowed for stars
    autoAccelDefault: true
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    icon: '😎',
    steerAssist: 0.3,
    offtrackDrag: 0.65,
    obstacleSlow: 0.6,
    recoverSeconds: 2.5,
    parMultiplier: 1.25,
    autoAccelDefault: false
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    icon: '🔥',
    steerAssist: 0,
    offtrackDrag: 0.85,
    obstacleSlow: 0.8,
    recoverSeconds: 3.5,
    parMultiplier: 1.0,
    autoAccelDefault: false
  }
};

/* Bolts awarded for race events (always generous, never punishing). */
export const REWARDS = {
  finishBase: 20,        // just for finishing — every finish is a win
  perBolt: 1,
  perBox: 2,
  perJumpLanded: 2,
  hiddenStar: 15,
  perStar: 5,            // bonus per star earned
  newVehicleTry: 10      // first drive with a newly unlocked vehicle
};

/* Safe, silly preset nicknames (custom names allowed too, stored locally only). */
export const PRESET_NAMES = [
  'Turbo', 'Blaze', 'Dash', 'Rocket', 'Spark', 'Boomer',
  'Zoomie', 'Crusher', 'Nitro', 'Pixel', 'Comet', 'Wheels'
];

export const AVATARS = ['🦖', '🐯', '🦊', '🤖', '🦄', '🐸', '🐼', '🦁', '👾', '🐙', '🦅', '🐢'];

/* Default per-profile settings. */
export const DEFAULT_SETTINGS = {
  difficulty: 'easy',
  soundVolume: 0.8,
  musicVolume: 0.5,
  muted: false,
  reducedMotion: 'auto',   // 'auto' | 'on' | 'off'
  highContrast: false,
  largeUI: false,
  screenShake: true,
  leftHanded: false,
  autoAccel: true,
  tts: false
};

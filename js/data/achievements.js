/*
 * Achievements — friendly goals, no timers, no pressure.
 * Each has a check(profile, raceResult) used after races / actions;
 * some are granted directly by name from UI code (e.g. builder).
 */

export const ACHIEVEMENTS = [
  {
    id: 'first-finish',
    name: 'First Finish',
    icon: '🏁',
    desc: 'Finish your very first race.',
    check: (p) => p.stats.races >= 1
  },
  {
    id: 'big-air',
    name: 'Big Jump',
    icon: '🪂',
    desc: 'Land a huge jump off a ramp.',
    check: (p) => p.stats.bigJumps >= 1
  },
  {
    id: 'box-breaker',
    name: 'Box Breaker',
    icon: '📦',
    desc: 'Smash 10 boxes in total.',
    check: (p) => p.stats.boxes >= 10
  },
  {
    id: 'mud-master',
    name: 'Mud Master',
    icon: '💩',
    desc: 'Finish the Mud Mayhem Arena track.',
    check: (p) => !!p.completedTracks['mud-arena']
  },
  {
    id: 'track-builder',
    name: 'Track Builder',
    icon: '🔨',
    desc: 'Build and save your own track.',
    check: (p) => p.stats.tracksBuilt >= 1
  },
  {
    id: 'five-races',
    name: 'Five Races',
    icon: '🖐️',
    desc: 'Finish 5 races.',
    check: (p) => p.stats.races >= 5
  },
  {
    id: 'try-all',
    name: 'Truck Collector',
    icon: '🚚',
    desc: 'Drive every one of the 8 trucks.',
    check: (p) => (p.stats.vehiclesTried || []).length >= 8
  },
  {
    id: 'bolt-100',
    name: 'Bolt Hoarder',
    icon: '🔩',
    desc: 'Collect 100 bolts in total.',
    check: (p) => p.stats.boltsCollected >= 100
  },
  {
    id: 'explorer',
    name: 'Explorer',
    icon: '🗺️',
    desc: 'Find a hidden star off the beaten path.',
    check: (p) => p.stats.hiddenStars >= 1
  },
  {
    id: 'speed-star',
    name: 'Speed Star',
    icon: '🌟',
    desc: 'Earn 3 stars on any track.',
    check: (p) => Object.values(p.completedTracks).some((t) => t.stars >= 3)
  },
  {
    id: 'customizer',
    name: 'Style Champ',
    icon: '🎨',
    desc: 'Customize the look of a truck.',
    check: (p) => p.stats.customized >= 1
  },
  {
    id: 'adventurer',
    name: 'Trail Blazer',
    icon: '🏆',
    desc: 'Finish every course on the Adventure Trail.',
    check: (p, adventureIds) =>
      Array.isArray(adventureIds) && adventureIds.length > 0 &&
      adventureIds.every((id) => !!p.completedTracks[id])
  }
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

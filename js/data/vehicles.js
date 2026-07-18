/*
 * The eight original monster trucks.
 * Stats are 1–5. No truck is best at everything.
 *   speed    — top speed
 *   accel    — how fast it gets going
 *   grip     — cornering + slippery-surface handling
 *   jump     — extra airtime from ramps
 *   strength — smashes boxes/cones with less slowdown
 */

export const VEHICLES = [
  {
    id: 'thunder-tread',
    name: 'Thunder Tread',
    emoji: '⚡',
    cost: 0,
    stats: { speed: 3, accel: 3, grip: 3, jump: 3, strength: 3 },
    body: { shape: 'classic', color: '#3b82f6', cab: '#1e3a8a' },
    blurb: 'The all-round hero. Great first truck!'
  },
  {
    id: 'mud-muncher',
    name: 'Mud Muncher',
    emoji: '🟤',
    cost: 0,
    stats: { speed: 2, accel: 3, grip: 5, jump: 2, strength: 4 },
    body: { shape: 'chunky', color: '#8b5a2b', cab: '#4a2f14' },
    blurb: 'Loves mud and never slips. Slow but steady.'
  },
  {
    id: 'bolt-beast',
    name: 'Bolt Beast',
    emoji: '🔩',
    cost: 60,
    stats: { speed: 3, accel: 5, grip: 3, jump: 2, strength: 3 },
    body: { shape: 'classic', color: '#facc15', cab: '#854d0e' },
    blurb: 'Blasts off the start line like lightning.'
  },
  {
    id: 'rocket-rumbler',
    name: 'Rocket Rumbler',
    emoji: '🚀',
    cost: 100,
    stats: { speed: 5, accel: 3, grip: 2, jump: 3, strength: 2 },
    body: { shape: 'sleek', color: '#ef4444', cab: '#7f1d1d' },
    blurb: 'Fastest truck in the garage — hold on tight!'
  },
  {
    id: 'gravel-gator',
    name: 'Gravel Gator',
    emoji: '🐊',
    cost: 140,
    stats: { speed: 3, accel: 2, grip: 4, jump: 2, strength: 5 },
    body: { shape: 'chunky', color: '#22c55e', cab: '#14532d' },
    blurb: 'Chomps through boxes without slowing down.'
  },
  {
    id: 'turbo-tusk',
    name: 'Turbo Tusk',
    emoji: '🐘',
    cost: 180,
    stats: { speed: 3, accel: 3, grip: 3, jump: 5, strength: 2 },
    body: { shape: 'sleek', color: '#a855f7', cab: '#4c1d95' },
    blurb: 'Soars off every ramp. King of big air!'
  },
  {
    id: 'stomper-x',
    name: 'Stomper X',
    emoji: '🦶',
    cost: 240,
    stats: { speed: 4, accel: 2, grip: 3, jump: 2, strength: 5 },
    body: { shape: 'chunky', color: '#64748b', cab: '#1e293b' },
    blurb: 'A slow starter that crushes everything at top speed.'
  },
  {
    id: 'neon-nomad',
    name: 'Neon Nomad',
    emoji: '🌈',
    cost: 320,
    stats: { speed: 4, accel: 4, grip: 2, jump: 4, strength: 1 },
    body: { shape: 'sleek', color: '#06b6d4', cab: '#164e63' },
    blurb: 'A glowing speedster that loves to fly — but hates bonks.'
  }
];

export const STARTER_VEHICLES = ['thunder-tread', 'mud-muncher'];

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

/* ---------- Customization catalogue (cosmetic, plus tire size with a clear tradeoff) ---------- */

export const CUSTOMIZATION = {
  colors: [
    { id: 'default', label: 'Original', cost: 0, value: null },
    { id: 'red', label: 'Red', cost: 0, value: '#ef4444' },
    { id: 'blue', label: 'Blue', cost: 0, value: '#3b82f6' },
    { id: 'green', label: 'Green', cost: 10, value: '#22c55e' },
    { id: 'purple', label: 'Purple', cost: 10, value: '#a855f7' },
    { id: 'orange', label: 'Orange', cost: 15, value: '#f97316' },
    { id: 'pink', label: 'Pink', cost: 15, value: '#ec4899' },
    { id: 'black', label: 'Midnight', cost: 25, value: '#334155' }
  ],
  wheels: [
    { id: 'classic', label: 'Classic', cost: 0, icon: '⚫' },
    { id: 'star', label: 'Star Rims', cost: 20, icon: '⭐' },
    { id: 'spike', label: 'Spikes', cost: 30, icon: '🌵' },
    { id: 'glowrim', label: 'Glow Rims', cost: 40, icon: '💿' }
  ],
  tires: [
    // Simple, clearly explained tradeoffs (shown in UI).
    { id: 'normal', label: 'Normal', cost: 0, icon: '🛞', effect: 'Balanced', speed: 0, grip: 0 },
    { id: 'big', label: 'Big Grip', cost: 25, icon: '🏔️', effect: '+Grip  −Speed', speed: -0.4, grip: 0.6 },
    { id: 'slick', label: 'Slicks', cost: 25, icon: '💨', effect: '+Speed  −Grip', speed: 0.4, grip: -0.6 }
  ],
  decals: [
    { id: 'none', label: 'Plain', cost: 0, icon: '⬜' },
    { id: 'flame', label: 'Flames', cost: 15, icon: '🔥' },
    { id: 'bolt', label: 'Lightning', cost: 15, icon: '⚡' },
    { id: 'star', label: 'Star', cost: 20, icon: '⭐' },
    { id: 'stripes', label: 'Stripes', cost: 20, icon: '🦓' },
    { id: 'paw', label: 'Paw Print', cost: 25, icon: '🐾' }
  ],
  accessories: [
    { id: 'none', label: 'None', cost: 0, icon: '⬜' },
    { id: 'flag', label: 'Race Flag', cost: 15, icon: '🚩' },
    { id: 'horns', label: 'Horns', cost: 25, icon: '🐂' },
    { id: 'lightbar', label: 'Light Bar', cost: 30, icon: '🚨' },
    { id: 'wing', label: 'Big Wing', cost: 35, icon: '🪽' }
  ],
  glows: [
    { id: 'none', label: 'None', cost: 0, icon: '⬜' },
    { id: 'yellow', label: 'Sunny Glow', cost: 20, icon: '🟡', value: '#ffd23f' },
    { id: 'blue', label: 'Ice Glow', cost: 20, icon: '🔵', value: '#4fc3f7' },
    { id: 'pink', label: 'Berry Glow', cost: 25, icon: '🩷', value: '#ff5da2' },
    { id: 'green', label: 'Slime Glow', cost: 25, icon: '🟢', value: '#3ddc84' }
  ]
};

export const DEFAULT_CUSTOM = {
  color: 'default', wheels: 'classic', tires: 'normal',
  decal: 'none', accessory: 'none', glow: 'none'
};

export function customOption(category, id) {
  const list = CUSTOMIZATION[category] || [];
  return list.find((o) => o.id === id) || list[0];
}

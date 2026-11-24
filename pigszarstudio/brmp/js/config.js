export const LEVELS = [
  'The Lobby','Habitable Zone','Pipe Dreams','Electrical Station','Abandoned Office','Terror Hotel','Lights Out','Thalassophobia','Cave System','Darkened Suburbs','The Bumper Crop','The Endless City','Matrix','The Infinite Apartments','Paradise','Futuristic Halls','Altered Topography','The Carrier','Memories','Attic Floor','Warehouse','Numbered Doors','Ruins Left Behind','Petrified Garden','The Moon','The Quarter Hub','Otherworldly','Bunker Woodwork','Stormstone Keep','Hyperian','Shift Beyond Reality','Roller Rink','Forest of the Skeleton Queen','The Infinite Mall','Sewer System','An Empty Car Park','Airport','Sublimity (The Poolrooms)','Intersecting Dimensions','Enchanted Forest','Roller Rockin\' Pizza','Black Lake','Horizon','Water World','Corroding Retail','Deepwell Corporation','Arabian Desert','Snake Forest','Sunset Beach','Trenches of War','The Moribund Highway','Olympia','School Halls','Alone','Stairwell of Spirals','Ice Kingdom','Frostbite','Art Gallery','Mudslide','Backway','Bayous','Train','Jungle Courtyard','Tranquility','Lurking Darkness','Bloodstained Garden','Swamp Exhibits','The Bakery','Eatery','The Road Trip of Affliction','Storage','Void Basement','The Iron Sea','The Red Lands','Stage Fright','Gallium Caves','Infinite Sewer System','Underground Train','Space Station','Watchtower','Highway','The Zoological Office','Trade Center','Sunken Submarine','Shifting Hedge Maze','Ship in a Bottle','Rivergate','Corridors of Time','Hallways of Love','Taste of Home','Newly Built Houses','Darkness','Crimson Glow','Overlook','Motion','Down Below','Ventilation System','The Lighthouse','Downtown Diner','The Ghastly Town','Silent Sounds'
].map((name, id) => ({ id, name, difficulty: 1 + (id % 7) * 0.08 }));

export const DIFFICULTIES = {
  EXPLORER: { entityCount: 0, entitySpeed: 0, batteryDrain: 0, staminaDrain: 0, spawnRate: 0, sanityDrain: 0 },
  EASY:     { entityCount: 1, entitySpeed: 1.45, batteryDrain: 0.42, staminaDrain: 0.65, spawnRate: 0.9, sanityDrain: 0.5 },
  NORMAL:   { entityCount: 2, entitySpeed: 2.05, batteryDrain: 0.72, staminaDrain: 1, spawnRate: 1.1, sanityDrain: 0.85 },
  HARD:     { entityCount: 3, entitySpeed: 2.7, batteryDrain: 1.15, staminaDrain: 1.2, spawnRate: 1.35, sanityDrain: 1.4 }
};

export const OUTFITS = {
  hazmat: { label: 'Hazmat Suit', base: '#b7a65c', accent: '#55d7d0', helmet: true },
  tactical: { label: 'Tactical Explorer', base: '#59685b', accent: '#c6b884', helmet: true },
  maintenance: { label: 'Maintenance Worker', base: '#b87532', accent: '#e2d4a1', helmet: false },
  researcher: { label: 'Lab Researcher', base: '#c5c9c2', accent: '#6eafb1', helmet: false }
};

export const DEFAULT_SETTINGS = {
  resolutionScale: 1, shadowQuality: 'Medium', fogDensity: 0.035, fov: 78, brightness: 1, vhsEnabled: true,
  masterVolume: 0.8, sfxVolume: 0.9, ambientVolume: 0.65, voiceVolume: 0.85, micGain: 1, audioInput: '', voiceMode: 'ptt', spatialAudio: true,
  sensitivity: 0.8, invertY: false, bobbing: 0.5, shake: 0.6,
  captions: true, photosensitive: false, highContrast: false,
  keybinds: { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', crouch: 'ControlLeft', flashlight: 'KeyF', interact: 'KeyE', walkie: 'KeyV', jump: 'Space' }
};

export const ACCESSORIES = [
  { id: 'shoulderLight', label: 'Shoulder flashlight' }, { id: 'backpack', label: 'Tactical backpack' },
  { id: 'gasMask', label: 'Dual-filter gas mask' }, { id: 'bodycam', label: 'Head-mounted bodycam' },
  { id: 'glowsticks', label: 'Belt glowsticks' }, { id: 'antenna', label: 'Long-range radio antenna' }
];

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 4;
export const NETWORK_TICK_MS = 50;
export const WORLD_SEED_DEFAULT = 781239;

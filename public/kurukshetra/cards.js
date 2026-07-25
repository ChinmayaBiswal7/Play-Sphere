/* ═══════════════════════════════════════════════════════
   KURUKSHETRA — Complete Card Roster
   Gods from Indian, Greek, Egyptian + Epic Warriors
   All names inspired — not exact mythological names
═══════════════════════════════════════════════════════ */

const RARITY = { COMMON: 'common', RARE: 'rare', EPIC: 'epic', DIVINE: 'divine', LEGEND: 'legendary' }

const CARDS = {

  /* ══════════ 🔱 INDIAN GODS (Divine Tier) ══════════ */
  dharma_lord: {
    id: 'dharma_lord', name: 'Dharma Lord', origin: 'Indian',
    emoji: '🔱', art: '⚡🔱', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'ground', karmaCost: 8,
    hp: 1800, damage: 280, speed: 0.9, range: 65, attackSpeed: 900,
    color: '#facc15', aura: '#fde68a',
    desc: 'Supreme Indian god. Radiates divine justice aura — all nearby allies gain +30% damage.',
    special: 'divine_aura', tag: '🔥 DIVINE AURA'
  },
  storm_avatar: {
    id: 'storm_avatar', name: 'Storm Avatar', origin: 'Indian',
    emoji: '⚡', art: '⚡🌩️', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'air', karmaCost: 7,
    hp: 600, damage: 320, speed: 2.8, range: 150, attackSpeed: 600,
    color: '#818cf8', aura: '#c4b5fd',
    desc: 'God of storms. Rains lightning chains that bounce to 3 enemies.',
    special: 'chain_lightning', tag: '⚡ CHAIN LIGHTNING'
  },
  lotus_guardian: {
    id: 'lotus_guardian', name: 'Lotus Guardian', origin: 'Indian',
    emoji: '🪷', art: '🪷✨', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'ground', karmaCost: 6,
    hp: 500, damage: 60, speed: 1.0, range: 200, attackSpeed: 1200,
    color: '#f9a8d4', aura: '#fce7f3',
    desc: 'Cosmic creator. Summons a lotus shield — makes all allies immune for 2s.',
    special: 'lotus_shield', tag: '🛡️ DIVINE SHIELD'
  },
  destroyer_god: {
    id: 'destroyer_god', name: 'The Destroyer', origin: 'Indian',
    emoji: '💀', art: '💀🔥', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'ground', karmaCost: 9,
    hp: 2200, damage: 400, speed: 0.5, range: 70, attackSpeed: 1500,
    color: '#7c2d12', aura: '#ef4444',
    desc: 'God of destruction. Dances of doom — AoE explosion on death that wipes nearby enemies.',
    special: 'death_dance', tag: '💥 DEATH EXPLOSION'
  },
  war_charioteer: {
    id: 'war_charioteer', name: 'War Charioteer', origin: 'Indian',
    emoji: '🏹', art: '🏹🔥', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'ground', karmaCost: 6,
    hp: 700, damage: 160, speed: 1.8, range: 220, attackSpeed: 500,
    color: '#38bdf8', aura: '#7dd3fc',
    desc: 'Master archer on divine chariot. Fires divine arrows that pierce through all units.',
    special: 'pierce_shot', tag: '🎯 PIERCING ARROWS'
  },
  wind_warrior: {
    id: 'wind_warrior', name: 'Wind Warrior', origin: 'Indian',
    emoji: '💨', art: '💨🪵', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'ground', karmaCost: 7,
    hp: 1600, damage: 300, speed: 0.7, range: 70, attackSpeed: 1200,
    color: '#f97316', aura: '#fed7aa',
    desc: 'Son of the wind god. Gale smash stuns all enemies in front for 2s.',
    special: 'gale_smash', tag: '💨 GALE STUN'
  },

  /* ══════════ ⚡ GREEK GODS ══════════ */
  sky_king: {
    id: 'sky_king', name: 'Sky King', origin: 'Greek',
    emoji: '⚡', art: '⚡👑', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'air', karmaCost: 8,
    hp: 900, damage: 380, speed: 1.5, range: 250, attackSpeed: 700,
    color: '#fbbf24', aura: '#fef3c7',
    desc: 'King of Olympus. Hurls divine lightning bolts that split on impact hitting 2 targets.',
    special: 'split_bolt', tag: '⚡ SPLIT LIGHTNING'
  },
  sea_titan: {
    id: 'sea_titan', name: 'Sea Titan', origin: 'Greek',
    emoji: '🔱', art: '🌊🔱', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'ground', karmaCost: 7,
    hp: 1200, damage: 200, speed: 0.8, range: 180, attackSpeed: 900,
    color: '#0ea5e9', aura: '#bae6fd',
    desc: 'Lord of seas. Summons a tidal wave that pushes back all ground enemies.',
    special: 'tidal_wave', tag: '🌊 TIDAL PUSH'
  },
  war_god: {
    id: 'war_god', name: 'War God', origin: 'Greek',
    emoji: '⚔️', art: '⚔️🛡️', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'ground', karmaCost: 6,
    hp: 1100, damage: 220, speed: 1.4, range: 65, attackSpeed: 700,
    color: '#ef4444', aura: '#fca5a5',
    desc: 'God of war. Every 5 attacks, unleashes a fury strike for 3x damage.',
    special: 'fury_strike', tag: '⚔️ FURY STRIKE'
  },
  death_ferryman: {
    id: 'death_ferryman', name: 'Death Ferryman', origin: 'Greek',
    emoji: '⚰️', art: '⚰️🌑', rarity: RARITY.EPIC,
    type: 'troop', lane: 'ground', karmaCost: 5,
    hp: 700, damage: 140, speed: 0.9, range: 60, attackSpeed: 1100,
    color: '#6b21a8', aura: '#d8b4fe',
    desc: 'Underworld boatman. Enemies killed nearby become ghost troops for you for 8s.',
    special: 'revive_ghosts', tag: '👻 REVIVE GHOSTS'
  },
  hunt_goddess: {
    id: 'hunt_goddess', name: 'Hunt Goddess', origin: 'Greek',
    emoji: '🌙', art: '🌙🏹', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'air', karmaCost: 5,
    hp: 500, damage: 280, speed: 2.4, range: 200, attackSpeed: 650,
    color: '#a78bfa', aura: '#ede9fe',
    desc: 'Goddess of the hunt. Moonbeam arrows mark targets — marked enemies take +50% damage.',
    special: 'moonbeam_mark', tag: '🌙 MOON MARK'
  },
  sun_chariot: {
    id: 'sun_chariot', name: 'Sun Chariot Rider', origin: 'Greek',
    emoji: '☀️', art: '☀️🔥', rarity: RARITY.EPIC,
    type: 'troop', lane: 'air', karmaCost: 6,
    hp: 600, damage: 160, speed: 2.0, range: 140, attackSpeed: 800,
    color: '#f59e0b', aura: '#fde68a',
    desc: 'Rides the sun chariot. Burns all ground units below as it flies over.',
    special: 'solar_burn', tag: '🔥 SOLAR BURN'
  },

  /* ══════════ 🐺 EGYPTIAN GODS ══════════ */
  death_jackal: {
    id: 'death_jackal', name: 'Death Jackal', origin: 'Egyptian',
    emoji: '🐺', art: '🐺⚖️', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'ground', karmaCost: 7,
    hp: 1000, damage: 220, speed: 1.1, range: 75, attackSpeed: 850,
    color: '#1c1917', aura: '#78716c',
    desc: 'God of death. After killing an enemy, weighs their soul — has a 50% chance to get +100% HP.',
    special: 'soul_weigh', tag: '⚖️ SOUL JUDGMENT'
  },
  sun_pharaoh: {
    id: 'sun_pharaoh', name: 'Sun Pharaoh', origin: 'Egyptian',
    emoji: '☀️', art: '☀️👁️', rarity: RARITY.LEGEND,
    type: 'troop', lane: 'air', karmaCost: 8,
    hp: 800, damage: 300, speed: 1.6, range: 200, attackSpeed: 700,
    color: '#ca8a04', aura: '#fef9c3',
    desc: 'Supreme sun god. Eye of Ra — fires a solar beam that melts everything in a line.',
    special: 'solar_beam', tag: '👁️ EYE OF RA'
  },
  hawk_warrior: {
    id: 'hawk_warrior', name: 'Hawk Warrior', origin: 'Egyptian',
    emoji: '🦅', art: '🦅🌤️', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'air', karmaCost: 6,
    hp: 750, damage: 200, speed: 2.2, range: 100, attackSpeed: 750,
    color: '#b45309', aura: '#fde68a',
    desc: 'Sky protector. Divine sight — reveals and destroys invisible enemy units instantly.',
    special: 'true_sight', tag: '👁️ TRUE SIGHT'
  },
  storm_set: {
    id: 'storm_set', name: 'Chaos Storm', origin: 'Egyptian',
    emoji: '🌪️', art: '🌪️⚡', rarity: RARITY.EPIC,
    type: 'troop', lane: 'ground', karmaCost: 5,
    hp: 800, damage: 150, speed: 1.3, range: 65, attackSpeed: 900,
    color: '#dc2626', aura: '#fca5a5',
    desc: 'God of chaos. Randomly buffs self or debuffs enemies every 4s — unpredictable!',
    special: 'chaos_roll', tag: '🌀 CHAOS ROLL'
  },
  cat_goddess: {
    id: 'cat_goddess', name: 'Cat Goddess', origin: 'Egyptian',
    emoji: '🐱', art: '🐱🛡️', rarity: RARITY.DIVINE,
    type: 'troop', lane: 'ground', karmaCost: 5,
    hp: 900, damage: 80, speed: 1.0, range: 200, attackSpeed: 1000,
    color: '#f59e0b', aura: '#fef3c7',
    desc: 'Goddess of protection. Heals the tower she reaches for 300 HP every 6 seconds.',
    special: 'tower_heal', tag: '💛 TOWER HEAL'
  },
  mummy_legion: {
    id: 'mummy_legion', name: 'Mummy Legion', origin: 'Egyptian',
    emoji: '🧟', art: '🧟🧟', rarity: RARITY.RARE,
    type: 'troop', lane: 'ground', karmaCost: 3,
    hp: 180, damage: 35, speed: 0.8, range: 55, attackSpeed: 1100,
    count: 3, color: '#a16207', aura: '#d97706',
    desc: 'Three ancient mummies rise. Slow but relentless — immune to slow effects.',
    special: 'slow_immune', tag: '🧟 UNDYING'
  },

  /* ══════════ 🌿 WARRIOR ARCHETYPES (Non-god) ══════════ */
  street_brawler: {
    id: 'street_brawler', name: 'Street Brawler', origin: 'Indian Street',
    emoji: '💪', art: '💪🥊', rarity: RARITY.COMMON,
    type: 'troop', lane: 'ground', karmaCost: 2,
    hp: 200, damage: 40, speed: 1.6, range: 55, attackSpeed: 850,
    color: '#f97316', aura: '#fed7aa',
    desc: 'Fearless gully fighter. Fast and disposable.',
    special: null, tag: null
  },
  chai_swarm: {
    id: 'chai_swarm', name: 'Chai Swarm', origin: 'Indian Street',
    emoji: '☕', art: '☕☕☕☕', rarity: RARITY.COMMON,
    type: 'troop', lane: 'ground', karmaCost: 2, count: 4,
    hp: 80, damage: 22, speed: 2.0, range: 50, attackSpeed: 800,
    color: '#92400e', aura: '#d97706',
    desc: 'Chaiwala mob of 4. Fast and scrappy.',
    special: 'swarm', tag: '×4 SWARM'
  },
  yogi_healer: {
    id: 'yogi_healer', name: 'Yogi Healer', origin: 'Indian',
    emoji: '🧘', art: '🧘✨', rarity: RARITY.RARE,
    type: 'troop', lane: 'ground', karmaCost: 3,
    hp: 400, damage: 30, speed: 1.0, range: 55, attackSpeed: 1200,
    color: '#22c55e', aura: '#bbf7d0',
    desc: 'Meditating yogi. Heals nearby allied troops for 20 HP/s while alive.',
    special: 'passive_heal', tag: '💚 HEAL AURA'
  },
  gladiator: {
    id: 'gladiator', name: 'Arena Gladiator', origin: 'Greek',
    emoji: '🪖', art: '🪖⚔️', rarity: RARITY.RARE,
    type: 'troop', lane: 'ground', karmaCost: 4,
    hp: 700, damage: 110, speed: 1.2, range: 60, attackSpeed: 900,
    color: '#64748b', aura: '#cbd5e1',
    desc: 'Seasoned Greek fighter. Shield bash stuns target for 1s.',
    special: 'shield_bash', tag: '🛡️ SHIELD BASH'
  },
  anubis_guard: {
    id: 'anubis_guard', name: 'Tomb Guard', origin: 'Egyptian',
    emoji: '⚱️', art: '⚱️💀', rarity: RARITY.RARE,
    type: 'troop', lane: 'ground', karmaCost: 3,
    hp: 550, damage: 70, speed: 0.9, range: 60, attackSpeed: 1000,
    color: '#78350f', aura: '#d6b896',
    desc: 'Ancient tomb guardian. Cannot be killed by spells — only troops.',
    special: 'spell_immune', tag: '🛡️ SPELL IMMUNE'
  },

  /* ══════════ 🏛️ DEFENSE BUILDINGS ══════════ */
  karma_shrine: {
    id: 'karma_shrine', name: 'Karma Shrine', origin: 'Indian',
    emoji: '🛕', art: '🛕✨', rarity: RARITY.COMMON,
    type: 'building', karmaCost: 2,
    hp: 400, damage: 0, attackSpeed: 0,
    color: '#78350f', aura: '#d97706',
    desc: 'Generates +1 Karma Orb every 10 seconds.',
    special: 'karma_gen', tag: '🔮 KARMA GEN'
  },
  pyramid_turret: {
    id: 'pyramid_turret', name: 'Pyramid Turret', origin: 'Egyptian',
    emoji: '🔺', art: '🔺💥', rarity: RARITY.RARE,
    type: 'building', karmaCost: 4,
    hp: 700, damage: 160, range: 200, attackSpeed: 1200,
    color: '#ca8a04', aura: '#fef9c3',
    desc: 'Egyptian laser turret. Fires golden energy beams. Hits air + ground.',
    special: 'multi_target', tag: '💥 LASER BEAM'
  },
  olympus_wall: {
    id: 'olympus_wall', name: 'Olympus Wall', origin: 'Greek',
    emoji: '🏛️', art: '🏛️⚡', rarity: RARITY.RARE,
    type: 'building', karmaCost: 3,
    hp: 1800, damage: 0, attackSpeed: 0,
    color: '#e2e8f0', aura: '#94a3b8',
    desc: 'Marble divine barrier. Enemies touching it take 10 damage/s.',
    special: 'thorns_wall', tag: '⚡ SHOCK WALL'
  },

  /* ══════════ ✨ DIVINE SPELLS ══════════ */
  dharma_blast: {
    id: 'dharma_blast', name: 'Dharma Blast', origin: 'Indian',
    emoji: '💥', art: '💥🔱', rarity: RARITY.COMMON,
    type: 'spell', karmaCost: 2, damage: 180, radius: 75,
    color: '#f97316', desc: 'Righteous explosion. Quick nuke.',
    special: null, tag: null
  },
  monsoon_wrath: {
    id: 'monsoon_wrath', name: 'Monsoon Wrath', origin: 'Indian',
    emoji: '🌧️', art: '🌧️🌀', rarity: RARITY.RARE,
    type: 'spell', karmaCost: 4, damage: 90, radius: 180, slow: 0.45,
    color: '#0ea5e9', desc: 'Slows all enemies in large area for 3.5s.',
    special: 'slow', tag: '❄️ SLOW'
  },
  greek_fire: {
    id: 'greek_fire', name: 'Greek Fire', origin: 'Greek',
    emoji: '🔥', art: '🔥🔥', rarity: RARITY.RARE,
    type: 'spell', karmaCost: 3, damage: 120, radius: 130, burn: 30,
    color: '#ef4444', desc: 'Sets area on fire — burns enemies for 30 dmg/s for 4s.',
    special: 'burn_dot', tag: '🔥 BURN'
  },
  divine_blessing: {
    id: 'divine_blessing', name: 'Divine Blessing', origin: 'Indian',
    emoji: '🙏', art: '🙏✨', rarity: RARITY.RARE,
    type: 'spell', karmaCost: 3, healAmount: 350, radius: 170,
    color: '#22c55e', desc: 'Heals all friendly troops. Sacred mantra.',
    special: 'heal', tag: '💚 HEAL'
  },
  solar_flare: {
    id: 'solar_flare', name: 'Solar Flare', origin: 'Egyptian',
    emoji: '☀️', art: '☀️💥', rarity: RARITY.EPIC,
    type: 'spell', karmaCost: 6, damage: 450, radius: 120,
    color: '#fbbf24', desc: 'Eye of Ra laser strike. Massive single-point divine damage.',
    special: null, tag: '👁️ RA STRIKE'
  },
  brahmastra: {
    id: 'brahmastra', name: 'Brahmastra', origin: 'Indian',
    emoji: '☄️', art: '☄️💫', rarity: RARITY.LEGEND,
    type: 'spell', karmaCost: 9, damage: 1200, radius: 150,
    color: '#a855f7', desc: 'The ultimate divine weapon. Annihilates everything in range.',
    special: null, tag: '💀 LEGENDARY NUKE'
  }
}

/* ── STARTER DECK ── */
const STARTER_DECK = [
  'street_brawler', 'chai_swarm', 'war_charioteer', 'wind_warrior',
  'sky_king', 'hawk_warrior', 'karma_shrine', 'dharma_blast'
]

/* ── AI DECKS ── */
const AI_DECKS = {
  easy:   ['chai_swarm','street_brawler','mummy_legion','gladiator','karma_shrine','dharma_blast','monsoon_wrath','yogi_healer'],
  medium: ['war_charioteer','wind_warrior','sky_king','death_jackal','pyramid_turret','greek_fire','divine_blessing','hawk_warrior'],
  hard:   ['destroyer_god','sun_pharaoh','storm_avatar','lotus_guardian','brahmastra','sun_chariot','death_ferryman','vajra']
}

export { CARDS, STARTER_DECK, AI_DECKS }

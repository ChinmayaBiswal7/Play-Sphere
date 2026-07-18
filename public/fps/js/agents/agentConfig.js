/* ==========================================================================
   DELHI DEFIANCE - AGENTS ATTRIBUTES REGISTRY
   ========================================================================== */

const AGENT_REGISTRY = {
  agni: {
    id: 'agni',
    name: 'AGNI',
    role: 'DUELIST',
    health: 100,
    armor: 50,
    speedMultiplier: 1.1,
    passive: 'FLAME_SPRINT',
    passiveDesc: '+10% movement speed and faster reload at full heat',
    abilities: {
      q: { name: 'Fire Pulse', cooldown: 30, type: 'BURN', description: 'Throws plasma grenade that burns area for 5s (18 DPS)' },
      e: { name: 'Dash Burst', cooldown: 18, type: 'DASH', description: 'Instant 8m burst dash (Left, Right, or Forward)' },
      x: { name: 'Solar Overdrive', pointsRequired: 7, type: 'ULTIMATE', description: '12s duration: faster speed, unlimited stamina, faster reload, burn bullets' }
    }
  },
  vayu: {
    id: 'vayu',
    name: 'VAYU',
    role: 'INITIATOR',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'FLOAT_JUMP',
    passiveDesc: 'Falls significantly slower and jumps higher',
    abilities: {
      q: { name: 'Wind Wave', cooldown: 20, type: 'KNOCKBACK', description: 'Force wave that pushes enemies and utility/grenades back' },
      e: { name: 'Cyclone', cooldown: 15, type: 'DEFLECT', description: 'Creates rotating wind barrier that blocks bullets for 2s' },
      x: { name: 'Monsoon', pointsRequired: 7, type: 'ULTIMATE', description: 'Spawns storm blurring enemy vision, amplifying footstep noise, and slowing them' }
    }
  },
  shadow: {
    id: 'shadow',
    name: 'SHADOW',
    role: 'CONTROLLER',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'SILENT_STEPS',
    passiveDesc: 'Running footstep volume is permanently reduced by 60%',
    abilities: {
      q: { name: 'Shadow Orb', cooldown: 25, type: 'SMOKE', description: 'Throws a dark orb creating a dense smoke sphere for 18s' },
      e: { name: 'Dark Veil', cooldown: 20, type: 'BLIND', description: 'Enemies inside cannot see the minimap or hear footsteps' },
      x: { name: 'Nightfall', pointsRequired: 7, type: 'ULTIMATE', description: 'Entire map darkens, reducing enemy vision (friendly unaffected)' }
    }
  },
  vajra: {
    id: 'vajra',
    name: 'VAJRA',
    role: 'SENTINEL',
    health: 100,
    armor: 70, // Sentinel gets +20 HP Shield / Extra armor!
    speedMultiplier: 0.95,
    passive: 'FORTIFIED',
    passiveDesc: 'Permanent +20 Shield capacity and reduced incoming damage',
    abilities: {
      q: { name: 'Shield Wall', cooldown: 25, type: 'BARRIER', description: 'Deploys portable energy shield blocking bullet trajectories' },
      e: { name: 'Auto Turret', cooldown: 20, type: 'SENTRY', description: 'Deploys automated micro-turret scanning and engaging targets' },
      x: { name: 'Fortress', pointsRequired: 7, type: 'ULTIMATE', description: 'Creates massive static energy dome that completely blocks all bullets' }
    }
  },
  naga: {
    id: 'naga',
    name: 'NAGA',
    role: 'CONTROLLER',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'TOXIC_RESIST',
    passiveDesc: 'Immune to all poison damage and acid zones',
    abilities: {
      q: { name: 'Poison Cloud', cooldown: 25, type: 'SMOKE', description: 'Creates expanding toxic gas screen damaging anyone inside' },
      e: { name: 'Toxic Pool', cooldown: 22, type: 'DEBUFF', description: 'Deploys corrosive chemical puddle slowing and eroding enemy HP' },
      x: { name: 'Serpent\'s Wrath', pointsRequired: 7, type: 'ULTIMATE', description: 'Spreads poison gas through the entire active bomb site' }
    }
  },
  astra: {
    id: 'astra',
    name: 'ASTRA-X',
    role: 'INITIATOR',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'COSMIC_EYE',
    passiveDesc: 'Allows seeing deployed utility/mines through walls',
    abilities: {
      q: { name: 'Gravity Well', cooldown: 24, type: 'PULL', description: 'Vortex pulls enemies toward center and weakens them' },
      e: { name: 'Gravity Lift', cooldown: 18, type: 'ELEVATE', description: 'Launches players upward for vertical platforms and jump peaks' },
      x: { name: 'Singularity', pointsRequired: 7, type: 'ULTIMATE', description: 'Fires massive black hole pulling players, utility, and the Spike' }
    }
  },
  rakshak: {
    id: 'rakshak',
    name: 'RAKSHAK',
    role: 'SENTINEL',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'MEDIC_REP',
    passiveDesc: 'Revives dead team members 20% faster',
    abilities: {
      q: { name: 'Shield Drone', cooldown: 28, type: 'BUFF', description: 'Deploys micro-drone shielding target teammate from front fire' },
      e: { name: 'Medical Beacon', cooldown: 20, type: 'HEAL', description: 'Places field emitting continuous health recovery to allies' },
      x: { name: 'Extraction', pointsRequired: 7, type: 'ULTIMATE', description: 'Revives one eliminated teammate back to full combat status' }
    }
  },
  kali: {
    id: 'kali',
    name: 'KALI',
    role: 'DUELIST',
    health: 100,
    armor: 50,
    speedMultiplier: 1.05,
    passive: 'BLOOD_HEAL',
    passiveDesc: 'Eliminating an opponent instantly restores 25 HP',
    abilities: {
      q: { name: 'Blink Slash', cooldown: 24, type: 'TELEPORT', description: 'Short range instant shadow step teleport' },
      e: { name: 'Blood Rush', cooldown: 20, type: 'BUFF', description: 'Greatly increases weapon firing speed and reload rate' },
      x: { name: 'Goddess Mode', pointsRequired: 7, type: 'ULTIMATE', description: 'Faster movement speed, infinite stamina, and double jumping' }
    }
  },
  garuda: {
    id: 'garuda',
    name: 'GARUDA',
    role: 'INITIATOR',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'GLIDE',
    passiveDesc: 'Hold space in mid-air to hover/glide slowly downward',
    abilities: {
      q: { name: 'Flash Drone', cooldown: 25, type: 'FLASH', description: 'Launches guided drone exploding into blinding light flash' },
      e: { name: 'Recon Hawk', cooldown: 20, type: 'INTEL', description: 'Deploys scouting hawk scanning and highlighting nearby enemies' },
      x: { name: 'Sky Strike', pointsRequired: 7, type: 'ULTIMATE', description: 'Target map coordinates to fire multiple heavy missile strikes' }
    }
  },
  maya: {
    id: 'maya',
    name: 'MAYA',
    role: 'CONTROLLER',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'DECEPTION',
    passiveDesc: 'Enemies occasionally hear fake footstep audio cues',
    abilities: {
      q: { name: 'Mirror Clone', cooldown: 25, type: 'CLONE', description: 'Sends forward running holographic decoy mimicking player' },
      e: { name: 'False Walls', cooldown: 22, type: 'ILLUSION', description: 'Deploys fake building wall blocking enemy visual sight' },
      x: { name: 'Illusion World', pointsRequired: 7, type: 'ULTIMATE', description: 'Enemies see fake teammate models, fake Spikes, and fake abilities' }
    }
  }
};

window.AGENT_REGISTRY = AGENT_REGISTRY;

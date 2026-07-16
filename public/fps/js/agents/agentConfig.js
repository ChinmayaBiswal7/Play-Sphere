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
    passive: 'FLAME_SPRINT', // moves faster after kills
    abilities: {
      q: {
        name: 'Molten Wall',
        cooldown: 25,
        type: 'VISION_BLOCK',
        description: 'Raise a wall of fire that damages enemies walking through'
      },
      e: {
        name: 'Fire Dash',
        cooldown: 18,
        type: 'DASH',
        description: 'Fast horizontal burst forward'
      },
      x: {
        name: 'Inferno Storm',
        pointsRequired: 7,
        type: 'ULTIMATE',
        description: 'Unleash high impact explosive thermal projectiles'
      }
    }
  },
  vayu: {
    id: 'vayu',
    name: 'VAYU',
    role: 'INITIATOR',
    health: 100,
    armor: 50,
    speedMultiplier: 1.0,
    passive: 'FLOAT_JUMP', // higher jumps
    abilities: {
      q: {
        name: 'Air Pulse',
        cooldown: 20,
        type: 'INTEL',
        description: 'Echo sonar highlights enemies through walls'
      },
      e: {
        name: 'Wind Burst',
        cooldown: 15,
        type: 'KNOCKBACK',
        description: 'Force blast pushes enemies back and destroys light barricades'
      },
      x: {
        name: 'Cyclone Field',
        pointsRequired: 7,
        type: 'ULTIMATE',
        description: 'Blasts a disorienting vortex covering a site'
      }
    }
  }
};

window.AGENT_REGISTRY = AGENT_REGISTRY;

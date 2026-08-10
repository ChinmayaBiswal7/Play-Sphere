/**
 * BLOCK ZONE: Procedural Loot Spawning & Pickups
 */
class LootSystem {
  constructor(scene, worldSize = 500) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.lootItems = [];
    this.init();
  }

  init() {
    // Spawn loot in clusters near landmarks and scattered in world
    const spawnPoints = [
      // Central Village Houses & Props
      { x: -25, z: -25, type: 'WEAPON', val: 'ASSAULT' },
      { x: 25, z: -25, type: 'WEAPON', val: 'SMG' },
      { x: -25, z: 25, type: 'WEAPON', val: 'SHOTGUN' },
      { x: 25, z: 25, type: 'SHIELD', val: 25 },
      { x: 0, z: 0, type: 'MEDKIT', val: 50 },
      { x: -32, z: -18, type: 'AMMO', val: 60 },
      { x: 32, z: 18, type: 'SHIELD', val: 25 },

      // Old Farm
      { x: 140, z: -120, type: 'WEAPON', val: 'SHOTGUN' },
      { x: 164, z: -110, type: 'WEAPON', val: 'ASSAULT' },
      { x: 124, z: -130, type: 'MEDKIT', val: 50 },
      { x: 150, z: -100, type: 'AMMO', val: 60 },

      // Stone Hill Lookout
      { x: -130, z: 120, type: 'WEAPON', val: 'SNIPER' },
      { x: -125, z: 125, type: 'AMMO', val: 30 },
      { x: -135, z: 115, type: 'SHIELD', val: 25 },

      // Factory Yard
      { x: 115, z: 115, type: 'WEAPON', val: 'SMG' },
      { x: 145, z: 145, type: 'WEAPON', val: 'ASSAULT' },
      { x: 130, z: 120, type: 'SHIELD', val: 25 },
      { x: 120, z: 140, type: 'MEDKIT', val: 50 },

      // Green Forest
      { x: -120, z: -120, type: 'WEAPON', val: 'SNIPER' },
      { x: -150, z: -130, type: 'MEDKIT', val: 50 },
      { x: -130, z: -160, type: 'SHIELD', val: 25 }
    ];

    // Add 40 additional random world loot drops
    const types = [
      { type: 'WEAPON', val: 'ASSAULT' },
      { type: 'WEAPON', val: 'SMG' },
      { type: 'WEAPON', val: 'SHOTGUN' },
      { type: 'WEAPON', val: 'SNIPER' },
      { type: 'MEDKIT', val: 50 },
      { type: 'SHIELD', val: 25 },
      { type: 'AMMO', val: 45 }
    ];

    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * this.worldSize * 0.7;
      const rz = (Math.random() - 0.5) * this.worldSize * 0.7;
      const t = types[Math.floor(Math.random() * types.length)];
      spawnPoints.push({ x: rx, z: rz, type: t.type, val: t.val });
    }

    spawnPoints.forEach(sp => this.spawnLoot(sp.x, sp.z, sp.type, sp.val));
  }

  spawnLoot(x, z, type, val) {
    let colorHex = 0xfacc15;
    let label = 'Loot Box';

    if (type === 'WEAPON') {
      const conf = WEAPON_CONFIGS[val];
      colorHex = conf ? conf.color : 0xfacc15;
      label = conf ? conf.name : val;
    } else if (type === 'MEDKIT') {
      colorHex = 0x22c55e;
      label = 'Medkit (+50 HP)';
    } else if (type === 'SHIELD') {
      colorHex = 0x38bdf8;
      label = 'Shield Potion (+25 SP)';
    } else if (type === 'AMMO') {
      colorHex = 0xf97316;
      label = `Ammo Pack (+${val})`;
    }

    const group = new THREE.Group();
    group.position.set(x, 0.8, z);

    // Glowing Loot Crate Box
    const boxMat = new THREE.MeshLambertMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.35
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), boxMat);
    box.castShadow = true;
    group.add(box);

    // Soft Point Light
    const light = new THREE.PointLight(colorHex, 0.8, 6);
    light.position.y = 0.5;
    group.add(light);

    this.scene.add(group);

    this.lootItems.push({
      mesh: group,
      type,
      val,
      label,
      initialY: 0.8,
      active: true
    });
  }

  update(dt, player) {
    const time = performance.now() / 1000;
    let closestItem = null;
    let closestDist = Infinity;

    for (let i = this.lootItems.length - 1; i >= 0; i--) {
      const item = this.lootItems[i];
      if (!item.active) continue;

      // Animate hovering and spinning
      item.mesh.rotation.y += dt * 2.0;
      item.mesh.position.y = item.initialY + Math.sin(time * 3.5 + i) * 0.18;

      // Check distance to player
      if (player && player.mesh) {
        const dist = player.mesh.position.distanceTo(item.mesh.position);
        if (dist < closestDist && dist < 4.5) {
          closestDist = dist;
          closestItem = item;
        }

        // Auto pickup on walkover (< 2 units)
        if (dist < 2.2) {
          this.collectLoot(item, player);
        }
      }
    }

    // Update HUD interact prompt if within interaction radius
    if (window.hud) {
      if (closestItem) {
        window.hud.showInteract(closestItem.label);
      } else {
        window.hud.hideInteract();
      }
    }
  }

  collectLoot(item, player) {
    item.active = false;
    this.scene.remove(item.mesh);

    if (item.type === 'WEAPON') {
      player.equipWeapon(item.val);
    } else if (item.type === 'MEDKIT') {
      player.health = Math.min(100, player.health + item.val);
    } else if (item.type === 'SHIELD') {
      player.shield = Math.min(50, player.shield + item.val);
    } else if (item.type === 'AMMO') {
      player.reserveAmmo += item.val;
    }

    if (window.audioManager) window.audioManager.playPickup();
    player.updateHUD();
  }
}

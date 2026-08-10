/**
 * BLOCK ZONE: 19 AI Bots with State Machine, Combat, Storm Navigation & Kill Feed
 */
const BOT_NAMES = [
  'Viper_01', 'Shadow_99', 'Ghost_X', 'NinjaBot', 'Blaze_77',
  'Striker_9', 'Alpha_Wolf', 'Titan_88', 'Phoenix_4', 'Storm_Rider',
  'Apex_Pro', 'Cyber_Punk', 'Rogue_X', 'Frost_Byte', 'Spectre_0',
  'Iron_Claw', 'Venom_07', 'Delta_Force', 'Hawk_Eye'
];

const BOT_COLORS = [
  0xef4444, 0xf97316, 0x10b981, 0x8b5cf6, 0xec4899,
  0x06b6d4, 0xf59e0b, 0x6366f1, 0x14b8a6, 0x84cc16,
  0xd946ef, 0x0ea5e9, 0xf43f5e, 0x64748b, 0xe11d48,
  0x059669, 0x7c3aed, 0x2563eb, 0xca8a04
];

class BotAI {
  constructor(scene, position, index) {
    this.scene = scene;
    this.name = BOT_NAMES[index] || `Bot_${index + 1}`;
    this.colorHex = BOT_COLORS[index % BOT_COLORS.length];
    this.isPlayer = false;

    this.health = 100;
    this.maxHealth = 100;
    this.shield = 25;
    this.speed = 8.5 + Math.random() * 2.5;

    const weapons = ['ASSAULT', 'SMG', 'SHOTGUN', 'PISTOL', 'SNIPER'];
    this.currentWeapon = weapons[Math.floor(Math.random() * weapons.length)];
    this.ammo = WEAPON_CONFIGS[this.currentWeapon].magSize;
    this.reserveAmmo = 999;
    this.accuracy = 0.45 + Math.random() * 0.25; // 45% - 70%

    this.lastFireTime = 0;
    this.state = 'WANDER'; // 'WANDER' | 'COMBAT' | 'RUN_TO_ZONE' | 'DEAD'
    this.target = null;
    this.wanderTarget = position.clone();
    this.stateTimer = 0;

    this.buildBotModel(position);
  }

  buildBotModel(pos) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(pos);
    this.mesh.position.y = 0;

    // Head
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffd1a4 });
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), headMat);
    this.head.position.y = 1.6;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Color Cap
    const capMat = new THREE.MeshLambertMaterial({ color: this.colorHex });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.72), capMat);
    cap.position.y = 0.28;
    this.head.add(cap);

    // Torso in team color
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.colorHex });
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.88, 0.44), bodyMat);
    this.body.position.y = 0.85;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Limbs
    const limbMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.78, 0.26), bodyMat);
    this.leftArm.position.set(-0.54, 0.85, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.78, 0.26), bodyMat);
    this.rightArm.position.set(0.54, 0.85, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Weapon mesh
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x111827 }));
    gun.position.set(0, -0.28, 0.3);
    this.rightArm.add(gun);

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.82, 0.32), limbMat);
    this.leftLeg.position.set(-0.2, 0, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.82, 0.32), limbMat);
    this.rightLeg.position.set(0.2, 0, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    this.scene.add(this.mesh);
  }

  takeDamage(amount, shooter, isStorm = false) {
    if (this.health <= 0) return;

    let remaining = amount;
    if (!isStorm && this.shield > 0) {
      if (this.shield >= remaining) {
        this.shield -= remaining;
        remaining = 0;
      } else {
        remaining -= this.shield;
        this.shield = 0;
      }
    }

    this.health = Math.max(0, this.health - remaining);

    if (shooter && shooter.health > 0 && this.state !== 'DEAD') {
      this.target = shooter;
      this.state = 'COMBAT';
    }

    if (this.health <= 0) {
      this.die(shooter ? shooter.name : (isStorm ? 'The Storm' : 'Unknown'), shooter);
    }
  }

  die(killerName, killerEntity) {
    this.state = 'DEAD';
    this.scene.remove(this.mesh);

    if (killerEntity && killerEntity.isPlayer) {
      killerEntity.kills = (killerEntity.kills || 0) + 1;
    }

    if (window.hud) {
      window.hud.addKill(killerName, this.name);
    }

    if (window.gameInstance) {
      window.gameInstance.checkPlayerCount();
    }
  }

  update(dt, entities, world, weaponSystem, safeZone) {
    if (this.health <= 0 || this.state === 'DEAD') return;

    this.stateTimer += dt;

    // Check Safe Zone Status
    if (safeZone) {
      const distToZoneCenter = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z)
        .distanceTo(new THREE.Vector2(safeZone.center.x, safeZone.center.z));
      
      if (distToZoneCenter > safeZone.currentRadius * 0.85) {
        this.state = 'RUN_TO_ZONE';
      }
    }

    // State Machine
    if (this.state === 'RUN_TO_ZONE' && safeZone) {
      // Run toward safe zone center
      const toCenter = safeZone.center.clone().sub(this.mesh.position);
      toCenter.y = 0;
      toCenter.normalize();

      this.moveInDirection(toCenter, dt, world, this.speed * 1.2);

      const dist = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z)
        .distanceTo(new THREE.Vector2(safeZone.center.x, safeZone.center.z));
      if (dist < safeZone.currentRadius * 0.5) {
        this.state = 'WANDER';
      }
    } else if (this.state === 'COMBAT') {
      if (!this.target || this.target.health <= 0) {
        this.target = null;
        this.state = 'WANDER';
        return;
      }

      const distToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
      if (distToTarget > 65) {
        this.target = null;
        this.state = 'WANDER';
        return;
      }

      // Face target
      const lookPos = this.target.mesh.position.clone();
      lookPos.y = this.mesh.position.y;
      this.mesh.lookAt(lookPos);

      // Strafe or close distance
      const toTarget = this.target.mesh.position.clone().sub(this.mesh.position);
      toTarget.y = 0;
      toTarget.normalize();

      if (distToTarget > 18) {
        this.moveInDirection(toTarget, dt, world, this.speed);
      } else if (distToTarget < 8) {
        this.moveInDirection(toTarget.clone().negate(), dt, world, this.speed * 0.7);
      }

      // Shoot at target
      const now = performance.now() / 1000;
      const config = WEAPON_CONFIGS[this.currentWeapon];
      if (now - this.lastFireTime >= config.fireRate + 0.1) {
        const shootOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const shootDir = this.target.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(shootOrigin).normalize();

        // Accuracy variation
        if (Math.random() < this.accuracy) {
          weaponSystem.fire(this, shootOrigin, shootDir, this.currentWeapon);
        } else {
          // Miss slightly
          shootDir.x += (Math.random() - 0.5) * 0.15;
          shootDir.z += (Math.random() - 0.5) * 0.15;
          weaponSystem.fire(this, shootOrigin, shootDir.normalize(), this.currentWeapon);
        }
      }
    } else {
      // WANDER / PATROL
      // Scan for enemies in sight
      for (let ent of entities) {
        if (ent !== this && ent.health > 0 && ent.mesh) {
          const dist = this.mesh.position.distanceTo(ent.mesh.position);
          if (dist < 42) {
            this.target = ent;
            this.state = 'COMBAT';
            break;
          }
        }
      }

      // Move toward wander target
      const toWander = this.wanderTarget.clone().sub(this.mesh.position);
      toWander.y = 0;

      if (toWander.length() < 3 || this.stateTimer > 8) {
        this.stateTimer = 0;
        this.wanderTarget = new THREE.Vector3(
          (Math.random() - 0.5) * 380,
          0,
          (Math.random() - 0.5) * 380
        );
      } else {
        toWander.normalize();
        this.moveInDirection(toWander, dt, world, this.speed);
      }
    }

    // Limb walk animation
    const time = performance.now() * 0.001 * 10;
    this.leftLeg.rotation.x = Math.sin(time) * 0.5;
    this.rightLeg.rotation.x = -Math.sin(time) * 0.5;
    this.leftArm.rotation.x = -Math.sin(time) * 0.4;
    this.rightArm.rotation.x = this.state === 'COMBAT' ? -0.5 : Math.sin(time) * 0.4;
  }

  moveInDirection(dir, dt, world, speed) {
    const nextPos = this.mesh.position.clone().add(dir.clone().multiplyScalar(speed * dt));
    if (!world.checkCollision(nextPos, 0.75)) {
      this.mesh.position.x = nextPos.x;
      this.mesh.position.z = nextPos.z;
    } else {
      // Pick new wander target on collision
      this.wanderTarget = new THREE.Vector3(
        (Math.random() - 0.5) * 380,
        0,
        (Math.random() - 0.5) * 380
      );
    }

    const angle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = angle;
  }
}

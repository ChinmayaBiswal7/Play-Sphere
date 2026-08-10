class WeaponSystem {
    constructor(scene) {
        this.scene = scene;
        this.weapons = {
            pistol: { name: 'Pistol', damage: 15, fireRate: 400, color: 0x888888 },
            rifle: { name: 'Assault Rifle', damage: 25, fireRate: 100, color: 0x222222 },
            sniper: { name: 'Sniper Rifle', damage: 80, fireRate: 1000, color: 0x118811 }
        };
        
        this.projectiles = [];
    }

    fire(shooter, position, direction, weaponType) {
        const weapon = this.weapons[weaponType];
        
        const now = Date.now();
        if (shooter.lastFireTime && now - shooter.lastFireTime < weapon.fireRate) {
            return; // Cooldown
        }
        shooter.lastFireTime = now;

        // Create visual projectile
        const geo = new THREE.SphereGeometry(0.2);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geo, mat);
        
        bullet.position.copy(position);
        bullet.velocity = direction.normalize().multiplyScalar(100); // 100 units per second
        bullet.damage = weapon.damage;
        bullet.shooter = shooter;
        bullet.life = 2.0; // 2 seconds

        this.scene.add(bullet);
        this.projectiles.push(bullet);
        
        // Muzzle flash or sound could be added here
    }

    update(dt, entities, world) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            
            if (p.life <= 0) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
                continue;
            }

            const step = p.velocity.clone().multiplyScalar(dt);
            const nextPos = p.position.clone().add(step);

            // Check collision with entities
            let hit = false;
            for (let entity of entities) {
                if (entity === p.shooter || entity.health <= 0) continue;
                
                if (entity.mesh.position.distanceTo(nextPos) < 2.0) { // Rough bounding sphere
                    entity.takeDamage(p.damage, p.shooter);
                    hit = true;
                    break;
                }
            }

            // Check collision with world
            if (!hit && world.checkCollision(nextPos, 0.2)) {
                hit = true;
            }

            if (hit) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
            } else {
                p.position.copy(nextPos);
            }
        }
    }
}

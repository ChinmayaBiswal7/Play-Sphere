class BotAI {
    constructor(scene, position, name) {
        this.scene = scene;
        this.name = name;
        this.health = 100;
        this.speed = 4;
        this.currentWeapon = 'pistol';
        this.lastFireTime = 0;
        
        // Visual
        const geo = new THREE.BoxGeometry(1, 2, 1);
        const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
        this.mesh.position.y = 1;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        this.state = 'wander'; // wander, attack
        this.target = null;
        this.wanderTarget = this.getRandomPosition();
    }

    getRandomPosition() {
        return new THREE.Vector3(
            this.mesh.position.x + (Math.random() - 0.5) * 50,
            this.mesh.position.y,
            this.mesh.position.z + (Math.random() - 0.5) * 50
        );
    }

    takeDamage(amount, shooter) {
        if (this.health <= 0) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        } else if (shooter && this.state !== 'attack') {
            this.state = 'attack';
            this.target = shooter;
        }
    }

    die() {
        this.scene.remove(this.mesh);
        console.log(this.name + " was eliminated.");
    }

    update(dt, entities, weaponSystem) {
        if (this.health <= 0) return;

        // Simple state machine
        if (this.state === 'wander') {
            // Find target
            for (let ent of entities) {
                if (ent !== this && ent.health > 0) {
                    const dist = this.mesh.position.distanceTo(ent.mesh.position);
                    if (dist < 40) { // Sight range
                        this.state = 'attack';
                        this.target = ent;
                        break;
                    }
                }
            }
            
            // Move to wander target
            const dir = this.wanderTarget.clone().sub(this.mesh.position);
            if (dir.length() < 1) {
                this.wanderTarget = this.getRandomPosition();
            } else {
                dir.normalize();
                this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
                this.mesh.lookAt(this.wanderTarget);
            }
            
        } else if (this.state === 'attack') {
            if (!this.target || this.target.health <= 0) {
                this.state = 'wander';
                this.target = null;
                return;
            }
            
            const dist = this.mesh.position.distanceTo(this.target.mesh.position);
            if (dist > 50) { // Lost sight
                this.state = 'wander';
                this.target = null;
                return;
            }
            
            // Look at target
            this.mesh.lookAt(this.target.mesh.position);
            
            // Move towards or away based on distance
            if (dist > 15) {
                const dir = this.target.mesh.position.clone().sub(this.mesh.position).normalize();
                this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
            }
            
            // Fire
            const fireDir = this.target.mesh.position.clone().sub(this.mesh.position).normalize();
            fireDir.y = 0; // aim horizontally
            weaponSystem.fire(this, this.mesh.position.clone().add(new THREE.Vector3(0,0.5,0)), fireDir, this.currentWeapon);
        }
    }
}

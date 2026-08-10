class Player {
    constructor(scene) {
        this.scene = scene;
        this.health = 100;
        this.speed = 10;
        this.currentWeapon = 'pistol';
        this.lastFireTime = 0;
        
        // Visual representation (hidden in first person, visible to others/camera)
        const geo = new THREE.BoxGeometry(1, 2, 1);
        const mat = new THREE.MeshLambertMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0, 100, 0); // Drop position
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.isGrounded = false;
        
        this.keys = {};
        document.addEventListener('keydown', (e) => this.keys[e.code] = true);
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);

        this.mouseLeft = false;
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouseLeft = true;
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseLeft = false;
        });
        
        this.updateUI();
    }

    takeDamage(amount, shooter) {
        if (this.health <= 0) return;
        this.health -= amount;
        this.updateUI();
        
        if (this.health <= 0) {
            console.log("Player died!");
            document.getElementById('hud').innerHTML = "<h1 style='color:red; text-align:center;'>ELIMINATED</h1>";
        }
    }

    updateUI() {
        const hud = document.getElementById('hud');
        if (hud) {
            hud.innerHTML = `Health: ${Math.floor(this.health)} | Weapon: ${this.currentWeapon.toUpperCase()}`;
        }
    }

    update(dt, camera, world, weaponSystem) {
        if (this.health <= 0) return;

        // Gravity
        if (this.mesh.position.y > 1) {
            this.velocity.y -= 20 * dt; // Gravity
            this.isGrounded = false;
        } else {
            this.mesh.position.y = 1;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Jump
        if (this.isGrounded && this.keys['Space']) {
            this.velocity.y = 10;
        }

        // Movement
        const dir = new THREE.Vector3();
        
        // Get camera yaw
        const camYaw = camera.yaw.rotation.y;
        const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
        const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

        if (this.keys['KeyW']) dir.sub(forward);
        if (this.keys['KeyS']) dir.add(forward);
        if (this.keys['KeyA']) dir.sub(right);
        if (this.keys['KeyD']) dir.add(right);

        dir.normalize();

        const moveStep = dir.clone().multiplyScalar(this.speed * dt);
        const nextPos = this.mesh.position.clone().add(moveStep);
        
        if (!world.checkCollision(nextPos, 0.5)) {
            this.mesh.position.x = nextPos.x;
            this.mesh.position.z = nextPos.z;
        }

        this.mesh.position.y += this.velocity.y * dt;

        // Shooting
        if (this.mouseLeft && camera.isLocked) {
            const camDir = camera.getDirection();
            weaponSystem.fire(
                this, 
                camera.camera.getWorldPosition(new THREE.Vector3()), 
                camDir, 
                this.currentWeapon
            );
        }
    }
}

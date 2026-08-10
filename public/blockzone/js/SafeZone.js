class SafeZone {
    constructor(scene, worldSize) {
        this.scene = scene;
        this.worldSize = worldSize;
        
        this.center = new THREE.Vector3(0, 0, 0);
        this.radius = worldSize * 0.7;
        
        this.nextCenter = new THREE.Vector3(
            (Math.random() - 0.5) * this.radius,
            0,
            (Math.random() - 0.5) * this.radius
        );
        this.nextRadius = this.radius * 0.5;
        
        this.state = 'waiting'; // waiting, shrinking
        this.timer = 30; // seconds
        
        // Visuals
        const geo = new THREE.CylinderGeometry(1, 1, 50, 32, 1, true);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x0000ff, 
            transparent: true, 
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(this.center);
        this.mesh.scale.set(this.radius, 1, this.radius);
        this.scene.add(this.mesh);
    }

    update(dt, entities) {
        this.timer -= dt;
        
        if (this.state === 'waiting' && this.timer <= 0) {
            this.state = 'shrinking';
            this.timer = 60; // shrink duration
            
            // Calculate shrink step per second
            this.shrinkRate = (this.radius - this.nextRadius) / this.timer;
            this.moveRate = this.nextCenter.clone().sub(this.center).divideScalar(this.timer);
        } else if (this.state === 'shrinking') {
            if (this.timer <= 0) {
                this.state = 'waiting';
                this.timer = 45; // wait before next shrink
                
                this.radius = this.nextRadius;
                this.center.copy(this.nextCenter);
                
                // Calculate next zone
                const r = this.radius * 0.5;
                const theta = Math.random() * Math.PI * 2;
                const offsetR = Math.random() * (this.radius - r);
                
                this.nextRadius = r;
                this.nextCenter = new THREE.Vector3(
                    this.center.x + Math.cos(theta) * offsetR,
                    0,
                    this.center.z + Math.sin(theta) * offsetR
                );
            } else {
                this.radius -= this.shrinkRate * dt;
                this.center.add(this.moveRate.clone().multiplyScalar(dt));
            }
        }
        
        // Update visuals
        this.mesh.position.copy(this.center);
        this.mesh.scale.set(this.radius, 1, this.radius);
        
        // Damage entities outside
        for (let entity of entities) {
            if (entity.health > 0) {
                const dist = new THREE.Vector2(entity.mesh.position.x, entity.mesh.position.z)
                    .distanceTo(new THREE.Vector2(this.center.x, this.center.z));
                    
                if (dist > this.radius) {
                    entity.takeDamage(5 * dt, null); // 5 damage per second
                }
            }
        }
    }
}

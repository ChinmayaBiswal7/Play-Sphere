class World {
    constructor(scene, size) {
        this.scene = scene;
        this.size = size;
        this.obstacles = [];
        this.init();
    }

    init() {
        // Ground
        const groundGeo = new THREE.PlaneGeometry(this.size, this.size);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a5f0b });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(this.size, this.size / 10, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Generate Trees/Obstacles
        const obstacleGeo = new THREE.BoxGeometry(2, 10, 2);
        const obstacleMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });

        for (let i = 0; i < 200; i++) {
            const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
            obstacle.position.x = (Math.random() - 0.5) * this.size;
            obstacle.position.z = (Math.random() - 0.5) * this.size;
            obstacle.position.y = 5;
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            
            // Add a "leaves" block on top
            const leavesGeo = new THREE.BoxGeometry(6, 6, 6);
            const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2d4c1e });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 8;
            leaves.castShadow = true;
            obstacle.add(leaves);

            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }

        // Buildings
        const buildingGeo = new THREE.BoxGeometry(15, 15, 15);
        const buildingMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        
        for (let i = 0; i < 50; i++) {
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.x = (Math.random() - 0.5) * this.size;
            building.position.z = (Math.random() - 0.5) * this.size;
            building.position.y = 7.5;
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.obstacles.push(building);
        }
    }

    checkCollision(position, radius) {
        for (let obs of this.obstacles) {
            const dx = position.x - obs.position.x;
            const dz = position.z - obs.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Simple bounding box/sphere collision estimation
            const obsRadius = obs.geometry.parameters.width / 2;
            if (dist < radius + obsRadius) {
                return true;
            }
        }
        return false;
    }
}

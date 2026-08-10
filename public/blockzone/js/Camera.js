class Camera {
    constructor(player, domElement) {
        this.player = player;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.pitch = new THREE.Object3D();
        this.yaw = new THREE.Object3D();
        
        this.yaw.add(this.pitch);
        this.pitch.add(this.camera);
        this.player.mesh.add(this.yaw);

        // Third person setup
        this.camera.position.set(0, 3, 7);
        this.camera.lookAt(0, 0, 0);

        this.mouseSensitivity = 0.002;
        this.isLocked = false;

        domElement.addEventListener('click', () => {
            domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === domElement;
        });

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.yaw.rotation.y -= movementX * this.mouseSensitivity;
        this.pitch.rotation.x -= movementY * this.mouseSensitivity;

        this.pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch.rotation.x));
    }

    update() {
        // Smooth camera follow could be added here
        // Currently it's rigidly attached to the player via yaw/pitch
    }

    getDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.pitch.quaternion);
        dir.applyQuaternion(this.yaw.quaternion);
        dir.applyQuaternion(this.player.mesh.quaternion);
        return dir;
    }
}

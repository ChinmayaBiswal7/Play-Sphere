class LootSystem {
    constructor(scene, worldSize) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.lootItems = [];
        this.initLoot();
    }

    initLoot() {
        const types = [
            { type: 'weapon', weapon: 'rifle', color: 0x0000ff },
            { type: 'weapon', weapon: 'sniper', color: 0xff00ff },
            { type: 'health', heal: 50, color: 0x00ff00 }
        ];

        for (let i = 0; i < 150; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshLambertMaterial({ color: t.color });
            const mesh = new THREE.Mesh(geo, mat);
            
            mesh.position.x = (Math.random() - 0.5) * this.worldSize;
            mesh.position.z = (Math.random() - 0.5) * this.worldSize;
            mesh.position.y = 0.5;
            
            mesh.castShadow = true;
            
            this.scene.add(mesh);
            
            this.lootItems.push({
                mesh: mesh,
                type: t.type,
                weapon: t.weapon,
                heal: t.heal
            });
        }
    }

    update(dt) {
        // Spin loot
        for (let loot of this.lootItems) {
            loot.mesh.rotation.y += dt;
        }
    }

    checkPickup(player) {
        for (let i = this.lootItems.length - 1; i >= 0; i--) {
            const loot = this.lootItems[i];
            if (player.mesh.position.distanceTo(loot.mesh.position) < 2) {
                if (loot.type === 'weapon') {
                    player.currentWeapon = loot.weapon;
                    player.updateUI();
                } else if (loot.type === 'health') {
                    player.health = Math.min(100, player.health + loot.heal);
                    player.updateUI();
                }
                
                this.scene.remove(loot.mesh);
                this.lootItems.splice(i, 1);
            }
        }
    }
}

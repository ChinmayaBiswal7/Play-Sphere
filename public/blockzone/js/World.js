/**
 * BLOCK ZONE: Procedural 500x500 Voxel Battle Royale Island
 */
class World {
  constructor(scene, size = 500) {
    this.scene = scene;
    this.size = size;
    this.collidables = []; // Bounding boxes for player & bot collision
    this.landmarkPoints = [
      { name: 'Central Village', x: 0, z: 0 },
      { name: 'Green Forest', x: -140, z: -140 },
      { name: 'Old Farm', x: 140, z: -120 },
      { name: 'Stone Hill', x: -130, z: 120 },
      { name: 'Factory Yard', x: 130, z: 130 },
      { name: 'Blue Lake', x: 0, z: 150 }
    ];

    this.init();
  }

  init() {
    this.createTerrain();
    this.createRoads();
    this.createGrass();
    this.createCentralVillage();
    this.createGreenForest();
    this.createOldFarm();
    this.createStoneHill();
    this.createFactory();
    this.createBlueLake();
    this.createScatteredProps();
  }

  /** Returns ground Y at given XZ — flat for now, hook for hills later */
  getGroundY(x, z) {
    // Stone hill elevation
    const hx = -130, hz = 120;
    const dx = x - hx, dz = z - hz;
    if (Math.abs(dx) < 20 && Math.abs(dz) < 20) return 8;   // top of hill
    if (Math.abs(dx) < 34 && Math.abs(dz) < 34) return 4;   // first layer
    return 0;
  }

  createTerrain() {
    // Main Grass Island Plane (500x500)
    const grassGeo = new THREE.PlaneGeometry(this.size, this.size, 32, 32);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x48bb78 });
    const ground = new THREE.Mesh(grassGeo, grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Sandy Shore Border
    const sandGeo = new THREE.RingGeometry(this.size * 0.48, this.size * 0.55, 32);
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xf6e05e });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = 0.02;
    this.scene.add(sand);

    // Surrounding Ocean
    const oceanGeo = new THREE.PlaneGeometry(this.size * 3, this.size * 3);
    const oceanMat = new THREE.MeshLambertMaterial({ color: 0x2b6cb0, transparent: true, opacity: 0.8 });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.4;
    this.scene.add(ocean);
  }

  // ── GRASS PATCHES ─────────────────────────────────────────────────────
  createGrass() {
    // Instanced grass blades using boxes — very efficient
    const bladeW = 0.18, bladeD = 0.18;
    const grassColors = [0x22c55e, 0x16a34a, 0x4ade80, 0x15803d, 0x86efac];

    // We'll create 5 color groups of instanced meshes for performance
    grassColors.forEach((col, ci) => {
      const mat = new THREE.MeshLambertMaterial({ color: col });
      const COUNT = 600;
      const dummy = new THREE.Object3D();
      const geo = new THREE.BoxGeometry(bladeW, 1, bladeD);
      const inst = new THREE.InstancedMesh(geo, mat, COUNT);
      inst.castShadow = false;

      for (let i = 0; i < COUNT; i++) {
        const gx = (Math.random() - 0.5) * 460;
        const gz = (Math.random() - 0.5) * 460;

        // Skip roads
        if (Math.abs(gx) < 8 || Math.abs(gz) < 8) continue;
        // Skip lake
        if (Math.abs(gx - 0) < 45 && Math.abs(gz - 150) < 30) continue;

        const h = 0.35 + Math.random() * 0.55;
        const gy = this.getGroundY(gx, gz);
        dummy.position.set(gx, gy + h / 2, gz);
        dummy.scale.set(1, h, 1);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      this.scene.add(inst);
    });

    // Tall dead grass / reeds near lake
    const reedMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad   = 38 + Math.random() * 10;
      const rx = rad * Math.cos(angle);
      const rz = 150 + rad * Math.sin(angle);
      const h  = 1.2 + Math.random() * 1.2;
      const reed = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, 0.25), reedMat);
      reed.position.set(rx, h / 2, rz);
      this.scene.add(reed);
    }
  }

  createRoads() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    
    // Main N-S Highway
    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, this.size * 0.8), roadMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.set(0, 0.03, 0);
    nsRoad.receiveShadow = true;
    this.scene.add(nsRoad);

    // Main E-W Highway
    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(this.size * 0.8, 12), roadMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.set(0, 0.03, 0);
    ewRoad.receiveShadow = true;
    this.scene.add(ewRoad);

    // Road Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let i = -180; i <= 180; i += 20) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8), stripeMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(0, 0.04, i);
      this.scene.add(s1);

      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), stripeMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(i, 0.04, 0);
      this.scene.add(s2);
    }
  }

  // ── PREFAB: BLOCKY MINECRAFT TREE ──
  addTree(x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Brown Wood Trunk
    const trunkGeo = new THREE.BoxGeometry(1.2 * scale, 6 * scale, 1.2 * scale);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 3-Tier Layered Cubic Foliage
    const leafMat1 = new THREE.MeshLambertMaterial({ color: 0x22543d });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2f855a });
    const leafMat3 = new THREE.MeshLambertMaterial({ color: 0x38a169 });

    const l1 = new THREE.Mesh(new THREE.BoxGeometry(5 * scale, 2.5 * scale, 5 * scale), leafMat1);
    l1.position.y = 5.5 * scale;
    l1.castShadow = true;
    group.add(l1);

    const l2 = new THREE.Mesh(new THREE.BoxGeometry(3.8 * scale, 2.5 * scale, 3.8 * scale), leafMat2);
    l2.position.y = 7.5 * scale;
    l2.castShadow = true;
    group.add(l2);

    const l3 = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 2 * scale, 2.2 * scale), leafMat3);
    l3.position.y = 9.2 * scale;
    l3.castShadow = true;
    group.add(l3);

    this.scene.add(group);
    this.registerCollidable(x, z, 1.2 * scale, 1.2 * scale);
  }

  // ── PREFAB: BUSH ──
  addBush(x, z) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x276749 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), mat);
    mesh.position.set(x, 0.8, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  // ── PREFAB: ROCK ──
  addRock(x, z, scale = 1) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x718096 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5 * scale, 1.8 * scale, 2.5 * scale), mat);
    mesh.position.set(x, 0.9 * scale, z);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.registerCollidable(x, z, 2.5 * scale, 2.5 * scale);
  }

  // ── PREFAB: WOODEN HOUSE ──
  addHouse(x, z, rot = 0, color = 0xd69e2e) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;

    // Walls
    const wallGeo = new THREE.BoxGeometry(10, 6, 8);
    const wallMat = new THREE.MeshLambertMaterial({ color: color });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 3;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Pitched Roof
    const roofGeo = new THREE.BoxGeometry(11, 2.5, 9);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x7b341e });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 6.8;
    roof.castShadow = true;
    group.add(roof);

    // Doorway Frame (Visual indication)
    const doorGeo = new THREE.BoxGeometry(2.2, 4, 0.3);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2, 4.05);
    group.add(door);

    // Windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0x90cdf4 });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.2), winMat);
    w1.position.set(-2.8, 3.5, 4.05);
    group.add(w1);

    const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.2), winMat);
    w2.position.set(2.8, 3.5, 4.05);
    group.add(w2);

    this.scene.add(group);
    this.registerCollidable(x, z, 10.5, 8.5);
  }

  // ── PREFAB: LARGE BARN ──
  addBarn(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Red Barn Walls
    const wallGeo = new THREE.BoxGeometry(18, 9, 14);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x9b2c2c });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 4.5;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof
    const roofGeo = new THREE.BoxGeometry(20, 3.5, 16);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 10;
    roof.castShadow = true;
    group.add(roof);

    // Big Barn Door
    const doorGeo = new THREE.BoxGeometry(5, 6.5, 0.3);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 3.25, 7.05);
    group.add(door);

    this.scene.add(group);
    this.registerCollidable(x, z, 18.5, 14.5);
  }

  // ── PREFAB: INDUSTRIAL WAREHOUSE ──
  addWarehouse(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const wallGeo = new THREE.BoxGeometry(22, 10, 16);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 5;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    const roofGeo = new THREE.BoxGeometry(24, 2, 18);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2d3748 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 10.5;
    roof.castShadow = true;
    group.add(roof);

    this.scene.add(group);
    this.registerCollidable(x, z, 22.5, 16.5);
  }

  // ── PREFAB: CRATE & BARREL ──
  addCrate(x, z) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xdd6b20 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
    crate.position.set(x, 1, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.registerCollidable(x, z, 2, 2);
  }

  addBarrel(x, z) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xe53e3e });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 12), mat);
    barrel.position.set(x, 1.1, z);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    this.scene.add(barrel);
    this.registerCollidable(x, z, 1.8, 1.8);
  }

  registerCollidable(x, z, width, depth) {
    this.collidables.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  // Check collision for player or bot sphere/box
  checkCollision(pos, radius = 0.8) {
    // Map outer boundary check
    const bound = this.size * 0.48;
    if (Math.abs(pos.x) > bound || Math.abs(pos.z) > bound) return true;

    for (let box of this.collidables) {
      if (
        pos.x + radius > box.minX &&
        pos.x - radius < box.maxX &&
        pos.z + radius > box.minZ &&
        pos.z - radius < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  // ── 1. CENTRAL PINE VILLAGE ──
  createCentralVillage() {
    this.addHouse(-25, -25, 0, 0xd69e2e);
    this.addHouse(25, -25, Math.PI, 0xb7791f);
    this.addHouse(-25, 25, 0, 0x975a16);
    this.addHouse(25, 25, Math.PI, 0xd69e2e);
    this.addHouse(-45, 0, Math.PI / 2, 0xb7791f);
    this.addHouse(45, 0, -Math.PI / 2, 0xd69e2e);

    // Village Trees & Props
    this.addTree(-10, -10, 1.1);
    this.addTree(10, 10, 1.2);
    this.addTree(-10, 35, 1.0);
    this.addTree(35, -10, 1.1);

    this.addBush(-15, -5);
    this.addBush(15, 5);
    this.addBush(-5, 15);
    this.addBush(5, -15);

    this.addCrate(-32, -18);
    this.addCrate(32, 18);
    this.addCrate(-18, 32);
    this.addBarrel(20, -32);
    this.addBarrel(-32, 20);
  }

  // ── 2. DENSE GREEN FOREST ──
  createGreenForest() {
    const originX = -140;
    const originZ = -140;

    for (let i = 0; i < 45; i++) {
      const tx = originX + (Math.random() - 0.5) * 110;
      const tz = originZ + (Math.random() - 0.5) * 110;
      const sc = 0.85 + Math.random() * 0.6;
      this.addTree(tx, tz, sc);
    }

    for (let i = 0; i < 20; i++) {
      const bx = originX + (Math.random() - 0.5) * 110;
      const bz = originZ + (Math.random() - 0.5) * 110;
      this.addBush(bx, bz);
    }

    for (let i = 0; i < 12; i++) {
      const rx = originX + (Math.random() - 0.5) * 110;
      const rz = originZ + (Math.random() - 0.5) * 110;
      this.addRock(rx, rz, 0.9 + Math.random() * 0.5);
    }
  }

  // ── 3. OLD FARM ──
  createOldFarm() {
    const fx = 140;
    const fz = -120;

    this.addBarn(fx, fz);
    this.addHouse(fx + 24, fz + 10, -Math.PI / 2, 0xd69e2e);

    // Hay Bales (Yellow block cubes)
    const hayMat = new THREE.MeshLambertMaterial({ color: 0xf6e05e });
    for (let i = 0; i < 8; i++) {
      const hay = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), hayMat);
      hay.position.set(fx - 16 + (i % 3) * 3, 1.25, fz - 12 + Math.floor(i / 3) * 3.2);
      hay.castShadow = true;
      hay.receiveShadow = true;
      this.scene.add(hay);
      this.registerCollidable(hay.position.x, hay.position.z, 2.5, 2.5);
    }

    this.addTree(fx - 25, fz - 20, 1.2);
    this.addTree(fx + 30, fz - 25, 1.1);
    this.addTree(fx + 35, fz + 30, 1.3);
  }

  // ── 4. STONE HILL (ELEVATED PLATEAU) ──
  createStoneHill() {
    const hx = -130;
    const hz = 120;

    // Layer 1
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(70, 4, 70), new THREE.MeshLambertMaterial({ color: 0x718096 }));
    s1.position.set(hx, 2, hz);
    s1.receiveShadow = true;
    this.scene.add(s1);

    // Layer 2
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(45, 4, 45), new THREE.MeshLambertMaterial({ color: 0x4a5568 }));
    s2.position.set(hx, 6, hz);
    s2.receiveShadow = true;
    this.scene.add(s2);

    // Lookout Cabin on Top
    this.addHouse(hx, hz, 0, 0x4a5568);

    // Rocks around Hill
    for (let i = 0; i < 14; i++) {
      const rx = hx + (Math.random() - 0.5) * 80;
      const rz = hz + (Math.random() - 0.5) * 80;
      this.addRock(rx, rz, 1.2 + Math.random() * 0.6);
    }
  }

  // ── 5. FACTORY / INDUSTRIAL YARD ──
  createFactory() {
    const ix = 130;
    const iz = 130;

    this.addWarehouse(ix - 15, iz - 15);
    this.addWarehouse(ix + 15, iz + 15);

    for (let i = 0; i < 10; i++) {
      this.addCrate(ix + (Math.random() - 0.5) * 40, iz + (Math.random() - 0.5) * 40);
      this.addBarrel(ix + (Math.random() - 0.5) * 40, iz + (Math.random() - 0.5) * 40);
    }
  }

  // ── 6. BLUE LAKE & BRIDGE ──
  createBlueLake() {
    const lx = 0;
    const lz = 150;

    // Lake Water Plane
    const waterGeo = new THREE.BoxGeometry(80, 0.4, 55);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x3182ce, transparent: true, opacity: 0.85 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(lx, 0.1, lz);
    this.scene.add(water);

    // Wooden Bridge across Lake
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x8c5b36 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 60), bridgeMat);
    bridge.position.set(lx, 0.6, lz);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    this.scene.add(bridge);

    // Shoreline Trees & Rocks
    this.addTree(lx - 45, lz - 20, 1.2);
    this.addTree(lx + 45, lz - 20, 1.1);
    this.addTree(lx - 45, lz + 25, 1.0);
    this.addTree(lx + 45, lz + 25, 1.2);
    this.addRock(lx - 38, lz + 10, 1.4);
    this.addRock(lx + 38, lz - 10, 1.3);
  }

  // ── SCATTERED PROPS ACROSS ENTIRE MAP ─────────────────────────────────
  createScatteredProps() {
    // Lone trees dotted all over the island
    const loneTreePositions = [
      [70, -70], [-70, 70], [100, 30], [-100, -30],
      [50, 100], [-50, -100], [80, 80], [-80, -80],
      [120, -60], [-120, 60], [30, -150], [-30, 150],
      [160, 10], [-160, -10], [0, -160]
    ];
    loneTreePositions.forEach(([x, z]) => {
      this.addTree(x + (Math.random()-0.5)*12, z + (Math.random()-0.5)*12, 0.9 + Math.random()*0.5);
    });

    // Scattered rocks everywhere
    for (let i = 0; i < 25; i++) {
      const rx = (Math.random() - 0.5) * 440;
      const rz = (Math.random() - 0.5) * 440;
      if (Math.abs(rx) < 60 && Math.abs(rz) < 60) continue; // skip village center
      this.addRock(rx, rz, 0.8 + Math.random() * 0.7);
    }

    // Abandoned cars (simple blocky shapes)
    const carPositions = [
      [60, 5], [-60, -5], [5, -80], [-5, 80], [110, -110]
    ];
    const carColor = [0x7f1d1d, 0x1e3a5f, 0x14532d, 0x451a03, 0x312e81];
    carPositions.forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * Math.PI;
      const bodyMat = new THREE.MeshLambertMaterial({ color: carColor[i] });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 9), bodyMat);
      body.position.y = 1.2;
      g.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 4.5),
        new THREE.MeshLambertMaterial({ color: carColor[i] }));
      cab.position.set(0, 2.6, -0.8);
      g.add(cab);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.7 }));
      windshield.position.set(0, 2.6, 1.4);
      g.add(windshield);
      // Wheels
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
      [[-1.9,-3],[-1.9,3],[1.9,-3],[1.9,3]].forEach(([wx,wz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.8, 8), wheelMat);
        wheel.rotation.z = Math.PI/2;
        wheel.position.set(wx, 0.65, wz);
        g.add(wheel);
      });
      this.scene.add(g);
      this.registerCollidable(x, z, 4.8, 9.5);
    });

    // Extra bushes across the map
    for (let i = 0; i < 40; i++) {
      const bx = (Math.random() - 0.5) * 420;
      const bz = (Math.random() - 0.5) * 420;
      this.addBush(bx, bz);
    }
  }
}

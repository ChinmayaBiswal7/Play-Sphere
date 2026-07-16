/* ==========================================================================
   DELHI DEFIANCE - 3D RAJDHANI MAP PROCEDURAL GEOMETRY BUILDER
   ========================================================================== */

class RajdhaniMapBuilder {
  constructor() {
    this.colliders = [];
    this.interactiveObjects = []; // Ziplines, plant zones, spike etc.
    this.plantZones = []; // { name: 'A', box: Box3 }
  }

  build(scene) {
    this.colliders = [];
    this.interactiveObjects = [];
    this.plantZones = [];

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x9a7b56, // Sandstone dust floor
      roughness: 0.9,
      metalness: 0.1
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc29b6e, // Sandstone blocks
      roughness: 0.85,
      metalness: 0.15
    });

    const techWallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Tech lab dark metal
      roughness: 0.4,
      metalness: 0.8
    });

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // wooden crates
      roughness: 0.7
    });

    const serverMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.9
    });

    // 1. Core Arena Ground Floor (150m x 150m sandbox)
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const ground = new THREE.Mesh(groundGeo, floorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // 2. Boundary Outer Walls (Height = 12m)
    const boundaries = [
      { x: 0, z: -80, w: 160, d: 4 }, // North
      { x: 0, z: 80, w: 160, d: 4 },  // South
      { x: -80, z: 0, w: 4, d: 160 }, // West
      { x: 80, z: 0, w: 4, d: 160 }   // East
    ];

    boundaries.forEach(b => {
      const mesh = this.createBlock(b.x, 5.5, b.z, b.w, 12, b.d, wallMat, scene);
      this.colliders.push(mesh);
    });

    // ── 3. MID COURTYARD ──
    // Clock Tower base structure
    const clockTower = this.createBlock(0, 10, -5, 8, 20, 8, wallMat, scene);
    this.colliders.push(clockTower);

    // Center Fountain
    const fBaseGeo = new THREE.CylinderGeometry(4, 4, 1, 16);
    const fBase = new THREE.Mesh(fBaseGeo, floorMat);
    fBase.position.set(0, 0, 10);
    scene.add(fBase);
    this.colliders.push(fBase);

    // Blue fountain core light rings
    const fWaterGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.1, 16);
    const fWaterMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8 });
    const fWater = new THREE.Mesh(fWaterGeo, fWaterMat);
    fWater.position.set(0, 0.5, 10);
    scene.add(fWater);

    // Mid pillars
    const midPillars = [
      { x: -12, z: 2 },
      { x: 12, z: 2 },
      { x: -12, z: 18 },
      { x: 12, z: 18 }
    ];
    midPillars.forEach(p => {
      const pil = this.createPillar(p.x, 2, p.z, 1.2, 5, wallMat, scene);
      this.colliders.push(pil);
    });


    // ── 4. A SITE (Ancient Palace - West) ──
    // Site A main base center at (-45, 0, -10)
    const aSiteCenter = { x: -45, z: -10 };

    // Palace Balcony (Heaven) - Height = 3.5m, players can climb
    const heavenPlatform = this.createBlock(aSiteCenter.x - 12, 3, aSiteCenter.z, 8, 0.5, 16, wallMat, scene);
    this.colliders.push(heavenPlatform);
    
    // Heaven Pillars
    this.colliders.push(this.createPillar(aSiteCenter.x - 8, 1, aSiteCenter.z - 6, 0.8, 4, wallMat, scene));
    this.colliders.push(this.createPillar(aSiteCenter.x - 8, 1, aSiteCenter.z + 6, 0.8, 4, wallMat, scene));

    // Default Plant Box (Triple Stack Crates)
    const c1 = this.createBlock(aSiteCenter.x, 0.5, aSiteCenter.z, 2, 2, 2, boxMat, scene);
    const c2 = this.createBlock(aSiteCenter.x + 2.2, 0.5, aSiteCenter.z, 2, 2, 2, boxMat, scene);
    const c3 = this.createBlock(aSiteCenter.x + 1.1, 2.5, aSiteCenter.z, 2, 2, 2, boxMat, scene);
    this.colliders.push(c1, c2, c3);

    // Sandstone Temple Pillars
    const templePillars = [
      { x: aSiteCenter.x - 5, z: aSiteCenter.z - 15 },
      { x: aSiteCenter.x + 5, z: aSiteCenter.z - 15 },
      { x: aSiteCenter.x - 5, z: aSiteCenter.z + 15 },
      { x: aSiteCenter.x + 5, z: aSiteCenter.z + 15 }
    ];
    templePillars.forEach(p => {
      const col = this.createPillar(p.x, 2.5, p.z, 1.4, 6, wallMat, scene);
      this.colliders.push(col);
    });

    // Site A Plant boundaries
    this.plantZones.push({
      name: 'A',
      box: new THREE.Box3(
        new THREE.Vector3(aSiteCenter.x - 12, -0.5, aSiteCenter.z - 12),
        new THREE.Vector3(aSiteCenter.x + 12, 4.0, aSiteCenter.z + 12)
      )
    });


    // ── 5. B SITE (Security Facility - East) ──
    // Site B main base center at (45, 0, -10)
    const bSiteCenter = { x: 45, z: -10 };

    // Metal research warehouse walls
    const bWall1 = this.createBlock(bSiteCenter.x, 4.5, bSiteCenter.z - 18, 20, 10, 2, techWallMat, scene);
    const bWall2 = this.createBlock(bSiteCenter.x - 10, 4.5, bSiteCenter.z, 2, 10, 36, techWallMat, scene);
    this.colliders.push(bWall1, bWall2);

    // Double crates
    const bC1 = this.createBlock(bSiteCenter.x + 4, 0.5, bSiteCenter.z + 4, 2.5, 2.5, 2.5, boxMat, scene);
    const bC2 = this.createBlock(bSiteCenter.x + 4, 3.0, bSiteCenter.z + 4, 2.2, 2.2, 2.2, boxMat, scene);
    this.colliders.push(bC1, bC2);

    // Tech server rack meshes (Black blocks with neon blue stripes)
    const server1 = this.createBlock(bSiteCenter.x - 6, 2.5, bSiteCenter.z - 8, 1.5, 5, 4, serverMat, scene);
    const server2 = this.createBlock(bSiteCenter.x - 6, 2.5, bSiteCenter.z + 8, 1.5, 5, 4, serverMat, scene);
    this.colliders.push(server1, server2);

    // Server glow lines
    const glow1 = this.createBlock(bSiteCenter.x - 5.15, 2.5, bSiteCenter.z - 8, 0.1, 4.5, 0.1, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);
    const glow2 = this.createBlock(bSiteCenter.x - 5.15, 2.5, bSiteCenter.z + 8, 0.1, 4.5, 0.1, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);

    // Site B Plant boundaries
    this.plantZones.push({
      name: 'B',
      box: new THREE.Box3(
        new THREE.Vector3(bSiteCenter.x - 10, -0.5, bSiteCenter.z - 10),
        new THREE.Vector3(bSiteCenter.x + 10, 4.0, bSiteCenter.z + 10)
      )
    });


    // ── 6. CONNECTORS & INTERCONNECTED LANES ──
    // Partition Walls separating Spawns, Sites, and Mid
    const partitions = [
      // Attacker Spawn to A Main
      { x: -35, z: 40, w: 2, d: 35 },
      // Attacker Spawn to B Main
      { x: 35, z: 40, w: 2, d: 35 },
      // Mid to A Short connector
      { x: -25, z: 0, w: 18, d: 2 },
      // Mid to B Short connector
      { x: 25, z: 0, w: 18, d: 2 },
      // Defender Spawn to A Link
      { x: -30, z: -40, w: 2, d: 30 },
      // Defender Spawn to B Link
      { x: 30, z: -40, w: 2, d: 30 }
    ];

    partitions.forEach(p => {
      const mesh = this.createBlock(p.x, 3.5, p.z, p.w, 8, p.d, wallMat, scene);
      this.colliders.push(mesh);
    });

    // ── 7. LIGHTING SETUP ──
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.65);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffeacc, 0.85);
    sunLight.position.set(-40, 60, -20);
    sunLight.castShadow = true;
    scene.add(sunLight);
  }

  createBlock(x, y, z, w, h, d, mat, scene) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  createPillar(x, y, z, r, h, mat, scene) {
    const geo = new THREE.CylinderGeometry(r, r, h, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Returns true if coordinates are inside either A or B plant zones
  getPlantZone(positionVector) {
    for (const zone of this.plantZones) {
      if (zone.box.containsPoint(positionVector)) {
        return zone.name;
      }
    }
    return null;
  }
}

window.RajdhaniMap = new RajdhaniMapBuilder();

/* ==========================================================================
   DELHI DEFIANCE — RAJDHANI MAP (BLUEPRINT-ACCURATE BUILD)
   Coordinate system: Blueprint (0,0)=Bottom-Left, +X=East, +Y=North
   Three.js:  x = bpX - 75   (left-right)
              z = 75 - bpY   (south=+Z / north=-Z)
              y = elevation (up)
   ========================================================================== */

class RajdhaniMapBuilder {
  constructor() {
    this.colliders = [];
    this.interactiveObjects = [];
    this.plantZones = [];
    this.ambientSoundInitialized = false;
    this.WH = 5;    // standard wall height
    this.CH = 1.5;  // low-cover height
  }

  // Blueprint to Three.js helper
  bp(bx, by) { return { x: bx - 75, z: 75 - by }; }

  build(scene) {
    this.colliders = [];
    this.interactiveObjects = [];
    this.plantZones = [];

    /* ─── MATERIAL PALETTE ─────────────────────────────────── */
    const sandMat    = new THREE.MeshStandardMaterial({ color: 0xc4a97e, roughness: 0.9 });
    const darkSand   = new THREE.MeshStandardMaterial({ color: 0x8a6d4a, roughness: 0.9 });
    const templeMat  = new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 0.9 });
    const techMat    = new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.3, metalness: 0.8 });
    const concMat    = new THREE.MeshStandardMaterial({ color: 0x787878, roughness: 0.85 });
    const woodMat    = new THREE.MeshStandardMaterial({ color: 0xb8651a, roughness: 0.8 });
    const metalMat   = new THREE.MeshStandardMaterial({ color: 0x3d4e63, roughness: 0.4, metalness: 0.7 });
    const greenMetal = new THREE.MeshStandardMaterial({ color: 0x2d5219, roughness: 0.55, metalness: 0.6 });
    const marbleMat  = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.35, metalness: 0.1 });
    const brickMat   = new THREE.MeshStandardMaterial({ color: 0x7a3b1e, roughness: 0.9 });

    /* ─── GROUND FLOORS (zoned by area) ──────────────────────── */
    // Main ground canvas
    const gMain = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), sandMat.clone());
    gMain.rotation.x = -Math.PI / 2; gMain.position.y = -0.5; gMain.receiveShadow = true;
    scene.add(gMain);

    // Zone-specific floor tints
    this.floorTile( 45, -17, 28, 24, new THREE.MeshStandardMaterial({ color: 0x9b6040, roughness: 0.65 }), scene); // A Site
    this.floorTile(-45, -17, 28, 24, new THREE.MeshStandardMaterial({ color: 0x4a6055, roughness: 0.65 }), scene); // B Site
    this.floorTile(  0,  -3, 34, 28, new THREE.MeshStandardMaterial({ color: 0xbba070, roughness: 0.45 }), scene); // Mid Plaza
    this.floorTile(  0,  67, 28, 16, techMat.clone(), scene); // ATK Spawn
    this.floorTile(  0, -67, 28, 14, techMat.clone(), scene); // DEF Spawn

    /* ─── 1. OUTER BOUNDARY WALLS ─────────────────────────────── */
    this.W(    0, -75, 160, 8, 1, sandMat, scene);  // North
    this.W(    0,  75, 160, 8, 1, sandMat, scene);  // South
    this.W(  -75,   0,   1, 8, 160, sandMat, scene); // West
    this.W(   75,   0,   1, 8, 160, sandMat, scene); // East

    /* ─── 2. ATTACKER SPAWN ROOM ──────────────────────────────── */
    // Center (0, 67), 26x14, Z:60-74, X:-13 to 13
    this.W(   0, 74, 28, this.WH, 1, techMat, scene); // S wall
    this.W( -14, 67,  1, this.WH,14, techMat, scene); // W wall
    this.W(  14, 67,  1, this.WH,14, techMat, scene); // E wall
    // N wall with three exit gaps (left ~x=-9, mid ~x=0, right ~x=9)
    this.W(-11, 60,  4, this.WH, 1, techMat, scene); // W segment
    this.W( 11, 60,  4, this.WH, 1, techMat, scene); // E segment
    // (middle ~8m gap for mid tunnel, so no center segment)

    // ATK Spawn props
    this.block( 0, 1.5, 71,  8, 2.2, 0.3, new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8 }), scene); // billboard
    this.addCover( 5, 63, this.CH, woodMat, scene);
    this.addCover(-5, 63, this.CH, woodMat, scene);
    this.block( 0, 0.6, 66,  8, 0.3, 4, new THREE.MeshStandardMaterial({ color: 0x22ff22, roughness: 1 }), scene); // buy zone

    /* ─── 3. ATK → B MAIN (left branch connection) ──────────── */
    // Hallway going west from ATK spawn left side: X: -14 to -30, Z: 57-63
    this.W(-22, 57, 16, this.WH, 1, darkSand, scene); // top
    this.W(-22, 63, 16, this.WH, 1, darkSand, scene); // bottom
    this.W(-30, 60,  1, this.WH, 6, darkSand, scene); // end cap (connects to B Main right wall)

    /* ─── 4. B MAIN CORRIDOR ─────────────────────────────────── */
    // NS corridor, center X=-35, width 8m, Z: -2 to 57
    // Left outer wall
    this.W(-39, 27.5, 1, this.WH, 59, brickMat, scene);
    // Right wall (inner, has gap where B Link connects at Z: -7 to -17)
    // Top segment (Z:-2 to -5): right inner wall north of B Link
    this.W(-31, -3.5, 1, this.WH, 5, sandMat, scene);
    // Bottom segment (Z:5 to 57): right inner wall south of B Link
    this.W(-31, 31, 1, this.WH, 52, sandMat, scene);

    // B Main props / cover
    this.addCover(-35, 48, this.CH, woodMat,  scene);
    this.addCover(-35, 35, this.CH, concMat,  scene);
    this.addCover(-35, 20, this.CH, woodMat,  scene);
    this.addCover(-35,  8, this.CH, concMat,  scene);
    // Rickshaw prop
    this.block(-37, 0.6, 42, 1.8, 1.2, 4.5, new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }), scene);
    // Broken bus
    this.block(-33, 1.2, 28, 2.4, 2.2, 7, techMat, scene);
    scene.add(this.makeColliderAt(-33, 1.2, 28, 2.4, 2.2, 7, scene));

    /* ─── 5. ATK → A MAIN (right branch connection) ─────────── */
    this.W( 22, 57, 16, this.WH, 1, darkSand, scene);
    this.W( 22, 63, 16, this.WH, 1, darkSand, scene);
    this.W( 30, 60,  1, this.WH, 6, darkSand, scene);

    /* ─── 6. A MAIN CORRIDOR ─────────────────────────────────── */
    // NS corridor, center X=35, width 8m, Z: -2 to 57
    this.W( 39, 27.5, 1, this.WH, 59, brickMat, scene); // Right outer
    this.W( 31, -3.5, 1, this.WH,  5, sandMat, scene);  // Left inner north of A Link
    this.W( 31, 31,   1, this.WH, 52, sandMat, scene);  // Left inner south

    // A Main props
    this.addCover(35, 48, this.CH, woodMat, scene);
    this.addCover(35, 35, this.CH, concMat, scene);
    this.addCover(35, 20, this.CH, woodMat, scene);
    this.addCover(35,  8, this.CH, concMat, scene);
    // Cars
    this.block(37, 0.7, 42, 2, 1.5, 4.5, concMat.clone(), scene);
    this.block(33, 0.7, 28, 2, 1.5, 4.5, concMat.clone(), scene);
    // Food stall
    this.block(33, 1.0, 18, 3, 2.0, 0.4, woodMat.clone(), scene);

    /* ─── 7. MID TUNNEL (underground) ───────────────────────── */
    // NS corridor, X: -4 to 4, Z: 14 to 57 (mouth to mid)
    this.W(-4.5, 35.5, 1, 3.5, 43, techMat, scene); // Left wall
    this.W( 4.5, 35.5, 1, 3.5, 43, techMat, scene); // Right wall
    // Tunnel ceiling
    const tunCeil = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 43), techMat);
    tunCeil.position.set(0, 2.85, 35.5); scene.add(tunCeil);
    // Neon guide strip
    this.neonLine(0, 2.7, 35.5,  9.5, 0.06, 43, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);
    // Tunnel cover and break wall
    this.addCover(-2, 48, this.CH, concMat, scene);
    this.addCover( 2, 24, this.CH, concMat, scene);

    /* ─── 8. MID PLAZA ──────────────────────────────────────── */
    // Center (0,-3), roughly 34x28m. X:-17 to 17, Z:-17 to 11
    // West wall (has B Link gap at Z: -7 to -17)
    this.W(-17,  4, 1, this.WH, 14, sandMat, scene);  // SW segment (Z:4 to 11 approx, south of B Link)
    this.W(-17,-12, 1, this.WH,  6, sandMat, scene);  // NW segment (Z:-12 to -17 approx)
    // East wall (has A Link gap)
    this.W( 17,  4, 1, this.WH, 14, sandMat, scene);  // SE segment
    this.W( 17,-12, 1, this.WH,  6, sandMat, scene);  // NE segment
    // South wall (has mid-tunnel gap width ~9m at center)
    this.W(-10, 11, 14, this.WH, 1, sandMat, scene);  // SW
    this.W( 10, 11, 14, this.WH, 1, sandMat, scene);  // SE
    // North wall (has connector gap to Mid Tower)
    this.W(-7, -17, 10, this.WH, 1, sandMat, scene);  // NW
    this.W( 7, -17, 10, this.WH, 1, sandMat, scene);  // NE

    // Mid Plaza — Central Fountain / Statue
    this.colliders.push(this.createPillar(0, 0, -3, 3.8, 1.2, marbleMat, scene));
    const cenStatue = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xd4b080, roughness: 0.3, metalness: 0.2 }));
    cenStatue.position.set(0, 1.8, -3); scene.add(cenStatue);

    // Market stall covers
    this.addCover(-9, -9, this.CH, woodMat, scene);
    this.addCover( 9, -9, this.CH, woodMat, scene);
    this.addCover(-9,  4, this.CH, woodMat, scene);
    this.addCover( 9,  4, this.CH, woodMat, scene);
    this.createStreetLamp(0, 0, scene);

    /* ─── 9. MID → MID TOWER CONNECTOR ─────────────────────── */
    // Narrow passage north of Mid: X:-5 to 5, Z:-17 to -27
    this.W(-5, -22, 1, this.WH, 10, sandMat, scene);
    this.W( 5, -22, 1, this.WH, 10, sandMat, scene);

    /* ─── 10. MID TOWER ─────────────────────────────────────── */
    // Building at (0,-33), 16x14m, 3-floor height=10m
    this.W( -8, -33, 1, 10, 14, techMat, scene); // W wall
    this.W(  8, -33, 1, 10, 14, techMat, scene); // E wall
    this.W(  0, -40, 16, 10,  1, techMat, scene); // N wall
    // S wall with center 4m door gap
    this.W( -6, -27, 4, 10,  1, techMat, scene);
    this.W(  6, -27, 4, 10,  1, techMat, scene);
    // Floor 2 balcony slab at y=4m
    const towerBal = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), techMat);
    towerBal.position.set(0, 4.5, -33); scene.add(towerBal);
    this.colliders.push(towerBal);
    // Sniper window on south face (slit opening — visually only)
    // Balcony south railing
    const tBRail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 0.25), metalMat);
    tBRail.position.set(0, 5.2, -27); scene.add(tBRail);

    /* ─── 11. B LINK ─────────────────────────────────────────── */
    // EW corridor, Z center =-12, width 8m, X:-17 to -33
    this.W(-25,  -7, 16, this.WH, 1, sandMat, scene); // North wall
    this.W(-25, -17, 16, this.WH, 1, sandMat, scene); // South wall
    this.addCover(-20, -12, this.CH, woodMat, scene);
    this.addCover(-30, -12, this.CH, concMat, scene);

    /* ─── 12. A LINK ─────────────────────────────────────────── */
    this.W( 25,  -7, 16, this.WH, 1, sandMat, scene);
    this.W( 25, -17, 16, this.WH, 1, sandMat, scene);
    this.addCover(20, -12, this.CH, woodMat, scene);
    this.addCover(30, -12, this.CH, concMat, scene);

    /* ─── 13. A SITE ─────────────────────────────────────────── */
    // Center (45,-17), 26x22m → X:32 to 58, Z:-28 to -6
    this.plantZones.push({
      name: 'A',
      box: new THREE.Box3(new THREE.Vector3(33,-1,-27), new THREE.Vector3(57,5,-7))
    });
    this.siteRing(45, -17, 0xff3366, scene);

    // Site A walls (entrance from A Link on west, open south-ish corridor)
    this.W(32, -17, 1, this.WH, 22, sandMat, scene); // W wall (faces Mid, but gap for A Link entry)
    this.W(58, -17, 1, this.WH, 22, sandMat, scene); // E wall (back site)
    this.W(45, -28, 26, this.WH, 1, sandMat, scene); // N back wall
    // S wall with entry gap (west-most 8m gap for link, rest is wall)
    this.W(52, -6, 10, this.WH, 1, sandMat, scene); // eastern S segment
    // West gap (entry from A Link) is at X: 32-39, no wall here

    // A Site props
    this.addCover(48, -14, 2.5, techMat, scene);  // Generator
    this.neonLine(48, 2.5, -14, 3.5, 0.1, 4, new THREE.MeshBasicMaterial({ color: 0xff3366 }), scene);
    this.createTruck(51, -22, greenMetal, scene);  // Truck
    this.templeArch(56, -13, templeMat, scene);    // Temple entrance
    // Statue
    this.colliders.push(this.createPillar(43, 1.8, -16, 0.7, 3.5, templeMat, scene));
    // Triple box stack
    this.addCover(37, -21, 1.2, woodMat, scene);
    this.block(37, 1.8, -21, 1.5, 1.2, 1.5, woodMat.clone(), scene);
    // Pillars
    this.colliders.push(this.createPillar(42, 2.5, -8, 0.5, 5, templeMat, scene));
    this.colliders.push(this.createPillar(52, 2.5, -8, 0.5, 5, templeMat, scene));
    // Sandbags at default plant
    this.addCover(44, -19, this.CH, concMat, scene);
    this.addCover(46, -23, this.CH, concMat, scene);
    // Extra cover
    this.addCover(54, -12, this.CH, metalMat, scene);
    this.addCover(36, -12, this.CH, woodMat, scene);

    /* ─── 14. B SITE ─────────────────────────────────────────── */
    // Center (-45,-17), 26x22m → X:-58 to -32, Z:-28 to -6
    this.plantZones.push({
      name: 'B',
      box: new THREE.Box3(new THREE.Vector3(-57,-1,-27), new THREE.Vector3(-33,5,-7))
    });
    this.siteRing(-45, -17, 0x00d2ff, scene);

    this.W(-32, -17, 1, this.WH, 22, sandMat, scene);
    this.W(-58, -17, 1, this.WH, 22, sandMat, scene);
    this.W(-45, -28, 26, this.WH, 1, sandMat, scene);
    this.W(-52,  -6, 10, this.WH, 1, sandMat, scene); // eastern S segment

    // B Site props
    this.block(-49, 1.1, -21, 2.4, 2.2, 8, techMat.clone(), scene); // Broken Bus
    scene.add(this.makeColliderAt(-49, 1.2, -21, 2.5, 2.2, 8, scene));
    this.addCover(-40, -20, 1.2, woodMat, scene);  // Boxes
    this.block(-40, 1.8, -20, 1.5, 1.2, 1.5, woodMat.clone(), scene);
    this.colliders.push(this.createPillar(-41, 1.5, -25, 2.5, 3, metalMat, scene)); // Water Tank
    this.templeArch(-56, -13, templeMat, scene); // Temple Gate
    this.addCover(-44, -19, this.CH, concMat, scene);
    this.addCover(-46, -23, this.CH, concMat, scene);
    this.addCover(-54, -12, this.CH, metalMat, scene);
    this.addCover(-36, -12, this.CH, woodMat, scene);
    this.colliders.push(this.createPillar(-42, 2.5, -8, 0.5, 5, templeMat, scene));
    this.colliders.push(this.createPillar(-52, 2.5, -8, 0.5, 5, templeMat, scene));

    /* ─── 15. A HEAVEN (elevation: 5m) ──────────────────────── */
    // Platform at (45,-37), 20x12m
    const aHeavenSlab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 12), darkSand);
    aHeavenSlab.position.set(45, 4.7, -37); scene.add(aHeavenSlab);
    this.colliders.push(aHeavenSlab);
    // Railing on south (overlooking A Site)
    const aRailS = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.25), metalMat);
    aRailS.position.set(45, 5.3, -31.5); scene.add(aRailS);
    // Back wall
    const aHeavBackW = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 1), sandMat);
    aHeavBackW.position.set(45, 6.0, -43); scene.add(aHeavBackW);
    this.colliders.push(aHeavBackW);
    // Stairs leading up from A Main top
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1), sandMat);
      step.position.set(58, i * 0.9, -32 - i); scene.add(step);
      this.colliders.push(step);
    }
    // AC Units on roof
    this.block(40, 5.6, -42, 2, 1, 2, techMat.clone(), scene);
    this.block(50, 5.6, -42, 2, 1, 2, techMat.clone(), scene);

    /* ─── 16. B HEAVEN (elevation: 5m) ──────────────────────── */
    const bHeavenSlab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 12), darkSand);
    bHeavenSlab.position.set(-45, 4.7, -37); scene.add(bHeavenSlab);
    this.colliders.push(bHeavenSlab);
    const bRailS = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.25), metalMat);
    bRailS.position.set(-45, 5.3, -31.5); scene.add(bRailS);
    const bHeavBackW = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 1), templeMat);
    bHeavBackW.position.set(-45, 6.0, -43); scene.add(bHeavBackW);
    this.colliders.push(bHeavBackW);
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1), sandMat);
      step.position.set(-58, i * 0.9, -32 - i); scene.add(step);
      this.colliders.push(step);
    }
    this.block(-40, 5.6, -42, 2, 1, 2, techMat.clone(), scene);
    this.block(-50, 5.6, -42, 2, 1, 2, techMat.clone(), scene);

    /* ─── 17. DEFENDER SPAWN ─────────────────────────────────── */
    // Center (0,-67), 28x14m, Z:-74 to -60
    this.W(   0, -74, 30, this.WH,  1, techMat, scene); // N wall
    this.W( -15, -67,  1, this.WH, 14, techMat, scene); // W wall
    this.W(  15, -67,  1, this.WH, 14, techMat, scene); // E wall
    // S wall with 3 exits at X:±23 and X:0
    this.W(  -8, -60, 10, this.WH,  1, techMat, scene); // W segment (gap at 0)
    this.W(   8, -60, 10, this.WH,  1, techMat, scene); // E segment

    // DEF spawn props
    this.addCover( 0, -70, 2.5, techMat, scene); // Server rack
    this.neonLine( 0, 2.6, -70, 6, 0.1, 3.5, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);
    this.block(10, 1.5, -68, 3, 2.5, 3.5, techMat.clone(), scene); // Generator
    this.block(-10, 0.6, -68, 2, 1.0, 0.5, metalMat.clone(), scene); // Weapon display

    /* ─── 18. DEF SIDE CONNECTORS → HEAVENS ─────────────────── */
    // Left corridor: X:-14 to -26, Z:-60 to -45
    this.W(-14, -52, 1, this.WH, 15, techMat, scene);
    this.W(-26, -52, 1, this.WH, 15, techMat, scene);
    // Right corridor
    this.W( 14, -52, 1, this.WH, 15, techMat, scene);
    this.W( 26, -52, 1, this.WH, 15, techMat, scene);

    /* ─── 19. MID TOWER SIDE WINGS → HEAVEN ACCESS ──────────── */
    // Left wing: X:-8 to -20, Z:-36 to -50
    this.W(-14, -43, 1, this.WH, 14, sandMat, scene);
    this.W( -8, -43, 1, this.WH, 14, sandMat, scene);
    // Right wing
    this.W( 14, -43, 1, this.WH, 14, sandMat, scene);
    this.W(  8, -43, 1, this.WH, 14, sandMat, scene);
    // Horizontal closers
    this.W(-11, -50, 6, this.WH, 1, sandMat, scene);
    this.W( 11, -50, 6, this.WH, 1, sandMat, scene);

    /* ─── 20. INTERIOR STREET LAMPS ─────────────────────────── */
    this.createStreetLamp(-35, 52, scene);
    this.createStreetLamp( 35, 52, scene);
    this.createStreetLamp(  0, 25, scene);
    this.createStreetLamp(-35, 18, scene);
    this.createStreetLamp( 35, 18, scene);
    this.createStreetLamp( 45, -17, scene);
    this.createStreetLamp(-45, -17, scene);
    this.createStreetLamp(  0, -33, scene);

    /* ─── 21. NEON BILLBOARD SIGNS ───────────────────────────── */
    this.neonBillboard( 45, 4, -6, 0xff3366, scene); // A entrance
    this.neonBillboard(-45, 4, -6, 0x00d2ff, scene); // B entrance
    this.neonBillboard(  0, 4, 12, 0xffcc00, scene); // Mid Market

    /* ─── 22. LIGHTING SETUP ─────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x1a1020, 0.5));

    const hemi = new THREE.HemisphereLight(0xffb36b, 0x1e293b, 0.7);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    // Warm directional sun (dusk)
    const sun = new THREE.DirectionalLight(0xff8c42, 1.1);
    sun.position.set(-45, 55, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const sc = 85;
    sun.shadow.camera.left = -sc; sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc; sun.shadow.camera.bottom = -sc;
    sun.shadow.camera.far = 200;
    scene.add(sun);

    // Site point lights
    const pA = new THREE.PointLight(0xff3366, 2.0, 38); pA.position.set(45, 5, -17); scene.add(pA);
    const pB = new THREE.PointLight(0x00d2ff, 2.0, 38); pB.position.set(-45, 5, -17); scene.add(pB);
    const pM = new THREE.PointLight(0xffcc44, 1.3, 30); pM.position.set(0, 6, -3); scene.add(pM);
    const pT = new THREE.PointLight(0x00d2ff, 1.0, 28); pT.position.set(0, 2, 35); scene.add(pT);
    const pD = new THREE.PointLight(0x4466ff, 1.2, 25); pD.position.set(0, 4, -67); scene.add(pD);

    // Dusk fog
    scene.fog = new THREE.FogExp2(0x110820, 0.013);

    // Ambient audio
    this.initAmbianceAudio();
  }

  /* ══ WALL HELPER (auto-collider) ════════════════════════════
     cx, cz = center (Three.js), w = X-size, h = Y-height, d = Z-size
     elev = base Y offset (default 0 = ground level)             */
  W(cx, cz, w, h, d, mat, scene, elev = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, elev + h / 2 - 0.5, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.colliders.push(mesh);
    return mesh;
  }

  /* ══ DECORATIVE BLOCK (no auto-collider) ═════════════════ */
  block(x, y, z, w, h, d, mat, scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y - 0.5, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  /* ══ FLOOR TILE ══════════════════════════════════════════ */
  floorTile(cx, cz, w, d, mat, scene) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, -0.49, cz);
    scene.add(mesh);
  }

  /* ══ PILLAR ══════════════════════════════════════════════ */
  createPillar(x, y, z, r, h, mat, scene) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat);
    mesh.position.set(x, y - 0.5, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  /* ══ LOW COVER ════════════════════════════════════════════ */
  addCover(x, z, h, mat, scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, h, 2.0), mat);
    mesh.position.set(x, h / 2 - 0.5, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    this.colliders.push(mesh);
    return mesh;
  }

  /* ══ INVISIBLE COLLIDER BOX ══════════════════════════════ */
  makeColliderAt(x, y, z, w, h, d, scene) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mesh.position.set(x, y - 0.5, z);
    scene.add(mesh);
    this.colliders.push(mesh);
    return mesh;
  }

  /* ══ NEON LINE / STRIP ════════════════════════════════════ */
  neonLine(x, y, z, w, h, d, mat, scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }

  /* ══ SITE RING MARKER ════════════════════════════════════ */
  siteRing(cx, cz, color, scene) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(9.5, 10, 32),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, -0.47, cz);
    scene.add(ring);
  }

  /* ══ TEMPLE ARCH ══════════════════════════════════════════ */
  templeArch(cx, cz, mat, scene) {
    const p1 = this.createPillar(cx - 2, 2.5, cz, 0.6, 5, mat, scene);
    const p2 = this.createPillar(cx + 2, 2.5, cz, 0.6, 5, mat, scene);
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1, 0.8), mat);
    top.position.set(cx, 5.0, cz); scene.add(top);
    this.colliders.push(p1, p2);
  }

  /* ══ TRUCK PROP ═══════════════════════════════════════════ */
  createTruck(cx, cz, mat, scene) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 6), mat);
    chassis.position.set(cx, 0.9, cz); chassis.castShadow = true; scene.add(chassis);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1a2436, metalness: 0.8 }));
    cabin.position.set(cx, 2.6, cz - 1.8); cabin.castShadow = true; scene.add(cabin);
    this.colliders.push(this.makeColliderAt(cx, 1.8, cz, 2.6, 3.6, 6.2, scene));
  }

  /* ══ STREET LAMP ═════════════════════════════════════════ */
  createStreetLamp(x, z, scene) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9 }));
    post.position.set(x, 2.5, z); scene.add(post);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
    glow.position.set(x, 5.5, z); scene.add(glow);
    const light = new THREE.PointLight(0xffbb33, 0.9, 14);
    light.position.set(x, 5.3, z); scene.add(light);
  }

  /* ══ NEON BILLBOARD ══════════════════════════════════════ */
  neonBillboard(cx, y, cz, color, scene) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0d1117, metalness: 0.8 }));
    board.position.set(cx, y, cz); scene.add(board);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.5, 0.4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    glow.position.set(cx, y, cz); scene.add(glow);
  }

  /* ══ AMBIENT AUDIO (procedural) ═════════════════════════ */
  initAmbianceAudio() {
    if (this.ambientSoundInitialized) return;
    this.ambientSoundInitialized = true;
    setInterval(() => {
      if (window.FPSState.gameState !== 'GAMEPLAY') return;
      if (!window.SynthAudio?.ctx || window.SynthAudio.ctx.state === 'suspended') return;
      const ctx = window.SynthAudio.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(55 + Math.random() * 15, t);
      gain.gain.setValueAtTime(0.008, t);
      gain.gain.linearRampToValueAtTime(0.02, t + 2.0);
      gain.gain.linearRampToValueAtTime(0.001, t + 4.0);
      osc.connect(gain); gain.connect(window.SynthAudio.masterGain);
      osc.start(t); osc.stop(t + 4.0);
      if (Math.random() < 0.2) this.synthesizeTempleBell(ctx, t);
    }, 4500);
  }

  synthesizeTempleBell(ctx, t) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 3.0);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
    osc.connect(gain); gain.connect(window.SynthAudio.masterGain);
    osc.start(t); osc.stop(t + 3.0);
  }

  getPlantZone(pos) {
    for (const z of this.plantZones) {
      if (z.box.containsPoint(pos)) return z.name;
    }
    return null;
  }
}

window.RajdhaniMap = new RajdhaniMapBuilder();

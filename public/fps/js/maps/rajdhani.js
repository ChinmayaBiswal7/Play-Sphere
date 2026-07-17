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

    // Generate Procedural Textures
    const floorTexture = this.createSandStoneTexture();
    const stuccoAtk = this.createPlasterBrickTexture('#0ea5e9', false);
    const stuccoDef = this.createPlasterBrickTexture('#1e1b4b', true); // Navy blue tech brick
    const stuccoMid = this.createPlasterBrickTexture('#f59e0b', false); // Saffron Gold plaster
    const stuccoSiteA = this.createPlasterBrickTexture('#ef4444', true); // Ruby Red brick
    const stuccoSiteB = this.createPlasterBrickTexture('#3b82f6', true); // Cobalt Blue brick
    const stuccoMain = this.createPlasterBrickTexture('#84cc16', false); // Lime Green stucco

    const sandMat    = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.85 }); // Paved sand/stone floor
    const darkSand   = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.8 });  // Indigo accent lanes
    const templeMat  = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.85 }); // Ancient Crimson wood
    const techMat    = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 }); // Dark navy tech carbon
    const concMat    = new THREE.MeshStandardMaterial({ color: 0xa21caf, roughness: 0.65 }); // Bright magenta cover
    const woodMat    = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.75 }); // Safety Orange wood
    const metalMat   = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.35, metalness: 0.8 }); // Neon Cyan metal
    const greenMetal = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55, metalness: 0.75 }); // Emerald Green metal
    const marbleMat  = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });  // White Polished Marble
    const brickMat   = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.8 });  // Cyber Pink brick

    // --- Vibrant AAA Esports Plaster Palette ---
    const colorAtk   = new THREE.MeshStandardMaterial({ map: stuccoAtk, roughness: 0.75 }); // Attacker Cyan/Teal
    const colorDef   = new THREE.MeshStandardMaterial({ map: stuccoDef, roughness: 0.75 }); // Defender Royal Navy
    const colorMid   = new THREE.MeshStandardMaterial({ map: stuccoMid, roughness: 0.8 });  // Mid Saffron/Gold
    const colorSiteA = new THREE.MeshStandardMaterial({ map: stuccoSiteA, roughness: 0.8 });  // A Site Ruby Red
    const colorSiteB = new THREE.MeshStandardMaterial({ map: stuccoSiteB, roughness: 0.8 });  // B Site Cobalt Blue
    const colorMain  = new THREE.MeshStandardMaterial({ map: stuccoMain, roughness: 0.8 });  // Lanes Lime Green

    /* ─── GROUND FLOORS (zoned by area) ──────────────────────── */
    // Main ground canvas
    const gMain = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), sandMat.clone());
    gMain.rotation.x = -Math.PI / 2; gMain.position.y = -0.5; gMain.receiveShadow = true;
    scene.add(gMain);

    // Zone-specific floor tints
    this.floorTile( 45, -17, 28, 24, new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 }), scene); // A Site Red
    this.floorTile(-45, -17, 28, 24, new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 }), scene); // B Site Blue
    this.floorTile(  0,  -3, 34, 28, new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }), scene); // Mid Gold
    this.floorTile(  0,  67, 28, 16, colorAtk.clone(), scene); // ATK Spawn Teal
    this.floorTile(  0, -67, 28, 14, colorDef.clone(), scene); // DEF Spawn Navy

    /* ─── 1. OUTER BOUNDARY WALLS ─────────────────────────────── */
    this.W(    0, -75, 160, 8, 1, sandMat, scene);  // North
    this.W(    0,  75, 160, 8, 1, sandMat, scene);  // South
    this.W(  -75,   0,   1, 8, 160, sandMat, scene); // West
    this.W(   75,   0,   1, 8, 160, sandMat, scene); // East

    /* ─── 2. ATTACKER SPAWN ROOM ──────────────────────────────── */
    // Center (0, 67), 26x14, Z:60-74, X:-13 to 13
    this.W(   0, 74, 28, this.WH, 1, colorAtk, scene); // S wall
    this.W( -14, 67,  1, this.WH,14, colorAtk, scene); // W wall
    this.W(  14, 67,  1, this.WH,14, colorAtk, scene); // E wall
    // N wall with three exit gaps (left ~x=-9, mid ~x=0, right ~x=9)
    this.W(-11, 60,  4, this.WH, 1, colorAtk, scene); // W segment
    this.W( 11, 60,  4, this.WH, 1, colorAtk, scene); // E segment
    // (middle ~8m gap for mid tunnel, so no center segment)

    // ATK Spawn props
    this.block( 0, 1.5, 71,  8, 2.2, 0.3, new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8 }), scene); // billboard
    this.addCover( 5, 63, this.CH, woodMat, scene);
    this.addCover(-5, 63, this.CH, woodMat, scene);
    this.block( 0, 0.6, 66,  8, 0.3, 4, new THREE.MeshStandardMaterial({ color: 0x22ff22, roughness: 1 }), scene); // buy zone

    /* ─── 3. ATK → B MAIN (left branch connection) ──────────── */
    // Hallway going west from ATK spawn left side: X: -14 to -30, Z: 57-63
    this.W(-22, 57, 16, this.WH, 1, colorMain, scene); // top
    this.W(-22, 63, 16, this.WH, 1, colorMain, scene); // bottom
    this.W(-30, 60,  1, this.WH, 6, colorMain, scene); // end cap (connects to B Main right wall)

    /* ─── 4. B MAIN CORRIDOR ─────────────────────────────────── */
    // NS corridor, center X=-35, width 8m, Z: -2 to 57
    // Left outer wall
    this.W(-39, 27.5, 1, this.WH, 59, colorSiteB, scene);
    // Right wall (inner, has gap where B Link connects at Z: -7 to -17)
    // Top segment (Z:-2 to -5): right inner wall north of B Link
    this.W(-31, -3.5, 1, this.WH, 5, colorMain, scene);
    // Bottom segment (Z:5 to 57): right inner wall south of B Link
    this.W(-31, 31, 1, this.WH, 52, colorMain, scene);

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
    this.W( 22, 57, 16, this.WH, 1, colorMain, scene);
    this.W( 22, 63, 16, this.WH, 1, colorMain, scene);
    this.W( 30, 60,  1, this.WH, 6, colorMain, scene);

    /* ─── 6. A MAIN CORRIDOR ─────────────────────────────────── */
    // NS corridor, center X=35, width 8m, Z: -2 to 57
    this.W( 39, 27.5, 1, this.WH, 59, colorSiteA, scene); // Right outer
    this.W( 31, -3.5, 1, this.WH,  5, colorMain, scene);  // Left inner north of A Link
    this.W( 31, 31,   1, this.WH, 52, colorMain, scene);  // Left inner south

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
    this.W(-4.5, 35.5, 1, 3.5, 43, colorDef, scene); // Left wall
    this.W( 4.5, 35.5, 1, 3.5, 43, colorDef, scene); // Right wall
    // Tunnel ceiling
    const tunCeil = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 43), colorDef);
    tunCeil.position.set(0, 2.85, 35.5); scene.add(tunCeil);
    // Neon guide strip
    this.neonLine(0, 2.7, 35.5,  9.5, 0.06, 43, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);
    // Tunnel cover and break wall
    this.addCover(-2, 48, this.CH, concMat, scene);
    this.addCover( 2, 24, this.CH, concMat, scene);

    /* ─── 8. MID PLAZA ──────────────────────────────────────── */
    // Center (0,-3), roughly 34x28m. X:-17 to 17, Z:-17 to 11
    // West wall (has B Link gap at Z: -7 to -17)
    this.W(-17,  4, 1, this.WH, 14, colorMid, scene);  // SW segment (Z:4 to 11 approx, south of B Link)
    this.W(-17,-12, 1, this.WH,  6, colorMid, scene);  // NW segment (Z:-12 to -17 approx)
    // East wall (has A Link gap)
    this.W( 17,  4, 1, this.WH, 14, colorMid, scene);  // SE segment
    this.W( 17,-12, 1, this.WH,  6, colorMid, scene);  // NE segment
    // South wall (has mid-tunnel gap width ~9m at center)
    this.W(-10, 11, 14, this.WH, 1, colorMid, scene);  // SW
    this.W( 10, 11, 14, this.WH, 1, colorMid, scene);  // SE
    // North wall (has connector gap to Mid Tower)
    this.W(-7, -17, 10, this.WH, 1, colorMid, scene);  // NW
    this.W( 7, -17, 10, this.WH, 1, colorMid, scene);  // NE

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
    this.W(-5, -22, 1, this.WH, 10, colorMid, scene);
    this.W( 5, -22, 1, this.WH, 10, colorMid, scene);

    /* ─── 10. MID TOWER ─────────────────────────────────────── */
    // Building at (0,-33), 16x14m, 3-floor height=10m
    this.W( -8, -33, 1, 10, 14, colorDef, scene); // W wall
    this.W(  8, -33, 1, 10, 14, colorDef, scene); // E wall
    this.W(  0, -40, 16, 10,  1, colorDef, scene); // N wall
    // S wall with center 4m door gap
    this.W( -6, -27, 4, 10,  1, colorDef, scene);
    this.W(  6, -27, 4, 10,  1, colorDef, scene);
    // Floor 2 balcony slab at y=4m
    const towerBal = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), colorDef);
    towerBal.position.set(0, 4.5, -33); scene.add(towerBal);
    this.colliders.push(towerBal);
    // Sniper window on south face (slit opening — visually only)
    // Balcony south railing
    const tBRail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 0.25), metalMat);
    tBRail.position.set(0, 5.2, -27); scene.add(tBRail);

    /* ─── 11. B LINK ─────────────────────────────────────────── */
    // EW corridor, Z center =-12, width 8m, X:-17 to -33
    this.W(-25,  -7, 16, this.WH, 1, colorMain, scene); // North wall
    this.W(-25, -17, 16, this.WH, 1, colorMain, scene); // South wall
    this.addCover(-20, -12, this.CH, woodMat, scene);
    this.addCover(-30, -12, this.CH, concMat, scene);

    /* ─── 12. A LINK ─────────────────────────────────────────── */
    this.W( 25,  -7, 16, this.WH, 1, colorMain, scene);
    this.W( 25, -17, 16, this.WH, 1, colorMain, scene);
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
    this.W(32, -17, 1, this.WH, 22, colorSiteA, scene); // W wall (faces Mid, but gap for A Link entry)
    this.W(58, -17, 1, this.WH, 22, colorSiteA, scene); // E wall (back site)
    this.W(45, -28, 26, this.WH, 1, colorSiteA, scene); // N back wall
    // S wall with entry gap (west-most 8m gap for link, rest is wall)
    this.W(52, -6, 10, this.WH, 1, colorSiteA, scene); // eastern S segment
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

    this.W(-32, -17, 1, this.WH, 22, colorSiteB, scene);
    this.W(-58, -17, 1, this.WH, 22, colorSiteB, scene);
    this.W(-45, -28, 26, this.WH, 1, colorSiteB, scene);
    this.W(-52,  -6, 10, this.WH, 1, colorSiteB, scene); // eastern S segment

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
    const aHeavenSlab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 12), colorSiteA);
    aHeavenSlab.position.set(45, 4.7, -37); scene.add(aHeavenSlab);
    this.colliders.push(aHeavenSlab);
    // Railing on south (overlooking A Site)
    const aRailS = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.25), metalMat);
    aRailS.position.set(45, 5.3, -31.5); scene.add(aRailS);
    // Back wall
    const aHeavBackW = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 1), colorSiteA);
    aHeavBackW.position.set(45, 6.0, -43); scene.add(aHeavBackW);
    this.colliders.push(aHeavBackW);
    // Stairs leading up from A Main top
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1), colorSiteA);
      step.position.set(58, i * 0.9, -32 - i); scene.add(step);
      this.colliders.push(step);
    }
    // AC Units on roof
    this.block(40, 5.6, -42, 2, 1, 2, techMat.clone(), scene);
    this.block(50, 5.6, -42, 2, 1, 2, techMat.clone(), scene);

    /* ─── 16. B HEAVEN (elevation: 5m) ──────────────────────── */
    const bHeavenSlab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 12), colorSiteB);
    bHeavenSlab.position.set(-45, 4.7, -37); scene.add(bHeavenSlab);
    this.colliders.push(bHeavenSlab);
    const bRailS = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.25), metalMat);
    bRailS.position.set(-45, 5.3, -31.5); scene.add(bRailS);
    const bHeavBackW = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 1), colorSiteB);
    bHeavBackW.position.set(-45, 6.0, -43); scene.add(bHeavBackW);
    this.colliders.push(bHeavBackW);
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1), colorSiteB);
      step.position.set(-58, i * 0.9, -32 - i); scene.add(step);
      this.colliders.push(step);
    }
    this.block(-40, 5.6, -42, 2, 1, 2, techMat.clone(), scene);
    this.block(-50, 5.6, -42, 2, 1, 2, techMat.clone(), scene);

    /* ─── 17. DEFENDER SPAWN ─────────────────────────────────── */
    // Center (0,-67), 28x14m, Z:-74 to -60
    this.W(   0, -74, 30, this.WH,  1, colorDef, scene); // N wall
    this.W( -15, -67,  1, this.WH, 14, colorDef, scene); // W wall
    this.W(  15, -67,  1, this.WH, 14, colorDef, scene); // E wall
    // S wall with 3 exits at X:±23 and X:0
    this.W(  -8, -60, 10, this.WH,  1, colorDef, scene); // W segment (gap at 0)
    this.W(   8, -60, 10, this.WH,  1, colorDef, scene); // E segment

    // DEF spawn props
    this.addCover( 0, -70, 2.5, techMat, scene); // Server rack
    this.neonLine( 0, 2.6, -70, 6, 0.1, 3.5, new THREE.MeshBasicMaterial({ color: 0x00d2ff }), scene);
    this.block(10, 1.5, -68, 3, 2.5, 3.5, techMat.clone(), scene); // Generator
    this.block(-10, 0.6, -68, 2, 1.0, 0.5, metalMat.clone(), scene); // Weapon display

    /* ─── 18. DEF SIDE CONNECTORS → HEAVENS ─────────────────── */
    // Left corridor: X:-14 to -26, Z:-60 to -45
    this.W(-14, -52, 1, this.WH, 15, colorDef, scene);
    this.W(-26, -52, 1, this.WH, 15, colorDef, scene);
    // Right corridor
    this.W( 14, -52, 1, this.WH, 15, colorDef, scene);
    this.W( 26, -52, 1, this.WH, 15, colorDef, scene);

    /* ─── 19. MID TOWER SIDE WINGS → HEAVEN ACCESS ──────────── */
    // Left wing: X:-8 to -20, Z:-36 to -50
    this.W(-14, -43, 1, this.WH, 14, colorDef, scene);
    this.W( -8, -43, 1, this.WH, 14, colorDef, scene);
    // Right wing
    this.W( 14, -43, 1, this.WH, 14, colorDef, scene);
    this.W(  8, -43, 1, this.WH, 14, colorDef, scene);
    // Horizontal closers
    this.W(-11, -50, 6, this.WH, 1, colorDef, scene);
    this.W( 11, -50, 6, this.WH, 1, colorDef, scene);

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

    // 23. Extra Decorative density to make map dense and detailed
    this.addWallPanelsAndTrims(scene, sandMat, darkSand, brickMat, woodMat, techMat);
    this.addMarketStallsAndCables(scene, woodMat, techMat, metalMat);
    this.addResidentialDetails(scene, woodMat, techMat);
    this.addCornerScatterProps(scene, woodMat, concMat, metalMat, techMat);

    // 24. Landmarks, Extra Cover & Fire Torches
    this.createBanyanTree(0, 64, scene);
    this.createBanyanTree(-12, -8, scene);
    this.createBanyanTree(12, -8, scene);
    this.createTempleBellLandmark(45, -23, scene, templeMat);
    this.createElectricTransformer(-36, 12, scene, techMat);
    this.createElectricTransformer(-45, -24, scene, techMat);
    this.createBrokenCart(0, -8, scene, woodMat);
    
    // Fire Torches (Ruby Red themed warm flickering light)
    this.createWallTorch(31.2, 2.2, 40, scene);
    this.createWallTorch(31.2, 2.2, 20, scene);
    this.createWallTorch(32.2, 2.2, -18, scene);
    this.createWallTorch(57.8, 2.2, -18, scene);

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

  /* ══ DECORATIVE WALL PANELS & TRIMS ══════════════════════ */
  addWallPanelsAndTrims(scene, sandMat, darkSand, brickMat, woodMat, techMat) {
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.85 });
    const pipingMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.8 });
    const glowRed = new THREE.MeshBasicMaterial({ color: 0xff3366 });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x00d2ff });

    // Add horizontal trims on boundary walls to break height monotony
    this.block(0, 2.5, -74.4, 158, 0.25, 0.4, trimMat, scene);
    this.block(0, 4.5, -74.4, 158, 0.15, 0.4, trimMat, scene);
    this.block(0, 2.5, 74.4, 158, 0.25, 0.4, trimMat, scene);
    this.block(0, 4.5, 74.4, 158, 0.15, 0.4, trimMat, scene);
    this.block(-74.4, 2.5, 0, 0.4, 0.25, 158, trimMat, scene);
    this.block(-74.4, 4.5, 0, 0.4, 0.15, 158, trimMat, scene);
    this.block(74.4, 2.5, 0, 0.4, 0.25, 158, trimMat, scene);
    this.block(74.4, 4.5, 0, 0.4, 0.15, 158, trimMat, scene);

    // Decorative columns along main corridors
    for (let z = 5; z <= 55; z += 12) {
      this.block(-38.3, 2.5, z, 0.7, 5, 0.7, darkSand, scene);
      this.block(-38.3, 3.8, z, 0.2, 0.2, 12, pipingMat, scene);
      this.block(-38.3, 3.8, z, 0.35, 0.35, 0.35, glowCyan, scene);
    }
    for (let z = 5; z <= 55; z += 12) {
      this.block(38.3, 2.5, z, 0.7, 5, 0.7, darkSand, scene);
      this.block(38.3, 3.8, z, 0.2, 0.2, 12, pipingMat, scene);
      this.block(38.3, 3.8, z, 0.35, 0.35, 0.35, glowRed, scene);
    }

    // Mid Plaza Wall Pillars
    this.block(-16.4, 2.5, 6, 0.8, 5, 0.8, darkSand, scene);
    this.block(16.4, 2.5, 6, 0.8, 5, 0.8, darkSand, scene);
    this.block(-16.4, 2.5, -6, 0.8, 5, 0.8, darkSand, scene);
    this.block(16.4, 2.5, -6, 0.8, 5, 0.8, darkSand, scene);

    // Arched support braces overhead crossing lanes (esports tactical feel)
    const archB = this.block(-35, 5.0, 52, 8, 0.5, 1.8, sandMat, scene);
    this.colliders.push(archB);
    const archA = this.block(35, 5.0, 52, 8, 0.5, 1.8, sandMat, scene);
    this.colliders.push(archA);
  }

  /* ══ MARKET STALLS & HANGING CABLES ══════════════════════ */
  addMarketStallsAndCables(scene, woodMat, techMat, metalMat) {
    const clothA = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9, side: THREE.DoubleSide }); // Orange Canvas
    const clothC = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.9, side: THREE.DoubleSide }); // Blue Canvas

    // Mid Plaza Market Stall 1
    this.createPillar(-12, 1.5, 2, 0.1, 3, woodMat, scene);
    this.createPillar(-8, 1.5, 2, 0.1, 3, woodMat, scene);
    this.createPillar(-12, 1.5, -2, 0.1, 3, woodMat, scene);
    this.createPillar(-8, 1.5, -2, 0.1, 3, woodMat, scene);
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 4.5), clothA);
    roof1.position.set(-10, 3.0, 0);
    roof1.rotation.z = 0.12;
    scene.add(roof1);
    this.colliders.push(roof1);
    this.block(-10, 0.5, 0, 1.5, 0.8, 1.5, woodMat, scene);
    this.block(-9.8, 1.1, 0, 0.8, 0.4, 0.8, new THREE.MeshStandardMaterial({ color: 0x059669 }), scene);

    // Mid Plaza Market Stall 2
    this.createPillar(12, 1.5, 2, 0.1, 3, woodMat, scene);
    this.createPillar(8, 1.5, 2, 0.1, 3, woodMat, scene);
    this.createPillar(12, 1.5, -2, 0.1, 3, woodMat, scene);
    this.createPillar(8, 1.5, -2, 0.1, 3, woodMat, scene);
    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 4.5), clothC);
    roof2.position.set(10, 3.0, 0);
    roof2.rotation.z = -0.12;
    scene.add(roof2);
    this.colliders.push(roof2);
    this.block(10, 0.5, 0, 1.5, 0.8, 1.5, woodMat, scene);

    // Hanging cables running across streets
    this.createCable(-39, 4.2, 35, -31, 4.8, 35, scene);
    this.createCable(-39, 4.2, 20, -31, 4.8, 20, scene);
    this.createCable(-17, 4.6, 5, 0, 5.2, -3, scene);
    this.createCable(17, 4.6, 5, 0, 5.2, -3, scene);
    this.createCable(-17, 4.6, -10, 0, 5.2, -27, scene);
    this.createCable(17, 4.6, -10, 0, 5.2, -27, scene);

    // Hanging lights
    this.createHangingLight(-20, 3.2, 0, scene);
    this.createHangingLight(20, 3.2, 0, scene);
    this.createHangingLight(0, 3.5, 25, scene);
  }

  createCable(x1, y1, z1, x2, y2, z2, scene) {
    const p1 = new THREE.Vector3(x1, y1, z1);
    const p2 = new THREE.Vector3(x2, y2, z2);
    const dist = p1.distanceTo(p2);
    const geo = new THREE.CylinderGeometry(0.025, 0.025, dist, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    const cable = new THREE.Mesh(geo, mat);
    cable.position.copy(p1).add(p2).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    cable.quaternion.setFromUnitVectors(up, direction);
    scene.add(cable);
  }

  createHangingLight(x, y, z, scene) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0x111827 }));
    wire.position.set(x, y + 0.6, z); scene.add(wire);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
    bulb.position.set(x, y, z); scene.add(bulb);
    const light = new THREE.PointLight(0xffaa44, 0.8, 10);
    light.position.set(x, y - 0.2, z); scene.add(light);
  }

  /* ══ RESIDENTIAL WINDOWS, BALCONIES, ACS ══════════════════ */
  addResidentialDetails(scene, woodMat, techMat) {
    const windowGlass = new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.6 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5, metalness: 0.8 });

    const windowPositions = [
      { x: -38.8, y: 3.5, z: 45, rotY: Math.PI/2 },
      { x: -38.8, y: 3.5, z: 25, rotY: Math.PI/2 },
      { x: -38.8, y: 3.5, z: 10, rotY: Math.PI/2 },
      { x: 38.8, y: 3.5, z: 45, rotY: -Math.PI/2 },
      { x: 38.8, y: 3.5, z: 25, rotY: -Math.PI/2 },
      { x: 38.8, y: 3.5, z: 10, rotY: -Math.PI/2 },
      { x: -16.8, y: 3.5, z: 8, rotY: Math.PI/2 },
      { x: 16.8, y: 3.5, z: 8, rotY: -Math.PI/2 },
    ];

    windowPositions.forEach(p => {
      const frame = this.block(p.x, p.y, p.z, 0.2, 1.6, 1.1, frameMat, scene);
      frame.rotation.y = p.rotY;
      const glass = this.block(p.x + (p.rotY > 0 ? 0.05 : -0.05), p.y, p.z, 0.1, 1.4, 0.9, windowGlass, scene);
      glass.rotation.y = p.rotY;
      const shutterL = this.block(p.x + (p.rotY > 0 ? 0.08 : -0.08), p.y, p.z - 0.65, 0.1, 1.4, 0.45, woodMat, scene);
      shutterL.rotation.y = p.rotY;
      const shutterR = this.block(p.x + (p.rotY > 0 ? 0.08 : -0.08), p.y, p.z + 0.65, 0.1, 1.4, 0.45, woodMat, scene);
      shutterR.rotation.y = p.rotY;
    });

    const acPositions = [
      { x: -38.7, y: 2.2, z: 32, rotY: Math.PI/2 },
      { x: 38.7, y: 2.2, z: 32, rotY: -Math.PI/2 },
      { x: -16.7, y: 2.8, z: 2, rotY: Math.PI/2 },
      { x: 16.7, y: 2.8, z: 2, rotY: -Math.PI/2 },
      { x: -5, y: 3.8, z: -27.2, rotY: 0 },
      { x: 5, y: 3.8, z: -27.2, rotY: 0 }
    ];

    acPositions.forEach(p => {
      const box = this.block(p.x, p.y, p.z, 1.2, 0.8, 0.6, metalMat, scene);
      box.rotation.y = p.rotY;
      const grill = this.block(p.x + (p.rotY === 0 ? 0 : (p.rotY > 0 ? 0.32 : -0.32)), p.y, p.z + (p.rotY === 0 ? -0.32 : 0), 0.1, 0.6, 0.6, frameMat, scene);
      grill.rotation.y = p.rotY;
    });

    const sign1 = this.block(-30.8, 3.2, -12, 0.2, 0.8, 1.2, woodMat, scene);
    sign1.rotation.y = Math.PI/2;
    const sign2 = this.block(30.8, 3.2, -12, 0.2, 0.8, 1.2, woodMat, scene);
    sign2.rotation.y = Math.PI/2;
  }

  /* ══ CORNER SCATTER PROPS ════════════════════════════════ */
  addCornerScatterProps(scene, woodMat, concMat, metalMat, techMat) {
    const greenContainerMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6, metalness: 0.7 });
    const blueContainerMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6, metalness: 0.7 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.7, metalness: 0.6 });

    // Attacker Spawn corner containers
    const cont1 = this.W(-10, 71, 2.5, 2.5, 4.5, greenContainerMat, scene);
    cont1.rotation.y = 0.15;
    const cont2 = this.W(10, 71, 2.5, 2.5, 4.5, blueContainerMat, scene);
    cont2.rotation.y = -0.15;

    // Mid Plaza corner cover stacks
    const midC1 = this.W(-14, -13, 2.2, 2.2, 2.2, techMat, scene);
    this.block(-14, 1.7, -13, 1.8, 1.8, 1.8, woodMat, scene);
    this.W(-14, 8, 2.0, 2.0, 2.0, concMat, scene);
    this.block(-14, 1.5, 8, 1.6, 1.0, 1.6, woodMat, scene);

    // Defender Spawn corners
    this.W(-11, -66, 2.4, 2.4, 2.4, metalMat, scene);
    this.W(11, -66, 2.4, 2.4, 2.4, metalMat, scene);

    // Wooden barrels scatter
    const barrelCoords = [
      { x: -37, z: 49 }, { x: -37.5, z: 47.8 },
      { x: 37, z: 49 }, { x: 36.5, z: 47.8 },
      { x: -32, z: 6 },
      { x: 32, z: 6 },
      { x: -14, z: -15.5 }, { x: -15, z: -16.2 },
      { x: 14, z: -15.5 }, { x: 15, z: -16.2 }
    ];

    barrelCoords.forEach(c => {
      const b = this.createPillar(c.x, 0.7, c.z, 0.45, 1.4, barrelMat, scene);
      this.colliders.push(b);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 8), ironMat);
      ring.position.set(c.x, 0.9, c.z);
      scene.add(ring);
    });

    // Rubble piles
    const rubbleCoords = [
      { x: -37.8, z: 54 }, { x: 37.8, z: 54 },
      { x: -37.8, z: 12 }, { x: 37.8, z: 12 },
      { x: -56, z: -25 }, { x: 56, z: -25 }
    ];

    rubbleCoords.forEach(c => {
      this.block(c.x, 0.3, c.z, 0.8, 0.4, 0.8, concMat, scene);
      const b2 = this.block(c.x + 0.3, 0.25, c.z - 0.2, 0.6, 0.3, 0.6, concMat, scene); b2.rotation.y = 0.5;
      const b3 = this.block(c.x - 0.2, 0.5, c.z + 0.1, 0.5, 0.4, 0.5, concMat, scene); b3.rotation.y = -0.3;
    });

    // Conduits/Pipes on floor
    this.block(-25, 0.05, -7.4, 12, 0.3, 0.3, ironMat, scene);
    this.block(25, 0.05, -7.4, 12, 0.3, 0.3, ironMat, scene);

    // Hanging laundry/banners
    this.createLaundryLine(-38.8, 3.8, 16, -31.2, 3.8, 16, scene);
    this.createLaundryLine(38.8, 3.8, 16, 31.2, 3.8, 16, scene);
  }

  /* ══ LANDMARK & PROP HELPERS ══════════════════════════════ */
  createBanyanTree(x, z, scene) {
    const box = this.W(x, z, 3, 1.2, 3, new THREE.MeshStandardMaterial({ color: 0x52525b }), scene);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3.8, 8), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
    trunk.position.set(x, 1.8 - 0.5, z); scene.add(trunk);
    this.colliders.push(trunk);
    
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.8 + Math.random() * 0.4, 8, 8), greenMat);
      leaf.position.set(x + (Math.random() - 0.5) * 1.5, 3.0 + Math.random() * 1.0, z + (Math.random() - 0.5) * 1.5);
      scene.add(leaf);
    }
  }

  createTempleBellLandmark(cx, cz, scene, templeMat) {
    const p1 = this.createPillar(cx - 1.8, 3, cz, 0.5, 6, templeMat, scene);
    const p2 = this.createPillar(cx + 1.8, 3, cz, 0.5, 6, templeMat, scene);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 0.8), templeMat);
    beam.position.set(cx, 5.3, cz); scene.add(beam);
    this.colliders.push(beam);
    
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 }));
    chain.position.set(cx, 4.3, cz); scene.add(chain);
    
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 }));
    bell.position.set(cx, 3.1, cz); scene.add(bell);
    this.colliders.push(bell);
  }

  createElectricTransformer(x, z, scene, techMat) {
    const base = this.W(x, z, 2.5, 1.8, 2.5, techMat, scene);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
    top.position.set(x, 1.3, z); scene.add(top);
    const warning = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xeab308 }));
    warning.position.set(x, 0.3, z); scene.add(warning);
  }

  createBrokenCart(x, z, scene, woodMat) {
    const deck = this.block(x, 0.5, z, 1.8, 0.15, 3.2, woodMat, scene);
    const wheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    wheel1.rotation.z = Math.PI / 2; wheel1.position.set(x - 0.95, 0.4, z - 0.6); scene.add(wheel1);
    const wheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    wheel2.rotation.z = Math.PI / 2; wheel2.position.set(x + 0.95, 0.4, z + 0.6); scene.add(wheel2);
    this.colliders.push(this.makeColliderAt(x, 0.6, z, 2.1, 1.2, 3.4, scene));
  }

  createWallTorch(x, y, z, scene) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 }));
    bracket.position.set(x, y, z); scene.add(bracket);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    stick.position.set(x, y + 0.35, z + 0.25); stick.rotation.x = 0.4; scene.add(stick);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
    flame.position.set(x, y + 0.72, z + 0.42); scene.add(flame);
    
    const light = new THREE.PointLight(0xff6600, 1.8, 12);
    light.position.set(x, y + 0.9, z + 0.5);
    scene.add(light);
    
    if (!this.torchLights) this.torchLights = [];
    this.torchLights.push(light);
  }

  updateTorches(dt) {
    if (!this.torchLights) return;
    this.torchLights.forEach(light => {
      light.intensity = 1.4 + Math.random() * 0.8;
    });
  }

  createLaundryLine(x1, y1, z1, x2, y2, z2, scene) {
    this.createCable(x1, y1, z1, x2, y2, z2, scene);
    const clothColors = [0xef4444, 0xf59e0b, 0x3b82f6];
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t - 0.4;
      const cz = z1 + (z2 - z1) * t;
      const clothMat = new THREE.MeshStandardMaterial({ color: clothColors[i - 1], roughness: 0.9, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), clothMat);
      cloth.position.set(cx, cy, cz);
      const lineDir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize();
      cloth.rotation.y = Math.atan2(lineDir.x, lineDir.z);
      scene.add(cloth);
    }
  }

  /* ══ PROCEDURAL CANVAS TEXTURE GENERATOR ══════════════════ */
  createSandStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base sand color
    ctx.fillStyle = '#dfbe8f';
    ctx.fillRect(0, 0, 512, 512);
    
    // Grain flecks
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2.5 + 1;
      ctx.fillStyle = Math.random() < 0.5 ? '#ccaa78' : '#ebd4b0';
      ctx.fillRect(x, y, size, size);
    }
    
    // Sloped pavers outline
    ctx.strokeStyle = '#bfa170';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = Math.random() * 90 + 50;
      const h = Math.random() * 90 + 50;
      ctx.strokeRect(x, y, w, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16); // Tile it densely
    return texture;
  }

  createPlasterBrickTexture(colorHexStr, isBrick = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = colorHexStr;
    ctx.fillRect(0, 0, 256, 256);
    
    // Plaster stucco granularity noise
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, 1, 1);
    }
    
    if (isBrick) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.2;
      const rowHeight = 16;
      const colWidth = 32;
      for (let y = 0; y < 256; y += rowHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        
        const shift = (y / rowHeight) % 2 === 0 ? 0 : colWidth / 2;
        for (let x = -shift; x < 256; x += colWidth) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + rowHeight);
          ctx.stroke();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
  }

  getPlantZone(pos) {
    for (const z of this.plantZones) {
      if (z.box.containsPoint(pos)) return z.name;
    }
    return null;
  }
}

window.RajdhaniMap = new RajdhaniMapBuilder();

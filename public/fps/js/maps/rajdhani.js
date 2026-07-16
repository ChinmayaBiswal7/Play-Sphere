/* ==========================================================================
   DELHI DEFIANCE - HANDCRAFTED 3D RAJDHANI MAPBLUEPRINT
   Designed exactly according to competitive tactical FPS level layout.
   ========================================================================== */

class RajdhaniMapBuilder {
  constructor() {
    this.colliders = [];
    this.interactiveObjects = [];
    this.plantZones = [];
    this.ambientSoundInitialized = false;
  }

  build(scene) {
    this.colliders = [];
    this.interactiveObjects = [];
    this.plantZones = [];

    // ── 1. MATERIAL PALETTE ──
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x9a7b56, // Sandstone dust ground
      roughness: 0.9,
      metalness: 0.05
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc29b6e, // Sandstone brick walls
      roughness: 0.85,
      metalness: 0.1
    });

    const templeMat = new THREE.MeshStandardMaterial({
      color: 0x8c6239, // Ancient red sandstone for temples
      roughness: 0.9,
      metalness: 0.05
    });

    const techMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark navy cyber metal
      roughness: 0.35,
      metalness: 0.85
    });

    const boxWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Orange-brown wood crates
      roughness: 0.75,
      metalness: 0.1
    });

    const greenMetalMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Military green containers
      roughness: 0.5,
      metalness: 0.6
    });

    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const neonRed  = new THREE.MeshBasicMaterial({ color: 0xff3366 });

    // ── 2. CORE GROUND FLOOR (120m x 120m sandbox) ──
    // Center at (0,0), limits X: -60 to 60, Z: -60 to 60
    const groundGeo = new THREE.PlaneGeometry(124, 124);
    const ground = new THREE.Mesh(groundGeo, floorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.5, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // ── 3. MAP BOUNDARY OUTER WALLS (10m high) ──
    // North (Defender Spawn back)
    this.colliders.push(this.createBlock(0, 5, -60, 120, 10, 2, wallMat, scene));
    // South (Attacker Spawn back)
    this.colliders.push(this.createBlock(0, 5, 60, 120, 10, 2, wallMat, scene));
    // West
    this.colliders.push(this.createBlock(-60, 5, 0, 2, 10, 120, wallMat, scene));
    // East
    this.colliders.push(this.createBlock(60, 5, 0, 2, 10, 120, wallMat, scene));

    // ── 4. BOMB SITE A (Center: 42, -2) ──
    // Site plant zone definition
    this.plantZones.push({
      name: 'A',
      box: new THREE.Box3(
        new THREE.Vector3(32, -1, -11),
        new THREE.Vector3(52, 5, 7)
      )
    });

    // Site A visual boundary marker ring
    const siteABorder = new THREE.Mesh(
      new THREE.RingGeometry(9.8, 10.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xff3366, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    siteABorder.rotation.x = Math.PI / 2;
    siteABorder.position.set(42, -0.48, -2);
    scene.add(siteABorder);

    // Generator (Center of Site A) (101,61) -> (41, -1)
    this.colliders.push(this.createBlock(41, 1.5, -1, 3.5, 3, 3.5, techMat, scene));
    this.addNeonTrim(41, 3.0, -1, 3.6, 0.1, 3.6, neonRed, scene);

    // Statue (106,62) -> (46, -2)
    const statueBase = this.createBlock(46, 0.5, -2, 2.5, 1, 2.5, templeMat, scene);
    this.colliders.push(statueBase);
    const statueTop = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.5, 8), templeMat);
    statueTop.position.set(46, 1.8, -2);
    scene.add(statueTop);

    // Two Pillars:
    // (103,66) -> (43, -6)
    this.colliders.push(this.createPillar(43, 3.5, -6, 0.6, 7.0, templeMat, scene));
    // (107,57) -> (47, 3)
    this.colliders.push(this.createPillar(47, 3.5, 3, 0.6, 7.0, templeMat, scene));

    // Large Box: (98,70) -> (38, -10)
    this.colliders.push(this.createBlock(38, 1.25, -10, 3, 2.5, 3, boxWoodMat, scene));

    // Truck: (109,67) -> (49, -7)
    const truckGroup = new THREE.Group();
    truckGroup.position.set(49, 0.5, -7);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 6.0), greenMetalMat);
    chassis.position.y = 0.5;
    truckGroup.add(chassis);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), techMat);
    cabin.position.set(0, 1.8, -1.8);
    truckGroup.add(cabin);
    this.sceneAddGroup(truckGroup, scene);

    // Small crates for cover on site
    this.colliders.push(this.createBlock(35, 0.6, 0, 1.2, 1.2, 1.2, boxWoodMat, scene));
    this.colliders.push(this.createBlock(40, 0.6, 5, 1.2, 1.2, 1.2, boxWoodMat, scene));

    // ── 5. BOMB SITE B (Center: -42, -2) ──
    this.plantZones.push({
      name: 'B',
      box: new THREE.Box3(
        new THREE.Vector3(-52, -1, -11),
        new THREE.Vector3(-32, 5, 7)
      )
    });

    const siteBBorder = new THREE.Mesh(
      new THREE.RingGeometry(9.8, 10.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    siteBBorder.rotation.x = Math.PI / 2;
    siteBBorder.position.set(-42, -0.48, -2);
    scene.add(siteBBorder);

    // Broken Bus: (25,60) -> (-35, 0)
    const busGroup = new THREE.Group();
    busGroup.position.set(-35, 0.5, 0);
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 8.0), techMat);
    busBody.position.y = 0.6;
    busGroup.add(busBody);
    this.sceneAddGroup(busGroup, scene);

    // Cargo Truck: (15,65) -> (-45, -5)
    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(-45, 0.5, -5);
    const cargoChassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.0, 5.0), greenMetalMat);
    cargoChassis.position.y = 0.5;
    cargoGroup.add(cargoChassis);
    this.sceneAddGroup(cargoGroup, scene);

    // Water Fountain in B Site center: (18,55) -> (-42, 5)
    this.colliders.push(this.createPillar(-42, 0.4, 5, 2.0, 0.8, templeMat, scene));
    const fontSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 2.2, 8), templeMat);
    fontSpire.position.set(-42, 1.1, 5);
    scene.add(fontSpire);

    // Temple Gate Arch on Site B back: (8,62) -> (-52, -2)
    this.colliders.push(this.createBlock(-54, 4.0, -2, 1.2, 8.0, 3.0, templeMat, scene));
    this.colliders.push(this.createBlock(-48, 4.0, -2, 1.2, 8.0, 3.0, templeMat, scene));
    this.colliders.push(this.createBlock(-51, 8.5, -2, 7.0, 1.5, 3.0, templeMat, scene)); // Arch top

    // ── 6. MID PLAZA & CONNECTIONS (Center: 0, 0) ──
    // Central Fountain
    this.colliders.push(this.createPillar(0, 0.5, 0, 4.5, 1.0, templeMat, scene));
    const cenStatue = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), techMat);
    cenStatue.position.set(0, 2.0, 0);
    scene.add(cenStatue);

    // Destroyed Market stalls around Plaza
    this.colliders.push(this.createBlock(-8, 1.0, -8, 3.0, 2.0, 1.5, boxWoodMat, scene));
    this.colliders.push(this.createBlock(8, 1.0, 8, 3.0, 2.0, 1.5, boxWoodMat, scene));
    this.colliders.push(this.createBlock(-8, 1.0, 8, 1.5, 2.0, 3.0, boxWoodMat, scene));

    // Mid Plaza Street Light
    this.createStreetLamp(0, 0, -10, scene);

    // ── 7. MID TOWER (Center: 60,82) -> (0, -22) ──
    // Height: 3 floors (Ground, platform 2m, balcony 5m, tower 8m)
    // 3-floor building structure
    this.colliders.push(this.createBlock(0, 4.0, -22, 12, 8.0, 8, wallMat, scene));
    // sniper balcony on floor 2 facing south towards Mid Plaza
    this.colliders.push(this.createBlock(0, 4.0, -17.5, 8, 0.4, 1.2, techMat, scene)); // Balcony plate
    // Balcony window openings (simulate via boxes on sides)
    this.colliders.push(this.createBlock(-4, 6.0, -18, 1.0, 3.0, 1.0, wallMat, scene));
    this.colliders.push(this.createBlock(4, 6.0, -18, 1.0, 3.0, 1.0, wallMat, scene));

    // ── 8. HEAVENS (Rooftops/Balconies overlooking sites) ──
    // A Heaven: (98,98) -> (38, -38)
    this.colliders.push(this.createBlock(38, 4.5, -38, 8, 0.5, 10, wallMat, scene)); // Floor slab
    this.colliders.push(this.createBlock(34, 6.0, -38, 0.5, 3.0, 10, wallMat, scene)); // Back wall

    // B Heaven: (22,98) -> (-38, -38)
    this.colliders.push(this.createBlock(-38, 4.5, -38, 8, 0.5, 10, wallMat, scene)); // Floor slab
    this.colliders.push(this.createBlock(-34, 6.0, -38, 0.5, 3.0, 10, wallMat, scene)); // Back wall

    // ── 9. MAINS & CONNECTOR CORRIDORS ──
    // A Main: x = 30 to 36, z = 40 to 10
    this.colliders.push(this.createBlock(33, 4.0, 25, 4.0, 8.0, 26, wallMat, scene)); // Side walls of lane
    // B Main: x = -30 to -36, z = 40 to 10
    this.colliders.push(this.createBlock(-33, 4.0, 25, 4.0, 8.0, 26, wallMat, scene));

    // A Connector block (82,62) -> (22, -2)
    this.colliders.push(this.createBlock(22, 3.5, -2, 6.0, 7.0, 4.0, wallMat, scene));
    // B Connector block (38,62) -> (-22, -2)
    this.colliders.push(this.createBlock(-22, 3.5, -2, 6.0, 7.0, 4.0, wallMat, scene));

    // A Link: (25, -22)
    this.colliders.push(this.createBlock(25, 4.0, -22, 4.0, 8.0, 10.0, wallMat, scene));
    // B Link: (-25, -22)
    this.colliders.push(this.createBlock(-25, 4.0, -22, 4.0, 8.0, 10.0, wallMat, scene));

    // ── 10. UNDERGROUND TUNNEL (Starts 60,52 to 60,20) -> (0, 8 to 40) ──
    // Create a covered trench look
    this.colliders.push(this.createBlock(0, 1.25, 24, 4.5, 2.5, 32, techMat, scene));
    // Neon tunnel guide light
    this.addNeonTrim(0, 2.4, 24, 0.2, 0.05, 31, neonCyan, scene);

    // ── 11. COMBAT COVER BLOCKS (EVERY 4-6 METERS RULE) ──
    // Concrete and sandbag cover props placed strategically
    const covers = [
      // Spawn pathways
      { x: -12, z: 42, w: 2.0, h: 1.5, d: 2.0 },
      { x: 12, z: 42, w: 2.0, h: 1.5, d: 2.0 },
      { x: 0, z: 46, w: 3.0, h: 1.2, d: 1.5 }, // Sandbags

      // Mid Plaza combat arena covers
      { x: -14, z: -4, w: 1.5, h: 1.6, d: 3.0 }, // Concrete block
      { x: 14, z: -4, w: 1.5, h: 1.6, d: 3.0 },
      { x: -6, z: 12, w: 2.0, h: 1.5, d: 2.0 },
      { x: 6, z: 12, w: 2.0, h: 1.5, d: 2.0 },

      // Site entrance lane angles
      { x: -44, z: 18, w: 3.0, h: 1.8, d: 1.5 }, // wooden box
      { x: 44, z: 18, w: 3.0, h: 1.8, d: 1.5 },
      { x: -35, z: -18, w: 2.0, h: 1.6, d: 2.0 },
      { x: 35, z: -18, w: 2.0, h: 1.6, d: 2.0 }
    ];

    covers.forEach(c => {
      this.colliders.push(this.createBlock(c.x, c.h / 2, c.z, c.w, c.h, c.d, boxWoodMat, scene));
    });

    // ── 12. LIGHTING & ENVIRONMENT VFX ──
    // Soft overall ambient ceiling skylight
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.4);
    scene.add(ambientLight);

    // Soft sky hemisphere bounce light
    const hemiLight = new THREE.HemisphereLight(0xffeacc, 0x1e293b, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Warm Sun at dusk
    const sunLight = new THREE.DirectionalLight(0xffa570, 0.95);
    sunLight.position.set(-50, 45, -30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    const dSide = 70;
    sunLight.shadow.camera.left = -dSide;
    sunLight.shadow.camera.right = dSide;
    sunLight.shadow.camera.top = dSide;
    sunLight.shadow.camera.bottom = -dSide;
    scene.add(sunLight);

    // Cyberpunk street festival neon signs
    this.createNeonBillboard(-42, 6, -58, "B SITE TECH", 0x00d2ff, scene);
    this.createNeonBillboard(42, 6, -58, "A SITE SHRINE", 0xff3366, scene);

    // Atmospheric Dusk Fog
    scene.fog = new THREE.FogExp2(0x130a1c, 0.018);

    // Initialize synthesized audio ambiance loops
    this.initAmbianceAudio();
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
    const geo = new THREE.CylinderGeometry(r, r, h, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  createStreetLamp(x, y, z, scene) {
    const postGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const post = new THREE.Mesh(postGeo, metalMat);
    post.position.set(x, 2.5, z);
    scene.add(post);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 })
    );
    glow.position.set(x, 5.6, z);
    scene.add(glow);

    // Warm street PointLight with shadows
    const light = new THREE.PointLight(0xffbb33, 1.2, 18);
    light.position.set(x, 5.4, z);
    light.castShadow = true;
    scene.add(light);
  }

  createNeonBillboard(x, y, z, text, colorCode, scene) {
    const billboard = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8, roughness: 0.2 })
    );
    billboard.position.set(x, y, z);
    scene.add(billboard);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 2.1, 0.4),
      new THREE.MeshBasicMaterial({ color: colorCode, transparent: true, opacity: 0.8 })
    );
    glow.position.set(x, y, z);
    scene.add(glow);
  }

  addNeonTrim(x, y, z, w, h, d, glowMat, scene) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowMat);
    trim.position.set(x, y, z);
    scene.add(trim);
  }

  sceneAddGroup(group, scene) {
    group.children.forEach(c => {
      c.castShadow = true;
      c.receiveShadow = true;
    });
    scene.add(group);
    
    // Register bounding colliders for composite structures
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const helperMat = new THREE.MeshBasicMaterial({ visible: false });
    const helper = this.createBlock(center.x, center.y + 0.5, center.z, size.x, size.y, size.z, helperMat, scene);
    this.colliders.push(helper);
  }

  // Synthesize procedural ambiance loops (wind, city hum, and random temple bell rings)
  initAmbianceAudio() {
    if (this.ambientSoundInitialized) return;
    this.ambientSoundInitialized = true;

    // Trigger procedural synthesized ambient hums via WebAudio Synth Engine
    setInterval(() => {
      if (window.FPSState.gameState !== 'GAMEPLAY') return;
      if (typeof window.SynthAudio === 'undefined' || !window.SynthAudio.ctx) return;
      
      const ctx = window.SynthAudio.ctx;
      if (ctx.state === 'suspended') return;

      const time = ctx.currentTime;
      
      // Procedural wind hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60 + Math.random() * 20, time);
      
      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(0.03, time + 2.0);
      gain.gain.linearRampToValueAtTime(0.001, time + 4.0);
      
      osc.connect(gain);
      gain.connect(window.SynthAudio.masterGain);
      osc.start(time);
      osc.stop(time + 4.0);

      // Occasionally ring distant temple bell
      if (Math.random() < 0.25) {
        this.synthesizeTempleBell(ctx, time);
      }
    }, 4000);
  }

  synthesizeTempleBell(ctx, time) {
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(440, time); // A4 bell chime pitch
    bellOsc.frequency.exponentialRampToValueAtTime(10, time + 3.0);

    bellGain.gain.setValueAtTime(0.06, time);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, time + 3.0);

    bellOsc.connect(bellGain);
    bellGain.connect(window.SynthAudio.masterGain);
    bellOsc.start(time);
    bellOsc.stop(time + 3.0);
  }

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

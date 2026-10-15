  function buildTrack() {
    const points = TRACK_POINTS[activeTrack];
    trackCurve = new THREE.CatmullRomCurve3(points, true, "centripetal");

    // 🌌 Gradient Sky Dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    
    let skyTopColor = 0xff9a5a;
    let skyBottomColor = 0xffe8c9;
    if (activeTrack === 1) {
      skyTopColor = 0x0284c7;
      skyBottomColor = 0xe0f2fe;
    }

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(skyTopColor) },
        bottomColor: { value: new THREE.Color(skyBottomColor) }
      },
      vertexShader: `varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec3 vWorldPosition;
        uniform vec3 topColor; uniform vec3 bottomColor;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }`,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    buildRoad();
    buildPitLane();
    buildRunoffAndBarriers();
    buildScenery();
    buildGrandstandsAndSponsors();

    // Validate placement of all decorative scene objects to ensure none are on the racing surface
    function validateTrackObjectPlacement(object) {
      if (!object) return;
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);

      if (typeof window.findNearestTrackProjection !== 'function') return;
      const projection = window.findNearestTrackProjection(worldPosition);
      if (!projection) return;

      // Track half width is 8.0 meters
      if (Math.abs(projection.lateralOffset) < 8.0) {
        console.error(
          "[OBJECT ON RACING SURFACE]",
          {
            name: object.name,
            uuid: object.uuid,
            offset: projection.lateralOffset,
            position: worldPosition
          }
        );
        // Remove it from the scene so it doesn't block the road!
        scene.remove(object);
      }
    }

    // Traverse the scene and validate decorative placements
    scene.traverse(object => {
      if (!object) return;
      if (
        object.userData?.isRoad ||
        object.userData?.isTrackSurface ||
        object.name === "skyDome" ||
        object.name === "ground" ||
        object.name === "pitGuideLine" ||
        object.userData?.colliderType === "CAR"
      ) {
        return;
      }
      
      const name = (object.name || "").toLowerCase();
      const parentName = (object.parent?.name || "").toLowerCase();
      if (
        name.includes("bush") ||
        name.includes("tree") ||
        name.includes("chalet") ||
        name.includes("grandstand") ||
        name.includes("billboard") ||
        name.includes("post") ||
        parentName.includes("scenery")
      ) {
        validateTrackObjectPlacement(object);
      }
    });
  }

  // Old buildTrack removed
  function createRacers() {
    racers = [];

    const activeTeam = F1_TEAMS[selectedTeamIndex];
    const playerDriver = activeTeam.drivers[activeDriver];

    let playerName = playerDriver.name;
    if (window.matchMode === 'PVP') {
      try {
        const profile = (window.parent && window.parent.profile) || window.profile;
        if (profile && profile.username) {
          playerName = profile.username;
        }
      } catch(e) {}
    }

    // Player Kart
    const pKartSetup = createProceduralKart(parseInt(activeTeam.color.replace('#', ''), 16), true);
    playerKart = {
      isPlayer: true,
      name: playerName,
      avatar: playerDriver.avatar,
      bonus: activeDriver === 0 ? "acceleration" : "topSpeed",
      mesh: pKartSetup.mesh,
      wheels: pKartSetup.wheels,
      currentOffset: 0.0,
      sideOffset: -1.8, // Left side P1 grid position
      speed: 0.0,
      targetSpeed: 0.0,
      rotationY: 0.0,
      driftAngle: 0.0,
      driftCharge: 0.0,
      isDrifting: false,
      boostTime: 0.0,
      shieldActive: false,
      shieldMesh: null,
      spinoutTime: 0.0,
      posRank: 1,
      teamIndex: selectedTeamIndex,
      completedLaps: 0,
      previousTrackProgress: 0.0,
      isPitting: false,
      pitProgress: 0.0,
      finished: false,
      finishPos: null,
      finishTime: null,
      ersEnergy: ERS_MAX_ENERGY,
      inPitLane: false,
      pitZone: "MAIN_TRACK",
      pitLimiterActive: false,
      currentPath: "TRACK",
      isTrackActive: true,    // physically present on track
      collisionEnabled: true  // part of collision simulation
    };
    racers.push(playerKart);
    if (typeof window.registerCollider === 'function') {
      window.registerCollider(playerKart.mesh, "CAR");
    }

    // ─── Helper: build AI profile from team/driver stats ───
    function buildAIProfile(team, driver) {
      const ts = team.stats;   // { speed, aero, tyre, power }
      const ds = driver.stats; // { accel, drift, speed }
      // Normalize 0-100 to 0-1
      const pace        = ds.speed  / 100;
      const brakingSkill= ds.accel  / 100;
      const corneringSkill = ds.drift / 100;
      const consistency = 0.70 + (ds.speed / 100) * 0.25;
      const aggression  = 0.55 + (ts.speed  / 100) * 0.35;

      // Deterministic personality archetype based on driver name hash
      const hash = (driver.name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const mod = hash % 4;
      let driverAI = {};
      if (mod === 0) {
        // AGGRESSIVE ATTACKER
        driverAI = {
          aggression: 0.94, awareness: 0.80, reaction: 0.88, bravery: 0.95,
          consistency: 0.76, racecraft: 0.87, patience: 0.25, defence: 0.84, mistakeRate: 0.07,
          archetype: "AGGRESSIVE ATTACKER"
        };
      } else if (mod === 1) {
        // CALCULATED CHAMPION
        driverAI = {
          aggression: 0.78, awareness: 0.96, reaction: 0.94, bravery: 0.84,
          consistency: 0.97, racecraft: 0.98, patience: 0.82, defence: 0.94, mistakeRate: 0.015,
          archetype: "CALCULATED CHAMPION"
        };
      } else if (mod === 2) {
        // DEFENSIVE VETERAN
        driverAI = {
          aggression: 0.59, awareness: 0.94, reaction: 0.89, bravery: 0.71,
          consistency: 0.92, racecraft: 0.91, patience: 0.88, defence: 0.97, mistakeRate: 0.025,
          archetype: "DEFENSIVE VETERAN"
        };
      } else {
        // ROOKIE
        driverAI = {
          aggression: 0.72, awareness: 0.68, reaction: 0.70, bravery: 0.83,
          consistency: 0.66, racecraft: 0.63, patience: 0.47, defence: 0.59, mistakeRate: 0.10,
          archetype: "ROOKIE"
        };
      }

      return { pace, brakingSkill, corneringSkill, consistency, aggression, driverAI };
    }
    function buildCarPerformance(team) {
      const ts = team.stats;
      return { topSpeed: ts.speed, cornering: ts.aero, downforce: ts.aero };
    }

    // Stagger teammate in P2 grid slot
    const mateDriver = activeTeam.drivers[activeDriver === 0 ? 1 : 0];
    const mateKartSetup = createProceduralKart(parseInt(activeTeam.color.replace('#', ''), 16), false);

    let opponentName = mateDriver.name;
    let opponentAvatar = mateDriver.avatar;
    if (window.matchMode === 'PVP') {
      opponentName = (window.cricketPvPRole === 'host') ? 'Opponent' : 'Host';
      try {
        const activeMatchStr = sessionStorage.getItem('ps_active_match');
        if (activeMatchStr) {
          const matchData = JSON.parse(activeMatchStr);
          if (window.cricketPvPRole === 'host') {
            opponentName = (matchData.guest && matchData.guest.username) || 'Guest';
          } else {
            opponentName = (matchData.host && matchData.host.username) || 'Host';
          }
        }
      } catch(e) {}
    }

    const teammateRacer = {
      isPlayer: false,
      name: opponentName,
      avatar: opponentAvatar,
      bonus: "handling",
      mesh: mateKartSetup.mesh,
      wheels: mateKartSetup.wheels,
      currentOffset: 1.0 - 0.007, // Staggered behind
      sideOffset: 1.8, // Right side grid position
      speed: 0.0,
      boostTime: 0.0,
      shieldActive: false,
      spinoutTime: 0.0,
      posRank: 2,
      teamIndex: selectedTeamIndex,
      completedLaps: 0,
      previousTrackProgress: 1.0 - 0.007,
      isPitting: false,
      pitProgress: 0.0,
      finished: false,
      finishPos: null,
      finishTime: null,
      ersEnergy: ERS_MAX_ENERGY,
      inPitLane: false,
      pitZone: "MAIN_TRACK",
      pitLimiterActive: false,
      currentPath: "TRACK",
      isTrackActive: true,
      collisionEnabled: true
    };
    teammateRacer.aiProfile      = buildAIProfile(activeTeam, mateDriver);
    teammateRacer.carPerformance = buildCarPerformance(activeTeam);
    racers.push(teammateRacer);
    if (typeof window.registerCollider === 'function') {
      window.registerCollider(teammateRacer.mesh, "CAR");
    }

    // Populate remaining 14 slots from other teams to complete a 16-car F1 grid matrix
    const isOnlineQuickMatch = (window.matchMode === 'PVP' && sessionStorage.getItem('ps_pvp_submode') === 'quick_match');
    if (!isOnlineQuickMatch) {
      let gridSlot = 2; // Slots 0=player, 1=teammate
      F1_TEAMS.forEach((team, tIdx) => {
        if (tIdx === selectedTeamIndex) return; // skip player team
        
        // Spawn both drivers of each other team
        team.drivers.forEach((driver, dIdx) => {
          if (gridSlot >= 16) return;
          
          const aiKartSetup = createProceduralKart(parseInt(team.color.replace('#', ''), 16), false);
          const row = Math.floor(gridSlot / 2);
          const sideOffset = gridSlot % 2 === 0 ? -1.8 : 1.8;
          const currentOffset = 1.0 - row * 0.009; // Wider gap so AI start further behind — prevents T1 rear collision

          const aiRacer = {
            isPlayer: false,
            name: driver.name,
            avatar: driver.avatar,
            bonus: "handling",
            mesh: aiKartSetup.mesh,
            wheels: aiKartSetup.wheels,
            currentOffset: currentOffset,
            sideOffset: sideOffset,
            speed: 0.0,
            boostTime: 0.0,
            shieldActive: false,
            spinoutTime: 0.0,
            posRank: gridSlot + 1,
            teamIndex: tIdx,
            completedLaps: 0,
            previousTrackProgress: currentOffset,
            isPitting: false,
            pitProgress: 0.0,
            finished: false,
            finishPos: null,
            finishTime: null,
            ersEnergy: ERS_MAX_ENERGY,
            inPitLane: false,
            pitZone: "MAIN_TRACK",
            pitLimiterActive: false,
            currentPath: "TRACK",
            isTrackActive: true,
            collisionEnabled: true
          };
          aiRacer.aiProfile      = buildAIProfile(team, driver);
          aiRacer.carPerformance = buildCarPerformance(team);
          racers.push(aiRacer);
          if (typeof window.registerCollider === 'function') {
            window.registerCollider(aiRacer.mesh, "CAR");
          }
          gridSlot++;
        });
      });
    }

    // If we are in the main GP race (session index 2) and startingGrid exists,
    // re-sort racers to match window.startingGrid.
    if (currentSessionIndex === 2 && window.startingGrid && window.startingGrid.length > 0) {
      const nameToRacer = {};
      racers.forEach(r => {
        nameToRacer[r.name] = r;
      });
      const sortedRacers = [];
      window.startingGrid.forEach(gridDriver => {
        const racer = nameToRacer[gridDriver.name];
        if (racer) sortedRacers.push(racer);
      });
      // Fallback
      racers.forEach(r => {
        if (!sortedRacers.includes(r)) sortedRacers.push(r);
      });
      racers = sortedRacers;
    }

    // Assign grid starting positions, staggered grid offsets and sideOffsets based on sorted order
    racers.forEach((r, index) => {
      let gridIndex = index;
      if (window.matchMode === 'PVP' && window.cricketPvPRole === 'guest') {
        if (index === 0) gridIndex = 1;
        else if (index === 1) gridIndex = 0;
      }

      const row = Math.floor(gridIndex / 2);
      const sideOffset = gridIndex % 2 === 0 ? -1.8 : 1.8;
      const currentOffset = 1.0 - row * 0.009;

      r.currentOffset = currentOffset;
      r.previousTrackProgress = currentOffset;
      r.sideOffset = sideOffset;
      r.posRank = gridIndex + 1;
      r.gridStartPos = gridIndex + 1;
      r.lastPosRank = gridIndex + 1;
      r.completedLaps = 0;
      r.finished = false;
      r.speed = 0.0;

      r.isOnTimedLap = false;
      r.lapTimeElapsed = 0.0;
    });
  }

  function createProceduralKart(driverColor, isPlayer) {
    const mesh = createProceduralKartMesh(driverColor);
    
    if (isPlayer) {
      const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 2.3, -0.2);
      arrow.rotation.x = Math.PI;
      arrow.visible = false; // Hidden so it never obstructs first-person, onboard, or garage views
      mesh.add(arrow);
      mesh.playerArrow = arrow;
    }

    scene.add(mesh);
    return {
      mesh: mesh,
      wheels: [],
      color: driverColor
    };
  }

  function createProceduralKartMesh(driverColor) {
    const car = new THREE.Group();
    car.name = "kart";

    const paint = new THREE.MeshStandardMaterial({
      color: driverColor,
      roughness: 0.30,
      metalness: 0.35
    });

    const carbon = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.75,
      metalness: 0.3
    });

    const darkIntake = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.95
    });

    const titanium = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.85,
      roughness: 0.25
    });

    // ==========================
    // 1. Aerodynamic Floor & Chassis
    // ==========================
    // Underfloor / Tea tray with edge vortex generators
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.08, 4.4),
      carbon
    );
    floor.position.set(0, 0.12, 0.1);
    floor.castShadow = true;
    car.add(floor);

    // Main monocoque chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.38, 2.2),
      paint
    );
    chassis.position.set(0, 0.32, 0.4);
    chassis.castShadow = true;
    car.add(chassis);

    // ==========================
    // 2. Tapered Aerodynamic Nosecone
    // ==========================
    // Main nose section sloping down towards front wing
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.22, 2.1),
      paint
    );
    nose.position.set(0, 0.32, 2.35);
    nose.rotation.x = 0.05; // slight downward aerodynamic rake
    nose.castShadow = true;
    nose.name = "nose";
    car.add(nose);
    car.nose = nose;

    // Nose tip crash structure
    const noseTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.55),
      paint
    );
    noseTip.position.set(0, 0.21, 3.5);
    noseTip.castShadow = true;
    car.add(noseTip);

    // Nose pitot tube / antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8),
      titanium
    );
    antenna.position.set(0, 0.48, 2.1);
    car.add(antenna);

    // ==========================
    // 3. F1 Front & Rear Suspension (Precision Multi-Link Carbon Wishbones)
    // ==========================
    // Helper to build true connecting suspension rods spanning between exact 3D coordinates
    const createSuspensionRod = (p1, p2, radius, mat) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const len = v1.distanceTo(v2);
      const mid = v1.clone().add(v2).multiplyScalar(0.5);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
      rod.position.copy(mid);
      const dir = v2.clone().sub(v1).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      rod.quaternion.setFromUnitVectors(up, dir);
      rod.castShadow = true;
      return rod;
    };

    [-1, 1].forEach(side => {
      // ── FRONT SUSPENSION (Connecting nose to front upright at x = ±1.05, y = 0.36, z = 1.60) ──
      // Front Upper A-Arm (Forward & Rearward legs)
      car.add(createSuspensionRod([side * 0.30, 0.42, 1.76], [side * 1.05, 0.38, 1.60], 0.016, carbon));
      car.add(createSuspensionRod([side * 0.30, 0.40, 1.42], [side * 1.05, 0.38, 1.60], 0.016, carbon));

      // Front Lower A-Arm (Forward & Rearward legs)
      car.add(createSuspensionRod([side * 0.28, 0.20, 1.76], [side * 1.05, 0.24, 1.60], 0.018, carbon));
      car.add(createSuspensionRod([side * 0.28, 0.20, 1.42], [side * 1.05, 0.24, 1.60], 0.018, carbon));

      // Front Pushrod (Diagonal strut from bottom upright to top monocoque)
      car.add(createSuspensionRod([side * 1.00, 0.22, 1.60], [side * 0.30, 0.48, 1.50], 0.015, titanium));

      // Steering track tie-rod
      car.add(createSuspensionRod([side * 0.30, 0.32, 1.46], [side * 1.04, 0.32, 1.52], 0.014, carbon));

      // Front Brake Cooling Duct & Vertical Carbon Upright
      const frontUpright = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.22), carbon);
      frontUpright.position.set(side * 1.02, 0.34, 1.60);
      car.add(frontUpright);

      const frontBrakeDuct = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.16), carbon);
      frontBrakeDuct.position.set(side * 0.98, 0.34, 1.74);
      car.add(frontBrakeDuct);

      // ── REAR SUSPENSION (Connecting engine casing to rear upright at x = ±1.05, y = 0.38, z = -1.50) ──
      // Rear Upper A-Arm
      car.add(createSuspensionRod([side * 0.35, 0.44, -1.35], [side * 1.05, 0.40, -1.50], 0.018, carbon));
      car.add(createSuspensionRod([side * 0.35, 0.44, -1.65], [side * 1.05, 0.40, -1.50], 0.018, carbon));

      // Rear Lower A-Arm
      car.add(createSuspensionRod([side * 0.35, 0.22, -1.35], [side * 1.05, 0.26, -1.50], 0.020, carbon));
      car.add(createSuspensionRod([side * 0.35, 0.22, -1.65], [side * 1.05, 0.26, -1.50], 0.020, carbon));

      // Rear Pullrod (Diagonal strut)
      car.add(createSuspensionRod([side * 1.00, 0.42, -1.50], [side * 0.35, 0.20, -1.55], 0.016, titanium));

      // Rear Titanium Drive Halfshaft (Axle)
      car.add(createSuspensionRod([side * 0.32, 0.34, -1.50], [side * 1.05, 0.34, -1.50], 0.022, titanium));

      // Rear Brake Duct & Upright
      const rearUpright = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.24), carbon);
      rearUpright.position.set(side * 1.02, 0.35, -1.50);
      car.add(rearUpright);
    });

    // ==========================
    // 4. Front Wing Assembly (Multi-Element)
    // ==========================
    const WING_WIDTH = 3.2;
    const HALF_WING = WING_WIDTH * 0.5;

    const wingGroup = new THREE.Group();

    // Main lower blade
    const mainBlade = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH, 0.06, 0.55),
      carbon
    );
    mainBlade.position.set(0, 0.11, 3.8);
    mainBlade.castShadow = true;
    wingGroup.add(mainBlade);

    // Flap element 2 (aerodynamic sweep)
    const flap2 = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH * 0.94, 0.045, 0.38),
      carbon
    );
    flap2.position.set(0, 0.18, 3.72);
    flap2.rotation.x = 0.12;
    wingGroup.add(flap2);

    // Flap element 3 (top cascade)
    const flap3 = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH * 0.88, 0.04, 0.30),
      paint
    );
    flap3.position.set(0, 0.24, 3.65);
    flap3.rotation.x = 0.22;
    wingGroup.add(flap3);

    // Endplates & Outer Dive Planes
    [-1, 1].forEach(side => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.38, 0.65),
        carbon
      );
      endplate.position.set(side * HALF_WING, 0.22, 3.78);
      endplate.castShadow = true;
      wingGroup.add(endplate);

      // Outward dive plane
      const divePlane = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.03, 0.32),
        carbon
      );
      divePlane.position.set(side * (HALF_WING + 0.08), 0.26, 3.76);
      divePlane.rotation.z = side * 0.18;
      wingGroup.add(divePlane);
    });

    car.add(wingGroup);
    car.frontWing = wingGroup;

    // ==========================
    // 5. Cockpit Opening & Safety Surround
    // ==========================
    // Headrest safety surround collar (black protective foam)
    const headrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.22, 0.75),
      darkIntake
    );
    headrest.position.set(0, 0.52, 0.25);
    car.add(headrest);

    // Rear engine firewall bulkhead
    const bulkhead = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.38, 0.2),
      carbon
    );
    bulkhead.position.set(0, 0.50, -0.15);
    car.add(bulkhead);

    // ==========================
    // 6. Realistic Driver & Helmet
    // ==========================
    // Driver shoulders / racing suit
    const driverTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.35),
      paint
    );
    driverTorso.position.set(0, 0.44, 0.28);
    car.add(driverTorso);

    // Seatbelts / HANS device
    [-0.1, 0.1].forEach(x => {
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.9 })
      );
      belt.position.set(x, 0.58, 0.26);
      car.add(belt);
    });

    // Realistic helmet (proportional human head size: radius 0.18)
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0, 0.72, 0.25);

    // Base helmet shell
    const helmetShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.3 })
    );
    helmetShell.scale.set(0.92, 1.0, 1.15); // slightly elongated racing helmet
    helmetShell.castShadow = true;
    helmetGroup.add(helmetShell);

    // Chin guard
    const chinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.12, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 })
    );
    chinGuard.position.set(0, -0.06, 0.12);
    helmetGroup.add(chinGuard);

    // Dark Iridium Visor with reflection
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.05,
      metalness: 0.95
    });
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.175, 0.09, 16, 1, true, -Math.PI / 3, (2 * Math.PI) / 3),
      visorMat
    );
    visor.position.set(0, 0.01, 0.04);
    visor.rotation.y = Math.PI;
    helmetGroup.add(visor);

    // Rear aerodynamic helmet spoiler
    const helmetSpoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.10),
      carbon
    );
    helmetSpoiler.position.set(0, 0.06, -0.15);
    helmetSpoiler.rotation.x = -0.2;
    helmetGroup.add(helmetSpoiler);

    car.add(helmetGroup);

    // ==========================
    // 7. Authentic F1 Halo Structure
    // ==========================
    // Titanium safety hoop wrapping around driver
    const haloHoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.034, 12, 28, Math.PI * 1.55),
      titanium
    );
    haloHoop.rotation.x = Math.PI / 2 + 0.12;
    haloHoop.rotation.z = Math.PI * 0.725;
    haloHoop.position.set(0, 0.77, 0.32);
    car.add(haloHoop);

    // Vertical central aerodynamic pylon strut (rising in front of driver)
    const haloStrut = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.32, 0.06),
      titanium
    );
    haloStrut.position.set(0, 0.62, 0.62);
    haloStrut.rotation.x = -0.25; // angled slightly forward into chassis
    car.add(haloStrut);

    // Rear halo mounting anchors
    [-0.22, 0.22].forEach(x => {
      const anchor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8),
        titanium
      );
      anchor.position.set(x, 0.68, 0.05);
      anchor.rotation.x = 0.45;
      car.add(anchor);
    });

    // ==========================
    // 8. F1 Steering Wheel & Arms
    // ==========================
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.56, 0.72);
    wheelGroup.rotation.x = Math.PI / 7; // angled towards driver

    // Carbon rectangular steering wheel frame
    const wheelFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.025),
      carbon
    );
    wheelGroup.add(wheelFrame);

    // Hand grips (suede/rubber)
    [-0.12, 0.12].forEach(x => {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
      );
      grip.position.set(x, 0, 0);
      wheelGroup.add(grip);
    });

    // Digital LCD display screen
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.065),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8
      })
    );
    screenMesh.position.set(0, 0.015, 0.015);
    wheelGroup.add(screenMesh);

    // Top shift LED row on wheel
    for (let l = -4; l <= 4; l++) {
      const ledColor = l < -1 ? 0x22c55e : (l <= 1 ? 0xef4444 : 0x8b5cf6);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.008, 0.004),
        new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 1.0 })
      );
      led.position.set(l * 0.013, 0.062, 0.015);
      wheelGroup.add(led);
    }

    wheelGroup.name = "steeringWheel";
    car.add(wheelGroup);
    car.steeringWheel = wheelGroup;

    // Driver arms holding grips
    const armMat = paint;
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.10, 0.42),
      armMat
    );
    leftArm.position.set(-0.20, 0.52, 0.50);
    leftArm.rotation.set(-Math.PI / 12, 0, 0.15);
    leftArm.name = "leftArm";
    car.add(leftArm);
    car.leftArm = leftArm;

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.10, 0.42),
      armMat
    );
    rightArm.position.set(0.20, 0.52, 0.50);
    rightArm.rotation.set(-Math.PI / 12, 0, -0.15);
    rightArm.name = "rightArm";
    car.add(rightArm);
    car.rightArm = rightArm;

    // ==========================
    // 9. Aerodynamic Undercut Sidepods
    // ==========================
    [-1, 1].forEach(side => {
      // Main sidepod body
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.32, 1.85),
        paint
      );
      pod.position.set(side * 0.68, 0.30, 0.10);
      pod.castShadow = true;
      car.add(pod);

      // Forward radiator intake scoop (black recessed inlet)
      const intake = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.22, 0.15),
        darkIntake
      );
      intake.position.set(side * 0.68, 0.32, 1.02);
      car.add(intake);

      // Undercut channel (sculpted aerodynamic undercuts)
      const undercut = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.16, 1.6),
        carbon
      );
      undercut.position.set(side * 0.46, 0.18, 0.2);
      car.add(undercut);

      // Bargeboard / Floor edge winglet
      const edgeWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.14, 1.2),
        carbon
      );
      edgeWing.position.set(side * 0.88, 0.16, 0.2);
      car.add(edgeWing);
    });

    // ==========================
    // 10. Engine Cover, Airbox & Shark Fin
    // ==========================
    // Engine cover body tapering to rear
    const engineCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.48, 1.8),
      paint
    );
    engineCover.position.set(0, 0.48, -0.9);
    engineCover.castShadow = true;
    car.add(engineCover);

    // Overhead airbox roll-hoop intake
    const airbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.28, 0.45),
      paint
    );
    airbox.position.set(0, 0.90, -0.10);
    car.add(airbox);

    const airboxIntake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16),
      darkIntake
    );
    airboxIntake.rotation.x = Math.PI / 2;
    airboxIntake.position.set(0, 0.90, 0.12);
    car.add(airboxIntake);

    // Official T-cam mounted on top of airbox
    const tCam = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.05, 0.06),
      carbon
    );
    tCam.position.set(0, 1.05, -0.05);
    car.add(tCam);
    car.tCam = tCam;

    // Vertical shark fin running down engine spine
    const sharkFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.38, 1.45),
      paint
    );
    sharkFin.position.set(0, 0.78, -0.85);
    sharkFin.castShadow = true;
    car.add(sharkFin);

    // Rear diffuser & safety rain LED light
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.16, 0.65),
      carbon
    );
    diffuser.position.set(0, 0.14, -1.95);
    car.add(diffuser);

    // Red pulsing FIA safety rain light
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 })
    );
    rainLight.position.set(0, 0.16, -2.28);
    car.add(rainLight);

    // ==========================
    // 11. Rear Wing Assembly (Swan-Neck Mounts & DRS Flap)
    // ==========================
    const rearWingGroup = new THREE.Group();

    // Main lower horizontal plane
    const mainPlane = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.05, 0.46),
      carbon
    );
    mainPlane.position.set(0, 0.88, -2.25);
    mainPlane.castShadow = true;
    mainPlane.name = "rearWing";
    rearWingGroup.add(mainPlane);

    // Upper DRS movable flap
    const drsFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.045, 0.38),
      paint
    );
    drsFlap.position.set(0, 0.98, -2.25);
    drsFlap.castShadow = true;
    drsFlap.name = "drsFlap";
    rearWingGroup.add(drsFlap);
    car.drsFlap = drsFlap;

    // Dual swan-neck pylons
    [-0.22, 0.22].forEach(x => {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.60, 0.22),
        carbon
      );
      pylon.position.set(x, 0.70, -2.18);
      pylon.rotation.x = 0.18;
      rearWingGroup.add(pylon);
    });

    // Rear wing endplates with vertical strakes
    [-1, 1].forEach(side => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.65, 0.68),
        carbon
      );
      endplate.position.set(side * 1.05, 0.85, -2.25);
      endplate.castShadow = true;
      rearWingGroup.add(endplate);
    });

    car.add(rearWingGroup);
    car.rearWing = rearWingGroup;

    // ==========================
    // 12. 18-Inch Wheels with Aero Covers & Pirelli Compounds
    // ==========================
    const tyreMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85
    });

    const aeroCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7
    });

    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Default soft red
      roughness: 0.7
    });
    car.tyreBandMat = bandMat;

    const wheelPos = [
      [-1.15, 0.36, 1.6],
      [1.15, 0.36, 1.6],
      [-1.15, 0.38, -1.5],
      [1.15, 0.38, -1.5]
    ];

    car.wheels = [];
    wheelPos.forEach((pos, idx) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(...pos);
      wGroup.originalX = pos[0];

      // Front vs Rear tyre width (rears are wider in F1)
      const tyreWidth = idx < 2 ? 0.34 : 0.42;
      const tyreRadius = idx < 2 ? 0.36 : 0.38;

      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(tyreRadius, tyreRadius, tyreWidth, 24),
        tyreMat
      );
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wGroup.add(tyre);

      // Aero wheel cover disc
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, tyreWidth + 0.01, 16),
        aeroCoverMat
      );
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      // Central wheel lock nut
      const nut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, tyreWidth + 0.04, 12),
        titanium
      );
      nut.rotation.z = Math.PI / 2;
      wGroup.add(nut);

      // Pirelli compound colored sidewall bands
      const sideBandL = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.31, 24),
        bandMat
      );
      sideBandL.position.x = -(tyreWidth / 2 + 0.005);
      sideBandL.rotation.y = Math.PI / 2;
      wGroup.add(sideBandL);

      const sideBandR = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.31, 24),
        bandMat
      );
      sideBandR.position.x = (tyreWidth / 2 + 0.005);
      sideBandR.rotation.y = -Math.PI / 2;
      wGroup.add(sideBandR);

      car.add(wGroup);
      car.wheels.push(wGroup);
    });

    return car;
  }

  function spawnStars() {
    stars.forEach(s => scene.remove(s.mesh));
    stars = [];

    const starCount = 12;
    const starGeo = new THREE.OctahedronGeometry(0.7, 0);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, emissive: 0x78350f });

    for (let i = 0; i < starCount; i++) {
      const offset = (i + 0.5) / starCount;
      const point = trackCurve.getPointAt(offset);
      const tangent = trackCurve.getTangentAt(offset);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      point.add(normal.multiplyScalar((i % 2 === 0 ? 1 : -1) * 3));
      point.y = 1.0;

      const mesh = new THREE.Mesh(starGeo, starMat);
      mesh.position.copy(point);
      scene.add(mesh);

      stars.push({ mesh: mesh, active: true, respawnTimer: 0.0 });
    }
  }

  function usePlayerItem() {
    if (!activePowerup) return;
    window.ApexAudio.playShoot();

    if (activePowerup === 'turbo') {
      playerKart.boostTime = 3.0;
      window.ApexAudio.playBoost();
      spawnExhaustSmoke(playerKart.mesh.position, true);
    } else if (activePowerup === 'shield') {
      activateShield(playerKart);
    } else if (activePowerup === 'rocket') {
      spawnRocket(playerKart.mesh.position.clone(), playerKart.currentOffset);
    }

    activePowerup = null;
    updatePowerupHUD();
  }

  function activateShield(racer) {
    if (racer.shieldActive) return;
    racer.shieldActive = true;
    racer.shieldMesh = null;
  }

  function spawnRocket(position, startOffset) {
    const group = new THREE.Group();
    group.position.copy(position);
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.3, 0.5, 12);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = 0.85;
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    scene.add(group);
    rockets.push({ mesh: group, currentOffset: startOffset, speed: 0.015 });
  }

  function spawnExhaustSmoke(pos, isNitro = false) {
    if (typeof scene === 'undefined' || !scene || typeof particles === 'undefined' || !particles) return;
    const count = isNitro ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const size = isNitro ? 0.08 : 0.05;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color: isNitro ? 0x22d3ee : 0xcbd5e1, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.y += Math.random() * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.5;
      scene.add(mesh);

      particles.push({
        mesh: mesh,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.05,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 1.0, (Math.random() - 0.5) * 1.5)
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🏁 RACE DIRECTOR — Full System Implementation
  // ═══════════════════════════════════════════════════════════════════

  /** Push a message to the Race Control banner queue */
  function rdShowMessage(text, duration = 4.0, color = '#fff') {
    rcMessageQueue.push({ text, duration, color });
  }

  /** Update Race Control ticker banner (top-centre pill) */
  function updateRCMessages(delta) {
    if (rcCurrentMsg) {
      rcMsgTimer -= delta;
      if (rcMsgTimer <= 0) {
        rcCurrentMsg = null;
        const banner = document.getElementById('rd-rc-banner');
        if (banner) banner.style.display = 'none';
      }
    }
    if (!rcCurrentMsg && rcMessageQueue.length > 0) {
      rcCurrentMsg = rcMessageQueue.shift();
      rcMsgTimer = rcCurrentMsg.duration;
      const banner = document.getElementById('rd-rc-banner');
      const txt   = document.getElementById('rd-rc-banner-text');
      if (banner && txt) {
        txt.innerText = rcCurrentMsg.text;
        txt.style.color = rcCurrentMsg.color;
        banner.style.display = 'block';
      }
    }
  }

  /**
   * Show the left-side flag notification card + screen dim.
   * @param {string} icon     - Emoji icon e.g. '🟡'
   * @param {string} title    - Short title e.g. 'VIRTUAL SAFETY CAR'
   * @param {string} msg      - Detail line e.g. 'No overtaking. Hold delta time.'
   * @param {string} headerBg - CSS background for card header e.g. '#f59e0b'
   * @param {string} headerColor - Text colour in header (default '#000')
   */
  function showFlagCard(icon, title, msg, headerBg = '#f59e0b', headerColor = '#000') {
    const card   = document.getElementById('rd-flag-card');
    const header = document.getElementById('rd-flag-card-header');
    const icoEl  = document.getElementById('rd-flag-card-icon');
    const titEl  = document.getElementById('rd-flag-card-title');
    const msgEl  = document.getElementById('rd-flag-card-msg');
    if (!card) return;
    if (icoEl)  icoEl.innerText  = icon;
    if (titEl)  { titEl.innerText = title; titEl.style.color = headerColor; }
    if (msgEl)  msgEl.innerText  = msg;
    if (header) { header.style.background = headerBg; header.style.color = headerColor; }
    card.style.display = 'block';
    // NO screen dim — user does not want the black overlay during flags
  }

  /** Hide the left-side flag card */
  function hideFlagCard() {
    const card = document.getElementById('rd-flag-card');
    if (card) card.style.display = 'none';
  }

  /** Update the top-of-screen flag colour strip */
  function updateFlagStrip(flagType) {
    const strip = document.getElementById('rd-flag-strip');
    if (!strip) return;
    const colors = {
      green:  '#22c55e',
      yellow: '#eab308',
      red:    '#e10600',
      blue:   '#3b82f6',
      vsc:    '#f59e0b',
      none:   'transparent'
    };
    if (flagType === 'none') {
      strip.style.display = 'none';
    } else {
      strip.style.display = 'block';
      strip.style.background = colors[flagType] || 'transparent';
    }
  }

  // ─── Track Limit Detection ──────────────────────────────────────
  function updateTrackLimits(delta) {
    if (!isRaceActive || isStartingSequence || !playerKart || !trackCurve) return;
    if (isPitting) return; // BUG FIX: pit lane IS off the main track — skip while auto-driving in pit
    if (trackLimitCooldown > 0) {
      trackLimitCooldown -= delta;
      return;
    }

    // Get distance from player to nearest track centre-line
    const distToTrack = getDistanceToTrack(playerKart.mesh.position);
    if (distToTrack > TRACK_HALF_WIDTH) {
      trackLimitWarnings++;
      trackLimitCooldown = 2.5;

      const el  = document.getElementById('rd-track-limit-count');
      const hud = document.getElementById('rd-track-limit-hud');
      if (el) el.innerText = trackLimitWarnings;
      if (hud) {
        hud.style.display = 'block';
        clearTimeout(hud._hideTimeout);
        hud._hideTimeout = setTimeout(() => { hud.style.display = 'none'; }, 3000);
      }

      if (trackLimitWarnings < 4) {
        rdShowMessage(`TRACK LIMITS WARNING ${trackLimitWarnings}/4 — ${4 - trackLimitWarnings} REMAINING`, 3.5, '#eab308');
        speakEngineerRadio(`Track limits warning ${trackLimitWarnings}. ${4 - trackLimitWarnings} more before penalty.`, 60);
      } else {
        playerTimePenaltySeconds += 5;
        trackLimitWarnings = 0;
        rdShowMessage(`+5 SECONDS — TRACK LIMITS EXCEEDED`, 5.0, '#e10600');
        speakEngineerRadio('Five second time penalty applied for repeated track limit violations.', 80);
        showPenaltyPopup(`+5 SECONDS`, 'Track Limits — 4 Strikes');
        if (el) el.innerText = 0;
      }
    }
  }

  /** Display penalty popup notification */
  function showPenaltyPopup(title, subtitle, duration = 5000) {
    const popup = document.getElementById('rd-penalty-popup');
    const txt = document.getElementById('rd-penalty-popup-text');
    const sub = document.getElementById('rd-penalty-popup-sub');
    if (!popup || !txt || !sub) return;
    txt.innerText = title;
    sub.innerText = subtitle;
    popup.style.display = 'block';
    clearTimeout(popup._hideTimeout);
    popup._hideTimeout = setTimeout(() => { popup.style.display = 'none'; }, duration);
  }

  // ─── Marshal Sectors ───────────────────────────────────────────
  function getSectorForOffset(t) {
    return Math.floor(t * SECTOR_COUNT) % SECTOR_COUNT;
  }

  function setSectorYellow(sectorIdx, duration = 20.0) {
    sectorFlags[sectorIdx] = 'yellow';
    sectorFlagTimers[sectorIdx] = duration;
  }
  window.getSectorForOffset = getSectorForOffset;
  window.setSectorYellow = setSectorYellow;

  function updateMarshalSectors(delta) {
    let anyYellow = false;
    for (let i = 0; i < SECTOR_COUNT; i++) {
      if (sectorFlags[i] === 'yellow') {
        sectorFlagTimers[i] -= delta;
        if (sectorFlagTimers[i] <= 0) {
          sectorFlags[i] = 'green';
          sectorFlagTimers[i] = 0;
        } else {
          anyYellow = true;
        }
      }
    }
    // Update flag strip if no full-course flag is active
    if (!safetyCarActive && !vscActive && !redFlagActive) {
      updateFlagStrip(anyYellow ? 'yellow' : 'none');
    }
  }

  /** Check if player is in a yellow sector — blocks overtaking */
  function isPlayerInYellowSector() {
    if (!playerKart) return false;
    const sector = getSectorForOffset(playerKart.currentOffset);
    return sectorFlags[sector] === 'yellow';
  }

  // ─── Virtual Safety Car (VSC) ──────────────────────────────────
  function deployVSC(duration = 30.0) {
    if (vscActive || safetyCarActive || redFlagActive) return;
    vscActive = true;
    vscTimer = duration;
    updateFlagStrip('vsc');
    const vscOverlay = document.getElementById('rd-vsc-overlay');
    if (vscOverlay) vscOverlay.style.display = 'block';
    showFlagCard('🟡', 'VIRTUAL SAFETY CAR',
      'Reduce speed. No overtaking.\nMaintain delta time until green.', '#d97706', '#000');
    rdShowMessage('VSC DEPLOYED — DELTA TIME ACTIVE', 5.0, '#f59e0b');
    speakEngineerRadio('Virtual Safety Car deployed. Maintain delta time. No overtaking.', 85);
  }

  function updateVSC(delta) {
    if (!vscActive) return;
    vscTimer -= delta;

    // Cap ALL racer speeds to VSC limit
    if (playerKart) {
      playerKart.speed = Math.min(playerKart.speed, VSC_SPEED_LIMIT);
    }
    racers.forEach(r => {
      if (!r.isPlayer) r.speed = Math.min(r.speed, VSC_SPEED_LIMIT + (Math.random() - 0.5) * 2.0);
    });

    if (vscTimer <= 0) {
      endVSC();
    }
  }

  function endVSC() {
    vscActive = false;
    const vscOverlay = document.getElementById('rd-vsc-overlay');
    if (vscOverlay) vscOverlay.style.display = 'none';
    hideFlagCard();
    updateFlagStrip('none');
    rdShowMessage('GREEN FLAG — VSC ENDING THIS LAP', 4.0, '#22c55e');
    speakEngineerRadio('Virtual Safety Car ending this lap. Prepare to race.', 80);
  }

  // ─── Red Flag ──────────────────────────────────────────────────
  function deployRedFlag(duration = 25.0) {
    if (redFlagActive) return;
    redFlagActive = true;
    redFlagTimer = duration;
    updateFlagStrip('red');
    const rfOverlay = document.getElementById('rd-red-flag-overlay');
    if (rfOverlay) rfOverlay.style.display = 'block';
    showFlagCard('🔴', 'RED FLAG',
      'Race suspended. Reduce speed\nimmediately. Do not overtake.', '#dc2626', '#fff');
    rdShowMessage('RED FLAG — RACE SUSPENDED', 8.0, '#e10600');
    speakEngineerRadio('Red Flag! Race suspended. Reduce speed immediately.', 100);
  }

  function updateRedFlag(delta) {
    if (!redFlagActive) return;
    // Hard freeze all cars
    if (playerKart) playerKart.speed = Math.max(0, playerKart.speed - delta * 80);
    racers.forEach(r => { r.speed = Math.max(0, (r.speed || 0) - delta * 80); });

    redFlagTimer -= delta;
    if (redFlagTimer <= 0 && !redFlagRestartPending) {
      redFlagRestartPending = true;
      const rfOverlay = document.getElementById('rd-red-flag-overlay');
      if (rfOverlay) rfOverlay.style.display = 'none';
      hideFlagCard();
      updateFlagStrip('none');
      
      redFlagActive = false;
      redFlagRestartPending = false;
      
      triggerStandingRestart();
    }
  }

  // ─── Blue Flag (Lapped Cars) ───────────────────────────────────

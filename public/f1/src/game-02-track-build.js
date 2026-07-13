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

    // Player Kart
    const pKartSetup = createProceduralKart(parseInt(activeTeam.color.replace('#', ''), 16), true);
    playerKart = {
      isPlayer: true,
      name: playerDriver.name,
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
    const teammateRacer = {
      isPlayer: false,
      name: mateDriver.name,
      avatar: mateDriver.avatar,
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
      const row = Math.floor(index / 2);
      const sideOffset = index % 2 === 0 ? -1.8 : 1.8;
      const currentOffset = 1.0 - row * 0.009;

      r.currentOffset = currentOffset;
      r.previousTrackProgress = currentOffset;
      r.sideOffset = sideOffset;
      r.posRank = index + 1;
      r.gridStartPos = index + 1;
      r.lastPosRank = index + 1;
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

    const paint = new THREE.MeshStandardMaterial({
      color: driverColor,
      roughness: 0.35,
      metalness: 0.25
    });

    const carbon = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9
    });

    // ==========================
    // Main Chassis
    // ==========================
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 4.8),
      paint
    );
    body.position.y = 0.35;
    body.castShadow = true;
    car.add(body);

    // ==========================
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.25, 2.0),
      paint
    );
    nose.position.set(0, 0.4, 3.2);
    nose.castShadow = true;
    nose.name = "nose";
    car.add(nose);

    // ==========================
    // Front Wing — Full Assembly
    // ==========================
    const WING_WIDTH = 3.2;   // total span matches endplate positions exactly
    const HALF_WING = WING_WIDTH * 0.5; // 1.6 — endplates sit at ±HALF_WING

    const wingCarbon = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    // Main lower blade — the big flat horizontal element
    const mainBlade = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH, 0.07, 0.52),
      wingCarbon
    );
    mainBlade.position.set(0, 0.13, 4.22);
    mainBlade.castShadow = true;
    mainBlade.name = "frontWing";
    car.add(mainBlade);

    // Upper cascade blade — sits above and slightly rearward
    const upperBlade = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH * 0.88, 0.055, 0.38),
      wingCarbon
    );
    upperBlade.position.set(0, 0.25, 4.12);
    upperBlade.castShadow = true;
    car.add(upperBlade);

    // Left + Right endplates — identical height/depth, flush at ±HALF_WING
    [-1, 1].forEach(side => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.38, 0.55),
        wingCarbon
      );
      endplate.position.set(side * HALF_WING, 0.20, 4.22);
      endplate.castShadow = true;
      car.add(endplate);
    });


    // ==========================
    // Cockpit
    // ==========================
    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.45, 1.0),
      carbon
    );
    cockpit.position.set(0, 0.6, 0.4);
    car.add(cockpit);

    // ==========================
    // Driver Shoulders & Helmet (Low Profile, inside Cockpit)
    // ==========================
    const shoulders = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.4),
      paint
    );
    shoulders.position.set(0, 0.62, 0.3);
    car.add(shoulders);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.30, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 })
    );
    helmet.position.set(0, 0.85, 0.35);
    helmet.castShadow = true;
    car.add(helmet);

    const visorGeo = new THREE.SphereGeometry(0.31, 16, 16, 0, Math.PI * 2, 0.4, 0.6);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.05, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.85, 0.45);
    car.add(visor);

    // ==========================
    // Halo
    // ==========================
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.04, 8, 16),
      carbon
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.83, 0.4);
    car.add(halo);

    // ==========================
    // Steering Wheel & Driver Arms
    // ==========================
    const steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.025, 8, 16),
      carbon
    );
    steeringWheel.position.set(0, 0.72, 0.75);
    steeringWheel.rotation.x = Math.PI / 6; // Angled slightly towards the driver
    steeringWheel.name = "steeringWheel";
    car.add(steeringWheel);
    car.steeringWheel = steeringWheel;

    const armMat = paint;
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.45),
      armMat
    );
    leftArm.position.set(-0.25, 0.68, 0.55);
    leftArm.rotation.set(-Math.PI / 12, 0, 0);
    leftArm.name = "leftArm";
    car.add(leftArm);
    car.leftArm = leftArm;

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.45),
      armMat
    );
    rightArm.position.set(0.25, 0.68, 0.55);
    rightArm.rotation.set(-Math.PI / 12, 0, 0);
    rightArm.name = "rightArm";
    car.add(rightArm);
    car.rightArm = rightArm;

    // ==========================
    // Sidepods
    // ==========================
    [-1, 1].forEach(side => {
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.32, 1.7),
        paint
      );
      pod.position.set(side * 0.8, 0.35, -0.1);
      pod.castShadow = true;
      car.add(pod);
    });

    // ==========================
    // Engine Cover
    // ==========================
    const engine = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.55, 1.6),
      paint
    );
    engine.position.set(0, 0.62, -1.1);
    engine.castShadow = true;
    car.add(engine);

    // ==========================
    // Rear Wing (Split Main Plane & DRS Flap)
    // ==========================
    const mainPlane = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.05, 0.45),
      carbon
    );
    mainPlane.position.set(0, 0.88, -2.35);
    mainPlane.castShadow = true;
    mainPlane.name = "rearWing";
    car.add(mainPlane);

    const drsFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.05, 0.40),
      carbon
    );
    drsFlap.position.set(0, 0.98, -2.35);
    drsFlap.castShadow = true;
    drsFlap.name = "drsFlap";
    car.add(drsFlap);
    car.drsFlap = drsFlap; // Store reference to animate it!

    [-1, 1].forEach(side => {
      const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.75, 0.08),
        carbon
      );
      support.position.set(side * 0.95, 0.55, -2.35);
      support.castShadow = true;
      car.add(support);
    });

    // ==========================
    // Wheels
    // ==========================
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.85
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.8,
      roughness: 0.2
    });

    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Default soft red
      roughness: 0.8
    });
    car.tyreBandMat = bandMat; // store on car group so we can access it directly!

    const wheelPos = [
      [-1.1, 0.45, 1.6],
      [1.1, 0.45, 1.6],
      [-1.1, 0.45, -1.5],
      [1.1, 0.45, -1.5]
    ];

    car.wheels = [];
    wheelPos.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(...pos);
      wGroup.originalX = pos[0];

      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.32, 24),
        wheelMat
      );
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wGroup.add(tyre);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.34, 16),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      rim.castShadow = true;
      wGroup.add(rim);

      // Side wall bands for tyre compound visual feedback!
      const sideBandL = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.35, 32),
        bandMat
      );
      sideBandL.position.x = -0.17;
      sideBandL.rotation.y = Math.PI / 2;
      wGroup.add(sideBandL);

      const sideBandR = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.35, 32),
        bandMat
      );
      sideBandR.position.x = 0.17;
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

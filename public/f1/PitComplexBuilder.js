// =========================================================
// PitComplexBuilder.js — Authentic Formula 1 Pit Lane Complex
// Apex Stars Engine V2
// Per-spline-point generation matching authentic F1 layouts:
// - Left Side (-7.0m): Continuous Pit Wall with Team Pit Perches (Glowing Monitors, Seated Principals)
// - Fast Lane (-4.0m to +4.0m): 8.0m wide clean, dark asphalt road (completely clear)
// - Working Apron (+4.0m to +18.0m): 14.0m wide clean concrete apron with Pit Boxes at +9.5m
// - Overhead Gantries: Cantilever booms extending from building facade (ZERO posts on the road!)
// - Garage Complex (+18.0m to +34.0m): Grand high-tech open bays with engineers at side walls
// =========================================================

const GARAGE_WIDTH        = 21.0;
const GARAGE_DEPTH        = 18.0;
const GARAGE_HEIGHT       = 7.5;
const PIT_WALL_OFFSET     = -7.0;
const PIT_WALL_HEIGHT     = 1.1;
const TEAM_BUILDING_DEPTH = 18.0;
const TEAM_BUILDING_HEIGHT= 8.5;
const GRANDSTAND_HEIGHT   = 7.5;

const DEFAULT_TEAMS_PCB = [
  { name: "Ferrari",      code: "FER", color: 0xdc0000, accent: 0xffffff },
  { name: "Mercedes",     code: "MER", color: 0x00d7b6, accent: 0x1a1a1a },
  { name: "Red Bull",     code: "RBR", color: 0x1e2a78, accent: 0xff1e1e },
  { name: "McLaren",      code: "MCL", color: 0xff8000, accent: 0x1a1a1a },
  { name: "Aston Martin", code: "AST", color: 0x00594f, accent: 0xcedc00 },
  { name: "Alpine",       code: "ALP", color: 0x0064ff, accent: 0xff2ec4 },
  { name: "Williams",     code: "WIL", color: 0x00a0de, accent: 0xffffff },
  { name: "Haas",         code: "HAA", color: 0xe6e6e6, accent: 0xdc0000 },
  { name: "RB",           code: "VRB", color: 0x1b2f6b, accent: 0xffffff },
  { name: "Sauber",       code: "SAU", color: 0x00e701, accent: 0x1a1a1a },
];

class PitComplexBuilder {
    constructor(teams = []) {
        this.teams = teams.length > 0 ? teams.map(t => ({
            name: t.name,
            code: (t.code || t.name.substring(0, 3)).toUpperCase(),
            color: typeof t.color === "string" ? parseInt(t.color.replace("#",""), 16) : (t.color || 0xaaaaaa),
            accent: typeof t.accent === "string" ? parseInt(t.accent.replace("#",""), 16) : (t.accent || 0x333333)
        })) : DEFAULT_TEAMS_PCB;
    }

    box(w, h, d, color, metalness = 0.1, roughness = 0.7) {
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color, metalness, roughness })
        );
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
    }

    // ─────────────────────────────────────────────────────
    //  Main entry point — positions elements directly on pitCurve
    // ─────────────────────────────────────────────────────
    buildAlongCurve(pitCurve, scene) {
        const numTeams  = this.teams.length;
        const T_START   = 0.26;
        const T_END     = 0.74;
        const T_RANGE   = T_END - T_START;
        const TEAM_STEP = T_RANGE / numTeams;

        window.f1PitBoxes = [];
        window.f1ActiveGarages = [];

        // ══════════════════════════════════════════════════════
        // 1. ULTRA-WIDE CONTINUOUS CONCRETE WORKING APRON (+4.0m to +18.5m)
        // Seamlessly bridges the fast lane (+4.0m) to the garage entrance (+18.0m)!
        // ══════════════════════════════════════════════════════
        const apronSamples = 60;
        const apronPtsLeft = [];
        const apronPtsRight = [];
        for (let s = 0; s <= apronSamples; s++) {
            const t = 0.18 + (s / apronSamples) * (0.82 - 0.18);
            const pt = pitCurve.getPointAt(t);
            const tang = pitCurve.getTangentAt(t).normalize();
            const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            apronPtsLeft.push(pt.clone().add(norm.clone().multiplyScalar(4.0)));
            apronPtsRight.push(pt.clone().add(norm.clone().multiplyScalar(18.5)));
        }

        const apronGeo = new THREE.BufferGeometry();
        const apronVertices = [];
        const apronUvs = [];
        for (let s = 0; s < apronSamples; s++) {
            const p1 = apronPtsLeft[s];
            const p2 = apronPtsRight[s];
            const p3 = apronPtsLeft[s + 1];
            const p4 = apronPtsRight[s + 1];

            // Tri 1: p1, p2, p3
            apronVertices.push(p1.x, 0.02, p1.z);
            apronVertices.push(p2.x, 0.02, p2.z);
            apronVertices.push(p3.x, 0.02, p3.z);
            apronUvs.push(0, s / apronSamples, 1, s / apronSamples, 0, (s + 1) / apronSamples);

            // Tri 2: p2, p4, p3
            apronVertices.push(p2.x, 0.02, p2.z);
            apronVertices.push(p4.x, 0.02, p4.z);
            apronVertices.push(p3.x, 0.02, p3.z);
            apronUvs.push(1, s / apronSamples, 1, (s + 1) / apronSamples, 0, (s + 1) / apronSamples);
        }
        apronGeo.setAttribute('position', new THREE.Float32BufferAttribute(apronVertices, 3));
        apronGeo.setAttribute('uv', new THREE.Float32BufferAttribute(apronUvs, 2));
        apronGeo.computeVertexNormals();

        const apronMat = new THREE.MeshStandardMaterial({
            color: 0x334155, // Clean high-contrast FIA pit apron concrete
            roughness: 0.85,
            metalness: 0.1
        });
        const apronMesh = new THREE.Mesh(apronGeo, apronMat);
        apronMesh.receiveShadow = true;
        scene.add(apronMesh);

        // ══════════════════════════════════════════════════════
        // 2. PIT WALL & TEAM COMMAND STANDS / PERCHES (LEFT SIDE AT -7.0m)
        // ══════════════════════════════════════════════════════
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xc5cad3, roughness: 0.7 });
        const screenCyanMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x06b6d4, emissiveIntensity: 0.95 });
        const screenGreenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x22c55e, emissiveIntensity: 0.95 });
        const screenYellowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0xfacc15, emissiveIntensity: 0.95 });
        const screenPurpleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0xa855f7, emissiveIntensity: 0.95 });

        // Continuous Concrete Pit Wall (Offset -7.0m, clear of fast lane by 3.0m)
        const wallSamples = 45;
        for (let s = 0; s < wallSamples; s++) {
            const t1 = 0.20 + (s / wallSamples) * (0.80 - 0.20);
            const t2 = 0.20 + ((s + 1) / wallSamples) * (0.80 - 0.20);
            const pt1 = pitCurve.getPointAt(t1);
            const tang1 = pitCurve.getTangentAt(t1).normalize();
            const norm1 = new THREE.Vector3(-tang1.z, 0, tang1.x).normalize();
            const wPos1 = pt1.clone().add(norm1.clone().multiplyScalar(PIT_WALL_OFFSET));

            const pt2 = pitCurve.getPointAt(t2);
            const tang2 = pitCurve.getTangentAt(t2).normalize();
            const norm2 = new THREE.Vector3(-tang2.z, 0, tang2.x).normalize();
            const wPos2 = pt2.clone().add(norm2.clone().multiplyScalar(PIT_WALL_OFFSET));

            const mid = wPos1.clone().lerp(wPos2, 0.5);
            const segLen = wPos1.distanceTo(wPos2);
            if (segLen < 0.1) continue;

            // Pit wall concrete segment
            const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, PIT_WALL_HEIGHT, segLen + 0.05), wallMat);
            wallSeg.position.copy(mid);
            wallSeg.position.y = PIT_WALL_HEIGHT / 2;
            wallSeg.lookAt(wPos2.clone().add(new THREE.Vector3(0, PIT_WALL_HEIGHT / 2, 0)));
            scene.add(wallSeg);

            // Polycarbonate debris fence / safety railing on top of pit wall
            const fence = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.9, segLen + 0.05),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.45, roughness: 0.2 })
            );
            fence.position.copy(mid);
            fence.position.y = PIT_WALL_HEIGHT + 0.45;
            fence.lookAt(wPos2.clone().add(new THREE.Vector3(0, PIT_WALL_HEIGHT + 0.45, 0)));
            scene.add(fence);
        }

        // ══════════════════════════════════════════════════════
        // 3. BUILD INDIVIDUAL TEAM PIT STATIONS, BOXES & GARAGES
        // ══════════════════════════════════════════════════════
        for (let i = 0; i < numTeams; i++) {
            const team = this.teams[i];
            const tCenter = T_START + (i + 0.5) * TEAM_STEP;

            const pos  = pitCurve.getPointAt(tCenter);
            const tang = pitCurve.getTangentAt(tCenter).normalize();
            const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

            // ── TEAM COMMAND PERCH (PIT WALL STAND ON LEFT AT -7.0m) ──
            const perchGroup = new THREE.Group();
            const perchPos = pos.clone().add(norm.clone().multiplyScalar(PIT_WALL_OFFSET));

            // Platform Base sitting on pit wall
            const perchBase = this.box(1.8, 0.15, 3.8, 0x1e293b, 0.5, 0.5);
            perchBase.position.set(0, PIT_WALL_HEIGHT + 0.08, 0);
            perchGroup.add(perchBase);

            // Canopy Roof in team color
            const canopy = this.box(2.0, 0.12, 4.0, team.color);
            canopy.position.set(0, PIT_WALL_HEIGHT + 2.3, 0);
            perchGroup.add(canopy);

            // Canopy Accent Lip
            const canopyLip = this.box(2.05, 0.06, 0.12, team.accent);
            canopyLip.position.set(0, PIT_WALL_HEIGHT + 2.3, 1.95);
            perchGroup.add(canopyLip);

            // Canopy Support Pillars
            [-0.85, 0.85].forEach(cx => {
                [-1.8, 1.8].forEach(cz => {
                    const post = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8),
                        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
                    );
                    post.position.set(cx, PIT_WALL_HEIGHT + 1.15, cz);
                    perchGroup.add(post);
                });
            });

            // Console Desk facing pit lane
            const desk = this.box(0.55, 0.75, 3.4, 0x0f172a, 0.4, 0.6);
            desk.position.set(0.35, PIT_WALL_HEIGHT + 0.5, 0);
            perchGroup.add(desk);

            // Bank of 4 Glowing Telemetry Screens facing the seated engineers
            const screenMats = [screenCyanMat, screenGreenMat, screenYellowMat, screenPurpleMat];
            for (let sc = 0; sc < 4; sc++) {
                const zOffset = -1.2 + sc * 0.8;
                const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.65), screenMats[sc]);
                monitor.position.set(0.35, PIT_WALL_HEIGHT + 1.05, zOffset);
                monitor.rotation.y = -Math.PI / 18;
                perchGroup.add(monitor);

                const mStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x475569 }));
                mStand.position.set(0.35, PIT_WALL_HEIGHT + 0.85, zOffset);
                perchGroup.add(mStand);
            }

            // 3 Seated Crew Engineers (Team Principal, Chief Strategist, Race Engineer)
            const seatedSuitMat = new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.6 });
            const seatedSkinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
            const headsetMat    = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 });

            [-0.9, 0.0, 0.9].forEach(chairZ => {
                const seat = this.box(0.48, 0.8, 0.48, 0x111827);
                seat.position.set(-0.35, PIT_WALL_HEIGHT + 0.55, chairZ);
                perchGroup.add(seat);

                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.45, 0.22), seatedSuitMat);
                torso.position.set(-0.25, PIT_WALL_HEIGHT + 0.85, chairZ);
                torso.rotation.z = Math.PI / 24;
                perchGroup.add(torso);

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), seatedSkinMat);
                head.position.set(-0.22, PIT_WALL_HEIGHT + 1.15, chairZ);
                perchGroup.add(head);

                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 14), seatedSuitMat);
                cap.position.set(-0.22, PIT_WALL_HEIGHT + 1.22, chairZ);
                perchGroup.add(cap);

                const hs = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 14), headsetMat);
                hs.position.set(-0.22, PIT_WALL_HEIGHT + 1.16, chairZ);
                hs.rotation.y = Math.PI / 2;
                perchGroup.add(hs);
            });

            perchGroup.position.copy(perchPos);
            perchGroup.lookAt(perchPos.clone().add(norm)); // Faces across the pit road towards garages
            scene.add(perchGroup);

            // ── CLEAN WIDE F1 PIT BOX ON APRON (+9.5m offset, 5.5m clear of fast lane) ──
            const pitBoxGroup = new THREE.Group();
            const boxPos = pos.clone().add(norm.clone().multiplyScalar(9.5));

            // High-contrast textured pit box ground pad
            const pitBoxPad = new THREE.Mesh(
                new THREE.PlaneGeometry(7.2, 8.2),
                new THREE.MeshStandardMaterial({
                    color: 0x1e293b,
                    roughness: 0.65,
                    metalness: 0.2,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -1
                })
            );
            pitBoxPad.rotation.x = -Math.PI / 2;
            pitBoxPad.position.set(0, 0.025, 0);
            pitBoxPad.receiveShadow = true;
            pitBoxGroup.add(pitBoxPad);

            // Clean, flush white painted box outline (Wide 7.2m x 8.2m F1 regulation box)
            const boxOutlineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.90 });
            const boxStripeMat  = new THREE.MeshBasicMaterial({ color: team.color, transparent: true, opacity: 0.90 });

            const boxHalfW = 3.6;
            const boxHalfL = 4.1;

            // Box boundary rectangle lines flat on concrete
            const boxL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, boxHalfL * 2), boxOutlineMat);
            boxL.rotation.x = -Math.PI / 2;
            boxL.position.set(-boxHalfW, 0.035, 0);
            pitBoxGroup.add(boxL);

            const boxR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, boxHalfL * 2), boxOutlineMat);
            boxR.rotation.x = -Math.PI / 2;
            boxR.position.set(boxHalfW, 0.035, 0);
            pitBoxGroup.add(boxR);

            const boxFront = new THREE.Mesh(new THREE.PlaneGeometry(boxHalfW * 2 + 0.18, 0.18), boxOutlineMat);
            boxFront.rotation.x = -Math.PI / 2;
            boxFront.position.set(0, 0.035, boxHalfL);
            pitBoxGroup.add(boxFront);

            const boxRear = new THREE.Mesh(new THREE.PlaneGeometry(boxHalfW * 2 + 0.18, 0.18), boxOutlineMat);
            boxRear.rotation.x = -Math.PI / 2;
            boxRear.position.set(0, 0.035, -boxHalfL);
            pitBoxGroup.add(boxRear);

            // Team color accent band across pit stop entry
            const teamChevrons = new THREE.Mesh(new THREE.PlaneGeometry(boxHalfW * 1.8, 0.50), boxStripeMat);
            teamChevrons.rotation.x = -Math.PI / 2;
            teamChevrons.position.set(0, 0.038, -boxHalfL + 0.6);
            pitBoxGroup.add(teamChevrons);

            // Front yellow hazard stop line where the front wing stops
            const stopBar = new THREE.Mesh(new THREE.PlaneGeometry(boxHalfW * 1.6, 0.30), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 }));
            stopBar.rotation.x = -Math.PI / 2;
            stopBar.position.set(0, 0.038, 1.8);
            pitBoxGroup.add(stopBar);

            // Flat wheel stop brackets (flat 2D decals on ground)
            const stopMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 });
            [[-1.6, 1.6], [1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]].forEach(([sx, sz]) => {
                const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.70), stopMarkMat);
                mark.rotation.x = -Math.PI / 2;
                mark.position.set(sx, 0.038, sz);
                pitBoxGroup.add(mark);
            });

            // ── PIT CREW ACTIVE ON APRON AT PIT BOX (Wheel Gunners & Jack Mechanics) ──
            const apronCrewMat = new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.5 });
            const apronTrouserMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
            const apronSkinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
            const createApronMechanic = (px, pz, protY, hasGun = false) => {
                const mech = new THREE.Group();
                const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), apronTrouserMat);
                lLeg.position.set(-0.09, 0.32, 0);
                mech.add(lLeg);
                const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), apronTrouserMat);
                rLeg.position.set(0.09, 0.32, 0);
                mech.add(rLeg);

                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.22), apronCrewMat);
                torso.position.set(0, 0.85, 0);
                mech.add(torso);

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), apronSkinMat);
                head.position.set(0, 1.22, 0);
                mech.add(head);

                const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), apronCrewMat);
                helm.position.set(0, 1.25, 0);
                mech.add(helm);

                if (hasGun) {
                    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.35), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
                    gun.position.set(0.2, 0.70, 0.25);
                    mech.add(gun);
                }

                mech.position.set(px, 0.03, pz);
                mech.rotation.y = protY;
                return mech;
            };

            // 6 active pit crew members stationed around the box
            const pitBoxCrew = [
                createApronMechanic(-2.4, 1.6, Math.PI / 2, true),   // Front Left Gunner
                createApronMechanic(2.4, 1.6, -Math.PI / 2, true),   // Front Right Gunner
                createApronMechanic(-2.4, -1.6, Math.PI / 2, true),  // Rear Left Gunner
                createApronMechanic(2.4, -1.6, -Math.PI / 2, true),  // Rear Right Gunner
                createApronMechanic(0.0, 3.2, Math.PI, false),       // Front Jack Engineer
                createApronMechanic(0.0, -3.2, 0.0, false),          // Rear Jack Engineer
                createApronMechanic(-2.8, 0.0, Math.PI / 2, false)   // Team Controller / Chief Mechanic
            ];
            pitBoxCrew.forEach(m => pitBoxGroup.add(m));

            // ── HIGH OVERHEAD CANTILEVER BOOM (NO POSTS ON THE ROAD!) ──
            // Boom originates safely at the garage facade (+8.5m from box = +18.0m) and reaches over the pit box
            const gantryPostMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.3 });
            
            // High horizontal boom arm spanning at y = 5.2m from facade to center of pit box
            const boomArm = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.16, 0.16), gantryPostMat);
            boomArm.position.set(4.25, 5.2, 0);
            pitBoxGroup.add(boomArm);

            // Status light pod directly above center of car at y = 4.8m
            const lightPod = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.3), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
            lightPod.position.set(0, 4.8, 0);
            pitBoxGroup.add(lightPod);

            // Team color band on gantry pod
            const podBand = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.32), new THREE.MeshStandardMaterial({ color: team.color }));
            podBand.position.set(0, 5.05, 0);
            pitBoxGroup.add(podBand);

            const redLed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 1.0
            }));
            redLed.position.set(0, 4.95, 0.16);
            pitBoxGroup.add(redLed);

            const greenLed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({
                color: 0x004400,
                emissive: 0x00ff00,
                emissiveIntensity: 0.05
            }));
            greenLed.position.set(0, 4.65, 0.16);
            pitBoxGroup.add(greenLed);

            pitBoxGroup.redLed = redLed;
            pitBoxGroup.greenLed = greenLed;

            pitBoxGroup.position.copy(boxPos);
            pitBoxGroup.lookAt(boxPos.clone().add(tang));
            scene.add(pitBoxGroup);

            window.f1PitBoxes.push({
                teamIndex: i,
                position: boxPos,
                group: pitBoxGroup,
                tProgress: tCenter
            });

            // ── DEDICATED DOUBLE-BAY CONSTRUCTOR GARAGE (Width 21.0m, Center at +26.0m, Front entrance at +17.0m) ──
            const garagePos = pos.clone().add(norm.clone().multiplyScalar(26.0));
            garagePos.y = GARAGE_HEIGHT / 2;

            const garageGroup = new THREE.Group();

            // Back wall spanning entire 21m width (located at local -Z away from track)
            const backWall = this.box(GARAGE_WIDTH - 0.1, GARAGE_HEIGHT, 0.3, 0x1e293b);
            backWall.position.set(0, 0, -GARAGE_DEPTH / 2);
            garageGroup.add(backWall);

            // Illuminated Driver Signboards on Back Wall: Bay 1 (Left: Car 1) and Bay 2 (Right: Car 2)
            [-5.25, 5.25].forEach((bayX, bayIdx) => {
                const baySignboard = new THREE.Mesh(
                    new THREE.BoxGeometry(7.5, 1.2, 0.15),
                    new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.2, metalness: 0.8 })
                );
                baySignboard.position.set(bayX, 1.8, -GARAGE_DEPTH / 2 + 0.2);
                garageGroup.add(baySignboard);

                const teamStripeBack = new THREE.Mesh(
                    new THREE.BoxGeometry(7.7, 0.18, 0.18),
                    new THREE.MeshStandardMaterial({ color: team.color, emissive: team.color, emissiveIntensity: 0.9 })
                );
                teamStripeBack.position.set(bayX, 2.45, -GARAGE_DEPTH / 2 + 0.22);
                garageGroup.add(teamStripeBack);

                const bayIdPlaque = new THREE.Mesh(
                    new THREE.BoxGeometry(1.6, 0.45, 0.2),
                    new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: team.accent, emissiveIntensity: 0.6 })
                );
                bayIdPlaque.position.set(bayX, 2.9, -GARAGE_DEPTH / 2 + 0.22);
                garageGroup.add(bayIdPlaque);
            });

            // ── INTERNAL CENTER DIVIDING PARTITION WALL SPLITTING GARAGE INTO TWO BAYS (x = 0) ──
            const centerDivider = this.box(0.35, GARAGE_HEIGHT - 0.2, GARAGE_DEPTH - 1.2, 0x1e293b);
            centerDivider.position.set(0, 0, -0.4);
            garageGroup.add(centerDivider);

            const centerLivery = this.box(0.38, 0.45, GARAGE_DEPTH - 1.4, team.color);
            centerLivery.position.set(0, 0.4, -0.4);
            garageGroup.add(centerLivery);

            const centerKick = this.box(0.38, 0.30, GARAGE_DEPTH - 1.4, 0x0f172a);
            centerKick.position.set(0, -GARAGE_HEIGHT / 2 + 0.15, -0.4);
            garageGroup.add(centerKick);

            const centerLightCove = new THREE.Mesh(
                new THREE.BoxGeometry(0.38, 0.10, GARAGE_DEPTH - 1.4),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.85 })
            );
            centerLightCove.position.set(0, GARAGE_HEIGHT / 2 - 0.25, -0.4);
            garageGroup.add(centerLightCove);

            // Double-sided telemetry monitor banks mounted on center partition facing both bays
            [-1, 1].forEach(side => {
                const mon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 1.0, 2.2),
                    new THREE.MeshStandardMaterial({ color: 0x090d16, emissive: 0x06b6d4, emissiveIntensity: 0.8 })
                );
                mon.position.set(side * 0.24, 0.6, 0.0);
                garageGroup.add(mon);
            });

            // Center entrance arch pillar between Bay 1 & Bay 2
            const centerPillar = this.box(0.65, GARAGE_HEIGHT, 1.4, 0x334155);
            centerPillar.position.set(0, 0, GARAGE_DEPTH / 2 - 0.7);
            garageGroup.add(centerPillar);

            // FULL DIVIDING PARTITION WALLS BETWEEN DIFFERENT TEAM CONSTRUCTOR BUILDINGS (Left & Right)
            [-GARAGE_WIDTH / 2, GARAGE_WIDTH / 2].forEach(colX => {
                const dividerWall = this.box(0.35, GARAGE_HEIGHT - 0.1, GARAGE_DEPTH - 0.3, 0x1e293b);
                dividerWall.position.set(colX, 0, 0);
                garageGroup.add(dividerWall);

                const liveryStripe = this.box(0.38, 0.45, GARAGE_DEPTH - 0.4, team.color);
                liveryStripe.position.set(colX, 0.4, 0);
                garageGroup.add(liveryStripe);

                const kickPlate = this.box(0.38, 0.30, GARAGE_DEPTH - 0.4, 0x0f172a);
                kickPlate.position.set(colX, -GARAGE_HEIGHT / 2 + 0.15, 0);
                garageGroup.add(kickPlate);

                const wallLightCove = new THREE.Mesh(
                    new THREE.BoxGeometry(0.38, 0.10, GARAGE_DEPTH - 1.0),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
                );
                wallLightCove.position.set(colX, GARAGE_HEIGHT / 2 - 0.25, 0);
                garageGroup.add(wallLightCove);

                const frontColumn = this.box(0.55, GARAGE_HEIGHT, 1.4, 0x334155);
                frontColumn.position.set(colX, 0, GARAGE_DEPTH / 2 - 0.7);
                garageGroup.add(frontColumn);
            });

            // High Cathedral Ceiling Roof spanning 21m
            const roof = this.box(GARAGE_WIDTH, 0.3, GARAGE_DEPTH, 0x0f172a);
            roof.position.set(0, GARAGE_HEIGHT / 2, 0);
            garageGroup.add(roof);

            // Polished Dark Epoxy Garage Floor across both bays
            const epoxyFloor = new THREE.Mesh(
                new THREE.BoxGeometry(GARAGE_WIDTH, 0.08, GARAGE_DEPTH),
                new THREE.MeshStandardMaterial({ color: 0x181e28, roughness: 0.25, metalness: 0.4 })
            );
            epoxyFloor.position.set(0, -GARAGE_HEIGHT / 2 + 0.04, 0);
            epoxyFloor.receiveShadow = true;
            garageGroup.add(epoxyFloor);

            // Dedicated Overhead Linear LED Ceiling Lights for Bay 1 (x = -5.25m) and Bay 2 (x = +5.25m)
            [-5.25, 5.25].forEach(bayCenterX => {
                for (let l = -6.0; l <= 6.0; l += 2.5) {
                    const ledStrip = new THREE.Mesh(
                        new THREE.BoxGeometry(7.8, 0.06, 0.25),
                        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 })
                    );
                    ledStrip.position.set(bayCenterX, GARAGE_HEIGHT / 2 - 0.15, l);
                    garageGroup.add(ledStrip);
                }
            });

            // High-Tech Diagnostics & Tool Trolleys along outer side walls
            [-1, 1].forEach(side => {
                const wallX = side * (GARAGE_WIDTH / 2 - 0.6);
                for (let s = -5.5; s <= 5.5; s += 3.5) {
                    const cabinet = this.box(0.8, 1.1, 1.6, side === -1 ? team.color : 0x1f2937, 0.4, 0.5);
                    cabinet.position.set(wallX, -GARAGE_HEIGHT / 2 + 0.55, s);
                    garageGroup.add(cabinet);

                    const diagScreen = new THREE.Mesh(
                        new THREE.BoxGeometry(0.08, 1.1, 1.8),
                        new THREE.MeshStandardMaterial({ color: 0x090d16, emissive: 0x06b6d4, emissiveIntensity: 0.7 })
                    );
                    diagScreen.position.set(side * (GARAGE_WIDTH / 2 - 0.12), 0.7, s);
                    garageGroup.add(diagScreen);
                }
            });

            // ── Mechanics inside garage positioned cleanly around Bay 1 and Bay 2 ──
            const crewMat = new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.6 });
            const trousersMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
            const headsetEngMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });

            const createGarageMechanic = (x, z, rotY, role) => {
                const person = new THREE.Group();
                person.baseX = x;
                person.baseZ = z;
                person.role = role;

                const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), trousersMat);
                legL.position.set(-0.1, 0.32, 0);
                person.add(legL);
                const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), trousersMat);
                legR.position.set(0.1, 0.32, 0);
                person.add(legR);

                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.22), crewMat);
                torso.position.set(0, 0.85, 0);
                person.add(torso);

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), skinMat);
                head.position.set(0, 1.22, 0);
                person.add(head);

                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14), crewMat);
                cap.position.set(0, 1.30, 0);
                person.add(cap);

                const hs = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 14), headsetEngMat);
                hs.position.set(0, 1.24, 0);
                hs.rotation.z = Math.PI / 2;
                person.add(hs);

                const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), crewMat);
                armL.position.set(-0.25, 0.82, 0.05);
                person.add(armL);

                const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), crewMat);
                armR.position.set(0.25, 0.82, 0.05);
                person.add(armR);

                if (role === 'telemetry') {
                    const tablet = new THREE.Mesh(
                        new THREE.BoxGeometry(0.24, 0.18, 0.02),
                        new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 })
                    );
                    tablet.position.set(0, 0.82, 0.22);
                    tablet.rotation.x = -Math.PI / 4;
                    person.add(tablet);
                }

                person.position.set(x, -GARAGE_HEIGHT / 2, z);
                person.rotation.y = rotY;
                return person;
            };

            // Mechanics stationed around Bay 1 (x = -5.25m) and Bay 2 (x = +5.25m)
            const mechanics = [
                // Bay 1 Crew (Left Car)
                createGarageMechanic(-7.2, 3.2, Math.PI / 2, 'aero_front_l'),
                createGarageMechanic(-3.3, 3.2, -Math.PI / 2, 'aero_front_r'),
                createGarageMechanic(-7.5, 1.8, Math.PI / 2, 'telemetry'),
                createGarageMechanic(-3.0, 1.8, -Math.PI / 2, 'mechanic_r'),
                createGarageMechanic(-7.2, 0.5, Math.PI / 2, 'tyre_l'),
                createGarageMechanic(-3.3, 0.5, -Math.PI / 2, 'tyre_r'),
                createGarageMechanic(-5.25, 4.8, Math.PI, 'front_jack'),

                // Bay 2 Crew (Right Car)
                createGarageMechanic(3.3, 3.2, Math.PI / 2, 'aero_front_l2'),
                createGarageMechanic(7.2, 3.2, -Math.PI / 2, 'aero_front_r2'),
                createGarageMechanic(3.0, 1.8, Math.PI / 2, 'telemetry2'),
                createGarageMechanic(7.5, 1.8, -Math.PI / 2, 'mechanic_r2'),
                createGarageMechanic(3.3, 0.5, Math.PI / 2, 'tyre_l2'),
                createGarageMechanic(7.2, 0.5, -Math.PI / 2, 'tyre_r2'),
                createGarageMechanic(5.25, 4.8, Math.PI, 'front_jack2')
            ];

            garageGroup.mechanics = mechanics;
            mechanics.forEach(m => garageGroup.add(m));

            window.f1ActiveGarages.push(garageGroup);

            garageGroup.position.copy(garagePos);
            garageGroup.lookAt(garagePos.clone().sub(norm)); // Faces forward towards the apron & track
            scene.add(garageGroup);

            // ── DUAL GARAGE BAY PORTAL ENTRANCES (Bay 1 & Bay 2) AT +17.0m ──
            const doorPos = garagePos.clone().sub(norm.clone().multiplyScalar(GARAGE_DEPTH / 2 - 0.1));
            
            [-5.25, 5.25].forEach(bayX => {
                const bayDoorPos = doorPos.clone().add(tang.clone().multiplyScalar(bayX));
                
                // Raised shutter at top of portal
                const shutter = this.box(9.2, 1.0, 0.25, 0x111827);
                shutter.position.copy(bayDoorPos);
                shutter.position.y = GARAGE_HEIGHT - 0.6;
                shutter.lookAt(bayDoorPos.clone().sub(norm));
                scene.add(shutter);

                // Illuminated team banner above bay opening
                const band = this.box(9.4, 1.2, 0.22, team.color);
                band.position.copy(bayDoorPos);
                band.position.y = GARAGE_HEIGHT - 1.4;
                band.lookAt(bayDoorPos.clone().sub(norm));
                scene.add(band);

                // LED glow line under team band
                const ledStrip = new THREE.Mesh(
                    new THREE.PlaneGeometry(9.0, 0.25),
                    new THREE.MeshStandardMaterial({ color: team.accent, emissive: team.accent, emissiveIntensity: 1.0 })
                );
                const ledPos = bayDoorPos.clone().add(norm.clone().multiplyScalar(-0.15));
                ledPos.y = GARAGE_HEIGHT - 2.05;
                ledStrip.position.copy(ledPos);
                ledStrip.lookAt(ledPos.clone().sub(norm));
                scene.add(ledStrip);
            });

            // ── Team Motorhome / Hospitality Building behind Garage (Width 21m) ──
            const bldgPos = garagePos.clone().add(norm.clone().multiplyScalar(GARAGE_DEPTH / 2 + TEAM_BUILDING_DEPTH / 2));
            bldgPos.y = TEAM_BUILDING_HEIGHT / 2;
            const bldg = this.box(GARAGE_WIDTH, TEAM_BUILDING_HEIGHT, TEAM_BUILDING_DEPTH, 0x94a3b8);
            bldg.position.copy(bldgPos);
            bldg.lookAt(bldgPos.clone().sub(norm));
            scene.add(bldg);

            // Glass facade on upper floor of motorhome
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(GARAGE_WIDTH - 1.0, 3.2, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.6, roughness: 0.1 })
            );
            const glassPos = bldgPos.clone().sub(norm.clone().multiplyScalar(TEAM_BUILDING_DEPTH / 2 + 0.1));
            glassPos.y = TEAM_BUILDING_HEIGHT - 2.2;
            glass.position.copy(glassPos);
            glass.lookAt(glassPos.clone().sub(norm));
            scene.add(glass);
        }
    }
}

if (typeof window !== "undefined") {
    window.PitComplexBuilder = PitComplexBuilder;
}

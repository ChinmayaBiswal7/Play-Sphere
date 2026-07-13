// =========================================================
// PitComplexBuilder.js  —  REWRITTEN
// Apex Stars Engine V2
// Per-spline-point garage generation
// Each garage/element is positioned directly on the pitCurve
// so it always aligns with the real track regardless of orientation
// =========================================================

const GARAGE_WIDTH        = 8;
const GARAGE_DEPTH        = 14;
const GARAGE_HEIGHT       = 6.5;
const PIT_WALL_HEIGHT     = 0.9;
const TEAM_BUILDING_DEPTH = 18;
const TEAM_BUILDING_HEIGHT= 9;
const GRANDSTAND_HEIGHT   = 8;

const DEFAULT_TEAMS_PCB = [
  { name: "Ferrari",      color: 0xdc0000, accent: 0xffffff },
  { name: "Mercedes",     color: 0x00d7b6, accent: 0x1a1a1a },
  { name: "Red Bull",     color: 0x1e2a78, accent: 0xff1e1e },
  { name: "McLaren",      color: 0xff8000, accent: 0x1a1a1a },
  { name: "Aston Martin", color: 0x00594f, accent: 0xcedc00 },
  { name: "Alpine",       color: 0x0064ff, accent: 0xff2ec4 },
  { name: "Williams",     color: 0x00a0de, accent: 0xffffff },
  { name: "Haas",         color: 0xe6e6e6, accent: 0xdc0000 },
  { name: "RB",           color: 0x1b2f6b, accent: 0xffffff },
  { name: "Sauber",       color: 0x00e701, accent: 0x1a1a1a },
];

class PitComplexBuilder {
    constructor(teams = []) {
        this.teams = teams.length > 0 ? teams.map(t => ({
            name: t.name,
            color: typeof t.color === "string" ? parseInt(t.color.replace("#",""), 16) : (t.color || 0xaaaaaa),
            accent: typeof t.accent === "string" ? parseInt(t.accent.replace("#",""), 16) : (t.accent || 0x333333)
        })) : DEFAULT_TEAMS_PCB;
    }

    box(w, h, d, color) {
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
        );
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
    }

    // ─────────────────────────────────────────────────────
    //  Main entry point — now takes the pitCurve so every
    //  element is spawned directly on the spline.
    // ─────────────────────────────────────────────────────
    buildAlongCurve(pitCurve, scene) {
        const numTeams  = this.teams.length;
        // Garages span the parallel section of the tapered pit curve (t = 0.28 to 0.72)
        const T_START   = 0.28;
        const T_END     = 0.72;
        const T_RANGE   = T_END - T_START;
        const TEAM_STEP = T_RANGE / numTeams;

        for (let i = 0; i < numTeams; i++) {
            const team = this.teams[i];
            const tCenter = T_START + (i + 0.5) * TEAM_STEP;
            const tLeft   = T_START + i * TEAM_STEP;
            const tRight  = T_START + (i + 1) * TEAM_STEP;

            const pos  = pitCurve.getPointAt(tCenter);
            const tang = pitCurve.getTangentAt(tCenter).normalize();
            // Outward normal from pitCurve (same convention used when building pitCurve)
            const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

            // ── Pit box colour marking (on working lane surface) ──────────
            const boxMark = new THREE.Mesh(
                new THREE.PlaneGeometry(GARAGE_WIDTH - 0.4, 5.5),
                new THREE.MeshStandardMaterial({ color: team.color, transparent: true, opacity: 0.4 })
            );
            boxMark.rotation.x = -Math.PI / 2;
            boxMark.position.copy(pos).add(norm.clone().multiplyScalar(6.0));
            boxMark.position.y = 0.08;
            scene.add(boxMark);

            // ── Garage body (Hollow Room for interior camera / car placement) ──
            // Place garage 17m outward from pitCurve (= behind working lane outer edge)
            const garagePos = pos.clone().add(norm.clone().multiplyScalar(17.0));
            garagePos.y = GARAGE_HEIGHT / 2;

            const garageGroup = new THREE.Group();
            
            // Back wall (rear of garage)
            const backWall = this.box(GARAGE_WIDTH - 0.3, GARAGE_HEIGHT, 0.2, 0xd0d0d0);
            backWall.position.set(0, 0, -GARAGE_DEPTH / 2);
            garageGroup.add(backWall);

            // Left wall
            const leftWall = this.box(0.2, GARAGE_HEIGHT, GARAGE_DEPTH, 0xc0c0c0);
            leftWall.position.set(-GARAGE_WIDTH / 2, 0, 0);
            garageGroup.add(leftWall);

            // Right wall
            const rightWall = this.box(0.2, GARAGE_HEIGHT, GARAGE_DEPTH, 0xc0c0c0);
            rightWall.position.set(GARAGE_WIDTH / 2, 0, 0);
            garageGroup.add(rightWall);

            // Roof
            const garageRoof = this.box(GARAGE_WIDTH - 0.3, 0.2, GARAGE_DEPTH, 0xa0a0a0);
            garageRoof.position.set(0, GARAGE_HEIGHT / 2, 0);
            garageGroup.add(garageRoof);

            garageGroup.position.copy(garagePos);
            garageGroup.lookAt(garagePos.clone().sub(norm)); // faces track
            scene.add(garageGroup);

            // ── Garage door (shutter raised/open at the top of the entrance) ──
            const doorPos = garagePos.clone().sub(norm.clone().multiplyScalar(GARAGE_DEPTH / 2 - 0.1));
            doorPos.y = GARAGE_HEIGHT - 0.8; // raised shutter at the ceiling
            const door = this.box(GARAGE_WIDTH - 1.2, 1.2, 0.3, 0x111111);
            door.position.copy(doorPos);
            door.lookAt(doorPos.clone().sub(norm));
            scene.add(door);

            // ── Team colour band above door ───────────────────────────────
            const bandPos = doorPos.clone();
            bandPos.y = GARAGE_HEIGHT - 1.2;
            const band = this.box(GARAGE_WIDTH - 0.2, 1.4, 0.25, team.color);
            band.position.copy(bandPos);
            band.lookAt(bandPos.clone().sub(norm));
            scene.add(band);

            // ── LED accent strip ──────────────────────────────────────────
            const ledMat = new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: new THREE.Color(team.accent),
                emissiveIntensity: 0.7
            });
            const ledGeo = new THREE.PlaneGeometry(GARAGE_WIDTH - 2, 1.0);
            const led = new THREE.Mesh(ledGeo, ledMat);
            const ledPos = doorPos.clone().add(norm.clone().multiplyScalar(-0.05));
            ledPos.y = GARAGE_HEIGHT - 2.8;
            led.position.copy(ledPos);
            led.lookAt(ledPos.clone().sub(norm));
            scene.add(led);

            // ── Roof ──────────────────────────────────────────────────────
            const roofPos = garagePos.clone();
            roofPos.y = GARAGE_HEIGHT + 0.2;
            const roof = this.box(GARAGE_WIDTH, 0.4, GARAGE_DEPTH + 2, 0x555555);
            roof.position.copy(roofPos);
            roof.lookAt(roofPos.clone().sub(norm));
            scene.add(roof);

            // ── Pillar at left edge of garage ─────────────────────────────
            const leftEdge = garagePos.clone().add(tang.clone().multiplyScalar(GARAGE_WIDTH / 2));
            leftEdge.y = GARAGE_HEIGHT / 2;
            const pillar = this.box(0.5, GARAGE_HEIGHT, 0.5, 0x888888);
            pillar.position.copy(leftEdge);
            scene.add(pillar);

            // ── Tyre stack ────────────────────────────────────────────────
            const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            for (let t2 = 0; t2 < 3; t2++) {
                const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.20, 8, 16), tyreMat);
                tyre.rotation.x = Math.PI / 2;
                const tyrePos = doorPos.clone()
                    .add(tang.clone().multiplyScalar(-(GARAGE_WIDTH / 2 - 1.0)))
                    .add(norm.clone().multiplyScalar(-0.5));
                tyrePos.y = 0.5 + t2 * 0.44;
                tyre.position.copy(tyrePos);
                scene.add(tyre);
            }

            // ── Team building behind garage ───────────────────────────────
            const bldgPos = garagePos.clone().add(norm.clone().multiplyScalar(GARAGE_DEPTH / 2 + TEAM_BUILDING_DEPTH / 2));
            bldgPos.y = TEAM_BUILDING_HEIGHT / 2;
            const bldg = this.box(GARAGE_WIDTH, TEAM_BUILDING_HEIGHT, TEAM_BUILDING_DEPTH, 0xa0a0a8);
            bldg.position.copy(bldgPos);
            bldg.lookAt(bldgPos.clone().sub(norm));
            scene.add(bldg);

            // ── Grandstand tiers behind team building ─────────────────────
            const gsSteps = 5;
            for (let s = 0; s < gsSteps; s++) {
                const stepD = 3.0;
                const stepH = GRANDSTAND_HEIGHT / gsSteps;
                const stepPos = bldgPos.clone().add(
                    norm.clone().multiplyScalar(TEAM_BUILDING_DEPTH / 2 + s * stepD + stepD / 2)
                );
                stepPos.y = stepH / 2 + s * stepH;
                const step = this.box(GARAGE_WIDTH, stepH, stepD, s % 2 === 0 ? 0x55557a : 0x4a4a68);
                step.position.copy(stepPos);
                step.lookAt(stepPos.clone().sub(norm));
                scene.add(step);
            }
        }

        // ── Last pillar at right edge of final garage ─────────────────────
        const tLast = T_START + numTeams * TEAM_STEP;
        const posLast  = pitCurve.getPointAt(Math.min(tLast, T_END));
        const tangLast = pitCurve.getTangentAt(Math.min(tLast, T_END)).normalize();
        const normLast = new THREE.Vector3(-tangLast.z, 0, tangLast.x).normalize();
        const garageLastPos = posLast.clone().add(normLast.clone().multiplyScalar(17.0));
        garageLastPos.y = GARAGE_HEIGHT / 2;
        const lastPillar = this.box(0.5, GARAGE_HEIGHT, 0.5, 0x888888);
        lastPillar.position.copy(garageLastPos);
        scene.add(lastPillar);
    }

    // Legacy build() — returns an empty group (no longer used)
    build() {
        return new THREE.Group();
    }
}
window.PitComplexBuilder = PitComplexBuilder;

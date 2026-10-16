// 🇲🇨 Circuit de Monaco — Monte Carlo, Monaco
// Official F1 Circuit Data (Length: 3.337 km, 19 Corners)
window.MONACO = {
  id: 4,
  name: "Circuit de Monaco",
  fullName: "Circuit de Monaco - Monte Carlo",
  location: "Monte Carlo, Monaco",
  country: "Monaco",
  flag: "🇲🇨",
  length: 3337,
  officialLengthKm: "3.337 km",
  cornersCount: 19,
  firstGP: 1950,
  racesHeld: 70,
  lapRecord: "1:12.909 (Lewis Hamilton, 2021)",
  laps: 12,
  roadWidth: 14.5,
  pitWidth: 6,
  theme: "riviera",
  skyTopColor: 0x0284c7,
  skyBottomColor: 0xbae6fd,
  fogColor: 0xdbeafe,
  startGrid: 16,
  drsZones: [
    { detect: 0.94, activate: 0.01 } // Main Straight DRS Zone
  ],
  trackPoints: [
    // ── 1. Start / Finish Pit Straight (Boulevard Albert 1er heading South: -Z) ──
    new THREE.Vector3(-574.3, 0.2, 82.0),
    new THREE.Vector3(-574.3, 0.2, 16.4),
    new THREE.Vector3(-574.3, 0.2, -49.2),
    new THREE.Vector3(-571.0, 0.3, -114.9),
    new THREE.Vector3(-561.2, 0.6, -172.3),

    // ── 2. Turn 1: Sainte Dévote (90° turn into church valley) ──
    new THREE.Vector3(-541.5, 1.5, -221.5),
    new THREE.Vector3(-508.6, 3.2, -237.9),
    new THREE.Vector3(-459.4, 5.8, -229.7),

    // ── 3. Turn 2: Beau Rivage (Steep uphill climb along Avenue d'Ostende heading East: +X) ──
    new THREE.Vector3(-344.6, 12.0, -216.6),
    new THREE.Vector3(-196.9, 21.0, -205.1),
    new THREE.Vector3(-32.8, 30.0, -193.6),
    new THREE.Vector3(131.3, 37.5, -183.8),
    new THREE.Vector3(246.1, 41.0, -180.5),

    // ── 4. Turn 3: Massenet (Long sweeping left curve around Casino gardens) ──
    new THREE.Vector3(352.8, 42.5, -183.8),
    new THREE.Vector3(434.8, 42.5, -164.1),
    new THREE.Vector3(475.8, 42.0, -123.1),

    // ── 5. Turn 4: Casino Square (Place du Casino: Past Grand Casino heading North: +Z) ──
    new THREE.Vector3(484.0, 41.5, -73.8),
    new THREE.Vector3(475.8, 41.0, -16.4),
    new THREE.Vector3(451.2, 37.5, 41.0),

    // ── 6. Turn 5: Mirabeau Haute (Turn plunging steeply downhill) ──
    new THREE.Vector3(434.8, 31.0, 82.0),
    new THREE.Vector3(443.0, 25.0, 123.1),
    new THREE.Vector3(426.6, 20.0, 155.9),

    // ── 7. Turn 6: Fairmont Hairpin (180° tightest hairpin in F1 around Fairmont hotel) ──
    new THREE.Vector3(406.9, 17.0, 180.5),
    new THREE.Vector3(426.6, 14.8, 210.0),
    new THREE.Vector3(449.6, 13.5, 196.9),
    new THREE.Vector3(426.6, 12.0, 167.4),

    // ── 8. Turn 7: Mirabeau Bas (Flick continuing downhill) ──
    new THREE.Vector3(402.0, 9.5, 177.2),
    new THREE.Vector3(385.6, 7.0, 205.1),

    // ── 9. Turn 8: Portier (Turn leading to tunnel entrance at sea level) ──
    new THREE.Vector3(361.0, 4.5, 233.0),
    new THREE.Vector3(328.2, 2.5, 259.2),
    new THREE.Vector3(278.9, 1.2, 265.8),

    // ── 10. Turn 9: The Tunnel (High-speed long curved tunnel along coast heading West: -X) ──
    new THREE.Vector3(188.7, 0.5, 270.7),
    new THREE.Vector3(73.8, 0.3, 262.5),
    new THREE.Vector3(-41.0, 0.2, 246.1),
    new THREE.Vector3(-147.7, 0.2, 213.3),
    new THREE.Vector3(-229.7, 0.2, 172.3),

    // ── 11. Turns 10 & 11: Nouvelle Chicane (Hard braking chicane at harbor waterfront) ──
    new THREE.Vector3(-270.7, 0.2, 131.3),
    new THREE.Vector3(-292.1, 0.2, 106.7),
    new THREE.Vector3(-308.5, 0.2, 114.9),
    new THREE.Vector3(-331.4, 0.2, 98.4),

    // ── 12. Harbor Quayside: Nouvelle Chicane to Tabac ──
    new THREE.Vector3(-357.7, 0.2, 65.6),
    new THREE.Vector3(-377.4, 0.2, 16.4),
    new THREE.Vector3(-390.5, 0.2, -32.8),

    // ── 13. Turn 12: Tabac (Fast 4th-gear sweep around harbor corner) ──
    new THREE.Vector3(-406.9, 0.2, -73.8),
    new THREE.Vector3(-429.9, 0.2, -90.2),
    new THREE.Vector3(-446.3, 0.2, -78.8),

    // ── 14. Turns 13 & 14: Louis Chiron (First Swimming Pool Chicane: High-speed) ──
    new THREE.Vector3(-451.2, 0.2, -49.2),
    new THREE.Vector3(-443.0, 0.2, -16.4),
    new THREE.Vector3(-434.8, 0.2, 16.4),

    // ── 15. Turns 15 & 16: Swimming Pool Chicane (Piscine Exit: Tight Kerbs) ──
    new THREE.Vector3(-434.8, 0.2, 57.4),
    new THREE.Vector3(-449.6, 0.2, 90.2),
    new THREE.Vector3(-443.0, 0.2, 123.1),

    // ── 16. Turns 17 & 18: La Rascasse (Tight double-apex hairpin around restaurant) ──
    new THREE.Vector3(-446.3, 0.2, 155.9),
    new THREE.Vector3(-462.7, 0.2, 183.8),
    new THREE.Vector3(-489.0, 0.2, 193.6),
    new THREE.Vector3(-516.9, 0.2, 180.5),

    // ── 17. Turn 19: Anthony Noghès (Final tight turn onto start/finish straight) ──
    new THREE.Vector3(-541.5, 0.2, 155.9),
    new THREE.Vector3(-566.1, 0.2, 123.1)
  ],
  corners: [
    { name: "T1", type: "Sainte Dévote (90° Right)", speed: 105 },
    { name: "T2", type: "Beau Rivage (Uphill Climb)", speed: 260 },
    { name: "T3", type: "Massenet (Left Sweeper)", speed: 165 },
    { name: "T4", type: "Casino Square (Medium Right)", speed: 140 },
    { name: "T5", type: "Mirabeau Haute (Downhill Right)", speed: 90 },
    { name: "T6", type: "Fairmont Hairpin (Slowest F1 Hairpin)", speed: 45 },
    { name: "T7", type: "Mirabeau Bas (Downhill Right)", speed: 85 },
    { name: "T8", type: "Portier (Coastal Right)", speed: 95 },
    { name: "T9", type: "The Tunnel (Full Throttle Right Curve)", speed: 285 },
    { name: "T10", type: "Nouvelle Chicane Entry (Hard Left)", speed: 75 },
    { name: "T11", type: "Nouvelle Chicane Exit (Flick Right)", speed: 90 },
    { name: "T12", type: "Tabac (Fast Quayside Left)", speed: 175 },
    { name: "T13", type: "Louis Chiron (Swimming Pool Entry)", speed: 215 },
    { name: "T14", type: "Louis Chiron Exit (Right Flick)", speed: 200 },
    { name: "T15", type: "Piscine Chicane (Right Kerb Strike)", speed: 110 },
    { name: "T16", type: "Piscine Chicane Exit (Left Kerb)", speed: 130 },
    { name: "T17", type: "La Rascasse 1 (Hairpin Entry)", speed: 70 },
    { name: "T18", type: "La Rascasse 2 (Apex & Traction)", speed: 80 },
    { name: "T19", type: "Anthony Noghès (Right onto Straight)", speed: 95 }
  ]
};

// 🇦🇪 Yas Marina Circuit — Abu Dhabi, United Arab Emirates
// Official F1 Circuit Data from formula-timer.com/circuit/yas_marina
window.YAS_MARINA = {
  id: 1,
  name: "Yas Marina Circuit",
  fullName: "Yas Marina Circuit Abu Dhabi",
  location: "Yas Island, Abu Dhabi, UAE",
  country: "United Arab Emirates",
  flag: "🇦🇪",
  length: 5281,
  officialLengthKm: "5.281 km",
  cornersCount: 16,
  firstGP: 2009,
  racesHeld: 17,
  lapRecord: "1:25.637 (Kevin Magnussen, 2024)",
  laps: 12,
  roadWidth: 16,
  pitWidth: 6,
  theme: "marina_twilight",
  skyTopColor: 0x1e1b4b,    // Deep twilight purple/navy
  skyBottomColor: 0x38bdf8, // Vibrant marina twilight cyan/gold
  fogColor: 0x0f172a,
  startGrid: 16,
  drsZones: [
    { detect: 0.95, activate: 0.01 }, // Main Straight
    { detect: 0.28, activate: 0.32 }, // Long 1.2km Back Straight
    { detect: 0.52, activate: 0.58 }  // Marina Straight
  ],
  trackPoints: [
    // Start / Finish Straight (Sector 1, Red) heading South
    new THREE.Vector3(0, 0.1, -50),
    new THREE.Vector3(0, 0.1, 10),
    new THREE.Vector3(0, 0.1, 70),
    new THREE.Vector3(0, 0.1, 120),  // T1 Braking point
    
    // Turn 1 (Sharp 90 Left) & Esses
    new THREE.Vector3(25, 0.1, 140), // T1 Left Apex
    new THREE.Vector3(65, 0.1, 140), // T2 Right
    new THREE.Vector3(115, 0.1, 100),// T3 Hill sweep
    new THREE.Vector3(165, 0.1, 115),// T4 Curve
    new THREE.Vector3(230, 0.1, 115),// T5 Hairpin entry
    new THREE.Vector3(255, 0.1, 85), // T5 Hairpin apex
    
    // Sector 2 (Cyan): Massive 1.2km Diagonal Back Straight with Speed Trap
    new THREE.Vector3(210, 0.1, 20),
    new THREE.Vector3(150, 0.1, -45),
    new THREE.Vector3(85, 0.1, -110), // Speed Trap
    new THREE.Vector3(15, 0.1, -170),
    new THREE.Vector3(-30, 0.1, -215),// T6/T7 Chicane braking zone
    new THREE.Vector3(-55, 0.1, -200),// T6 Left
    new THREE.Vector3(-50, 0.1, -170),// T7 Right
    
    // Banked Marina Sweeping Hairpin (Turns 8 & 9)
    new THREE.Vector3(-90, 0.1, -135),
    new THREE.Vector3(-145, 0.1, -60),
    new THREE.Vector3(-170, 0.1, 20),
    new THREE.Vector3(-145, 0.1, 95),  // T8/T9 Sweeping banked hairpin
    
    // Sector 3 (Yellow): Hotel & Yacht Club Marina Complex
    new THREE.Vector3(-110, 0.1, 55),  // T10
    new THREE.Vector3(-85, 0.1, 25),   // T11
    new THREE.Vector3(-60, 0.1, 40),   // T12 Under Yas Hotel
    new THREE.Vector3(-45, 0.1, 65),   // T13
    new THREE.Vector3(-25, 0.1, 65),   // T14 Marina exit
    new THREE.Vector3(-25, 0.1, 10),   // T15 Fast right
    new THREE.Vector3(-15, 0.1, -30)   // T16 Final right connecting to main straight
  ],
  corners: [
    { name: "T1", type: "Sharp 90 Left", speed: 135 },
    { name: "T2", type: "Esses Entry", speed: 210 },
    { name: "T3", type: "Sweeper", speed: 250 },
    { name: "T4", type: "Downhill Curve", speed: 195 },
    { name: "T5", type: "Tight Hairpin", speed: 75 },
    { name: "T6", type: "Chicane Left", speed: 110 },
    { name: "T7", type: "Chicane Right", speed: 125 },
    { name: "T8", type: "Banked Entry", speed: 185 },
    { name: "T9", type: "Marina Hairpin", speed: 145 },
    { name: "T10", type: "Marina Left", speed: 155 },
    { name: "T11", type: "Marina Right", speed: 140 },
    { name: "T12", type: "Hotel Left", speed: 120 },
    { name: "T13", type: "Hotel Right", speed: 115 },
    { name: "T14", type: "Hotel Exit", speed: 125 },
    { name: "T15", type: "Fast Right", speed: 190 },
    { name: "T16", type: "Final Corner", speed: 215 }
  ]
};

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
    new THREE.Vector3(-144.2, 0.1, -42.4),
    new THREE.Vector3(-144.2, 0.1, 161.1),
    new THREE.Vector3(-144.2, 0.1, 364.6),
    new THREE.Vector3(-144.2, 0.1, 534.2),
    new THREE.Vector3(-59.4, 0.1, 602),
    new THREE.Vector3(76.3, 0.1, 602),
    new THREE.Vector3(245.9, 0.1, 466.4),
    new THREE.Vector3(415.5, 0.1, 517.2),
    new THREE.Vector3(636, 0.1, 517.2),
    new THREE.Vector3(720.8, 0.1, 415.5),
    new THREE.Vector3(568.1, 0.1, 195),
    new THREE.Vector3(364.6, 0.1, -25.4),
    new THREE.Vector3(144.2, 0.1, -245.9),
    new THREE.Vector3(-93.3, 0.1, -449.4),
    new THREE.Vector3(-245.9, 0.1, -602),
    new THREE.Vector3(-330.7, 0.1, -551.2),
    new THREE.Vector3(-313.7, 0.1, -449.4),
    new THREE.Vector3(-449.4, 0.1, -330.7),
    new THREE.Vector3(-636, 0.1, -76.3),
    new THREE.Vector3(-720.8, 0.1, 195),
    new THREE.Vector3(-636, 0.1, 449.4),
    new THREE.Vector3(-517.2, 0.1, 313.7),
    new THREE.Vector3(-432.5, 0.1, 212),
    new THREE.Vector3(-347.7, 0.1, 262.9),
    new THREE.Vector3(-296.8, 0.1, 347.7),
    new THREE.Vector3(-228.9, 0.1, 347.7),
    new THREE.Vector3(-228.9, 0.1, 161.1),
    new THREE.Vector3(-195, 0.1, 25.4)
  ],
  corners: [
    { name: "T1", type: "Sharp 90 Left", speed: 135 },
    { name: "T2", type: "Esses Entry", speed: 210 },
    { name: "T3", type: "Hill Sweep", speed: 245 },
    { name: "T4", type: "Crest Flick", speed: 220 },
    { name: "T5", type: "North Hairpin Entry", speed: 85 },
    { name: "T6", type: "Back Straight Chicane Left", speed: 130 },
    { name: "T7", type: "Chicane Right Exit", speed: 145 },
    { name: "T8", type: "Marina Sweeper Entry", speed: 230 },
    { name: "T9", type: "Banked Sweeper Apex", speed: 250 },
    { name: "T10", type: "Marina Fast Bend", speed: 220 },
    { name: "T11", type: "Hotel Left Entry", speed: 155 },
    { name: "T12", type: "Under Yas Hotel Arch", speed: 125 },
    { name: "T13", type: "Yacht Club Right", speed: 140 },
    { name: "T14", type: "Marina Exit Left", speed: 160 },
    { name: "T15", type: "Fast Right Bend", speed: 210 },
    { name: "T16", type: "Final Corner onto Main Straight", speed: 180 }
  ]
};

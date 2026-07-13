// 🌅 AAA-Quality Arcade Formula Circuit - Sunset Coast Circuit Layout Metadata
window.SUNSET_COAST = {
  name: "Sunset Coast",
  country: "Arcadia",
  length: 4860,
  laps: 12,
  roadWidth: 16,
  pitWidth: 6,
  theme: "coastal",
  startGrid: 16,
  drsZones: [
    {
      detect: 0.83,
      activate: 0.94
    }
  ],
  trackPoints: [
    new THREE.Vector3(0, 0.1, 180),
    new THREE.Vector3(60, 0.1, 170),
    new THREE.Vector3(120, 0.1, 130),
    new THREE.Vector3(170, 0.1, 40),
    new THREE.Vector3(150, 0.1, -60),
    new THREE.Vector3(90, 0.1, -150),
    new THREE.Vector3(0, 0.1, -180),
    new THREE.Vector3(-100, 0.1, -150),
    new THREE.Vector3(-170, 0.1, -80),
    new THREE.Vector3(-180, 0.1, 20),
    new THREE.Vector3(-120, 0.1, 120),
    new THREE.Vector3(-40, 0.1, 180)
  ],
  aiSpline: [
    0.00, 0.03, 0.05, 0.08, 0.12, 0.16, 0.21, 0.27, 0.33,
    0.38, 0.45, 0.53, 0.60, 0.68, 0.76, 0.84, 0.92, 1.00
  ],
  pitLane: [
    new THREE.Vector3(-10, 0.1, 178),
    new THREE.Vector3(-35, 0.1, 194),
    new THREE.Vector3(-90, 0.1, 198),
    new THREE.Vector3(-140, 0.1, 194),
    new THREE.Vector3(-170, 0.1, 180),
    new THREE.Vector3(-155, 0.1, 160)
  ],
  pitBoxes: [
    { team: 0, x: -30, z: 194 },
    { team: 1, x: -44, z: 194 },
    { team: 2, x: -58, z: 194 },
    { team: 3, x: -72, z: 194 },
    { team: 4, x: -86, z: 194 },
    { team: 5, x: -100, z: 194 },
    { team: 6, x: -114, z: 194 },
    { team: 7, x: -128, z: 194 },
    { team: 8, x: -142, z: 194 },
    { team: 9, x: -156, z: 194 }
  ],
  checkpoints: [
    0.00, 0.08, 0.17, 0.28, 0.37, 0.45, 0.55, 0.63, 0.72, 0.81, 0.90, 1.00
  ],
  grid: [
    { offset: 0.000, left: true },
    { offset: 0.006, left: false },
    { offset: 0.012, left: true },
    { offset: 0.018, left: false },
    { offset: 0.024, left: true },
    { offset: 0.030, left: false },
    { offset: 0.036, left: true },
    { offset: 0.042, left: false },
    { offset: 0.048, left: true },
    { offset: 0.054, left: false },
    { offset: 0.060, left: true },
    { offset: 0.066, left: false },
    { offset: 0.072, left: true },
    { offset: 0.078, left: false },
    { offset: 0.084, left: true },
    { offset: 0.090, left: false }
  ],
  corners: [
    { name: "T1", type: "Fast Right", speed: 250 },
    { name: "T2", type: "Medium Left", speed: 180 },
    { name: "T3", type: "Hairpin", speed: 65 },
    { name: "T4", type: "Sweeper", speed: 230 },
    { name: "T5", type: "S Curves", speed: 170 },
    { name: "T6", type: "Double Apex", speed: 150 },
    { name: "T7", type: "Long Left", speed: 210 },
    { name: "T8", type: "Fast Right", speed: 245 },
    { name: "T9", type: "Hairpin", speed: 60 },
    { name: "T10", type: "Chicane", speed: 120 },
    { name: "T11", type: "Fast Left", speed: 220 },
    { name: "T12", type: "Final Corner", speed: 170 }
  ]
};

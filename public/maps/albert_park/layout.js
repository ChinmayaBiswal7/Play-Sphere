// 🇦🇺 Albert Park Grand Prix Circuit — Melbourne, Australia
// Official F1 Circuit Data from formula-timer.com/circuit/albert_park
window.ALBERT_PARK = {
  id: 0,
  name: "Albert Park Circuit",
  fullName: "Albert Park Grand Prix Circuit",
  location: "Melbourne, Australia",
  country: "Australia",
  flag: "🇦🇺",
  length: 5278,
  officialLengthKm: "5.278 km",
  cornersCount: 14,
  firstGP: 1996,
  racesHeld: 29,
  lapRecord: "1:19.813 (Charles Leclerc, 2024)",
  laps: 12,
  roadWidth: 16,
  pitWidth: 6,
  theme: "parkland",
  skyTopColor: 0x0284c7,
  skyBottomColor: 0xe0f2fe,
  fogColor: 0xe0f2fe,
  startGrid: 16,
  drsZones: [
    { detect: 0.94, activate: 0.02 }, // Main Straight DRS Zone
    { detect: 0.22, activate: 0.28 }, // Lakeside Straight DRS Zone
    { detect: 0.68, activate: 0.74 }  // Back Sweeper DRS Zone
  ],
  trackPoints: [
    // Start / Finish Main Straight (South) heading East
    new THREE.Vector3(-80, 0.1, 180),
    new THREE.Vector3(-30, 0.1, 180), // Speed Trap
    new THREE.Vector3(20, 0.1, 180),
    new THREE.Vector3(70, 0.1, 180),
    
    // Turn 1 & 2 (Jones / Brabham Chicane)
    new THREE.Vector3(120, 0.1, 180),
    new THREE.Vector3(150, 0.1, 155), // T1 Right
    new THREE.Vector3(145, 0.1, 120), // T2 Left
    
    // Sector 1: Run up to Turn 3 & 4
    new THREE.Vector3(130, 0.1, 75),
    new THREE.Vector3(105, 0.1, 35),
    new THREE.Vector3(80, 0.1, 5),    // T3 Sharp 90 Right
    new THREE.Vector3(50, 0.1, -15),  // T4 Left flick
    new THREE.Vector3(15, 0.1, -40),  // T5 Fast right sweep
    
    // Sector 2: Turn 6 & 7 into Lakeside Sweep
    new THREE.Vector3(-25, 0.1, -75), // T6 Right
    new THREE.Vector3(-55, 0.1, -110),// T7 Fast left entry
    
    // High-Speed Lakeside Curve (Turns 8, 9, 10)
    new THREE.Vector3(-80, 0.1, -155),
    new THREE.Vector3(-120, 0.1, -195),
    new THREE.Vector3(-165, 0.1, -220),// Peak North curve along Albert Park Lake
    new THREE.Vector3(-215, 0.1, -205),// T9/10 flat-out sweep
    
    // Sector 3: Run down to Waite Chicane (Turn 11 & 12)
    new THREE.Vector3(-240, 0.1, -150),
    new THREE.Vector3(-235, 0.1, -80),
    new THREE.Vector3(-205, 0.1, -5),  // T11 Left
    new THREE.Vector3(-180, 0.1, 45),  // T12 Right exit
    
    // Infield to Turn 13 & 14
    new THREE.Vector3(-145, 0.1, 95),
    new THREE.Vector3(-115, 0.1, 135), // T13 90 Right
    new THREE.Vector3(-95, 0.1, 175)   // T14 Final 90 Right onto straight
  ],
  corners: [
    { name: "T1", type: "Fast Right", speed: 220 },
    { name: "T2", type: "Medium Left", speed: 175 },
    { name: "T3", type: "Sharp 90 Right", speed: 95 },
    { name: "T4", type: "Left Flick", speed: 180 },
    { name: "T5", type: "Fast Right Sweep", speed: 235 },
    { name: "T6", type: "Medium Right", speed: 165 },
    { name: "T7", type: "Fast Left", speed: 210 },
    { name: "T8", type: "Lakeside Kink", speed: 285 },
    { name: "T9", type: "High Speed Sweep", speed: 260 },
    { name: "T10", type: "Lakeside Exit", speed: 275 },
    { name: "T11", type: "Waite Left", speed: 225 },
    { name: "T12", type: "Waite Right", speed: 230 },
    { name: "T13", type: "90 Right", speed: 110 },
    { name: "T14", type: "Final Corner", speed: 125 }
  ]
};

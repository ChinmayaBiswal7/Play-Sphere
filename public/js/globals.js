// Shared mutable states initialized on the window object
var currentUser, STATES, gameState, prePauseState, activeCameraMode, currentStadiumVal, currentStadiumScale, currentStadiumHeight, currentStadiumRotation, MODES, matchMode, socket, roomCode, controllerConnected, phoneConnectedSocketId, controllerInput, gamepadIndex, gamepadPrevButtons, keys, TEAMS, BATTING_LINEUP, profile, settings, MATCH, BOWLING_STEPS, currentBowlingStep, scene, camera, renderer, physicsWorld, orbitControls, targetCamPos, targetCamLook, currentCamLook, lastFrameTime, perfDiv, stadium, pitch, wicketsGroup, batsmanMesh, nonStrikerMesh, bowlerMesh, ballMesh, batMesh, fielders, ballBody, pitchBody, stumpBodies, bailBodies, batBody, stumpsVisuals, bailsVisuals, deliveryType, DELIVERIES, bowlingVariationActive, activeWheelSector, BOWLER_ANIM_STATES, bowlerAnimState, bowlerAnimTime, bowlerReleased, deliverySpeedKmh, ballBounceDetected, swingForceApplied, stanceX, STANCE_SPEED, BATSMAN_CREASE_Z, WICKET_Z, swingPhase, swingT, swingPressTime, hasSwungThisBall, swingResolved, shotDirection, aimDirection, shotAngle, runningState, runProgress, runStartTime, RUN_DURATION, nonStrikerStartZ, strikerStartZ, fielderRetrieved, clock, ui, ballSettled;

window.currentUser = null;


window.STATES = {
  SPLASH: 'STATES.SPLASH', // unique placeholder matching string
  MAIN_MENU: 'MAIN_MENU',
  WAITING_FOR_PHONE: 'WAITING_FOR_PHONE',
  CUTSCENE: 'CUTSCENE',
  BOWL_READY: 'BOWL_READY',
  BALL_IN_FLIGHT: 'BALL_IN_FLIGHT',
  HIT: 'HIT',
  MISS: 'MISS',
  BOWLED: 'BOWLED',
  OUT: 'OUT',
  RESULT: 'RESULT',
  NEXT_BALL: 'NEXT_BALL',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED',
  RUNNING: 'RUNNING',  // batsmen running between wickets
  REPLAY: 'REPLAY',
  THROW_IN_FLIGHT: 'THROW_IN_FLIGHT',
  RUNOUT_REVIEW: 'RUNOUT_REVIEW'
};

// Fix circular references matching in strings
window.STATES.SPLASH = 'SPLASH';

window.gameState = window.STATES.SPLASH;
window.prePauseState = null;
window.activeCameraMode = 'broadcast';

// Stadium state & real-time tuning values
window.currentStadiumVal = 'default';
window.currentStadiumScale = null;
window.currentStadiumHeight = null;
window.currentStadiumRotation = null;

window.MODES = {
  SOLO: 'SOLO',
  PVP: 'PVP'
};
window.matchMode = window.MODES.SOLO;

window.socket = null;
window.roomCode = null;
window.controllerConnected = false;
window.phoneConnectedSocketId = null;

window.controllerInput = {
  joystickX: 0,
  joystickY: 0,
  aimX: 0,
  aimY: 0,
  // Legacy names (kept for phone controller socket compatibility)
  btnCross:    false,
  btnTriangle: false,
  btnCircle:   false,
  btnSquare:   false,
  btnR2:       false,
  btnL1:       false,
  btnR1:       false,
  // New semantic names — mapped to Ucom/DualShock layout
  btnDefensive: false,  // 1 (Top)    → Defensive block
  btnLofted:    false,  // 2 (Right)  → Lofted shot
  btnGrounded:  false,  // 3 (Bottom) → Normal grounded shot
  btnStepOut:   false,  // 4 (Left)   → Step out / advance
  frontFoot:    false,  // D-pad ↑    → Front foot position
  backFoot:     false,  // D-pad ↓    → Back foot position
};

window.gamepadIndex = null;
window.gamepadPrevButtons = [];

window.keys = {
  a: false,
  d: false,
  w: false,
  s: false,
  arrowLeft: false,
  arrowRight: false,
  arrowUp: false,
  arrowDown: false,
  space: false,
  shift: false, // defend
  ctrl: false   // loft
};

window.TEAMS = {
  // INTERNATIONAL
  IND: {
    name: 'India', league: 'INTERNATIONAL', flag: '🇮🇳', rating: 85, primary: '#1d4ed8', secondary: '#f97316', pant: '#1d4ed8', helmet: '#172554',
    squad: ["R. Sharma", "Y. Jaiswal", "V. Kohli", "S. Yadav", "R. Pant", "H. Pandya", "R. Jadeja", "A. Patel", "J. Bumrah", "A. Singh", "M. Siraj", "K. Rahul", "S. Gill", "R. Bishnoi", "Y. Chahal", "S. Samson", "S. Iyer", "R. Singh", "W. Sundar", "K. Yadav", "P. Krishna", "T. Natarajan", "S. Dube", "M. Shami", "B. Kumar"],
    bowler: "J. Bumrah"
  },
  AUS: {
    name: 'Australia', league: 'INTERNATIONAL', flag: '🇦🇺', rating: 88, primary: '#facc15', secondary: '#15803d', pant: '#facc15', helmet: '#15803d',
    squad: ["T. Head", "M. Marsh", "S. Smith", "G. Maxwell", "M. Stoinis", "T. David", "M. Wade", "P. Cummins", "M. Starc", "A. Zampa", "J. Hazlewood", "J. Fraser-McGurk", "M. Labuschagne", "A. Carey", "C. Green", "A. Agar", "N. Ellis", "M. Short", "S. Abbott", "J. Inglis", "X. Bartlett", "N. Lyon", "S. Johnson", "B. Dwarshuis"],
    bowler: "M. Starc"
  },
  ENG: {
    name: 'England', league: 'INTERNATIONAL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 87, primary: '#0284c7', secondary: '#b91c1c', pant: '#172554', helmet: '#172554',
    squad: ["J. Buttler", "P. Salt", "W. Jacks", "J. Bairstow", "H. Brook", "L. Livingstone", "M. Ali", "S. Curran", "J. Archer", "A. Rashid", "R. Topley", "B. Duckett", "J. Root", "O. Pope", "C. Woakes", "G. Atkinson", "M. Wood", "R. Ahmed", "T. Hartley", "J. Overton", "J. Tongue", "D. Lawrence", "M. Potts", "D. Willey", "S. Mahmood"],
    bowler: "J. Archer"
  },
  PAK: {
    name: 'Pakistan', league: 'INTERNATIONAL', flag: '🇵🇰', rating: 82, primary: '#065f46', secondary: '#ffffff', pant: '#065f46', helmet: '#065f46',
    squad: ["B. Azam", "M. Rizwan", "U. Khan", "F. Zaman", "S. Khan", "I. Ahmed", "I. Wasim", "S. Afridi", "N. Shah", "H. Rauf", "M. Amir", "S. Ayub", "A. Ali", "A. Jamal", "A. Salman", "A. Minhas", "M. Ali", "M. Wasim", "S. Dahani", "Z. Mehmood", "A. Yousuf", "H. Ali", "H. Talat", "S. Fiaz", "I.ullah"],
    bowler: "S. Afridi"
  },
  NZ: {
    name: 'New Zealand', league: 'INTERNATIONAL', flag: '🇳🇿', rating: 83, primary: '#111827', secondary: '#ffffff', pant: '#111827', helmet: '#111827',
    squad: ["D. Conway", "F. Allen", "K. Williamson", "D. Mitchell", "G. Phillips", "J. Neesham", "M. Santner", "T. Southee", "T. Boult", "L. Ferguson", "M. Henry", "R. Ravindra", "M. Chapman", "I. Sodhi", "B. Sears", "W. Young", "T. Latham", "H. Nicholls", "K. Jamieson", "M. Bracewell", "G. Clarkson", "B. Tickner", "J. Duffy", "A. Milne"],
    bowler: "L. Ferguson"
  },
  SA: {
    name: 'South Africa', league: 'INTERNATIONAL', flag: '🇿🇦', rating: 84, primary: '#166534', secondary: '#facc15', pant: '#166534', helmet: '#166534',
    squad: ["Q. de Kock", "R. Hendricks", "A. Markram", "H. Klaasen", "D. Miller", "T. Stubbs", "M. Jansen", "K. Maharaj", "K. Rabada", "A. Nortje", "T. Shamsi", "O. Baartman", "N. Burger", "L. Ngidi", "R. Rickelton", "B. Fortuin", "G. Coetzee", "D. Ferreira", "M. Breetzke", "W. Mulder", "L. Williams", "J. Hermann", "K. Maphaka", "P. Kruger"],
    bowler: "K. Rabada"
  },
  WI: {
    name: 'West Indies', league: 'INTERNATIONAL', flag: '🌴', rating: 81, primary: '#7c2d12', secondary: '#facc15', pant: '#7c2d12', helmet: '#7c2d12',
    squad: ["B. King", "J. Charles", "N. Pooran", "R. Chase", "R. Powell", "S. Rutherford", "A. Russell", "R. Shepherd", "A. Hosein", "A. Joseph", "G. Motie", "S. Hope", "O. Smith", "K. Mayers", "J. Holder", "O. McCoy", "S. Cottrell", "A. Athanaze", "K. Carty", "M. Forde", "H. Walsh", "Y. Cariah", "R. Cornwall", "J. Seales"],
    bowler: "A. Joseph"
  },
  SL: {
    name: 'Sri Lanka', league: 'INTERNATIONAL', flag: '🇱🇰', rating: 80, primary: '#1e40af', secondary: '#facc15', pant: '#1e40af', helmet: '#1e40af',
    squad: ["P. Nissanka", "K. Mendis", "S. Samarawickrama", "D. de Silva", "C. Asalanka", "W. Hasaranga", "A. Mathews", "D. Shanaka", "M. Theekshana", "M. Pathirana", "D. Chameera", "K. Perera", "J. Liyanage", "N. Thushara", "B. Fernando", "D. Madushanka", "A. Dananjaya", "K. Rajitha", "L. Kumara", "P. Madushan", "V. Fernando", "P. Jayasuriya"],
    bowler: "M. Pathirana"
  },
  BAN: {
    name: 'Bangladesh', league: 'INTERNATIONAL', flag: '🇧🇩', rating: 78, primary: '#047857', secondary: '#dc2626', pant: '#047857', helmet: '#047857',
    squad: ["T. Hasan", "L. Das", "N. Shanto", "T. Hridoy", "S. Al Hasan", "Mahmudullah", "J. Ali", "M. Hasan", "R. Hossain", "T. Ahmed", "M. Rahman", "A. Hossen", "S. Islam", "H. Mahmud", "T. Sakib", "S. Sarkar", "A. Anik", "Z. Ali", "N. Ahmed", "M. Hasan Miraz", "E. Hossain", "K. Islam"],
    bowler: "M. Rahman"
  },
  AFG: {
    name: 'Afghanistan', league: 'INTERNATIONAL', flag: '🇦🇫', rating: 79, primary: '#2563eb', secondary: '#dc2626', pant: '#2563eb', helmet: '#2563eb',
    squad: ["R. Gurbaz", "I. Zadran", "A. Omarzai", "G. Naib", "M. Nabi", "N. Zadran", "K. Janat", "R. Khan", "N. Ahmad", "N. Haq", "F. Farooqi", "H. Zazai", "F. Malik", "Q. Ahmad", "S. Kamal", "I. Alikhil", "M. Ishaq", "N. Masood", "W. Momand", "A. Ghazanfar", "Y. Surkhabi"],
    bowler: "R. Khan"
  },
  
  // Extra Internationals
  BER: { name: 'Bermuda', league: 'INTERNATIONAL', flag: '🇧🇲', rating: 66, primary: '#ef4444', secondary: '#3b82f6', pant: '#ef4444', helmet: '#1e3a8a', bowler: 'K. Leverock' },
  CAN: { name: 'Canada', league: 'INTERNATIONAL', flag: '🇨🇦', rating: 68, primary: '#dc2626', secondary: '#ffffff', pant: '#dc2626', helmet: '#991b1b', bowler: 'K. Sana' },
  DEN: { name: 'Denmark', league: 'INTERNATIONAL', flag: '🇩🇰', rating: 66, primary: '#dc2626', secondary: '#ffffff', pant: '#dc2626', helmet: '#991b1b', bowler: 'H. Shah' },
  GER: { name: 'Germany', league: 'INTERNATIONAL', flag: '🇩🇪', rating: 71, primary: '#111827', secondary: '#eab308', pant: '#111827', helmet: '#111827', bowler: 'D. Klein' },
  HKG: { name: 'Hong Kong', league: 'INTERNATIONAL', flag: '🇭🇰', rating: 69, primary: '#ef4444', secondary: '#ffffff', pant: '#ef4444', helmet: '#991b1b', bowler: 'E. Khan' },
  IRE: { name: 'Ireland', league: 'INTERNATIONAL', flag: '🇮🇪', rating: 82, primary: '#166534', secondary: '#16a34a', pant: '#166534', helmet: '#14532d', bowler: 'M. Adair' },
  ITA: { name: 'Italy', league: 'INTERNATIONAL', flag: '🇮🇹', rating: 71, primary: '#1d4ed8', secondary: '#ffffff', pant: '#1d4ed8', helmet: '#172554', bowler: 'J. Berg' },
  JER: { name: 'Jersey', league: 'INTERNATIONAL', flag: '🇯🇪', rating: 66, primary: '#dc2626', secondary: '#ffffff', pant: '#dc2626', helmet: '#991b1b', bowler: 'C. Bisson' },
  KEN: { name: 'Kenya', league: 'INTERNATIONAL', flag: '🇰🇪', rating: 68, primary: '#111827', secondary: '#dc2626', pant: '#111827', helmet: '#111827', bowler: 'E. Otieno' },
  KUW: { name: 'Kuwait', league: 'INTERNATIONAL', flag: '🇰🇼', rating: 68, primary: '#059669', secondary: '#ffffff', pant: '#059669', helmet: '#064e3b', bowler: 'S. Monib' },
  MAS: { name: 'Malaysia', league: 'INTERNATIONAL', flag: '🇲🇾', rating: 71, primary: '#eab308', secondary: '#1d4ed8', pant: '#1d4ed8', helmet: '#172554', bowler: 'S. Aziz' },
  NAM: { name: 'Namibia', league: 'INTERNATIONAL', flag: '🇳🇦', rating: 73, primary: '#1e3a8a', secondary: '#ef4444', pant: '#1e3a8a', helmet: '#172554', bowler: 'R. Trumpelmann' },
  NEP: { name: 'Nepal', league: 'INTERNATIONAL', flag: '🇳🇵', rating: 71, primary: '#1e40af', secondary: '#dc2626', pant: '#1e40af', helmet: '#172554', bowler: 'S. Kami' },

  // INDIAN T20 LEAGUE
  MI: { name: 'Mumbai', league: 'INDIAN_T20_LEAGUE', flag: '🔵', rating: 86, primary: '#1d4ed8', secondary: '#facc15', pant: '#1d4ed8', helmet: '#172554', bowler: 'J. Bumrah' },
  CSK: { name: 'Chennai', league: 'INDIAN_T20_LEAGUE', flag: '🟡', rating: 85, primary: '#facc15', secondary: '#1d4ed8', pant: '#facc15', helmet: '#ca8a04', bowler: 'M. Pathirana' },
  RCB: { name: 'Bangalore', league: 'INDIAN_T20_LEAGUE', flag: '🔴', rating: 84, primary: '#dc2626', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'M. Siraj' },
  KKR: { name: 'Kolkata', league: 'INDIAN_T20_LEAGUE', flag: '🟣', rating: 85, primary: '#581c87', secondary: '#facc15', pant: '#581c87', helmet: '#3b0764', bowler: 'M. Starc' },
  DC: { name: 'Delhi', league: 'INDIAN_T20_LEAGUE', flag: '⚪', rating: 83, primary: '#2563eb', secondary: '#dc2626', pant: '#2563eb', helmet: '#1d4ed8', bowler: 'K. Yadav' },
  RR: { name: 'Rajasthan', league: 'INDIAN_T20_LEAGUE', flag: '💗', rating: 84, primary: '#ec4899', secondary: '#1d4ed8', pant: '#1d4ed8', helmet: '#172554', bowler: 'Y. Chahal' },
  SRH: { name: 'Hyderabad', league: 'INDIAN_T20_LEAGUE', flag: '🟠', rating: 85, primary: '#f97316', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'P. Cummins' },
  PBKS: { name: 'Punjab', league: 'INDIAN_T20_LEAGUE', flag: '🔴', rating: 82, primary: '#ef4444', secondary: '#ffffff', pant: '#ef4444', helmet: '#991b1b', bowler: 'A. Singh' },
  LSG: { name: 'Lucknow', league: 'INDIAN_T20_LEAGUE', flag: '🟢', rating: 83, primary: '#0ea5e9', secondary: '#facc15', pant: '#0ea5e9', helmet: '#0284c7', bowler: 'R. Bishnoi' },
  GT: { name: 'Gujarat', league: 'INDIAN_T20_LEAGUE', flag: '⚫', rating: 83, primary: '#0f172a', secondary: '#f59e0b', pant: '#0f172a', helmet: '#0f172a', bowler: 'R. Khan' },

  // BIG BASH LEAGUE
  SYS: { name: 'Sydney Sixers', league: 'BIG_BASH_LEAGUE', flag: '💗', rating: 81, primary: '#ec4899', secondary: '#ffffff', pant: '#ec4899', helmet: '#db2777', bowler: 'S. Abbott' },
  SYT: { name: 'Sydney Thunder', league: 'BIG_BASH_LEAGUE', flag: '🟢', rating: 79, primary: '#84cc16', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'N. McAndrew' },
  MLS: { name: 'Melbourne Stars', league: 'BIG_BASH_LEAGUE', flag: '🟢', rating: 80, primary: '#15803d', secondary: '#ffffff', pant: '#15803d', helmet: '#166534', bowler: 'S. Rauf' },
  MLR: { name: 'Melbourne Renegades', league: 'BIG_BASH_LEAGUE', flag: '🔴', rating: 80, primary: '#ef4444', secondary: '#111827', pant: '#111827', helmet: '#991b1b', bowler: 'A. Zampa' },
  BRH: { name: 'Brisbane Heat', league: 'BIG_BASH_LEAGUE', flag: '🔵', rating: 82, primary: '#06b6d4', secondary: '#ffffff', pant: '#06b6d4', helmet: '#0891b2', bowler: 'S. Johnson' },
  HBH: { name: 'Hobart Hurricanes', league: 'BIG_BASH_LEAGUE', flag: '🟣', rating: 79, primary: '#7c3aed', secondary: '#ffffff', pant: '#7c3aed', helmet: '#6d28d9', bowler: 'N. Ellis' },
  ADS: { name: 'Adelaide Strikers', league: 'BIG_BASH_LEAGUE', flag: '🔵', rating: 80, primary: '#3b82f6', secondary: '#ffffff', pant: '#3b82f6', helmet: '#1d4ed8', bowler: 'W. Agar' },
  PTS: { name: 'Perth Scorchers', league: 'BIG_BASH_LEAGUE', flag: '🟠', rating: 83, primary: '#f97316', secondary: '#ffffff', pant: '#f97316', helmet: '#c2410c', bowler: 'J. Richardson' },

  // THE HUNDRED
  TRT: { name: 'Trent Rockets', league: 'THE_HUNDRED', flag: '🟡', rating: 81, primary: '#eab308', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'L. Wood' },
  STB: { name: 'Southern Brave', league: 'THE_HUNDRED', flag: '🟢', rating: 82, primary: '#15803d', secondary: '#ffffff', pant: '#15803d', helmet: '#166534', bowler: 'C. Jordan' },
  WEF: { name: 'Welsh Fire', league: 'THE_HUNDRED', flag: '🔴', rating: 79, primary: '#ef4444', secondary: '#ffffff', pant: '#ef4444', helmet: '#b91c1c', bowler: 'H. Rauf' },
  LNS: { name: 'London Spirit', league: 'THE_HUNDRED', flag: '🔵', rating: 80, primary: '#1e3a8a', secondary: '#ffffff', pant: '#1e3a8a', helmet: '#172554', bowler: 'N. Ellis' },
  OVI: { name: 'Oval Invincibles', league: 'THE_HUNDRED', flag: '🟢', rating: 83, primary: '#0f766e', secondary: '#eab308', pant: '#0f766e', helmet: '#115e59', bowler: 'S. Narine' },
  BPH: { name: 'Birmingham Phoenix', league: 'THE_HUNDRED', flag: '🟠', rating: 80, primary: '#ea580c', secondary: '#ffffff', pant: '#ea580c', helmet: '#c2410c', bowler: 'A. Milne' },
  NSC: { name: 'Northern Superchargers', league: 'THE_HUNDRED', flag: '🟣', rating: 80, primary: '#4c1d95', secondary: '#ffffff', pant: '#4c1d95', helmet: '#2e1065', bowler: 'R. Topley' },
  MNO: { name: 'Manchester Originals', league: 'THE_HUNDRED', flag: '⚫', rating: 81, primary: '#1f2937', secondary: '#ffffff', pant: '#1f2937', helmet: '#111827', bowler: 'F. Hartley' },

  // PAKISTAN SUPER LEAGUE
  KK: { name: 'Karachi Kings', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🔵', rating: 80, primary: '#1d4ed8', secondary: '#eab308', pant: '#1d4ed8', helmet: '#172554', bowler: 'H. Ali' },
  LQ: { name: 'Lahore Qalandars', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🟢', rating: 82, primary: '#a3e635', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'S. Afridi' },
  IU: { name: 'Islamabad United', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🔴', rating: 83, primary: '#ef4444', secondary: '#ffffff', pant: '#ef4444', helmet: '#991b1b', bowler: 'N. Shah' },
  PZ: { name: 'Peshawar Zalmi', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🟡', rating: 82, primary: '#facc15', secondary: '#111827', pant: '#111827', helmet: '#111827', bowler: 'L. Wood' },
  QG: { name: 'Quetta Gladiators', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🟣', rating: 81, primary: '#4c1d95', secondary: '#facc15', pant: '#4c1d95', helmet: '#2e1065', bowler: 'M. Amir' },
  MS: { name: 'Multan Sultans', league: 'PAKISTAN_SUPER_LEAGUE', flag: '🟢', rating: 83, primary: '#0284c7', secondary: '#16a34a', pant: '#0284c7', helmet: '#0369a1', bowler: 'A. Ali' }
};

// Post-process TEAMS to ensure all have squad, lineup and bowler populated correctly
Object.keys(window.TEAMS).forEach(key => {
  const team = window.TEAMS[key];
  
  // If squad doesn't exist, generate a realistic squad of 25 players based on team name
  if (!team.squad) {
    const list = [];
    const firstNames = ["A.", "M.", "J.", "S.", "R.", "D.", "K.", "C.", "T.", "P.", "L.", "N.", "B.", "G.", "H.", "F.", "W.", "I.", "V.", "Z."];
    const surnames = ["Smith", "Taylor", "Jones", "Brown", "Wilson", "Williams", "Miller", "Davis", "Anderson", "Thomas", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Torres", "Nguyen"];
    
    // Add the bowler to the squad first if defined
    if (team.bowler) {
      list.push(team.bowler);
    }
    
    while (list.length < 25) {
      const pName = firstNames[Math.floor(Math.random() * firstNames.length)] + " " + surnames[Math.floor(Math.random() * surnames.length)];
      if (!list.includes(pName)) {
        list.push(pName);
      }
    }
    team.squad = list;
  }
  
  // Ensure lineup is the first 11 players of the squad
  if (!team.lineup) {
    team.lineup = team.squad.slice(0, 11);
  }
});

window.BATTING_LINEUP = window.TEAMS.IND.lineup;

window.profile = {
  username: '',
  dob: '',
  played: 0,
  won: 0,
  lost: 0,
  runs: 0,
  wickets: 0,
  xp: 0,
  coins: 0,
  achievements: [],
  unlockedItems: [],
  equippedBat: 'default'
};

window.settings = {
  graphicsQuality: 'medium',
  resolutionScale: 1.0,
  masterVol: 0.8,
  sfxVol: 0.75,
  crowdVol: 0.6
};

window.MATCH = {
  userTeam: 'IND',
  oppTeam: 'AUS',
  runs: 0,
  wickets: 0,
  balls: 0,
  maxBalls: 12, // 2 overs
  target: 24,   // Target to chase
  runsThisBall: 0,
  isOutThisBall: false,
  outType: '',
  oversString: '0.0',
  batters: [
    { name: window.TEAMS.IND.lineup[0], runs: 0, balls: 0, stamina: 100 },
    { name: window.TEAMS.IND.lineup[1], runs: 0, balls: 0, stamina: 100 }
  ],
  strikerIndex: 0,
  nextBatsmanIndex: 2,
  bowlerName: 'M. Starc',
  bowlerWickets: 0,
  bowlerRuns: 0,
  bowlerOversBalls: 0,
  bowlerOversString: '0.0',
  overHistory: [],
  wagonWheel: [],
  ballDead: false,
  completedRuns: 0,
  deliveryStrikerIndex: 0,
  pendingRun: false,
  catchPossible: false,
  
  // Innings and Bowling configuration
  userIsBatting: true,
  currentInnings: 1,
  firstInningsRuns: 0,
  bowlingTargetX: 0,
  bowlingTargetZ: -4.0,
  bowlerRunupActive: false,
  bowlerRunupProgress: 0,
  bowlerReleasePressed: false,
  bowlerReleaseScore: null,
  isNoBallThisBall: false
};

window.BOWLING_STEPS = {
  SELECT_BOWLER: 'SELECT_BOWLER',
  SELECT_LOCATION: 'SELECT_LOCATION',
  SELECT_BALL_TYPE: 'SELECT_BALL_TYPE',
  RELEASE_METER: 'RELEASE_METER',
  IN_FLIGHT: 'IN_FLIGHT'
};
window.currentBowlingStep = null;

window.scene = null;
window.camera = null;
window.renderer = null;
window.physicsWorld = null;
window.orbitControls = null;

window.targetCamPos = new THREE.Vector3(0, 4.5, 8.5);
window.targetCamLook = new THREE.Vector3(0, 1.0, -8.0);
window.currentCamLook = new THREE.Vector3(0, 1.0, -8.0);
window.lastFrameTime = performance.now();
window.perfDiv = null;

window.stadium = null;
window.pitch = null;
window.wicketsGroup = null;
window.batsmanMesh = null;
window.bowlerMesh = null;
window.ballMesh = null;
window.batMesh = null;
window.fielders = [];

window.ballBody = null;
window.pitchBody = null;
window.stumpBodies = [];
window.bailBodies = [];
window.batBody = null;

window.stumpsVisuals = [];
window.bailsVisuals = [];

window.deliveryType = '';
window.DELIVERIES = [
  { name: 'Straight', speed: 38, type: 'fast', swing: 0 },
  { name: 'In-swing', speed: 38, type: 'fast', swing: -1.2 },
  { name: 'Out-swing', speed: 38, type: 'fast', swing: 1.2 },
  { name: 'Off-cutter', speed: 32, type: 'spin', breakVal: -1.5 },
  { name: 'Leg-cutter', speed: 32, type: 'spin', breakVal: 1.5 },
  { name: 'Bouncer', speed: 41, type: 'bouncer', swing: 0 },
  { name: 'Slower', speed: 28, type: 'fast', swing: 0 },
  // Spin Bowler Deliveries
  { name: 'Off-break', speed: 23, type: 'spin', breakVal: -1.5 },
  { name: 'Leg-break', speed: 23, type: 'spin', breakVal: 1.5 },
  { name: 'Arm Ball', speed: 25, type: 'spin', breakVal: 0 },
  { name: 'Top-spinner', speed: 24, type: 'spin', breakVal: 0 },
  { name: 'Doosra', speed: 22, type: 'spin', breakVal: 1.4 },
  { name: 'Flipper', speed: 26, type: 'spin', breakVal: 0.3 },
  { name: 'Carrom Ball', speed: 23, type: 'spin', breakVal: -1.4 },
  { name: 'Slower Ball', speed: 20, type: 'spin', breakVal: 1.0 },
  // Keep legacy names for safety
  { name: 'FAST OUT-SWINGER', speed: 38, type: 'fast', swing: 1.2 },
  { name: 'FAST IN-SWINGER', speed: 38, type: 'fast', swing: -1.2 },
  { name: 'HEAVY BOUNCER', speed: 41, type: 'bouncer', swing: 0 },
  { name: 'SLOW LEG-SPIN', speed: 23, type: 'spin', breakVal: 1.5 },
  { name: 'SLOW OFF-SPIN', speed: 23, type: 'spin', breakVal: -1.5 },
  { name: 'FLAT YORKER', speed: 36, type: 'yorker', swing: 0 }
];

window.bowlingVariationActive = false;
window.activeWheelSector = 0; // 0 = top, 1 = left, 2 = right, 3 = bottom


window.BOWLER_ANIM_STATES = {
  IDLE: 'IDLE',
  RUNUP: 'RUNUP',
  LOADUP: 'LOADUP',
  RELEASE: 'RELEASE',
  FOLLOWTHROUGH: 'FOLLOWTHROUGH'
};
window.bowlerAnimState = window.BOWLER_ANIM_STATES.IDLE;
window.bowlerAnimTime = 0;
window.bowlerReleased = false;
window.deliverySpeedKmh = 0;
window.ballBounceDetected = false;
window.swingForceApplied = false;

window.stanceX = 0;
window.STANCE_SPEED = 0.08;
window.BATSMAN_CREASE_Z = 0.0;
window.WICKET_Z = 1.2;

window.swingPhase = 0;
window.swingT = 0;
window.swingPressTime = -999;
window.hasSwungThisBall = false;
window.swingResolved = false;

window.shotDirection = 0;
window.aimDirection = 0;
window.shotAngle = 0;

window.runningState = 'idle';
window.runProgress = 0;
window.runStartTime = 0;
window.RUN_DURATION = 2.2;
window.nonStrikerStartZ = -21.2;
window.strikerStartZ = 0;

window.nonStrikerMesh = null;
window.fielderRetrieved = false;
window.clock = new THREE.Clock();

window.ui = {
  splash: document.getElementById('splash-screen'),
  loaderBar: document.getElementById('loader-bar'),
  splashLogo1: document.getElementById('splash-logo-1'),
  splashLogo2: document.getElementById('splash-logo-2'),
  mainMenu: document.getElementById('main-menu'),
  controlsScreen: document.getElementById('controls-screen'),
  lobby: document.getElementById('lobby-screen'),
  qrSpinner: document.getElementById('qr-loading-spinner'),
  qrImageWrapper: document.getElementById('qr-image-wrapper'),
  qrImage: document.getElementById('qr-image'),
  roomCodeText: document.getElementById('room-code-text'),
  statusLabel: document.getElementById('status-label'),
  statusDot: document.querySelector('.connection-status .status-dot'),
  hud: document.getElementById('game-hud'),
  hudMode: document.getElementById('hud-match-mode'),
  runs: document.getElementById('hud-runs'),
  wickets: document.getElementById('hud-wickets'),
  overs: document.getElementById('hud-overs'),
  targetRow: document.getElementById('hud-target-row'),
  runsNeeded: document.getElementById('hud-runs-needed'),
  ballsLeft: document.getElementById('hud-balls-left'),
  bowlerName: document.getElementById('hud-bowler-name'),
  bowlerSpeed: document.getElementById('hud-bowler-speed'),
  revealPill: document.getElementById('hud-reveal-pill'),
  revealPanel: document.getElementById('delivery-reveal-panel'),
  revealText: document.getElementById('reveal-text'),
  feedbackPanel: document.getElementById('feedback-panel'),
  feedbackTiming: document.getElementById('feedback-timing'),
  feedbackRun: document.getElementById('feedback-run'),
  gameOver: document.getElementById('game-over-screen'),
  endTitle: document.getElementById('end-title'),
  endSubtitle: document.getElementById('end-subtitle'),
  endScore: document.getElementById('end-score'),
  endOvers: document.getElementById('end-overs'),
  endRunrate: document.getElementById('end-runrate'),

  // Profile Header Elements
  menuProfileBtn: document.getElementById('menu-profile-btn'),
  menuProfAvatar: document.getElementById('menu-prof-avatar'),
  menuProfName: document.getElementById('menu-prof-name'),
  menuProfLevel: document.getElementById('menu-prof-level'),
  menuProfXpFill: document.getElementById('menu-prof-xp-fill'),
  menuProfXp: document.getElementById('menu-prof-xp'),

  // Profile Modal Elements
  profileModal: document.getElementById('profile-modal'),
  profileCloseBtn: document.getElementById('profile-close-btn'),
  profileAvatarContainer: document.getElementById('profile-avatar-container'),
  profileUsernameInput: document.getElementById('profile-username-input'),
  profileLoginBtn: document.getElementById('profile-login-btn'),
  profileLogoutBtn: document.getElementById('profile-logout-btn'),
  profileCardLevel: document.getElementById('profile-card-level'),
  profileCardXp: document.getElementById('profile-card-xp'),
  profileCardXpFill: document.getElementById('profile-card-xp-fill'),
  profileStatsPlayed: document.getElementById('profile-stats-played'),
  profileStatsWon: document.getElementById('profile-stats-won'),
  profileStatsLost: document.getElementById('profile-stats-lost'),
  profileStatsRuns: document.getElementById('profile-stats-runs'),
  profileStatsWickets: document.getElementById('profile-stats-wickets'),
  profileStatsWinRatio: document.getElementById('profile-stats-winratio'),

  // Settings screen elements
  settingsScreen: document.getElementById('settings-screen'),
  settingsBackBtn: document.getElementById('settings-back-btn'),
  fullscreenBtn: document.getElementById('menu-setting-fullscreen'),

  // Match loading screen elements
  matchLoadingScreen: document.getElementById('match-loading-screen'),
  matchLoaderBar: document.getElementById('match-loader-bar'),
  loadingPct: document.getElementById('loading-pct'),
  loadingTip: document.getElementById('loading-tip'),
  loadingStatusTxt: document.getElementById('loading-status-txt'),

  // Batsman scorecards in HUD bottom ticker
  bat1Card: document.getElementById('hud-batsman-1-card'),
  bat1Active: document.getElementById('hud-bat1-active'),
  bat1Name: document.getElementById('hud-bat1-name'),
  bat1Runs: document.getElementById('hud-bat1-runs'),
  bat1Balls: document.getElementById('hud-bat1-balls'),
  bat1Stamina: document.getElementById('hud-bat1-stamina'),

  bat2Card: document.getElementById('hud-batsman-2-card'),
  bat2Active: document.getElementById('hud-bat2-active'),
  bat2Name: document.getElementById('hud-bat2-name'),
  bat2Runs: document.getElementById('hud-bat2-runs'),
  bat2Balls: document.getElementById('hud-bat2-balls'),
  bat2Stamina: document.getElementById('hud-bat2-stamina'),

  // Bowler figures in HUD bottom ticker
  bowlerWickets: document.getElementById('hud-bowler-wickets'),
  bowlerRuns: document.getElementById('hud-bowler-runs'),
  bowlerOvers: document.getElementById('hud-bowler-overs'),

  // Right-hand Panel HUD elements
  overBallsTracker: document.getElementById('over-balls-tracker'),
  stanceDefensive: document.getElementById('stance-defensive'),
  stanceNormal: document.getElementById('stance-normal'),
  stanceLoft: document.getElementById('stance-loft'),

  // Main menu settings
  menuSettingGraphics: document.getElementById('menu-setting-graphics'),
  menuSettingRes: document.getElementById('menu-setting-res'),
  menuSettingResVal: document.getElementById('menu-setting-res-val'),
  menuSettingVolMaster: document.getElementById('menu-setting-vol-master'),
  menuSettingVolMasterVal: document.getElementById('menu-setting-vol-master-val'),
  menuSettingVolSfx: document.getElementById('menu-setting-vol-sfx'),
  menuSettingVolSfxVal: document.getElementById('menu-setting-vol-sfx-val'),
  menuSettingVolCrowd: document.getElementById('menu-setting-vol-crowd'),
  menuSettingVolCrowdVal: document.getElementById('menu-setting-vol-crowd-val'),
  menuBtnSaveSettings: document.getElementById('menu-btn-save-settings'),

  // Pause menu settings
  pauseSettingGraphics: document.getElementById('pause-setting-graphics'),
  pauseSettingVolMaster: document.getElementById('pause-setting-vol-master'),
  pauseSettingVolSfx: document.getElementById('pause-setting-vol-sfx'),
  pauseSettingVolCrowd: document.getElementById('pause-setting-vol-crowd')
};

window.ballSettled = false;

window.isBowlerSpinner = function(bowlerName) {
  if (!bowlerName) return false;
  const name = bowlerName.toUpperCase();
  const spinners = [
    'R. JADEJA', 'A. PATEL', 'A. ZAMPA', 'G. MAXWELL', 'M. ALI', 'A. RASHID',
    'S. KHAN', 'I. AHMED', 'M. SANTNER', 'K. MAHARAJ', 'T. SHAMSI', 'A. HOSEIN',
    'G. MOTIE', 'W. HASARANGA', 'M. THEEKSHANA', 'S. AL HASAN', 'M. HASAN',
    'R. HOSSAIN', 'RASHID KHAN', 'M. NABI', 'M. MUJEEB', 'ZAMPA', 'JADEJA', 'PATEL',
    'MAXWELL', 'RASHID', 'SANTNER', 'MAHARAJ', 'SHAMSI', 'HASARANGA', 'THEEKSHANA'
  ];
  return spinners.some(s => name.includes(s));
};

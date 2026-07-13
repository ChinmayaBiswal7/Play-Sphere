/**
 * f1-data.js — Static F1 team, driver, and AI personality configuration
 * Loaded before game.js so data is available as window globals.
 */

// ── F1 Driver AI Personalities ──────────────────────────────────────────────
// Each driver: speed(0-1), aggression, consistency, overtakeSkill, defendSkill, mistakeRate
window.AI_PERSONALITIES = {
  "Max Verstappen":   { speed:0.98, aggr:0.92, cons:0.97, over:0.97, def:0.90, mistake:0.03 },
  "Sergio Perez":     { speed:0.88, aggr:0.72, cons:0.85, over:0.80, def:0.75, mistake:0.10 },
  "Charles Leclerc":  { speed:0.93, aggr:0.85, cons:0.86, over:0.88, def:0.80, mistake:0.13 },
  "Carlos Sainz":     { speed:0.90, aggr:0.75, cons:0.90, over:0.84, def:0.82, mistake:0.09 },
  "Lewis Hamilton":   { speed:0.94, aggr:0.80, cons:0.95, over:0.93, def:0.88, mistake:0.05 },
  "George Russell":   { speed:0.91, aggr:0.78, cons:0.90, over:0.87, def:0.82, mistake:0.07 },
  "Fernando Alonso":  { speed:0.91, aggr:0.87, cons:0.93, over:0.92, def:0.89, mistake:0.06 },
  "Lance Stroll":     { speed:0.82, aggr:0.60, cons:0.74, over:0.68, def:0.65, mistake:0.18 },
  "Lando Norris":     { speed:0.92, aggr:0.83, cons:0.88, over:0.89, def:0.81, mistake:0.08 },
  "Oscar Piastri":    { speed:0.88, aggr:0.72, cons:0.84, over:0.82, def:0.75, mistake:0.11 },
  "Pierre Gasly":     { speed:0.85, aggr:0.78, cons:0.82, over:0.80, def:0.76, mistake:0.12 },
  "Esteban Ocon":     { speed:0.83, aggr:0.74, cons:0.80, over:0.77, def:0.73, mistake:0.14 },
  "Nico Hulkenberg":  { speed:0.82, aggr:0.71, cons:0.81, over:0.76, def:0.72, mistake:0.13 },
  "Kevin Magnussen":  { speed:0.80, aggr:0.88, cons:0.74, over:0.75, def:0.79, mistake:0.18 },
  "Alex Albon":       { speed:0.86, aggr:0.73, cons:0.83, over:0.82, def:0.74, mistake:0.11 },
  "Logan Sargeant":   { speed:0.74, aggr:0.60, cons:0.68, over:0.65, def:0.60, mistake:0.24 },
  "Valtteri Bottas":  { speed:0.85, aggr:0.68, cons:0.85, over:0.80, def:0.70, mistake:0.09 },
  "Zhou Guanyu":      { speed:0.80, aggr:0.65, cons:0.77, over:0.72, def:0.65, mistake:0.15 },
  "Daniel Ricciardo": { speed:0.86, aggr:0.82, cons:0.82, over:0.87, def:0.80, mistake:0.11 },
  "Yuki Tsunoda":     { speed:0.84, aggr:0.80, cons:0.75, over:0.80, def:0.73, mistake:0.17 },
};

window.getDriverPersonality = function(racer) {
  return window.AI_PERSONALITIES[racer.name] ||
    { speed:0.80, aggr:0.70, cons:0.80, over:0.78, def:0.70, mistake:0.14 };
};

// ── Loading Screen Pro Tips ──────────────────────────────────────────────────
window.PRO_TIPS = [
  "Holding Spacebar during high-speed turns will slide your kart into a drift. Releasing it triggers a Drift Boost!",
  "Golden stars floating on the track grant randomized item powerups. Press Shift to activate them!",
  "Upgrading your Engine Power in the R&D tab increases your straight-line top speed.",
  "Upgrading Chassis Weight reduces your kart mass, granting extremely fast acceleration off the line.",
  "Keep an eye on tyre wear! Worn tyres lose grip and make drifting through corners unstable.",
  "Fire soda rockets directly at competitors ahead to temporarily knock them out."
];

// ── F1 Teams & Drivers Database ─────────────────────────────────────────────
window.F1_TEAMS = [
  {
    name: "Red Bull Racing", principal: "Christian Horner", color: "#1e3a8a",
    expectation: "WIN THE CONSTRUCTORS CHAMPIONSHIP",
    stats: { speed: 96, aero: 95, tyre: 89, power: 94 },
    drivers: [
      { name: "Max Verstappen",  num: "#1",  avatar: "🦁", stats: { accel: 97, drift: 92, speed: 96 } },
      { name: "Sergio Perez",    num: "#11", avatar: "🇲🇽", stats: { accel: 88, drift: 85, speed: 89 } }
    ]
  },
  {
    name: "Scuderia Ferrari", principal: "Fred Vasseur", color: "#e10600",
    expectation: "CHALLENGE RED BULL FOR VICTORIES",
    stats: { speed: 92, aero: 90, tyre: 84, power: 95 },
    drivers: [
      { name: "Charles Leclerc", num: "#16", avatar: "🇲🇨", stats: { accel: 93, drift: 94, speed: 92 } },
      { name: "Carlos Sainz",    num: "#55", avatar: "🌶️",  stats: { accel: 90, drift: 92, speed: 91 } }
    ]
  },
  {
    name: "Mercedes AMG", principal: "Toto Wolff", color: "#94a3b8",
    expectation: "FIGHT FOR PODIUM FINISHES",
    stats: { speed: 89, aero: 88, tyre: 90, power: 91 },
    drivers: [
      { name: "Lewis Hamilton", num: "#44", avatar: "👑",  stats: { accel: 92, drift: 89, speed: 93 } },
      { name: "George Russell", num: "#63", avatar: "🇬🇧", stats: { accel: 89, drift: 90, speed: 91 } }
    ]
  },
  {
    name: "Aston Martin", principal: "Mike Krack", color: "#0f766e",
    expectation: "FINISH TOP 4 IN CHAMPIONSHIP",
    stats: { speed: 86, aero: 88, tyre: 92, power: 88 },
    drivers: [
      { name: "Fernando Alonso", num: "#14", avatar: "⚡",  stats: { accel: 91, drift: 93, speed: 90 } },
      { name: "Lance Stroll",    num: "#18", avatar: "🇨🇦", stats: { accel: 82, drift: 80, speed: 84 } }
    ]
  },
  {
    name: "McLaren Racing", principal: "Andrea Stella", color: "#ff8000",
    expectation: "STEADY POINTS & PODIUM THREATS",
    stats: { speed: 90, aero: 91, tyre: 85, power: 89 },
    drivers: [
      { name: "Lando Norris",  num: "#4",  avatar: "🇬🇧", stats: { accel: 92, drift: 91, speed: 92 } },
      { name: "Oscar Piastri", num: "#81", avatar: "🇦🇺", stats: { accel: 87, drift: 88, speed: 89 } }
    ]
  },
  {
    name: "Alpine F1", principal: "Bruno Famin", color: "#0080ff",
    expectation: "LEAD THE MIDFIELD PACK",
    stats: { speed: 78, aero: 75, tyre: 76, power: 74 },
    drivers: [
      { name: "Pierre Gasly",  num: "#10", avatar: "🇫🇷", stats: { accel: 84, drift: 83, speed: 85 } },
      { name: "Esteban Ocon",  num: "#31", avatar: "🇫🇷", stats: { accel: 83, drift: 82, speed: 84 } }
    ]
  },
  {
    name: "Haas F1 Team", principal: "Ayao Komatsu", color: "#ffffff",
    expectation: "SCORE POINTS CONSISTENTLY",
    stats: { speed: 72, aero: 68, tyre: 65, power: 78 },
    drivers: [
      { name: "Nico Hulkenberg",  num: "#27", avatar: "🇩🇪", stats: { accel: 81, drift: 79, speed: 83 } },
      { name: "Kevin Magnussen", num: "#20", avatar: "🇩🇰", stats: { accel: 79, drift: 78, speed: 80 } }
    ]
  },
  {
    name: "Williams Racing", principal: "James Vowles", color: "#0050ff",
    expectation: "DEVELOP ROOKIE TALENT",
    stats: { speed: 80, aero: 64, tyre: 72, power: 82 },
    drivers: [
      { name: "Alex Albon",       num: "#23", avatar: "🇹🇭", stats: { accel: 86, drift: 85, speed: 88 } },
      { name: "Logan Sargeant",   num: "#2",  avatar: "🇺🇸", stats: { accel: 74, drift: 72, speed: 77 } }
    ]
  },
  {
    name: "Kick Sauber", principal: "A. Alunni Bravi", color: "#00ff66",
    expectation: "FIGHT FOR TOP 10 FINISHES",
    stats: { speed: 74, aero: 72, tyre: 78, power: 75 },
    drivers: [
      { name: "Valtteri Bottas", num: "#77", avatar: "🇫🇮", stats: { accel: 83, drift: 84, speed: 85 } },
      { name: "Zhou Guanyu",     num: "#24", avatar: "🇨🇳", stats: { accel: 78, drift: 80, speed: 80 } }
    ]
  },
  {
    name: "RB Team", principal: "Laurent Mekies", color: "#203c56",
    expectation: "DEVELOP YOUNG RED BULL TALENT",
    stats: { speed: 76, aero: 74, tyre: 75, power: 76 },
    drivers: [
      { name: "Daniel Ricciardo", num: "#3",  avatar: "🇦🇺", stats: { accel: 85, drift: 84, speed: 86 } },
      { name: "Yuki Tsunoda",     num: "#22", avatar: "🇯🇵", stats: { accel: 84, drift: 82, speed: 85 } }
    ]
  }
];

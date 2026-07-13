/**
 * Build Script — Apex Stars F1 Game
 * Concatenates all source parts from ./src/ into game.js
 *
 * Usage:  node build.js         (from public/f1/)
 *         node build.js --watch (rebuilds on file change)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'src');
const OUTPUT = path.join(__dirname, 'game.js');

// Parts loaded IN ORDER — sequence is critical!
const PARTS = [
  'game-01a-state-helpers.js',     // ~1242 lines  State vars, helpers, UI, menu
  'game-01b-setup-builders.js',    // ~1150 lines  setupGame, starting sequence, track geometry
  'game-02-track-build.js',        //  ~763 lines  buildTrack, visual track layout
  'game-03-blueflag-director.js',  //  ~261 lines  updateBlueFlag, updateRaceDirector
  'game-04-animate.js',            //  ~219 lines  animate loop
  'game-05-player-physics.js',     //  ~837 lines  updatePlayerPhysics, DRS, ERS, gear
  'game-06-ai-physics.js',         //  ~534 lines  updateAIPysics, AI strategy, pit
  'game-07-hazards-collision.js',  //  ~316 lines  hazards, rockets, collision detection
  'game-08-particles-camera.js',   //  ~150 lines  particles, camera follow
  'game-09a-postrace-setup.js',    //  ~424 lines  postrace startup, cinematics, trophy
  'game-09b-postrace-state.js',    //  ~488 lines  postrace state machine, results, pit stop
  'game-10a-weather-voice.js',     //  ~445 lines  weather events, voice, telemetry, radio
  'game-10b-hud-settings.js',      //  ~852 lines  minimap, leaderboard HUD, settings
];

const HEADER = `/**
 * Apex Stars: Chibi F1 - EA Sports F1 23/24 Style console engine
 * AUTO-GENERATED — edit files in ./src/ then run: node build.js
 */

(function () {
`;

const FOOTER = `
})();
`;

function build() {
  const parts = PARTS.map(name => {
    const file = path.join(SRC_DIR, name);
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing part: ${file}`);
      process.exit(1);
    }
    return `\n// ═══ ${name} ═══\n` + fs.readFileSync(file, 'utf-8');
  });

  const output = HEADER + parts.join('') + FOOTER;
  fs.writeFileSync(OUTPUT, output, 'utf-8');

  const kb = (output.length / 1024).toFixed(1);
  const lines = output.split('\n').length;
  console.log(`✅ Built game.js — ${lines} lines, ${kb} KB`);
  console.log(`   Parts: ${PARTS.length} files from ./src/`);
}

// ── Watch mode ────────────────────────────────────────────────────────────────
const watchMode = process.argv.includes('--watch');

build(); // Always build once on start

if (watchMode) {
  console.log('\n👁  Watching ./src/ for changes...\n');
  let debounce = null;
  fs.watch(SRC_DIR, { recursive: false }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`\n🔄 Changed: ${filename}`);
      try { build(); } catch (e) { console.error('Build error:', e.message); }
    }, 80);
  });
}

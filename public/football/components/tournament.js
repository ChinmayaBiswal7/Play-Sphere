/**
 * Football Legends 2026 - Tournament Mode Screen Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';

export function renderTournament(container, onPlayMatch) {
  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">FEATURED</button>
        <button class="sub-tab-btn">DAILY</button>
        <button class="sub-tab-btn">WEEKLY</button>
        <button class="sub-tab-btn">MONTHLY</button>
        <button class="sub-tab-btn">CUSTOM</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content">
        <div class="tournament-list-container">
          
          <!-- Champions Cup -->
          <div class="tournament-row-card gold-border">
            <div class="tour-trophy gold-text">🏆</div>
            <div class="tour-details">
              <strong>CHAMPIONS CUP</strong>
              <small>Win the ultimate glory and claim the golden shield.</small>
              <div class="tour-pills-row">
                <span class="tour-pill">Entry: 🪙 500</span>
                <span class="tour-pill lime-pill">Prize: 🪙 10,000 + 💎 500</span>
              </div>
            </div>
            <div class="tour-timer-action">
              <span class="timer-countdown">Ends in 2d 06h</span>
              <button class="menu-btn primary-btn tour-play-btn" data-team="MADRID KINGS">PLAY CUP</button>
            </div>
          </div>

          <!-- True Blue Cup -->
          <div class="tournament-row-card blue-border">
            <div class="tour-trophy blue-text">🏆</div>
            <div class="tour-details">
              <strong>TRUE BLUE CUP</strong>
              <small>Only for true champions. High intensity pitch matches.</small>
              <div class="tour-pills-row">
                <span class="tour-pill">Entry: 🪙 300</span>
                <span class="tour-pill lime-pill">Prize: 🪙 5,000 + 💎 250</span>
              </div>
            </div>
            <div class="tour-timer-action">
              <span class="timer-countdown">Ends in 1d 18h</span>
              <button class="menu-btn primary-btn tour-play-btn" data-team="MILANO FC">PLAY CUP</button>
            </div>
          </div>

          <!-- Golden League -->
          <div class="tournament-row-card purple-border">
            <div class="tour-trophy purple-text">🏆</div>
            <div class="tour-details">
              <strong>GOLDEN LEAGUE</strong>
              <small>Prove your skills in regional league tournaments.</small>
              <div class="tour-pills-row">
                <span class="tour-pill">Entry: 🪙 200</span>
                <span class="tour-pill lime-pill">Prize: 🪙 3,000 + 💎 150</span>
              </div>
            </div>
            <div class="tour-timer-action">
              <span class="timer-countdown">Ends in 23h 45m</span>
              <button class="menu-btn primary-btn tour-play-btn" data-team="MUNICH GIANTS">PLAY LEAGUE</button>
            </div>
          </div>

        </div>

        <button class="menu-btn secondary-btn" id="btn-create-tournament" style="max-width: 250px; align-self: flex-start; margin-top: 10px;">CREATE TOURNAMENT</button>
      </main>
    </div>
  `;

  document.querySelectorAll('.tour-play-btn').forEach(btn => {
    btn.onclick = () => {
      const oppTeam = btn.getAttribute('data-team');
      AudioSynth.playWhistle();
      onPlayMatch("RED DEVILS", oppTeam);
    };
  });

  document.getElementById('btn-create-tournament').onclick = () => {
    alert("Custom Tournaments unlocks at Level 5!");
  };
}

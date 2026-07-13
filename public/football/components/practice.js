/**
 * Football Legends 2026 - Practice Arena Mode Screen Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';

export function renderPractice(container, onPlayMatch) {
  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">TRAINING</button>
        <button class="sub-tab-btn">SKILL GAMES</button>
        <button class="sub-tab-btn">FREE KICK</button>
        <button class="sub-tab-btn">PENALTY</button>
        <button class="sub-tab-btn">TRAINING PLAN</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content">
        <h3 class="panel-section-title">CHOOSE PRACTICE DRILL</h3>
        
        <div class="practice-drills-grid">
          
          <!-- Shooting -->
          <div class="drill-card" data-mode="shooting">
            <div class="drill-icon">⚽</div>
            <strong>SHOOTING</strong>
            <p>Improve your shooting power and curves.</p>
          </div>

          <!-- Passing -->
          <div class="drill-card" data-mode="passing">
            <div class="drill-icon">↪️</div>
            <strong>PASSING</strong>
            <p>Improve your teammate passing precision.</p>
          </div>

          <!-- Dribbling -->
          <div class="drill-card" data-mode="dribbling">
            <div class="drill-icon">🏃</div>
            <strong>DRIBBLING</strong>
            <p>Improve your player movements and sprint speeds.</p>
          </div>

          <!-- Defending -->
          <div class="drill-card" data-mode="defending">
            <div class="drill-icon">🛡️</div>
            <strong>DEFENDING</strong>
            <p>Improve slide tackling and intercepting balls.</p>
          </div>

          <!-- Goalkeeper -->
          <div class="drill-card" data-mode="goalkeeper">
            <div class="drill-icon">🧤</div>
            <strong>GOALKEEPER</strong>
            <p>Train manually diving to save direct goals.</p>
          </div>

          <!-- Custom Drill -->
          <div class="drill-card" data-mode="custom">
            <div class="drill-icon">⚙️</div>
            <strong>CUSTOM DRILL</strong>
            <p>Create your custom sandbox rules and drills.</p>
          </div>

        </div>
      </main>
    </div>
  `;

  document.querySelectorAll('.drill-card').forEach(card => {
    card.onclick = () => {
      const mode = card.getAttribute('data-mode');
      AudioSynth.playWhistle();
      // Setup amateur match with lower opponent difficulty for practice
      onPlayMatch("RED DEVILS", "SKY BLUES", "easy");
    };
  });
}

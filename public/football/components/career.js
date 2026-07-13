/**
 * Football Legends 2026 - Career Mode Screen Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';

export function renderCareer(container, onPlayMatch) {
  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">OVERVIEW</button>
        <button class="sub-tab-btn">MATCHES</button>
        <button class="sub-tab-btn">STANDINGS</button>
        <button class="sub-tab-btn">TRANSFERS</button>
        <button class="sub-tab-btn">STATS</button>
        <button class="sub-tab-btn">OBJECTIVES</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content">
        <div class="career-hero-card">
          <div class="career-hero-details">
            <span class="lime-text font-display font-bold">LEGENDARY JOURNEY</span>
            <h2 class="font-display font-black">CHAPTER 3</h2>
            <p>Keep winning, conquer leagues and become a football legend.</p>
            
            <div class="career-progress-section">
              <span class="prog-label">CHAPTER PROGRESS</span>
              <div class="xp-progress-bar" style="width: 100%; max-width: 320px;">
                <div class="xp-progress-fill" style="width: 78%; background: linear-gradient(90deg, #84cc16, #a3e635);"></div>
              </div>
              <span class="prog-val">78% Complete</span>
            </div>
          </div>
          <div class="career-crest-large">🏆</div>
        </div>

        <div class="career-grid-bottom">
          <!-- Next Match Card -->
          <div class="career-match-card">
            <h3 class="panel-section-title">NEXT MATCH</h3>
            <div class="career-vs-row">
              <div class="club-crest-box">
                <div class="crest-shield red-glow">🛡️</div>
                <span>FC LEGENDS</span>
              </div>
              <div class="vs-badge">VS</div>
              <div class="club-crest-box">
                <div class="crest-shield blue-glow">🛡️</div>
                <span>ROYAL UNITED</span>
              </div>
            </div>
            
            <div class="career-match-details">
              <div><span>COMPETITION:</span><b>PREMIER LEAGUE</b></div>
              <div><span>DIFFICULTY:</span><b>PROFESSIONAL</b></div>
              <div><span>REWARD:</span><b class="lime-text">🪙 200 + ⚡ 10</b></div>
            </div>

            <button class="menu-btn primary-btn" id="career-play-match-btn">PLAY MATCH</button>
          </div>
          
          <!-- Objectives Widget -->
          <div class="career-objectives-card">
            <h3 class="panel-section-title">CHAPTER OBJECTIVES</h3>
            <ul class="obj-list">
              <li class="completed"><span>Score 5 goals in total</span><b class="lime-text">✓</b></li>
              <li><span>Win 3 matches in a row</span><b>1/3</b></li>
              <li><span>Perform a slide tackle steal</span><b>0/1</b></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('career-play-match-btn').onclick = () => {
    AudioSynth.playWhistle();
    onPlayMatch("RED DEVILS", "SKY BLUES"); 
  };
}

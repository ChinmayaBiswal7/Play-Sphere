/**
 * Football Legends 2026 - My Team & Squad Lineups Screen Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';

export function renderTeam(container) {
  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">LINEUP</button>
        <button class="sub-tab-btn">PLAYERS</button>
        <button class="sub-tab-btn">TACTICS</button>
        <button class="sub-tab-btn">ROLES</button>
        <button class="sub-tab-btn">BOOSTS</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content team-screen-layout">
        
        <!-- Center Tactics Pitch -->
        <div class="team-pitch-container">
          <div class="pitch-grass">
            <div class="pitch-half-line"></div>
            <div class="pitch-center-circle"></div>
            
            <!-- 11 Players nodes in 4-3-3 formation -->
            <!-- Goalkeeper -->
            <div class="pitch-node" style="bottom: 6%; left: 50%;">
              <div class="node-jersey" style="background: #eab308; color: #000;">1</div>
              <span class="node-name">GK: ALISSON</span>
            </div>
            
            <!-- Defenders -->
            <div class="pitch-node" style="bottom: 22%; left: 35%;">
              <div class="node-jersey">4</div>
              <span class="node-name">CB: DIAS</span>
            </div>
            <div class="pitch-node" style="bottom: 22%; left: 65%;">
              <div class="node-jersey">5</div>
              <span class="node-name">CB: VAN DIJK</span>
            </div>
            <div class="pitch-node" style="bottom: 26%; left: 15%;">
              <div class="node-jersey">3</div>
              <span class="node-name">LB: SHAW</span>
            </div>
            <div class="pitch-node" style="bottom: 26%; left: 85%;">
              <div class="node-jersey">2</div>
              <span class="node-name">RB: HAKIMI</span>
            </div>

            <!-- Midfielders -->
            <div class="pitch-node" style="bottom: 46%; left: 30%;">
              <div class="node-jersey">8</div>
              <span class="node-name">CM: KROOS</span>
            </div>
            <div class="pitch-node" style="bottom: 42%; left: 50%;">
              <div class="node-jersey">6</div>
              <span class="node-name">CDM: RODRI</span>
            </div>
            <div class="pitch-node" style="bottom: 46%; left: 70%;">
              <div class="node-jersey">10</div>
              <span class="node-name">CM: MODRIC</span>
            </div>

            <!-- Forwards -->
            <div class="pitch-node" style="bottom: 74%; left: 20%;">
              <div class="node-jersey">11</div>
              <span class="node-name">LW: VINICIUS</span>
            </div>
            <div class="pitch-node" style="bottom: 78%; left: 50%;">
              <div class="node-jersey">9</div>
              <span class="node-name">ST: HAALAND</span>
            </div>
            <div class="pitch-node" style="bottom: 74%; left: 80%;">
              <div class="node-jersey">7</div>
              <span class="node-name">RW: SALAH</span>
            </div>

          </div>
        </div>

        <!-- Right Squad details panel -->
        <div class="team-squad-sidebar">
          <div class="squad-rating-card">
            <span class="squad-title">SQUAD RATING</span>
            <div class="ovr-box">OVR 87</div>
            <div class="chem-row">
              <span>CHEMISTRY</span>
              <strong class="lime-text">95</strong>
            </div>
          </div>
          
          <div class="squad-settings-card">
            <h3 class="panel-section-title">FORMATION</h3>
            <div class="formation-selector">
              <strong>4 - 3 - 3 (Holding)</strong>
            </div>

            <div class="team-actions-column">
              <button class="menu-btn primary-btn" id="btn-auto-build">AUTO BUILD</button>
              <button class="menu-btn secondary-btn" id="btn-best-lineup">BEST LINEUP</button>
              <button class="menu-btn secondary-btn" id="btn-tactics">TACTICS</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  `;

  document.getElementById('btn-auto-build').onclick = () => {
    AudioSynth.playKick();
    alert("Squad re-optimized for maximum chemistry!");
  };

  document.getElementById('btn-best-lineup').onclick = () => {
    AudioSynth.playKick();
    alert("Highest OVR players substituted into lineup.");
  };

  document.getElementById('btn-tactics').onclick = () => {
    AudioSynth.playKick();
    alert("Team playstyle set to Tiki-Taka / Counter Attack.");
  };
}

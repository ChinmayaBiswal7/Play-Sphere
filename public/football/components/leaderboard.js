/**
 * Football Legends 2026 - Leaderboards Table Screen Component
 */

import { gameState } from '../state.js';
import { FirebaseSync } from '../profile.js';

export function renderLeaderboard(container) {
  const currentXP = FirebaseSync.profile.xp || 0;
  
  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">GLOBAL</button>
        <button class="sub-tab-btn">FRIENDS</button>
        <button class="sub-tab-btn">LOCAL</button>
        <button class="sub-tab-btn">CLUB</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content">
        <h3 class="panel-section-title">GLOBAL LEADERBOARD</h3>
        
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th style="width: 80px;">RANK</th>
              <th>PLAYER</th>
              <th>XP RATING</th>
              <th>MATCHES WON</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="rank-badge rank-1">1</span></td>
              <td>👑 FootballKing <small>LEGEND III</small></td>
              <td><b>7,250 XP</b></td>
              <td>125</td>
            </tr>
            <tr>
              <td><span class="rank-badge rank-2">2</span></td>
              <td>🥈 TheStriker10 <small>LEGEND II</small></td>
              <td><b>6,580 XP</b></td>
              <td>118</td>
            </tr>
            <tr class="user-row">
              <td><span class="rank-badge rank-3">3</span></td>
              <td>👤 ${FirebaseSync.profile.username || "PlayerOne"} (You) <small>LEGEND I</small></td>
              <td><b>${currentXP} XP</b></td>
              <td>${FirebaseSync.profile.football_won || 0}</td>
            </tr>
            <tr>
              <td><span class="rank-badge">4</span></td>
              <td>GoalMachine <small>LEGEND I</small></td>
              <td><b>2,390 XP</b></td>
              <td>97</td>
            </tr>
            <tr>
              <td><span class="rank-badge">5</span></td>
              <td>ChampionX <small>LEGEND I</small></td>
              <td><b>2,310 XP</b></td>
              <td>93</td>
            </tr>
            <tr>
              <td><span class="rank-badge">6</span></td>
              <td>LeoMessiFan <small>LEGEND I</small></td>
              <td><b>2,230 XP</b></td>
              <td>89</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  `;
}

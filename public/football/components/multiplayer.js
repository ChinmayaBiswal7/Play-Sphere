/**
 * Football Legends 2026 - Multiplayer Selection Screen Component
 * Simplified choice layout for PVP Friend Challenges and Online Matchmaking.
 */

import { AudioSynth } from '../audio.js';

export function renderMultiplayer(container, onPlayMatch) {
  const drawScreen = () => {
    container.innerHTML = `
      <div style="display: flex; gap: 32px; justify-content: center; align-items: center; height: 100%; padding: 40px; font-family: 'Orbitron', sans-serif; box-sizing: border-box; width: 100%;">
        <!-- PVP Friendly Card -->
        <div class="multi-quickplay-card" id="btn-pvp-friend" style="flex: 1; max-width: 400px; background: linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(88,28,135,0.4) 100%); border: 2px solid #a855f7; border-radius: 16px; padding: 40px 32px; text-align: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 3.5rem; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(168,85,247,0.5));">⚔️</div>
          <strong style="font-size: 1.5rem; color: #c084fc; display: block; margin-bottom: 12px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">PVP FRIEND CHALLENGE</strong>
          <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0; font-family: 'Inter', sans-serif;">Open your PlaySphere friends hub to challenge a friend to a live 1v1 football match.</p>
        </div>

        <!-- Online Matchmaking Card -->
        <div class="multi-quickplay-card" id="btn-pvp-online" style="flex: 1; max-width: 400px; background: linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.4) 100%); border: 2px solid #10b981; border-radius: 16px; padding: 40px 32px; text-align: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 3.5rem; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(16,185,129,0.5));">🌐</div>
          <strong style="font-size: 1.5rem; color: #34d399; display: block; margin-bottom: 12px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">ONLINE QUICK MATCH</strong>
          <p style="font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0; font-family: 'Inter', sans-serif;">Enter the matchmaking queue to find and play against a random online opponent.</p>
        </div>
      </div>
    `;

    // Bind action clicks
    document.getElementById('btn-pvp-friend').onclick = () => {
      AudioSynth.playClick();
      if (window.parent && window.parent.friendsManager) {
        window.parent.friendsManager.openFriendsModal();
      } else if (window.friendsManager) {
        window.friendsManager.openFriendsModal();
      } else {
        const fab = document.getElementById('ps-mp-fab');
        if (fab) fab.click();
      }
    };

    document.getElementById('btn-pvp-online').onclick = () => {
      AudioSynth.playWhistle();
      if (window.PSMultiplayer && typeof window.PSMultiplayer.findMatch === 'function') {
        window.PSMultiplayer.findMatch();
      } else {
        const fab = document.getElementById('ps-mp-fab');
        if (fab) {
          fab.click();
          setTimeout(() => {
            const mmTab = document.querySelector('[data-tab="mm"]');
            if (mmTab) mmTab.click();
          }, 300);
        }
      }
    };
  };

  drawScreen();
}

/**
 * Football Legends 2026 - Settings Toggles Screen Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';
import { FirebaseSync } from '../profile.js';

export function renderSettings(container) {
  let activeTab = 'GENERAL'; // 'GENERAL', 'CONTROLS', 'AUDIO', 'DISPLAY'

  // Load initial settings from localStorage or defaults
  if (gameState.cameraView === undefined) {
    gameState.cameraView = localStorage.getItem('fb_settings_camera') || 'classic';
  }
  if (gameState.graphicsQuality === undefined) {
    gameState.graphicsQuality = localStorage.getItem('fb_settings_graphics') || 'medium';
  }
  if (gameState.vibrationEnabled === undefined) {
    gameState.vibrationEnabled = localStorage.getItem('fb_settings_vibrate') !== 'false';
  }
  if (gameState.tutorialEnabled === undefined) {
    gameState.tutorialEnabled = localStorage.getItem('fb_settings_tutorial') !== 'false';
  }

  const drawScreen = () => {
    container.innerHTML = `
      <div class="subscreen-layout">
        <!-- Left Tabs -->
        <aside class="subscreen-sidebar">
          <button class="sub-tab-btn ${activeTab === 'GENERAL' ? 'active' : ''}" id="settings-tab-gen">GENERAL</button>
          <button class="sub-tab-btn ${activeTab === 'DISPLAY' ? 'active' : ''}" id="settings-tab-disp">DISPLAY</button>
          <button class="sub-tab-btn ${activeTab === 'AUDIO' ? 'active' : ''}" id="settings-tab-audio">AUDIO</button>
          <button class="sub-tab-btn ${activeTab === 'CONTROLS' ? 'active' : ''}" id="settings-tab-ctrl">CONTROLS</button>
        </aside>

        <!-- Main Body -->
        <main class="subscreen-main-content">
          ${renderTabContent()}
        </main>
      </div>
    `;

    // Bind sidebar clicks
    document.getElementById('settings-tab-gen').onclick = () => { activeTab = 'GENERAL'; AudioSynth.playClick ? AudioSynth.playClick() : AudioSynth.playPost(); drawScreen(); };
    document.getElementById('settings-tab-disp').onclick = () => { activeTab = 'DISPLAY'; AudioSynth.playClick ? AudioSynth.playClick() : AudioSynth.playPost(); drawScreen(); };
    document.getElementById('settings-tab-audio').onclick = () => { activeTab = 'AUDIO'; AudioSynth.playClick ? AudioSynth.playClick() : AudioSynth.playPost(); drawScreen(); };
    document.getElementById('settings-tab-ctrl').onclick = () => { activeTab = 'CONTROLS'; AudioSynth.playClick ? AudioSynth.playClick() : AudioSynth.playPost(); drawScreen(); };

    bindTriggers();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'GENERAL':
        return `
          <h3 class="panel-section-title">GENERAL PREFERENCES</h3>
          <div class="settings-rows-list">
            <div class="settings-control-row">
              <span>LANGUAGE</span>
              <div class="settings-select-wrapper">
                <select class="settings-select" id="settings-lang">
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            <div class="settings-control-row">
              <span>CAMERA VIEW</span>
              <div class="settings-select-wrapper">
                <select class="settings-select" id="settings-camera">
                  <option value="classic" ${gameState.cameraView === 'classic' ? 'selected' : ''}>Classic TV Broadcast</option>
                  <option value="overhead" ${gameState.cameraView === 'overhead' ? 'selected' : ''}>Overhead / Tactical</option>
                  <option value="player" ${gameState.cameraView === 'player' ? 'selected' : ''}>Player Focus (Dribbler)</option>
                </select>
              </div>
            </div>

            <div class="settings-control-row">
              <span>VIBRATION / HAPTICS</span>
              <label class="toggle-switch">
                <input type="checkbox" id="settings-vibrate" ${gameState.vibrationEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-control-row">
              <span>TUTORIAL PROMPTS</span>
              <label class="toggle-switch">
                <input type="checkbox" id="settings-tutorial" ${gameState.tutorialEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <button class="menu-btn danger-btn" id="btn-logout" style="max-width: 200px; margin-top: 20px;">LOG OUT</button>
        `;
      case 'DISPLAY':
        return `
          <h3 class="panel-section-title">VIDEO & PERFORMANCE</h3>
          <div class="settings-rows-list">
            <div class="settings-control-row">
              <span>GRAPHICS QUALITY</span>
              <div class="settings-select-wrapper">
                <select class="settings-select" id="settings-graphics">
                  <option value="low" ${gameState.graphicsQuality === 'low' ? 'selected' : ''}>LOW (Max FPS / No Shadows)</option>
                  <option value="medium" ${gameState.graphicsQuality === 'medium' ? 'selected' : ''}>MEDIUM (Standard Shadows)</option>
                  <option value="high" ${gameState.graphicsQuality === 'high' ? 'selected' : ''}>HIGH (Enhanced Shadows & AA)</option>
                </select>
              </div>
            </div>
            <div class="settings-control-row">
              <span>FULLSCREEN MODE</span>
              <button id="settings-fullscreen-btn" class="menu-btn primary-btn" style="margin: 0; max-width: 220px; font-size: 0.8rem; padding: 10px 16px;">TOGGLE FULLSCREEN</button>
            </div>
          </div>
        `;
      case 'AUDIO':
        return `
          <h3 class="panel-section-title">AUDIO ENGINE VOLUMES</h3>
          <div class="settings-rows-list">
            <div class="settings-control-row" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>MASTER VOLUME</span>
                <span id="val-master">${Math.round(AudioSynth.masterVolume * 100)}%</span>
              </div>
              <input type="range" id="slider-master" min="0" max="1" step="0.05" value="${AudioSynth.masterVolume}" class="settings-slider" style="width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.2); outline: none;">
            </div>

            <div class="settings-control-row" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>SFX (KICKS / WHISTLES)</span>
                <span id="val-sfx">${Math.round(AudioSynth.sfxVolume * 100)}%</span>
              </div>
              <input type="range" id="slider-sfx" min="0" max="1" step="0.05" value="${AudioSynth.sfxVolume}" class="settings-slider" style="width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.2); outline: none;">
            </div>

            <div class="settings-control-row" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>CROWD & AMBIENCE</span>
                <span id="val-crowd">${Math.round(AudioSynth.crowdVolume * 100)}%</span>
              </div>
              <input type="range" id="slider-crowd" min="0" max="1" step="0.05" value="${AudioSynth.crowdVolume}" class="settings-slider" style="width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.2); outline: none;">
            </div>
          </div>
        `;
      case 'CONTROLS':
        return `
          <h3 class="panel-section-title">CONTROLS & KEY BINDINGS</h3>
          <div style="display: flex; gap: 24px; justify-content: space-between; align-items: stretch;">
            <!-- Keyboard Bindings -->
            <div style="flex: 1; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px;">
              <h4 style="color: var(--accent-lime); font-size: 0.9rem; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px; text-transform: uppercase;">Keyboard controls</h4>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
                <div style="display: flex; justify-content: space-between;"><span>Move Player</span><b style="color: #60a5fa;">W/A/S/D or ◀▶▲▼</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Sprint Boost</span><b style="color: #60a5fa;">Left Shift</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Pass Ball</span><b style="color: #60a5fa;">E Key</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Shoot Goal</span><b style="color: #60a5fa;">Q Key</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Slide Tackle</span><b style="color: #60a5fa;">Space Bar</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Switch Player</span><b style="color: #60a5fa;">C Key</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Pause Menu</span><b style="color: #60a5fa;">Escape Key</b></div>
              </div>
            </div>

            <!-- Gamepad Bindings -->
            <div style="flex: 1; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px;">
              <h4 style="color: var(--accent-lime); font-size: 0.9rem; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px; text-transform: uppercase;">Gamepad controls</h4>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
                <div style="display: flex; justify-content: space-between;"><span>Directional Aim</span><b style="color: #a78bfa;">Left Joystick</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Sprint Boost</span><b style="color: #a78bfa;">R1 / RT</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Pass Teammate</span><b style="color: #a78bfa;">✕ Cross</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Shoot Goal</span><b style="color: #a78bfa;">○ Circle</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Tackle Slider</span><b style="color: #a78bfa;">□ Square</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Switch Player</span><b style="color: #a78bfa;">L1 / LT</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Pause Menu</span><b style="color: #a78bfa;">Options / Start</b></div>
              </div>
            </div>
          </div>
        `;
    }
  };

  const bindTriggers = () => {
    if (activeTab === 'GENERAL') {
      // Camera View Trigger
      const camSelect = document.getElementById('settings-camera');
      camSelect.onchange = () => {
        const val = camSelect.value;
        gameState.cameraView = val;
        localStorage.setItem('fb_settings_camera', val);
        AudioSynth.playPost();
      };

      // Vibration Toggle
      const vibCheckbox = document.getElementById('settings-vibrate');
      vibCheckbox.onchange = () => {
        const val = vibCheckbox.checked;
        gameState.vibrationEnabled = val;
        localStorage.setItem('fb_settings_vibrate', val ? 'true' : 'false');
        AudioSynth.playPost();
      };

      // Tutorial Toggle
      const tutCheckbox = document.getElementById('settings-tutorial');
      tutCheckbox.onchange = () => {
        const val = tutCheckbox.checked;
        gameState.tutorialEnabled = val;
        localStorage.setItem('fb_settings_tutorial', val ? 'true' : 'false');
        AudioSynth.playPost();
      };

      // Logout Action
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          AudioSynth.playPost();
          alert("Logging out from PlaySphere profile sync...");
          if (window.parent && window.parent !== window && typeof window.parent.closeGameIframe === 'function') {
            window.parent.closeGameIframe();
          } else {
            window.location.href = '/index.html';
          }
        };
      }
    } else if (activeTab === 'DISPLAY') {
      // Graphics Quality Trigger
      const graphSelect = document.getElementById('settings-graphics');
      graphSelect.onchange = () => {
        const val = graphSelect.value;
        gameState.graphicsQuality = val;
        localStorage.setItem('fb_settings_graphics', val);
        AudioSynth.playPost();
        
        // Dynamically adjust shadows based on graphics quality
        if (gameState.renderer) {
          gameState.renderer.shadowMap.enabled = (val !== 'low');
          gameState.scene.traverse(node => {
            if (node.isLight || node.isMesh) {
              if (node.castShadow !== undefined) node.castShadow = (val === 'high');
              if (node.receiveShadow !== undefined) node.receiveShadow = (val !== 'low');
            }
          });
        }
      };

      // Fullscreen Action
      const fsBtn = document.getElementById('settings-fullscreen-btn');
      if (fsBtn) {
        fsBtn.onclick = () => {
          AudioSynth.playPost();
          if (typeof window.toggleFullscreen === 'function') {
            window.toggleFullscreen();
          } else {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (!isFs) {
              document.documentElement.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }
        };
      }
    } else if (activeTab === 'AUDIO') {
      // Master Volume Slider
      const sliderMaster = document.getElementById('slider-master');
      sliderMaster.oninput = () => {
        const val = parseFloat(sliderMaster.value);
        AudioSynth.setVolume('master', val);
        document.getElementById('val-master').innerText = `${Math.round(val * 100)}%`;
      };

      // SFX Volume Slider
      const sliderSfx = document.getElementById('slider-sfx');
      sliderSfx.oninput = () => {
        const val = parseFloat(sliderSfx.value);
        AudioSynth.setVolume('sfx', val);
        document.getElementById('val-sfx').innerText = `${Math.round(val * 100)}%`;
      };

      // Crowd Volume Slider
      const sliderCrowd = document.getElementById('slider-crowd');
      sliderCrowd.oninput = () => {
        const val = parseFloat(sliderCrowd.value);
        AudioSynth.setVolume('crowd', val);
        document.getElementById('val-crowd').innerText = `${Math.round(val * 100)}%`;
      };
    }
  };

  drawScreen();
}

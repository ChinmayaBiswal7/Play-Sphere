/* ==========================================================================
   DELHI DEFIANCE - AGENT SELECTION TIMER & LOCKED CONFIRMATIONS
   ========================================================================= */

class AgentSelectUIManager {
  constructor() {
    this.timerInterval = null;
    this.secondsLeft = 30;
    this.locked = false;
  }

  init() {
    this.setupListeners();
  }

  setupListeners() {
    const gridItems = document.querySelectorAll('.agent-grid-item');
    gridItems.forEach(item => {
      item.addEventListener('click', () => {
        if (this.locked) return;
        window.SynthAudio.playClick();
        gridItems.forEach(i => i.classList.remove('active'));
        item.add = item.classList.add('active');

        const agentId = item.getAttribute('data-agent');
        this.updateSelectedDetails(agentId);
      });
    });

    // Lock In Button Click
    document.getElementById('btn-agent-lockin').addEventListener('click', () => {
      if (this.locked) return;
      
      this.locked = true;
      window.FPSState.lockedAgentId = window.FPSState.selectedAgentId;
      if (window.SynthAudio) window.SynthAudio.playSplashChime();
      
      const lockBtn = document.getElementById('btn-agent-lockin');
      lockBtn.innerText = "LOCKED IN";
      lockBtn.style.opacity = "0.6";
      lockBtn.style.pointerEvents = "none";

      // Stop timer and auto transition
      clearInterval(this.timerInterval);
      setTimeout(() => {
        this.transitionToMatchLoading();
      }, 1000);
    });
  }

  updateSelectedDetails(agentId) {
    window.FPSState.selectedAgentId = agentId;
    
    const nameLabel = document.getElementById('select-agent-name');
    const roleLabel = document.getElementById('select-agent-role');
    const bioLabel = document.getElementById('select-agent-bio');
    const abilitiesBox = document.querySelector('.details-abilities-column');

    const agent = window.AGENT_REGISTRY[agentId] || window.AGENT_REGISTRY['agni'];

    if (nameLabel) nameLabel.innerText = agent.name;
    if (roleLabel) {
      roleLabel.innerText = agent.role;
      if (agent.role === 'DUELIST') roleLabel.style.color = "var(--neon-red)";
      else if (agent.role === 'INITIATOR') roleLabel.style.color = "var(--neon-cyan)";
      else if (agent.role === 'CONTROLLER') roleLabel.style.color = "#a855f7";
      else if (agent.role === 'SENTINEL') roleLabel.style.color = "#eab308";
    }
    if (bioLabel) bioLabel.innerText = agent.passiveDesc;
    if (abilitiesBox) {
      abilitiesBox.innerHTML = `
        <div class="detail-ability"><span class="ab-key">[Q]</span> <strong>${agent.abilities.q.name.toUpperCase()}</strong></div>
        <div class="detail-ability"><span class="ab-key">[E]</span> <strong>${agent.abilities.e.name.toUpperCase()}</strong></div>
        <div class="detail-ability"><span class="ab-key">[X]</span> <strong>${agent.abilities.x.name.toUpperCase()}</strong></div>
      `;
    }
  }

  startCountdown() {
    this.secondsLeft = 30;
    this.locked = false;
    
    const timerLabel = document.getElementById('agent-select-timer');
    timerLabel.innerText = this.secondsLeft;
    
    const lockBtn = document.getElementById('btn-agent-lockin');
    lockBtn.innerText = "LOCK IN";
    lockBtn.style.opacity = "1.0";
    lockBtn.style.pointerEvents = "auto";

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.secondsLeft--;
      timerLabel.innerText = this.secondsLeft;

      if (this.secondsLeft <= 5) {
        if (window.SynthAudio) window.SynthAudio.playSpikeTick(1.0);
        const tc = document.querySelector('.select-timer-circle');
        if (tc) tc.style.borderColor = 'var(--neon-red)';
      }

      if (this.secondsLeft <= 0) {
        clearInterval(this.timerInterval);
        if (!this.locked) {
          // Auto lock current selection
          this.locked = true;
          window.FPSState.lockedAgentId = window.FPSState.selectedAgentId;
          this.transitionToMatchLoading();
        }
      }
    }, 1000);
  }

  transitionToMatchLoading() {
    document.getElementById('agent-select-screen').style.display = 'none';
    
    // Set up loading details
    const user = window.FPSState.currentUser;
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
    setEl('match-load-p1-name',  user.username);
    setEl('match-load-p1-agent', (window.FPSState.lockedAgentId || 'agni').toUpperCase());
    const avatars = { '1': '👤', '2': '🔥', '3': '🌀', '4': '💀' };
    setEl('match-load-p1-card', avatars[user.avatar] || '👤');

    const matchLoadingScreen = document.getElementById('match-loading-screen');
    matchLoadingScreen.style.display = 'flex';
    window.FPSState.gameState = 'MATCH_LOADING';

    // Simulate match loading progress bar
    let loadProgress = 0;
    const progressFill = document.getElementById('match-load-progress');
    
    const interval = setInterval(() => {
      loadProgress += Math.floor(Math.random() * 12) + 4;
      if (loadProgress > 100) loadProgress = 100;
      if (progressFill) progressFill.style.width = `${loadProgress}%`;

      if (loadProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          matchLoadingScreen.style.display = 'none';
          const arena = document.getElementById('arena-container');
          if (arena) arena.style.display = 'block';
          window.FPSState.gameState = 'GAMEPLAY';
          if (window.FPSGameLoop) window.FPSGameLoop.startMatch();
        }, 600);
      }
    }, 150);
  }
}

window.agentSelectUI = new AgentSelectUIManager();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.agentSelectUI.init());
} else {
  window.agentSelectUI.init();
}

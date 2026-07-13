// Team Selection Grid Controller Module
(function() {
  let activeLeague = 'INTERNATIONAL';
  let focusedIndex = 0;
  let targetTeamSide = 'home'; // 'home' or 'away' (home = userTeam, away = oppTeam)
  let visibleTeams = [];

  window.openTeamSelection = function(side) {
    targetTeamSide = side; // 'home' or 'away'
    focusedIndex = 0;
    
    // Set target label text
    const label = document.getElementById('team-sel-target-label');
    if (label) {
      label.innerText = side === 'home' ? "SELECTING HOME TEAM" : "SELECTING AWAY TEAM";
      label.className = side === 'home' ? "sel-highlight" : "sel-highlight away-color";
    }

    document.getElementById('team-selection-overlay').classList.remove('hidden');
    
    // Set tab to INTERNATIONAL by default
    switchTab('INTERNATIONAL');
  };

  window.closeTeamSelection = function() {
    document.getElementById('team-selection-overlay').classList.add('hidden');
  };

  function switchTab(leagueKey) {
    activeLeague = leagueKey;
    focusedIndex = 0;

    // Update active tab styles
    const tabs = document.querySelectorAll('.team-sel-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-league') === leagueKey) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    populateGrid();
  }

  function populateGrid() {
    const grid = document.getElementById('team-sel-grid');
    grid.innerHTML = '';
    
    // Filter teams belonging to this league
    visibleTeams = Object.keys(window.TEAMS).filter(key => {
      return window.TEAMS[key].league === activeLeague;
    });

    visibleTeams.forEach((key, idx) => {
      const team = window.TEAMS[key];
      const card = document.createElement('div');
      card.className = 'team-sel-card';
      card.setAttribute('data-key', key);
      card.setAttribute('data-index', idx);
      
      const primary = team.primary || '#3b82f6';
      const secondary = team.secondary || '#ffffff';

      card.innerHTML = `
        <div class="team-logo-circle" style="background: linear-gradient(135deg, ${primary} 50%, ${secondary} 50%); border: 2.5px solid ${primary}; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; width: 50px; height: 50px; border-radius: 50%; margin-bottom: 8px;">
          <span class="team-logo-code" style="color: #fff; text-shadow: 1px 1px 3px rgba(0,0,0,0.95), -1px -1px 3px rgba(0,0,0,0.95), 1px -1px 3px rgba(0,0,0,0.95), -1px 1px 3px rgba(0,0,0,0.95); font-weight: 900; font-size: 0.95rem; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px; line-height: 1;">${key}</span>
        </div>
        <div class="team-name">${team.name.toUpperCase()}</div>
        <div class="team-rating">${team.rating || 80}</div>
      `;

      card.onclick = () => {
        selectTeam(key);
      };

      grid.appendChild(card);
    });

    updateGridFocus();
  }

  function updateGridFocus() {
    const cards = document.querySelectorAll('.team-sel-card');
    cards.forEach(c => c.classList.remove('focused'));
    
    if (cards[focusedIndex]) {
      cards[focusedIndex].classList.add('focused');
      cards[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectTeam(teamKey) {
    if (targetTeamSide === 'home') {
      window.MATCH.userTeam = teamKey;
      // If user is batting, sync striker lineup
      const team = window.TEAMS[teamKey];
      if (team && team.lineup) {
        window.MATCH.batters[0].name = team.lineup[0];
        window.MATCH.batters[1].name = team.lineup[1];
      }
    } else {
      window.MATCH.oppTeam = teamKey;
      const team = window.TEAMS[teamKey];
      if (team) {
        window.MATCH.bowlerName = team.bowler || team.lineup[8];
      }
    }

    closeTeamSelection();

    // Refresh Captains Faceoff UI
    if (typeof window.updateMatchupScreenUI === 'function') {
      window.updateMatchupScreenUI();
    }

    // Trigger tick sound
    if (window.CricketAudio && window.CricketAudio.playHit) {
      window.CricketAudio.playHit(0.45);
    }
  }

  // Handle D-pad navigation for Team Selector
  window.handleTeamSelNavigation = function(key) {
    const cards = document.querySelectorAll('.team-sel-card');
    if (cards.length === 0) return;

    // Find grid columns layout dynamically
    const grid = document.getElementById('team-sel-grid');
    const cols = getGridCols(grid);

    if (key === 'ArrowRight') {
      focusedIndex = (focusedIndex + 1) % visibleTeams.length;
      updateGridFocus();
    } else if (key === 'ArrowLeft') {
      focusedIndex = (focusedIndex - 1 + visibleTeams.length) % visibleTeams.length;
      updateGridFocus();
    } else if (key === 'ArrowDown') {
      if (focusedIndex + cols < visibleTeams.length) {
        focusedIndex += cols;
      } else {
        // Wrap to top column
        focusedIndex = focusedIndex % cols;
      }
      updateGridFocus();
    } else if (key === 'ArrowUp') {
      if (focusedIndex - cols >= 0) {
        focusedIndex -= cols;
      } else {
        // Wrap to bottom matching index
        const rem = focusedIndex % cols;
        const target = Math.floor((visibleTeams.length - 1) / cols) * cols + rem;
        focusedIndex = target < visibleTeams.length ? target : target - cols;
      }
      updateGridFocus();
    } else if (key === 'Enter' || key === 'Space') {
      const selectedKey = visibleTeams[focusedIndex];
      if (selectedKey) selectTeam(selectedKey);
    } else if (key === 'Escape' || key === 'Backspace') {
      closeTeamSelection();
    } else if (key === 'PageUp' || key === 'KeyQ') {
      // Cycle tabs left
      cycleTabs(-1);
    } else if (key === 'PageDown' || key === 'KeyE') {
      // Cycle tabs right
      cycleTabs(1);
    }
  };

  function cycleTabs(dir) {
    const tabs = ["INTERNATIONAL", "INDIAN_T20_LEAGUE", "BIG_BASH_LEAGUE", "THE_HUNDRED", "PAKISTAN_SUPER_LEAGUE"];
    let idx = tabs.indexOf(activeLeague);
    idx = (idx + dir + tabs.length) % tabs.length;
    switchTab(tabs[idx]);
  }

  function getGridCols(gridEl) {
    if (!gridEl) return 5;
    const computedStyle = window.getComputedStyle(gridEl);
    const colsString = computedStyle.getPropertyValue('grid-template-columns');
    const cols = colsString.split(' ').length;
    return cols || 5;
  }

  // Setup click listeners for league tab buttons
  document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.team-sel-tab');
    tabs.forEach(tab => {
      tab.onclick = () => {
        const lKey = tab.getAttribute('data-league');
        switchTab(lKey);
      };
    });
  });

  // Direct keydown event capture listener to ensure keys (like Esc, Arrow keys) work 100% reliably
  window.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('team-selection-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    const handledKeys = ['Escape', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'PageUp', 'PageDown'];
    if (handledKeys.includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();

      let mappedKey = e.code;
      if (e.code === 'KeyW') mappedKey = 'ArrowUp';
      else if (e.code === 'KeyS') mappedKey = 'ArrowDown';
      else if (e.code === 'KeyA') mappedKey = 'ArrowLeft';
      else if (e.code === 'KeyD') mappedKey = 'ArrowRight';
      else if (e.code === 'Space') mappedKey = 'Enter';
      else if (e.code === 'KeyQ') mappedKey = 'PageUp';
      else if (e.code === 'KeyE') mappedKey = 'PageDown';

      window.handleTeamSelNavigation(mappedKey);
    }
  }, true); // useCapture
})();

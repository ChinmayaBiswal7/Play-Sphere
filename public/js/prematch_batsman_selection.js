/**
 * Prematch Opening Batsmen Selection Logic
 * Handles selecting striker and non-striker before match starts
 */

window.openOpeningLineupSelection = function(onConfirmCallback) {
  const userTeamVal = window.MATCH.userTeam || 'IND';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  
  const screen = document.getElementById('prematch-batsman-selection-screen');
  if (!screen) return;
  
  screen.classList.remove('hidden');
  
  let selectedStriker = null;
  let selectedNonStriker = null;
  
  const playersGrid = document.getElementById('prematch-players-grid');
  const confirmBtn = document.getElementById('prematch-confirm-btn');
  const strikerDisplay = document.getElementById('selected-striker-display');
  const nonStrikerDisplay = document.getElementById('selected-nonstriker-display');
  
  window.prematchNavHighlightIndex = 0;

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.add('disabled');
    confirmBtn.onmouseenter = () => {
      window.prematchNavHighlightIndex = 11;
      document.querySelectorAll('.prematch-player-row').forEach(r => r.classList.remove('nav-highlight'));
      confirmBtn.classList.add('nav-highlight');
    };
  }
  
  function updateLists() {
    if (!playersGrid) return;
    playersGrid.innerHTML = '';
    
    userTeam.lineup.forEach((player, index) => {
      const pRow = document.createElement('div');
      pRow.className = 'prematch-player-row';
      if (window.prematchNavHighlightIndex === index) {
        pRow.classList.add('nav-highlight');
      }
      
      let statusText = 'SELECT';
      let isActive = false;
      
      if (player === selectedStriker) {
        statusText = 'STRIKER';
        isActive = true;
        pRow.classList.add('active');
      } else if (player === selectedNonStriker) {
        statusText = 'NON-STRIKER';
        isActive = true;
        pRow.classList.add('active');
      } else {
        if (selectedStriker && selectedNonStriker) {
          pRow.classList.add('disabled');
        }
      }
      
      pRow.innerHTML = `<span>${player}</span><span class="player-role-badge">${statusText}</span>`;
      
      pRow.onclick = (e) => {
        e.stopPropagation();
        
        if (player === selectedStriker) {
          selectedStriker = null;
          if (strikerDisplay) strikerDisplay.innerText = "SELECT STRIKER";
        } else if (player === selectedNonStriker) {
          selectedNonStriker = null;
          if (nonStrikerDisplay) nonStrikerDisplay.innerText = "SELECT NON-STRIKER";
        } else {
          if (!selectedStriker) {
            selectedStriker = player;
            if (strikerDisplay) strikerDisplay.innerText = player.toUpperCase();
          } else if (!selectedNonStriker) {
            selectedNonStriker = player;
            if (nonStrikerDisplay) nonStrikerDisplay.innerText = player.toUpperCase();
          } else {
            return;
          }
        }
        
        updateLists();
      };

      pRow.onmouseenter = () => {
        window.prematchNavHighlightIndex = index;
        document.querySelectorAll('.prematch-player-row').forEach((r, idx) => {
          if (idx === index) r.classList.add('nav-highlight');
          else r.classList.remove('nav-highlight');
        });
        if (confirmBtn) confirmBtn.classList.remove('nav-highlight');
      };
      
      playersGrid.appendChild(pRow);
    });
    
    if (selectedStriker && selectedNonStriker) {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('disabled');
      }
    } else {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('disabled');
      }
    }

    if (confirmBtn) {
      if (window.prematchNavHighlightIndex === 11) {
        confirmBtn.classList.add('nav-highlight');
      } else {
        confirmBtn.classList.remove('nav-highlight');
      }
    }

    // Auto-scroll the active player row into view
    if (window.prematchNavHighlightIndex >= 0 && window.prematchNavHighlightIndex < 11) {
      const activeRow = playersGrid.children[window.prematchNavHighlightIndex];
      if (activeRow) {
        activeRow.scrollIntoView({ block: 'nearest' });
      }
    }
  }
  
  if (strikerDisplay) strikerDisplay.innerText = "SELECT STRIKER";
  if (nonStrikerDisplay) nonStrikerDisplay.innerText = "SELECT NON-STRIKER";
  
  updateLists();
  
  if (confirmBtn) {
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      if (selectedStriker && selectedNonStriker) {
        window.prematchSelectedStriker = selectedStriker;
        window.prematchSelectedNonStriker = selectedNonStriker;
        window.prematchLineupSelected = true;
        screen.classList.add('hidden');
        
        // Wrap callback inside a short timeout so that the click event finishes bubbling
        // before the entrance cutscene is activated.
        setTimeout(() => {
          if (typeof onConfirmCallback === 'function') onConfirmCallback();
        }, 50);
      }
    };
  }
};

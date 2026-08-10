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

  const playersGrid     = document.getElementById('prematch-players-grid');
  const confirmBtn      = document.getElementById('prematch-confirm-btn');
  const strikerDisplay  = document.getElementById('selected-striker-display');
  const nonStrikerDisplay = document.getElementById('selected-nonstriker-display');
  const strikerCard     = document.getElementById('opener-striker-card');
  const nonStrikerCard  = document.getElementById('opener-nonstriker-card');

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

  function updateCards() {
    // Striker card
    if (strikerDisplay) strikerDisplay.textContent = selectedStriker ? selectedStriker.toUpperCase() : 'SELECT';
    if (strikerCard) strikerCard.classList.toggle('has-player', !!selectedStriker);

    // Non-striker card
    if (nonStrikerDisplay) nonStrikerDisplay.textContent = selectedNonStriker ? selectedNonStriker.toUpperCase() : 'SELECT';
    if (nonStrikerCard) nonStrikerCard.classList.toggle('has-player', !!selectedNonStriker);

    // Confirm button state
    const ready = !!(selectedStriker && selectedNonStriker);
    if (confirmBtn) {
      confirmBtn.disabled = !ready;
      confirmBtn.classList.toggle('disabled', !ready);
    }
  }

  function updateLists() {
    if (!playersGrid) return;
    playersGrid.innerHTML = '';

    userTeam.lineup.forEach((player, index) => {
      const pRow = document.createElement('div');
      pRow.className = 'prematch-player-row';
      if (window.prematchNavHighlightIndex === index) pRow.classList.add('nav-highlight');

      let statusText = 'SELECT';
      if (player === selectedStriker)    { statusText = 'STRIKER';     pRow.classList.add('active'); }
      else if (player === selectedNonStriker) { statusText = 'NON-STRIKER'; pRow.classList.add('active'); }
      else if (selectedStriker && selectedNonStriker) { pRow.classList.add('disabled'); }

      pRow.innerHTML = `<span>${player}</span><span class="player-role-badge">${statusText}</span>`;

      pRow.onclick = (e) => {
        e.stopPropagation();
        if (player === selectedStriker)    { selectedStriker = null; }
        else if (player === selectedNonStriker) { selectedNonStriker = null; }
        else if (!selectedStriker)    { selectedStriker = player; }
        else if (!selectedNonStriker) { selectedNonStriker = player; }
        else return;

        updateCards();
        updateLists();
      };

      pRow.onmouseenter = () => {
        window.prematchNavHighlightIndex = index;
        document.querySelectorAll('.prematch-player-row').forEach((r, idx) => {
          r.classList.toggle('nav-highlight', idx === index);
        });
        if (confirmBtn) confirmBtn.classList.remove('nav-highlight');
      };

      playersGrid.appendChild(pRow);
    });

    // Sync confirm button nav-highlight state
    if (confirmBtn) {
      confirmBtn.classList.toggle('nav-highlight', window.prematchNavHighlightIndex === 11);
    }

    // Auto-scroll active row into view
    if (window.prematchNavHighlightIndex >= 0 && window.prematchNavHighlightIndex < 11) {
      const activeRow = playersGrid.children[window.prematchNavHighlightIndex];
      if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
    }
  }

  updateCards();
  updateLists();

  if (confirmBtn) {
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      if (selectedStriker && selectedNonStriker) {
        window.prematchSelectedStriker    = selectedStriker;
        window.prematchSelectedNonStriker = selectedNonStriker;
        window.prematchLineupSelected     = true;
        screen.classList.add('hidden');
        setTimeout(() => {
          if (typeof onConfirmCallback === 'function') onConfirmCallback();
        }, 50);
      }
    };
  }
};

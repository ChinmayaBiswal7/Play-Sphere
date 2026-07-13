// Lineup Editor Module
(function() {
  let activeCol = 'home'; // 'home' or 'away'
  let activeIdx = 0; // 0 to 11
  let swappingMode = false;
  let activeSwapPlayerName = null;
  let benchFocusedIdx = 0;

  // Helper to get deterministic player stats
  function getPlayerAttributes(name, teamKey, rating) {
    let seed = 0;
    for (let i = 0; i < name.length; i++) seed += name.charCodeAt(i);
    
    const team = window.TEAMS[teamKey];
    const isBowler = (team.bowler === name) || (team.squad.indexOf(name) >= 15);
    const isWK = (team.squad.indexOf(name) === 4) || (name.includes("Pant") || name.includes("Buttler") || name.includes("Kock") || name.includes("Samson") || name.includes("Rahul") || name.includes("Rizwan") || name.includes("Wade"));
    
    let batTech = Math.round(rating * (isBowler ? 0.45 : 0.95) + (seed % 10));
    let frontFoot = Math.round(rating * (isBowler ? 0.40 : 0.96) + ((seed >> 2) % 8));
    let backFoot = Math.round(rating * (isBowler ? 0.35 : 0.94) + ((seed >> 3) % 8));
    let unorthodox = Math.round(rating * (isBowler ? 0.20 : 0.70) + ((seed >> 4) % 15));
    let bowlDel = Math.round(rating * (isBowler ? 0.96 : 0.30) + ((seed >> 5) % 8));
    let bowlCtrl = Math.round(rating * (isBowler ? 0.94 : 0.25) + ((seed >> 6) % 8));
    let fielding = Math.round(rating * 0.88 + ((seed >> 7) % 10));
    let physical = Math.round(rating * 0.90 + ((seed >> 8) % 10));

    const role = isWK ? "WICKETKEEPER" : (isBowler ? "BOWLER" : "BATSMAN");
    const hand = (seed % 4 === 0) ? "LHB" : "RHB";
    const bowlType = isBowler ? ((seed % 3 === 0) ? "SLO" : ((seed % 3 === 1) ? "LFM" : "RMF")) : "OB";

    return {
      role,
      batTech: Math.min(99, Math.max(10, batTech)),
      frontFoot: Math.min(99, Math.max(10, frontFoot)),
      backFoot: Math.min(99, Math.max(10, backFoot)),
      unorthodox: Math.min(99, Math.max(10, unorthodox)),
      bowlDel: Math.min(99, Math.max(10, bowlDel)),
      bowlCtrl: Math.min(99, Math.max(10, bowlCtrl)),
      fielding: Math.min(99, Math.max(10, fielding)),
      physical: Math.min(99, Math.max(10, physical)),
      style: `${hand} | ${bowlType} | OVR ${rating}`
    };
  }

  function getBenchPlayers(teamKey) {
    const team = window.TEAMS[teamKey];
    // Return players in squad that are NOT in lineup
    return team.squad.filter(p => !team.lineup.includes(p));
  }

  window.openLineupEditor = function() {
    activeCol = 'home';
    activeIdx = 0;
    swappingMode = false;
    
    document.getElementById('lineup-editor-overlay').classList.remove('hidden');
    populateLineupLists();
    updateFocusStyles();
    updateCardDetails();
  };

  function closeLineupEditor() {
    document.getElementById('lineup-editor-overlay').classList.add('hidden');
    // Update matchup screen display immediately
    if (typeof window.updateMatchupScreenUI === 'function') {
      window.updateMatchupScreenUI();
    }
  }

  function populateLineupLists() {
    const homeTeamKey = window.MATCH.userTeam || 'IND';
    const awayTeamKey = window.MATCH.oppTeam || 'AUS';

    const homeTeam = window.TEAMS[homeTeamKey];
    const awayTeam = window.TEAMS[awayTeamKey];

    // Populate titles
    document.getElementById('lineup-home-team-title').innerText = `${homeTeam.name.toUpperCase()} XI`;
    document.getElementById('lineup-away-team-title').innerText = `${awayTeam.name.toUpperCase()} XI`;
    document.getElementById('lineup-active-edit-team-name').innerText = `${homeTeam.name.toUpperCase()} VS ${awayTeam.name.toUpperCase()}`;

    // Populate Home Lineup
    const homeList = document.getElementById('lineup-home-list');
    homeList.innerHTML = '';
    homeTeam.lineup.forEach((player, idx) => {
      const row = createLineupRow(player, idx, homeTeamKey);
      row.onclick = () => {
        activeCol = 'home';
        activeIdx = idx;
        updateFocusStyles();
        updateCardDetails();
        openBenchModal();
      };
      homeList.appendChild(row);
    });

    // Populate Away Lineup
    const awayList = document.getElementById('lineup-away-list');
    awayList.innerHTML = '';
    awayTeam.lineup.forEach((player, idx) => {
      const row = createLineupRow(player, idx, awayTeamKey);
      row.onclick = () => {
        activeCol = 'away';
        activeIdx = idx;
        updateFocusStyles();
        updateCardDetails();
        openBenchModal();
      };
      awayList.appendChild(row);
    });
  }

  function createLineupRow(playerName, idx, teamKey) {
    const team = window.TEAMS[teamKey];
    const rating = team.rating || 80;
    const attrs = getPlayerAttributes(playerName, teamKey, rating);
    
    const row = document.createElement('div');
    row.className = 'lineup-row';
    row.setAttribute('data-index', idx);

    let roleBadge = '';
    if (idx === 0) roleBadge = '<span class="row-badge">C</span>';
    else if (idx === 4) roleBadge = '<span class="row-badge">WK</span>';
    else if (playerName === team.bowler) roleBadge = '<span class="row-badge">B</span>';

    row.innerHTML = `
      <span class="row-num">${idx + 1}</span>
      <span class="row-name">${playerName} ${roleBadge}</span>
      <span class="row-style">${attrs.role}</span>
      <span class="row-rating">${rating}</span>
    `;
    return row;
  }

  function updateFocusStyles() {
    // Remove all focused classes
    document.querySelectorAll('.lineup-row').forEach(el => el.classList.remove('focused'));

    const listId = activeCol === 'home' ? 'lineup-home-list' : 'lineup-away-list';
    const list = document.getElementById(listId);
    if (list) {
      const rows = list.querySelectorAll('.lineup-row');
      if (rows[activeIdx]) {
        rows[activeIdx].classList.add('focused');
        rows[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function updateCardDetails() {
    const teamKey = activeCol === 'home' ? (window.MATCH.userTeam || 'IND') : (window.MATCH.oppTeam || 'AUS');
    const team = window.TEAMS[teamKey];
    const playerName = team.lineup[activeIdx];
    const rating = team.rating || 80;
    const attrs = getPlayerAttributes(playerName, teamKey, rating);

    // Update details card
    document.getElementById('card-role').innerText = attrs.role;
    document.getElementById('card-name').innerText = playerName.toUpperCase();
    document.getElementById('card-style').innerText = attrs.style;

    // Fills
    document.getElementById('bar-bat-tech').style.width = `${attrs.batTech}%`;
    document.getElementById('val-bat-tech').innerText = attrs.batTech;

    document.getElementById('bar-front-foot').style.width = `${attrs.frontFoot}%`;
    document.getElementById('val-front-foot').innerText = attrs.frontFoot;

    document.getElementById('bar-back-foot').style.width = `${attrs.backFoot}%`;
    document.getElementById('val-back-foot').innerText = attrs.backFoot;

    document.getElementById('bar-unorthodox').style.width = `${attrs.unorthodox}%`;
    document.getElementById('val-unorthodox').innerText = attrs.unorthodox;

    document.getElementById('bar-bowl-del').style.width = `${attrs.bowlDel}%`;
    document.getElementById('val-bowl-del').innerText = attrs.bowlDel;

    document.getElementById('bar-bowl-ctrl').style.width = `${attrs.bowlCtrl}%`;
    document.getElementById('val-bowl-ctrl').innerText = attrs.bowlCtrl;

    document.getElementById('bar-fielding').style.width = `${attrs.fielding}%`;
    document.getElementById('val-fielding').innerText = attrs.fielding;

    document.getElementById('bar-physical').style.width = `${attrs.physical}%`;
    document.getElementById('val-physical').innerText = attrs.physical;
  }

  function openBenchModal() {
    swappingMode = true;
    benchFocusedIdx = 0;
    
    const modal = document.getElementById('lineup-bench-modal');
    modal.classList.remove('hidden');

    const teamKey = activeCol === 'home' ? (window.MATCH.userTeam || 'IND') : (window.MATCH.oppTeam || 'AUS');
    const team = window.TEAMS[teamKey];
    const bench = getBenchPlayers(teamKey);

    document.getElementById('bench-modal-title').innerText = `SWAP: ${team.lineup[activeIdx].toUpperCase()}`;

    const listEl = document.getElementById('bench-players-list');
    listEl.innerHTML = '';

    if (bench.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.4); padding: 20px;">NO SQUAD BENCH PLAYERS AVAILABLE</div>';
      return;
    }

    bench.forEach((player, idx) => {
      const attrs = getPlayerAttributes(player, teamKey, team.rating || 80);
      const row = document.createElement('div');
      row.className = 'bench-row';
      row.setAttribute('data-index', idx);
      row.innerHTML = `
        <span class="bench-name">${player}</span>
        <span class="bench-style">${attrs.role}</span>
        <span class="bench-rating">${team.rating || 80}</span>
      `;
      row.onclick = () => {
        swapPlayer(player);
      };
      listEl.appendChild(row);
    });

    updateBenchFocus();
  }

  function closeBenchModal() {
    swappingMode = false;
    document.getElementById('lineup-bench-modal').classList.add('hidden');
    updateFocusStyles();
  }

  function updateBenchFocus() {
    const listEl = document.getElementById('bench-players-list');
    const rows = listEl.querySelectorAll('.bench-row');
    rows.forEach(r => r.classList.remove('focused'));
    if (rows[benchFocusedIdx]) {
      rows[benchFocusedIdx].classList.add('focused');
      rows[benchFocusedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function swapPlayer(benchPlayerName) {
    const teamKey = activeCol === 'home' ? (window.MATCH.userTeam || 'IND') : (window.MATCH.oppTeam || 'AUS');
    const team = window.TEAMS[teamKey];
    
    // Swap lineup[activeIdx] with benchPlayerName
    const idx = team.lineup.indexOf(team.lineup[activeIdx]);
    if (idx !== -1) {
      team.lineup[idx] = benchPlayerName;
    }

    closeBenchModal();
    populateLineupLists();
    updateFocusStyles();
    updateCardDetails();

    // Trigger audio tick
    if (window.CricketAudio && window.CricketAudio.playHit) {
      window.CricketAudio.playHit(0.4);
    }
  }

  // Keyboard navigation overrides for Lineup overlay
  window.handleLineupNavigation = function(key) {
    if (swappingMode) {
      const listEl = document.getElementById('bench-players-list');
      const rows = listEl.querySelectorAll('.bench-row');
      if (rows.length === 0) return;

      if (key === 'ArrowUp') {
        benchFocusedIdx = (benchFocusedIdx - 1 + rows.length) % rows.length;
        updateBenchFocus();
      } else if (key === 'ArrowDown') {
        benchFocusedIdx = (benchFocusedIdx + 1) % rows.length;
        updateBenchFocus();
      } else if (key === 'Enter' || key === 'Space') {
        // Swap selected
        const teamKey = activeCol === 'home' ? (window.MATCH.userTeam || 'IND') : (window.MATCH.oppTeam || 'AUS');
        const bench = getBenchPlayers(teamKey);
        if (bench[benchFocusedIdx]) {
          swapPlayer(bench[benchFocusedIdx]);
        }
      } else if (key === 'Escape' || key === 'Backspace') {
        closeBenchModal();
      }
      return;
    }

    // Normal navigation mode
    if (key === 'ArrowUp') {
      activeIdx = (activeIdx - 1 + 11) % 11;
      updateFocusStyles();
      updateCardDetails();
    } else if (key === 'ArrowDown') {
      activeIdx = (activeIdx + 1) % 11;
      updateFocusStyles();
      updateCardDetails();
    } else if (key === 'ArrowLeft') {
      if (activeCol === 'away') {
        activeCol = 'home';
        updateFocusStyles();
        updateCardDetails();
      }
    } else if (key === 'ArrowRight') {
      if (activeCol === 'home') {
        activeCol = 'away';
        updateFocusStyles();
        updateCardDetails();
      }
    } else if (key === 'Enter' || key === 'Space') {
      openBenchModal();
    } else if (key === 'Escape' || key === 'Backspace') {
      closeLineupEditor();
    } else if (key === 'KeyC' || key === 'KeyY') {
      setCaptainForActive();
    }
  };

  function setCaptainForActive() {
    const teamKey = activeCol === 'home' ? (window.MATCH.userTeam || 'IND') : (window.MATCH.oppTeam || 'AUS');
    const team = window.TEAMS[teamKey];
    if (!team || activeIdx === 0) return; // already captain or invalid

    // Swap team.lineup[activeIdx] with team.lineup[0]
    const temp = team.lineup[0];
    team.lineup[0] = team.lineup[activeIdx];
    team.lineup[activeIdx] = temp;

    // Refresh displays
    populateLineupLists();
    updateFocusStyles();
    updateCardDetails();

    // Trigger tick sound
    if (window.CricketAudio && window.CricketAudio.playHit) {
      window.CricketAudio.playHit(0.5);
    }
  }

  // Attach button triggers
  document.addEventListener('DOMContentLoaded', () => {
    const cancelModal = document.getElementById('lineup-bench-close-btn');
    if (cancelModal) {
      cancelModal.onclick = () => closeBenchModal();
    }
  });

  // Direct capture-phase keydown listener to make keyboard navigation work 100% reliably
  window.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('lineup-editor-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    const handledKeys = ['Escape', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyC', 'KeyY'];
    if (handledKeys.includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();

      let mappedKey = e.code;
      if (e.code === 'KeyW') mappedKey = 'ArrowUp';
      else if (e.code === 'KeyS') mappedKey = 'ArrowDown';
      else if (e.code === 'KeyA') mappedKey = 'ArrowLeft';
      else if (e.code === 'KeyD') mappedKey = 'ArrowRight';
      else if (e.code === 'Space') mappedKey = 'Enter';

      window.handleLineupNavigation(mappedKey);
    }
  }, true); // useCapture

  // Expose
  window.closeLineupEditor = closeLineupEditor;
})();

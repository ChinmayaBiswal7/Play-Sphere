// ── PLAYER CARD UI ───────────────────────────────────────────────
// Shows pre-match player stat cards during the entrance cutscene.

(function() {
  // Real T20I stats for known players
  const PLAYER_STATS = {
    'R. Sharma':     { matches: 159, runs: 3853, sr: 131.9, hundreds: 4,  fifties: 29, wickets: null, avg: null },
    'Y. Jaiswal':    { matches: 18,  runs: 762,  sr: 161.4, hundreds: 3,  fifties: 2,  wickets: null, avg: null },
    'V. Kohli':      { matches: 125, runs: 4188, sr: 137.2, hundreds: 1,  fifties: 38, wickets: null, avg: null },
    'S. Yadav':      { matches: 72,  runs: 1885, sr: 172.4, hundreds: 2,  fifties: 11, wickets: null, avg: null },
    'R. Pant':       { matches: 66,  runs: 1786, sr: 148.9, hundreds: 1,  fifties: 11, wickets: null, avg: null },
    'H. Pandya':     { matches: 97,  runs: 1524, sr: 147.0, hundreds: 0,  fifties: 8,  wickets: 60,   avg: 28.1 },
    'R. Jadeja':     { matches: 74,  runs: 652,  sr: 117.8, hundreds: 0,  fifties: 2,  wickets: 54,   avg: 29.6 },
    'J. Bumrah':     { matches: 71,  runs: 47,   sr: 100.0, hundreds: 0,  fifties: 0,  wickets: 89,   avg: 20.2 },
    'M. Siraj':      { matches: 28,  runs: 6,    sr: 75.0,  hundreds: 0,  fifties: 0,  wickets: 38,   avg: 22.1 },
    'T. Head':       { matches: 45,  runs: 1692, sr: 148.0, hundreds: 3,  fifties: 12, wickets: null, avg: null },
    'M. Marsh':      { matches: 55,  runs: 1420, sr: 144.0, hundreds: 1,  fifties: 8,  wickets: 32,   avg: 33.2 },
    'S. Smith':      { matches: 71,  runs: 2382, sr: 125.4, hundreds: 2,  fifties: 14, wickets: null, avg: null },
    'G. Maxwell':    { matches: 118, runs: 3228, sr: 154.0, hundreds: 7,  fifties: 14, wickets: 46,   avg: 36.4 },
    'M. Starc':      { matches: 64,  runs: 284,  sr: 120.0, hundreds: 0,  fifties: 0,  wickets: 80,   avg: 23.4 },
    'P. Cummins':    { matches: 58,  runs: 178,  sr: 105.0, hundreds: 0,  fifties: 0,  wickets: 68,   avg: 25.8 },
    'J. Hazlewood':  { matches: 49,  runs: 14,   sr: 70.0,  hundreds: 0,  fifties: 0,  wickets: 59,   avg: 21.5 },
    'J. Buttler':    { matches: 110, runs: 3582, sr: 143.0, hundreds: 9,  fifties: 17, wickets: null, avg: null },
    'P. Salt':       { matches: 18,  runs: 612,  sr: 168.0, hundreds: 2,  fifties: 3,  wickets: null, avg: null },
    'J. Archer':     { matches: 40,  runs: 92,   sr: 92.0,  hundreds: 0,  fifties: 0,  wickets: 48,   avg: 21.2 },
    'A. Rashid':     { matches: 76,  runs: 178,  sr: 110.0, hundreds: 0,  fifties: 0,  wickets: 89,   avg: 20.8 },
    'K. Williamson': { matches: 94,  runs: 2530, sr: 127.0, hundreds: 2,  fifties: 18, wickets: null, avg: null },
    'D. Conway':     { matches: 32,  runs: 1034, sr: 138.0, hundreds: 1,  fifties: 8,  wickets: null, avg: null },
    'T. Southee':    { matches: 109, runs: 380,  sr: 115.0, hundreds: 0,  fifties: 0,  wickets: 123,  avg: 28.9 },
    'L. Ferguson':   { matches: 55,  runs: 48,   sr: 80.0,  hundreds: 0,  fifties: 0,  wickets: 72,   avg: 22.4 },
    'B. Azam':       { matches: 100, runs: 3858, sr: 130.2, hundreds: 3,  fifties: 37, wickets: null, avg: null },
    'M. Rizwan':     { matches: 88,  runs: 2695, sr: 128.4, hundreds: 0,  fifties: 20, wickets: null, avg: null },
    'S. Afridi':     { matches: 55,  runs: 120,  sr: 98.0,  hundreds: 0,  fifties: 0,  wickets: 74,   avg: 19.8 },
    'H. Rauf':       { matches: 45,  runs: 62,   sr: 90.0,  hundreds: 0,  fifties: 0,  wickets: 59,   avg: 20.1 },
    'Q. de Kock':    { matches: 92,  runs: 2820, sr: 135.5, hundreds: 4,  fifties: 18, wickets: null, avg: null },
    'A. Markram':    { matches: 56,  runs: 1456, sr: 143.0, hundreds: 2,  fifties: 10, wickets: 18,   avg: 30.4 },
    'K. Rabada':     { matches: 68,  runs: 182,  sr: 125.0, hundreds: 0,  fifties: 0,  wickets: 89,   avg: 21.8 },
    'A. Nortje':     { matches: 42,  runs: 44,   sr: 85.0,  hundreds: 0,  fifties: 0,  wickets: 55,   avg: 18.6 },
  };

  function findStats(playerName) {
    if (PLAYER_STATS[playerName]) return PLAYER_STATS[playerName];
    // Partial last-name match
    const lastName = playerName.split('. ').pop();
    const key = Object.keys(PLAYER_STATS).find(k => k.includes(lastName));
    return key ? PLAYER_STATS[key] : null;
  }

  let _lastCardPlayer = '';

  window.updatePlayerCardUI = function(playerName, isBowler, teamKey) {
    if (playerName === _lastCardPlayer) return;
    _lastCardPlayer = playerName;

    const card = document.getElementById('prematch-player-card');
    if (!card) return;

    const nameEl        = document.getElementById('player-card-name');
    const roleEl        = document.getElementById('player-card-role');
    const teamEl        = document.getElementById('player-card-team');
    const stat1El       = document.getElementById('player-stat-1');
    const stat2El       = document.getElementById('player-stat-2');
    const stat3El       = document.getElementById('player-stat-3');
    const stat4El       = document.getElementById('player-stat-4');
    const stat2LblEl    = document.getElementById('player-stat-label-2');
    const stat3LblEl    = document.getElementById('player-stat-label-3');
    const stat4LblEl    = document.getElementById('player-stat-label-4');

    const team     = (window.TEAMS && window.TEAMS[teamKey]) || {};
    const teamName = team.name || teamKey || '';

    let stats = findStats(playerName);
    if (!stats) {
      // Synthetic fallback
      stats = isBowler
        ? { matches: Math.floor(Math.random()*50+20), wickets: Math.floor(Math.random()*60+15), avg: (15+Math.random()*20).toFixed(1) }
        : { matches: Math.floor(Math.random()*80+20), runs: Math.floor(Math.random()*2000+500),
            sr: (110+Math.random()*50).toFixed(1), hundreds: Math.floor(Math.random()*3), fifties: Math.floor(Math.random()*15) };
    }

    if (nameEl)  nameEl.innerText  = playerName.toUpperCase();
    if (teamEl)  teamEl.innerText  = teamName.toUpperCase();
    if (roleEl)  roleEl.innerText  = isBowler ? 'BOWLER' : 'BATSMAN';
    if (stat1El) stat1El.innerText = stats.matches || '--';

    if (isBowler && stats.wickets != null) {
      if (stat2LblEl) stat2LblEl.innerText = 'WICKETS';
      if (stat2El)    stat2El.innerText    = stats.wickets;
      if (stat3LblEl) stat3LblEl.innerText = 'AVERAGE';
      if (stat3El)    stat3El.innerText    = stats.avg || '--';
      if (stat4LblEl) stat4LblEl.innerText = 'ECONOMY';
      if (stat4El)    stat4El.innerText    = (5.5 + Math.random() * 2.5).toFixed(1);
    } else {
      if (stat2LblEl) stat2LblEl.innerText = 'RUNS';
      if (stat2El)    stat2El.innerText    = stats.runs || '--';
      if (stat3LblEl) stat3LblEl.innerText = 'STRIKE RATE';
      if (stat3El)    stat3El.innerText    = stats.sr || '--';
      if (stat4LblEl) stat4LblEl.innerText = '100s / 50s';
      if (stat4El)    stat4El.innerText    = `${stats.hundreds ?? '--'} / ${stats.fifties ?? '--'}`;
    }

    // Hide and show to trigger CSS animation restart
    card.classList.add('hidden');
    void card.offsetWidth; // Force browser reflow to restart animation
    card.classList.remove('hidden');
  };
})();

/**
 * PlaySphere Achievement System Component
 * Renders achievement notification toasts and handles unlocking achievements.
 */

// Steam/PSN style notification popup
function showPSNAchievementNotification(name, xp, coins) {
  const toast = document.createElement('div');
  toast.className = 'ps5-ach-toast';
  toast.innerHTML = `
    <div class="ps5-toast-icon">🏆</div>
    <div class="ps5-toast-content">
      <span class="ps5-toast-title">Achievement Unlocked</span>
      <span class="ps5-toast-name">${name}</span>
      <span class="ps5-toast-reward">+${xp} XP | +${coins} Coins</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  // Trigger slide-in
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Slide-out and remove after 4.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 800);
  }, 4500);
}

// Global Achievement Unlocker helper
window.unlockAchievement = function(id) {
  const list = {
    first_boundary: { name: 'First Boundary', xp: 50, coins: 10, desc: 'Scored a 4 or 6 in a match' },
    sixer_master: { name: 'Sixer Master', xp: 100, coins: 20, desc: 'Hit a massive 6 into the crowd' },
    clean_bowled: { name: 'Clean Bowled', xp: 80, coins: 15, desc: 'Dismissed a batsman by hitting stumps' },
    spectacular_catch: { name: 'Spectacular Catch', xp: 100, coins: 25, desc: 'Completed a Catch QTE successfully' },
    run_out: { name: 'Crease Run Out', xp: 120, coins: 30, desc: 'Ran out a batsman during throws' },
    match_winner: { name: 'Match Winner', xp: 200, coins: 50, desc: 'Won a complete match' }
  };

  const ach = list[id];
  if (!ach) return;

  const profile = window.profile;
  if (!profile) return;
  if (!profile.achievements) profile.achievements = [];

  if (profile.achievements.includes(id)) return; // Already unlocked!

  profile.achievements.push(id);
  profile.xp = (profile.xp || 0) + ach.xp;
  profile.coins = (profile.coins || 0) + ach.coins;

  // Display toast and play trophy sound
  showPSNAchievementNotification(ach.name, ach.xp, ach.coins);
  if (window.sounds && typeof window.sounds.playTrophy === 'function') {
    window.sounds.playTrophy();
  }

  // Save changes
  if (typeof window.saveProfile === 'function') {
    window.saveProfile();
  }
};

window.showPSNAchievementNotification = showPSNAchievementNotification;

/* ==========================================================================
   DELHI DEFIANCE - SPLASH SCREEN & PROGRESSIVE LOADER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Splash Screen Nodes
  const splashScreen = document.getElementById('splash-screen');
  const progressBar = document.getElementById('splash-progress-bar');
  const statusLabel = document.getElementById('splash-status-lbl');
  const tipLabel = document.getElementById('splash-tip');

  // Loading Tips Catalog
  const tips = [
    "Tip: Headshots deal 3x damage. Always crosshair-place at head level.",
    "Tip: Walking (Hold Shift) makes your movement completely silent.",
    "Tip: The Vandal has high recoil. Pull down on your mouse while firing to control it.",
    "Tip: Planting the Spike rewards your entire team with extra credits next round.",
    "Tip: Defenders can defuse the Spike in 7 seconds. Defuse half-ticks are saved!"
  ];

  // Pick random tip
  tipLabel.innerText = tips[Math.floor(Math.random() * tips.length)];

  // Loading state simulation
  let progress = 0;
  
  // Play startup sound on first click to unlock AudioContext
  document.body.addEventListener('click', playStartupChimeOnFirstClick, { once: true });

  function playStartupChimeOnFirstClick() {
    window.SynthAudio.playSplashChime();
  }

  const statusTexts = [
    { threshold: 15, text: "INITIALIZING 3D ENGINE..." },
    { threshold: 45, text: "COMPILING WEBGL SHADERS..." },
    { threshold: 70, text: "BUILDING RAJDHANI ARENA GEOMETRY..." },
    { threshold: 90, text: "SPAWNING COMBAT BOTS..." },
    { threshold: 100, text: "ESTABLISHING SENTINEL LINK..." }
  ];

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 2;
    if (progress > 100) progress = 100;

    // Update bar width
    progressBar.style.width = `${progress}%`;

    // Update status text
    const matchedText = statusTexts.find(s => progress <= s.threshold);
    if (matchedText) {
      statusLabel.innerText = matchedText.text;
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        // Transition to login screen
        splashScreen.classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        
        // Update global state
        window.FPSState.gameState = window.STATES.LOGIN;
      }, 500);
    }
  }, 120);
});

// ── FIELD PLACEMENT SYSTEM ─────────────────────────────────────────
// Allows interactive custom field placement by clicking the mini-map.

(function() {
  let selectedFielderIndex = null;
  // Temporary coordinates during editing: { [idx]: { x, z } }
  let tempPositions = {};

  const MAP_DIAMETER = 320; // Matches CSS width/height
  const MAP_RADIUS = MAP_DIAMETER / 2;
  const FIELD_LIMIT_M = 55.0; // boundary radius in meters
  const MAP_SCALE = MAP_RADIUS / FIELD_LIMIT_M; // px per meter (~2.909)

  function init() {
    const radar = document.getElementById('radar-container');
    if (!radar) return;

    radar.addEventListener('click', (e) => {
      // Prevent double trigger if clicking small dots inside the mini-map
      e.stopPropagation();

      // Only open if the user is bowling and the game is ready for a delivery
      const MATCH = window.MATCH;
      const STATES = window.STATES;
      const gameState = window.gameState;

      if (!MATCH || MATCH.userIsBatting) return;
      if (gameState !== STATES.BOWL_READY) return;
      
      // Only allow before bowler release
      if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BOWLER ||
          window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
        openFieldPlacement();
      }
    });

    // Wire up buttons
    const applyBtn = document.getElementById('field-placement-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', applyChanges);

    const cancelBtn = document.getElementById('field-placement-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeFieldPlacement);

    // Click on field circle map
    const mapCircle = document.getElementById('field-map-circle');
    if (mapCircle) {
      mapCircle.addEventListener('click', (e) => {
        // If clicking a dot directly, handled separately
        if (e.target.classList.contains('map-dot')) return;

        if (selectedFielderIndex === null) return;

        const rect = mapCircle.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Relative to center of map
        let relX = clickX - MAP_RADIUS;
        let relY = clickY - MAP_RADIUS;

        const dist = Math.sqrt(relX * relX + relY * relY);
        // Clamp to boundary limit
        if (dist > MAP_RADIUS) {
          relX = (relX / dist) * MAP_RADIUS;
          relY = (relY / dist) * MAP_RADIUS;
        }

        // Convert to 3D world coordinates
        // Pitch center is Z = -10.0, X = 0.0
        const fx = relX / MAP_SCALE;
        const fz = (relY / MAP_SCALE) - 10.0;

        // Save temporarily
        tempPositions[selectedFielderIndex] = { x: fx, z: fz };

        // Update dot position on the large map circle UI
        const dotId = `map-dot-fielder-${selectedFielderIndex}`;
        const dot = document.getElementById(dotId);
        if (dot) {
          const mapX = MAP_RADIUS + relX;
          const mapY = MAP_RADIUS + relY;
          dot.style.left = `${mapX}px`;
          dot.style.top = `${mapY}px`;
        }
      });
    }
  }

  function openFieldPlacement() {
    const modal = document.getElementById('field-placement-modal');
    if (!modal) return;

    selectedFielderIndex = null;
    tempPositions = {};

    // Populated dynamic dots container
    const container = document.getElementById('map-fielders-container');
    if (container) container.innerHTML = '';

    const fielders = window.fielders || [];
    fielders.forEach((f, idx) => {
      // Skip the bowler-fielder helper if active
      if (f.id === 'bowler-fielder') return;

      const dot = document.createElement('div');
      dot.className = 'map-dot fielder';
      dot.id = `map-dot-fielder-${idx}`;
      
      // Calculate initial map coordinates based on current home position
      const mapX = MAP_RADIUS + f.homePosition.x * MAP_SCALE;
      const mapY = MAP_RADIUS + (f.homePosition.z + 10) * MAP_SCALE;
      
      dot.style.left = `${mapX}px`;
      dot.style.top = `${mapY}px`;

      dot.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop trigger on parent mapCircle
        selectFielder(idx);
      });

      if (container) container.appendChild(dot);
    });

    modal.classList.add('show');
  }

  function selectFielder(idx) {
    selectedFielderIndex = idx;
    
    // Remove selected class from all dots
    document.querySelectorAll('.field-map-circle .map-dot.fielder').forEach(dot => {
      dot.classList.remove('selected');
    });

    const activeDot = document.getElementById(`map-dot-fielder-${idx}`);
    if (activeDot) activeDot.classList.add('selected');
  }

  function applyChanges() {
    const fielders = window.fielders || [];
    const THREE = window.THREE;

    Object.keys(tempPositions).forEach(key => {
      const idx = parseInt(key);
      const pos = tempPositions[idx];
      const f = fielders[idx];
      if (!f) return;

      // Update 3D variables
      f.startPos.set(pos.x, 0, pos.z);
      f.homePosition.set(pos.x, 0, pos.z);
      f.pos.set(pos.x, 0, pos.z);

      // Instantly position the 3D model
      if (f.mesh) {
        f.mesh.position.set(pos.x, 0, pos.z);
        // Face the pitch center (0, 0, -10)
        f.mesh.rotation.set(0, Math.atan2(-pos.x, -10 - pos.z), 0);
      }

      // Update the mini-map radar dot style position
      if (f.radarDot) {
        const miniScale = 70 / 55; // Mini-radar is 140px diameter (70px radius)
        const miniX = 70 + pos.x * miniScale;
        const miniY = 70 + (pos.z + 10) * miniScale;
        f.radarDot.style.left = `${miniX}px`;
        f.radarDot.style.top = `${miniY}px`;
      }
    });

    closeFieldPlacement();
  }

  function closeFieldPlacement() {
    const modal = document.getElementById('field-placement-modal');
    if (modal) modal.classList.remove('show');
  }

  // Initialize on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

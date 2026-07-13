// Entrance Cutscene Module

window.entranceCutsceneActive = false;
window.entranceCutsceneTime = 0;

function startEntranceCutscene() {
  window.entranceCutsceneActive = true;
  window.entranceCutsceneTime = 0;
  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.CUTSCENE);

  if (window.fielders) {
    window.fielders.forEach((f, idx) => {
      if (!f.mesh) return;
      const angle = (idx / window.fielders.length) * Math.PI * 2;
      f.mesh.position.set(Math.cos(angle) * 45, 0, Math.sin(angle) * 45);
      f.walkCycle = Math.random() * 10;
    });
  }

  if (window.batsmanMesh) {
    window.batsmanMesh.position.set(1.5, 0, 32.0);
    window.batsmanMesh.rotation.set(0, Math.PI, 0);
  }
  if (window.nonStrikerMesh) {
    window.nonStrikerMesh.position.set(-1.5, 0, 32.0);
    window.nonStrikerMesh.rotation.set(0, Math.PI, 0);
  }

  if (window.bowlerMesh) {
    window.bowlerMesh.position.set(0.6, 0, -38.0);
    window.bowlerMesh.rotation.set(0, 0, 0);
  }

  if (window.ui && window.ui.hud) window.ui.hud.style.display = 'flex';
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'none';

  if (window.ui && window.ui.mainMenu) window.ui.mainMenu.classList.add('hidden');
  const matchup = document.getElementById('matchup-screen');
  if (matchup) matchup.classList.add('hidden');
}

function updateEntranceCutscene(dt) {
  const THREE = window.THREE;
  window.entranceCutsceneTime += dt;
  const time = window.entranceCutsceneTime;

  if (window.fielders) {
    window.fielders.forEach(f => {
      if (!f.mesh) return;
      const dist = f.mesh.position.distanceTo(f.startPos);
      if (dist > 0.2) {
        const dir = new THREE.Vector3().subVectors(f.startPos, f.mesh.position).normalize();
        f.mesh.position.addScaledVector(dir, 10.0 * dt);
        f.mesh.lookAt(f.startPos);
        f.walkCycle += dt * 16;
        if (f.mesh.parts) {
          const cycle = f.walkCycle;
          if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.7;
          if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.7;
          if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.x = Math.sin(cycle + Math.PI) * 0.7;
          if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.x = Math.sin(cycle) * 0.7;
        }
      } else {
        f.mesh.position.copy(f.startPos);
        f.mesh.lookAt(0, 0, 0);
        if (f.mesh.parts) {
          if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
          if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
          if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.x = 0.1;
          if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.x = 0.1;
        }
      }
    });
  }

  if (window.batsmanMesh) {
    const distZ = window.batsmanMesh.position.z - window.BATSMAN_CREASE_Z;
    if (distZ > 0.2) {
      window.batsmanMesh.position.z -= 6.5 * dt;
      window.batsmanMesh.position.x = THREE.MathUtils.lerp(window.batsmanMesh.position.x, 0.8, 0.05);
      const cycle = time * 12;
      if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
        if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
        if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
      }
    } else {
      window.batsmanMesh.position.set(window.stanceX || 0.8, 0, window.BATSMAN_CREASE_Z);
      window.batsmanMesh.rotation.set(0, Math.PI / 2, 0);
      if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
        if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = 0;
        if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = 0;
      }
    }
  }

  if (window.nonStrikerMesh) {
    const distZ = window.nonStrikerMesh.position.z - window.nonStrikerStartZ;
    if (distZ > 0.2) {
      window.nonStrikerMesh.position.z -= 6.5 * dt;
      window.nonStrikerMesh.position.x = THREE.MathUtils.lerp(window.nonStrikerMesh.position.x, -1.2, 0.05);
      const cycle = time * 12;
      if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
        if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
        if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
      }
    } else {
      window.nonStrikerMesh.position.set(-1.2, 0, window.nonStrikerStartZ);
      window.nonStrikerMesh.rotation.set(0, 0, 0);
      if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
        if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = 0;
        if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = 0;
      }
    }
  }

  if (window.bowlerMesh) {
    const dist = Math.abs(window.bowlerMesh.position.z - (-34.0));
    if (dist > 0.2) {
      window.bowlerMesh.position.z += 6.5 * dt;
      window.bowlerMesh.position.x = THREE.MathUtils.lerp(window.bowlerMesh.position.x, 0.6, 0.05);
      const cycle = time * 12;
      if (window.bowlerMesh.parts) {
        if (window.bowlerMesh.parts.leftLeg) window.bowlerMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
        if (window.bowlerMesh.parts.rightLeg) window.bowlerMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
      }
    } else {
      window.bowlerMesh.position.set(0.6, 0, -34.0);
      window.bowlerMesh.rotation.set(0, 0, 0);
      if (window.bowlerMesh.parts) {
        if (window.bowlerMesh.parts.leftLeg) window.bowlerMesh.parts.leftLeg.rotation.x = 0;
        if (window.bowlerMesh.parts.rightLeg) window.bowlerMesh.parts.rightLeg.rotation.x = 0;
      }
    }
  }

  const battingTeamKey = window.MATCH.userIsBatting ? window.MATCH.userTeam : window.MATCH.oppTeam;
  const fieldingTeamKey = window.MATCH.userIsBatting ? window.MATCH.oppTeam : window.MATCH.userTeam;
  const battingTeam = window.TEAMS[battingTeamKey] || window.TEAMS.IND;
  const fieldingTeam = window.TEAMS[fieldingTeamKey] || window.TEAMS.AUS;

  if (time < 3.0) {
    window.targetCamPos.set(12 * Math.sin(time * 0.4), 6.5, 12 * Math.cos(time * 0.4) - 8.0);
    window.targetCamLook.set(0, 1.0, -10.0);
    
    const card = document.getElementById('prematch-player-card');
    if (card) card.classList.add('hidden');
  } 
  else if (time < 6.0) {
    window.targetCamPos.set(2.0, 1.3, 3.2);
    window.targetCamLook.set(0.8, 1.0, 0.0);
    
    const playerName = (window.MATCH.batters && window.MATCH.batters[0]) ? window.MATCH.batters[0].name : (battingTeam.lineup[0] || "Striker");
    if (typeof window.updatePlayerCardUI === 'function') window.updatePlayerCardUI(playerName, false, battingTeamKey);
  }
  else if (time < 9.0) {
    window.targetCamPos.set(-2.2, 1.3, -18.2);
    window.targetCamLook.set(-1.2, 1.0, -21.2);
    
    const playerName = (window.MATCH.batters && window.MATCH.batters[1]) ? window.MATCH.batters[1].name : (battingTeam.lineup[1] || "Non-Striker");
    if (typeof window.updatePlayerCardUI === 'function') window.updatePlayerCardUI(playerName, false, battingTeamKey);
  }
  else if (time < 12.0) {
    window.targetCamPos.set(1.6, 1.3, -31.0);
    window.targetCamLook.set(0.6, 1.0, -34.0);
    
    const playerName = fieldingTeam.bowler || "Bowler";
    if (typeof window.updatePlayerCardUI === 'function') window.updatePlayerCardUI(playerName, true, fieldingTeamKey);
  }
  else {
    skipEntranceCutscene();
  }
}

function skipEntranceCutscene() {
  if (!window.entranceCutsceneActive) return;
  window.entranceCutsceneActive = false;

  const card = document.getElementById('prematch-player-card');
  if (card) card.classList.add('hidden');

  if (window.batsmanMesh) {
    window.batsmanMesh.position.set(window.stanceX || 0.8, 0, window.BATSMAN_CREASE_Z);
    window.batsmanMesh.rotation.set(0, Math.PI / 2, 0);
    if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
      if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = 0;
      if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = 0;
    }
  }
  if (window.nonStrikerMesh) {
    window.nonStrikerMesh.position.set(-1.2, 0, window.nonStrikerStartZ);
    window.nonStrikerMesh.rotation.set(0, 0, 0);
    if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
      if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = 0;
      if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = 0;
    }
  }
  if (window.bowlerMesh) {
    window.bowlerMesh.position.set(0.6, 0, -34.0);
    window.bowlerMesh.rotation.set(0, 0, 0);
    if (window.bowlerMesh.parts) {
      if (window.bowlerMesh.parts.leftLeg) window.bowlerMesh.parts.leftLeg.rotation.x = 0;
      if (window.bowlerMesh.parts.rightLeg) window.bowlerMesh.parts.rightLeg.rotation.x = 0;
    }
  }
  if (window.fielders) {
    window.fielders.forEach(f => {
      if (!f.mesh) return;
      f.mesh.position.copy(f.startPos);
      f.mesh.lookAt(0, 0, 0);
      if (f.mesh.parts) {
        if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
        if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
        if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.x = 0.1;
        if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.x = 0.1;
      }
    });
  }

  if (window.ui && window.ui.hud) window.ui.hud.style.display = 'flex';
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'flex';

  if (window.MATCH.userIsBatting) {
    window.activeCameraMode = 'broadcast';
  } else {
    window.activeCameraMode = 'bowler';
  }

  if (typeof window.setGameState === 'function') {
    window.setGameState(window.STATES.BOWL_READY);
  }
  if (!window.MATCH.userIsBatting) {
    if (typeof window.showBowlerSelection === 'function') window.showBowlerSelection();
  }
}

// Expose globally
window.startEntranceCutscene = startEntranceCutscene;
window.updateEntranceCutscene = updateEntranceCutscene;
window.skipEntranceCutscene = skipEntranceCutscene;

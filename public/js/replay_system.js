// Action Replay System for Apex 3D Cricket

(function() {
  const THREE = window.THREE;
  const CANNON = window.CANNON;

  class ReplaySystem {
    constructor() {
      this.history = [];
      this.isPlayingReplay = false;
      this.isRecording = true;
      this.playbackIndex = 0;
      this.onCompleteCallback = null;
      this.savedGameState = null;
      this.savedCamPos = new THREE.Vector3();
      this.savedCamLook = new THREE.Vector3();
      
      this.maxFrames = 600; // max 10 seconds of history at 60fps
      this.speed = 0.45;    // slow-motion playback speed (45% of real time)

      this.initUI();
    }

    initUI() {
      if (document.getElementById('replay-overlay')) return;

      const style = document.createElement('style');
      style.innerHTML = `
        #replay-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 9999;
          display: none;
          font-family: 'Impact', 'Arial Black', sans-serif;
        }
        #replay-overlay.show {
          display: block;
        }
        .replay-watermark {
          position: absolute;
          top: 40px;
          left: 40px;
          color: #ef4444;
          font-weight: 900;
          font-size: 28px;
          letter-spacing: 3px;
          text-shadow: 2px 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(239, 68, 68, 0.4);
          animation: replayFlash 0.8s infinite alternate;
        }
        .replay-logo {
          color: #ffffff;
          font-style: italic;
          margin-right: 10px;
        }
        .replay-skip-hint {
          position: absolute;
          bottom: 40px;
          right: 40px;
          color: rgba(255,255,255,0.85);
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 1px;
          background: rgba(0,0,0,0.65);
          padding: 8px 16px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.25);
          text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
          animation: pulseSkip 1.5s infinite;
        }
        @keyframes replayFlash {
          from { opacity: 0.4; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1.02); }
        }
        @keyframes pulseSkip {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);

      const overlay = document.createElement('div');
      overlay.id = 'replay-overlay';
      overlay.innerHTML = `
        <div class="replay-watermark"><span class="replay-logo">PLAYSPHERE SPORTS</span>🔴 REPLAY</div>
        <div class="replay-skip-hint">PRESS SPACE TO SKIP</div>
      `;
      document.body.appendChild(overlay);
    }

    clearHistory() {
      this.history = [];
    }

    recordFrame() {
      if (this.isPlayingReplay || !this.isRecording) return;
      if (!window.ballBody || !window.ballMesh) return;

      const frame = {
        ball: {
          pos: window.ballBody.position.clone(),
          quat: window.ballBody.quaternion.clone(),
          visible: window.ballMesh.visible
        },
        stumps: window.stumpBodies ? window.stumpBodies.map(b => ({
          pos: b.position.clone(), quat: b.quaternion.clone()
        })) : [],
        bails: window.bailBodies ? window.bailBodies.map(b => ({
          pos: b.position.clone(), quat: b.quaternion.clone()
        })) : [],
        batsman: this.getPlayerData(window.batsmanMesh),
        nonStriker: this.getPlayerData(window.nonStrikerMesh),
        bowler: this.getPlayerData(window.bowlerMesh),
        keeper: this.getPlayerData(window.keeperMesh),
        fielders: window.fielders ? window.fielders.map(f => ({
          active: !!f.mesh,
          pos: f.mesh ? f.mesh.position.clone() : null,
          rotY: f.mesh ? f.mesh.rotation.y : 0,
          playerData: this.getPlayerData(f.mesh)
        })) : []
      };

      this.history.push(frame);
      if (this.history.length > this.maxFrames) {
        this.history.shift();
      }
    }

    getPlayerData(mesh) {
      if (!mesh) return null;
      return {
        pos: mesh.position.clone(),
        rot: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        visible: mesh.visible,
        isFBX: !!mesh.isFBX,
        proceduralRots: this.getProceduralRotations(mesh),
        fbxBoneData: this.getFBXBoneData(mesh)
      };
    }

    getProceduralRotations(mesh) {
      if (!mesh || !mesh.parts) return null;
      const parts = mesh.parts;
      const rots = {};
      for (const key in parts) {
        const part = parts[key];
        if (part && part.rotation) {
          rots[key] = {
            x: part.rotation.x,
            y: part.rotation.y,
            z: part.rotation.z,
            py: part.position ? part.position.y : undefined
          };
        }
      }
      return rots;
    }

    getFBXBoneData(mesh) {
      if (!mesh || !mesh.isFBX || !window.FBXPlayers || typeof window.FBXPlayers.getBone !== 'function') return null;
      const bones = [
        'Hips', 'Spine', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm',
        'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'Bat'
      ];
      const data = {};
      bones.forEach(name => {
        const bone = window.FBXPlayers.getBone(mesh, name);
        if (bone) {
          data[name] = {
            rot: bone.rotation ? { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z } : null,
            pos: (name === 'Hips' && bone.position) ? { x: bone.position.x, y: bone.position.y, z: bone.position.z } : null
          };
        }
      });
      return data;
    }

    applyPlayerData(mesh, data) {
      if (!mesh || !data) return;
      mesh.position.copy(data.pos);
      if (data.rot) {
        mesh.rotation.set(data.rot.x, data.rot.y, data.rot.z);
      } else if (data.rotY !== undefined) {
        mesh.rotation.set(0, data.rotY, 0);
      }
      mesh.visible = data.visible;

      if (data.isFBX && data.fbxBoneData) {
        for (const name in data.fbxBoneData) {
          const bone = window.FBXPlayers.getBone(mesh, name);
          const boneData = data.fbxBoneData[name];
          if (bone && boneData) {
            if (boneData.rot) {
              bone.rotation.set(boneData.rot.x, boneData.rot.y, boneData.rot.z);
            }
            if (boneData.pos && bone.position) {
              bone.position.set(boneData.pos.x, boneData.pos.y, boneData.pos.z);
            }
          }
        }
      } else if (!data.isFBX && data.proceduralRots) {
        const parts = mesh.parts;
        if (parts) {
          for (const key in data.proceduralRots) {
            const part = parts[key];
            const rot = data.proceduralRots[key];
            if (part && rot) {
              part.rotation.set(rot.x, rot.y, rot.z);
              if (rot.py !== undefined && part.position) {
                part.position.y = rot.py;
              }
            }
          }
        }
      }
    }

    startReplay(onComplete) {
      if (this.history.length === 0) {
        console.warn("[ReplaySystem] No history recorded to play back.");
        if (onComplete) onComplete();
        return;
      }

      console.log(`[ReplaySystem] Starting playback of ${this.history.length} frames.`);
      this.isPlayingReplay = true;
      this.playbackIndex = 0;
      this.onCompleteCallback = onComplete;
      this.savedGameState = window.gameState;

      // Save camera target settings so they can be restored afterwards
      if (window.targetCamPos) this.savedCamPos.copy(window.targetCamPos);
      if (window.targetCamLook) this.savedCamLook.copy(window.targetCamLook);

      // Disable physics body collision solver temporarily
      if (window.ballBody) {
        window.ballBody.velocity.set(0,0,0);
        window.ballBody.angularVelocity.set(0,0,0);
      }

      // Show Broadcast UI REPLAY overlay
      const overlay = document.getElementById('replay-overlay');
      if (overlay) overlay.classList.add('show');

      // Shift to REPLAY state
      window.setGameState(window.STATES.REPLAY);
    }

    stopReplay() {
      if (!this.isPlayingReplay) return;
      console.log("[ReplaySystem] Replay finished or skipped.");
      this.isPlayingReplay = false;

      // Hide Replay overlay UI
      const overlay = document.getElementById('replay-overlay');
      if (overlay) overlay.classList.remove('show');

      // Restore camera targets
      if (window.targetCamPos) window.targetCamPos.copy(this.savedCamPos);
      if (window.targetCamLook) window.targetCamLook.copy(this.savedCamLook);

      // Transition to next state
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      if (cb) cb();
    }

    update(dt) {
      if (!this.isPlayingReplay) return;

      // Advance index in slow motion
      this.playbackIndex += this.speed;

      if (this.playbackIndex >= this.history.length) {
        this.stopReplay();
        return;
      }

      const frameIdx = Math.floor(this.playbackIndex);
      const frame = this.history[frameIdx];
      if (!frame) return;

      // 1. Sync visual ball position & rotation
      if (window.ballMesh && window.ballBody) {
        window.ballMesh.position.copy(frame.ball.pos);
        window.ballMesh.quaternion.copy(frame.ball.quat);
        window.ballMesh.visible = frame.ball.visible;
      }

      // 2. Sync stumps & bails
      if (window.stumpsVisuals && frame.stumps) {
        frame.stumps.forEach((stumpData, idx) => {
          if (window.stumpsVisuals[idx]) {
            window.stumpsVisuals[idx].position.copy(stumpData.pos);
            window.stumpsVisuals[idx].quaternion.copy(stumpData.quat);
          }
        });
      }
      if (window.bailsVisuals && frame.bails) {
        frame.bails.forEach((bailData, idx) => {
          if (window.bailsVisuals[idx]) {
            window.bailsVisuals[idx].position.copy(bailData.pos);
            window.bailsVisuals[idx].quaternion.copy(bailData.quat);
          }
        });
      }

      // 3. Sync player meshes
      this.applyPlayerData(window.batsmanMesh, frame.batsman);
      this.applyPlayerData(window.nonStrikerMesh, frame.nonStriker);
      this.applyPlayerData(window.bowlerMesh, frame.bowler);
      this.applyPlayerData(window.keeperMesh, frame.keeper);

      if (window.fielders && frame.fielders) {
        frame.fielders.forEach((fData, idx) => {
          const f = window.fielders[idx];
          if (f && f.mesh && fData.active) {
            this.applyPlayerData(f.mesh, fData.playerData);
          }
        });
      }

      // 4. Update camera to cinematic broadcast replay mode
      // Position camera at an elevated, side-on broadcast position
      // and look directly at the ball!
      const ballPos = frame.ball.pos;
      if (window.camera && window.targetCamPos && window.targetCamLook) {
        // Place camera at elevated side-on position tracking the ball
        window.targetCamPos.set(16.0, 5.0, -10.0);
        window.targetCamLook.copy(ballPos);

        // Standard lerp update in game loop handles smooth look-at
        // but we force camera lookAt during replay to ensure zero lag
        window.camera.position.copy(window.targetCamPos);
        window.camera.lookAt(window.targetCamLook);
      }
    }
  }

  window.replaySystem = new ReplaySystem();
})();

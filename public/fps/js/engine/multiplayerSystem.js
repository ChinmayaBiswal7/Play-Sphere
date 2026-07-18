/* ==========================================================================
   DELHI DEFIANCE - MULTIPLAYER FPS REALTIME SYNC SYSTEM
   ========================================================================== */

class MultiplayerManager {
  constructor(scene, camera, playerController) {
    this.scene = scene;
    this.camera = camera;
    this.player = playerController;
    
    this.socket = null;
    this.roomCode = null;
    this.isMultiplayer = false;
    this.players = []; // list of connected players in lobby
    this.opponentId = null;
    this.opponentMesh = null;
    
    // Smooth interpolation targets
    this.targetPosition = new THREE.Vector3();
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.targetWeapon = 'vandal';
    this.targetAnim = 'idle';

    // Heartbeat ticker
    this.updateInterval = 0.05; // 20 times per second
    this.timeSinceLastUpdate = 0;
  }

  init() {
    if (this.socket) return;
    if (window.io) {
      this.socket = window.io();
      this.setupSocketListeners();
    }
  }

  setupSocketListeners() {
    this.socket.on('fps-pvp-room-created', ({ roomCode, players }) => {
      this.roomCode = roomCode;
      this.players = players;
      this.isMultiplayer = true;
      this.updateLobbyUI();
    });

    this.socket.on('fps-pvp-room-joined', ({ roomCode, players }) => {
      this.roomCode = roomCode;
      this.players = players;
      this.isMultiplayer = true;
      
      // Find opponent socket ID
      const opp = players.find(p => p.socketId !== this.socket.id);
      if (opp) this.opponentId = opp.socketId;

      this.updateLobbyUI();
      
      // Play ready beep sound
      if (window.SynthAudio) window.SynthAudio.playHitMarker();
    });

    this.socket.on('fps-pvp-match-started', () => {
      // 1. Hide lobby overlays
      document.getElementById('lobby-screen').style.display = 'none';
      document.getElementById('multiplayer-lobby-overlay').style.display = 'none';
      
      // 2. Show arena container
      const arena = document.getElementById('arena-container');
      if (arena) arena.style.display = 'block';

      // 3. Start engine match
      if (window.FPSGameLoop) {
        window.FPSGameLoop.startMatch();
      }
    });

    this.socket.on('fps-pvp-player-update', (data) => {
      this.targetPosition.set(data.pos.x, data.pos.y, data.pos.z);
      this.targetYaw = data.yaw;
      this.targetPitch = data.pitch;
      this.targetWeapon = data.weapon;
      this.targetAnim = data.animState;
      
      if (this.opponentMesh) {
        if (data.animState === 'run' && Math.random() < 0.15 && window.SynthAudio) {
          window.SynthAudio.playFootstep();
        }
      }
    });

    this.socket.on('fps-pvp-shoot', ({ origin, dir, weapon }) => {
      this.renderTracer(origin, dir);
      if (window.SynthAudio) window.SynthAudio.playShoot(weapon || 'vandal');
    });

    this.socket.on('fps-pvp-hit', ({ damage, zone }) => {
      if (window.FPSState && window.FPSState.currentUser) {
        const user = window.FPSState.currentUser;
        if (user.hp > 0) {
          user.hp = Math.max(0, user.hp - damage);
          
          // Show red blood flash vignette
          const flash = document.getElementById('damage-flash');
          if (flash) {
            flash.style.opacity = 0.55;
            setTimeout(() => { flash.style.opacity = 0; }, 240);
          }
          
          if (window.SynthAudio) window.SynthAudio.playDamageTaken();
          
          if (user.hp <= 0) {
            if (window.SynthAudio) window.SynthAudio.playUltReady();
            document.getElementById('respawn-countdown-container').style.display = 'flex';
            
            setTimeout(() => {
              if (window.FPSGameLoop) {
                window.FPSGameLoop.resetRound();
                document.getElementById('respawn-countdown-container').style.display = 'none';
              }
            }, 4000);
          }
        }
      }
    });

    this.socket.on('fps-pvp-ability', ({ key, pos, yaw }) => {
      if (window.FPSGameLoop && window.FPSGameLoop.abilities) {
        const agent = window.FPSState.selectedAgentId || 'agni';
        if (agent === 'agni') {
          window.FPSGameLoop.abilities.triggerAgniAbility(key);
        } else {
          window.FPSGameLoop.abilities.triggerVayuAbility(key);
        }
      }
    });

    this.socket.on('fps-pvp-player-left', () => {
      alert('Opponent disconnected or left lobby!');
      location.reload();
    });

    this.socket.on('fps-pvp-error', (msg) => {
      alert(msg);
    });
  }

  createRoom(agentId, username) {
    this.init();
    if (this.socket) {
      this.socket.emit('fps-pvp-create-room', { agentId, username });
    }
  }

  joinRoom(roomCode, agentId, username) {
    this.init();
    if (this.socket) {
      this.socket.emit('fps-pvp-join-room', { roomCode, agentId, username });
    }
  }

  startMatch() {
    if (this.socket && this.roomCode) {
      this.socket.emit('fps-pvp-start-match');
    }
  }

  updateLobbyUI() {
    const listDiv = document.getElementById('lobby-players-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    
    this.players.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'lobby-player-row';
      row.innerHTML = `
        <span class="player-num">#${idx + 1}</span>
        <span class="player-name">${p.username}</span>
        <span class="player-agent">Agent: ${p.agentId.toUpperCase()}</span>
        <span class="player-status">${p.socketId === this.socket.id ? '(You)' : '(Friend)'}</span>
      `;
      listDiv.appendChild(row);
    });

    const codeSpan = document.getElementById('lobby-code-display');
    if (codeSpan) codeSpan.textContent = this.roomCode;

    const startBtn = document.getElementById('lobby-start-button');
    if (startBtn) {
      if (this.players.length >= 2 && this.players[0].socketId === this.socket.id) {
        startBtn.style.display = 'block';
      } else {
        startBtn.style.display = 'none';
      }
    }
  }

  spawnOpponentModel() {
    if (this.opponentMesh) {
      this.scene.remove(this.opponentMesh);
    }

    const group = new THREE.Group();
    
    // Torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
    );
    torso.position.y = 0.7;
    torso.castShadow = true;
    torso.isTorso = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 })
    );
    head.position.y = 1.6;
    head.castShadow = true;
    head.isHead = true;
    group.add(head);

    // Shoulder stripes
    const shoulders = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xff1133 })
    );
    shoulders.position.y = 1.25;
    group.add(shoulders);

    // Gun box
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
    );
    gun.position.set(0.25, 0.7, -0.45);
    group.add(gun);

    this.scene.add(group);
    this.opponentMesh = group;

    // Start coordinates (opposite spawn side)
    this.targetPosition.set(0, 1.3, -52);
    this.opponentMesh.position.copy(this.targetPosition);
  }

  update(dt) {
    if (!this.isMultiplayer || !this.socket) return;

    if (this.opponentMesh) {
      this.opponentMesh.position.lerp(this.targetPosition, 16.0 * dt);
      
      const curRotation = this.opponentMesh.rotation.y;
      let targetRot = this.targetYaw;
      
      let diff = targetRot - curRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.opponentMesh.rotation.y = curRotation + diff * 18.0 * dt;
    }

    this.timeSinceLastUpdate += dt;
    if (this.timeSinceLastUpdate >= this.updateInterval) {
      this.timeSinceLastUpdate = 0;
      
      let anim = 'idle';
      if (this.player.keys.w || this.player.keys.s || this.player.keys.a || this.player.keys.d) {
        anim = this.player.keys.Shift ? 'walk' : (this.player.keys.ctrl ? 'crouch' : 'run');
      }

      this.socket.emit('fps-pvp-player-update', {
        pos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        yaw: this.player.yaw,
        pitch: this.player.pitch,
        weapon: window.FPSState?.currentUser?.equippedWeapon || 'vandal',
        animState: anim
      });
    }
  }

  emitShoot(origin, dir, weapon) {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('fps-pvp-shoot', { origin, dir, weapon });
    }
  }

  emitHit(damage, zone) {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('fps-pvp-hit', { damage, zone });
    }
  }

  emitAbility(key, pos, yaw) {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('fps-pvp-ability', { key, pos, yaw });
    }
  }

  renderTracer(origin, dir) {
    const o = new THREE.Vector3(origin.x, origin.y, origin.z);
    const d = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
    
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      o,
      o.clone().add(d.multiplyScalar(65))
    ]);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(line);
    
    setTimeout(() => {
      this.scene.remove(line);
    }, 100);
  }
}

window.MultiplayerManager = MultiplayerManager;

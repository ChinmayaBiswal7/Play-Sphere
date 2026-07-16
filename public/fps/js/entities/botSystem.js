/* ==========================================================================
   DELHI DEFIANCE - AI BOTS COMBAT PATROLS & LINE-OF-SIGHT SHOOTING
   ========================================================================== */

class BotSystem {
  constructor(scene, colliders, playerCamera) {
    this.scene = scene;
    this.colliders = colliders;
    this.playerCamera = playerCamera;

    this.bots = [];
    this.botSpeed = 4.5;
    this.spawningPoints = [
      { x: -45, y: 1.6, z: -25 }, // Site A back
      { x: 45, y: 1.6, z: -25 },  // Site B back
      { x: 0, y: 1.6, z: -15 }    // Mid courtyard back
    ];
  }

  spawnBots() {
    // Clear old bots
    this.bots.forEach(b => this.scene.remove(b.mesh));
    this.bots = [];

    // Red neon outline material for hostile bots
    const botMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red silhouette
      roughness: 0.5,
      metalness: 0.1,
      wireframe: true
    });

    const headMat = new THREE.MeshBasicMaterial({ color: 0xff3366 });

    this.spawningPoints.forEach((pos, idx) => {
      const botGroup = new THREE.Group();
      botGroup.position.set(pos.x, pos.y, pos.z);
      botGroup.isBot = true;

      // Capsule body
      const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
      const bodyMesh = new THREE.Mesh(bodyGeo, botMat);
      bodyMesh.position.y = 0.4;
      botGroup.add(bodyMesh);

      // Glowing head
      const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = 1.4;
      botGroup.add(headMesh);

      this.scene.add(botGroup);

      // Add to logic list
      this.bots.push({
        id: `bot-${idx + 1}`,
        name: `BOT ARCHON ${idx + 1}`,
        mesh: botGroup,
        hp: 100,
        fireCooldown: 0,
        patrolWaypoints: [
          new THREE.Vector3(pos.x, pos.y, pos.z),
          new THREE.Vector3(pos.x + (idx === 0 ? 10 : -10), pos.y, pos.z + 15),
          new THREE.Vector3(pos.x, pos.y, pos.z + 25)
        ],
        currentWaypointIdx: 0,
        targetPos: new THREE.Vector3(),
        isDead: false
      });
    });
  }

  update(dt, playerPosition) {
    if (window.FPSState.gameState !== window.STATES.GAMEPLAY) return;

    this.bots.forEach(b => {
      if (b.isDead) return;

      // 1. Line of sight check to player
      const botPos = b.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)); // head level
      const playerPos = playerPosition.clone();
      
      const distance = botPos.distanceTo(playerPos);
      let canSeePlayer = false;

      if (distance < 45) { // within sight range
        const raycaster = new THREE.Raycaster();
        const direction = playerPos.clone().sub(botPos).normalize();
        raycaster.set(botPos, direction);

        // Raycast against all colliders
        const intersects = raycaster.intersectObjects(this.colliders, true);
        if (intersects.length > 0) {
          // If first intersection is farther than player, we see the player!
          if (intersects[0].distance > distance) {
            canSeePlayer = true;
          }
        } else {
          canSeePlayer = true;
        }
      }

      if (canSeePlayer) {
        // Stop moving and look at player
        b.mesh.lookAt(playerPos.x, b.mesh.position.y, playerPos.z);
        
        // Attack cycle
        if (b.fireCooldown > 0) {
          b.fireCooldown -= dt;
        } else {
          // Fire shot!
          b.fireCooldown = 1.25 + Math.random() * 0.8; // fire rate
          this.botShoot(b, playerPos);
        }
      } else {
        // 2. Patrol waypoints pathing
        const target = b.patrolWaypoints[b.currentWaypointIdx];
        const dir = target.clone().sub(b.mesh.position);
        dir.y = 0; // lock to horizontal plane
        
        if (dir.length() < 1.0) {
          // Switch to next patrol index
          b.currentWaypointIdx = (b.currentWaypointIdx + 1) % b.patrolWaypoints.length;
        } else {
          dir.normalize();
          b.mesh.position.add(dir.multiplyScalar(this.botSpeed * dt));
          b.mesh.lookAt(target.x, b.mesh.position.y, target.z);
        }
      }
    });
  }

  botShoot(bot, playerPos) {
    // Synth gunshot sound
    window.SynthAudio.playShoot('pistol');

    // Create red tracer pointing at player
    const muzzle = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    
    // Draw red tracer line
    const points = [muzzle, playerPos];
    const tracerGeo = new THREE.BufferGeometry().setFromPoints(points);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.95 });
    const tracer = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(tracer);

    setTimeout(() => {
      this.scene.remove(tracer);
    }, 80);

    // Deal damage to player (unless player blocks/dodges)
    let damageAmount = 15 + Math.floor(Math.random() * 10);
    
    // Distribute to health & armor
    if (window.FPSState.currentUser.hp > 0) {
      if (window.FPSState.currentUser.armor > 0) {
        window.FPSState.currentUser.armor = Math.max(0, window.FPSState.currentUser.armor - damageAmount * 0.5);
        window.FPSState.currentUser.hp = Math.max(0, window.FPSState.currentUser.hp - damageAmount * 0.5);
      } else {
        window.FPSState.currentUser.hp = Math.max(0, window.FPSState.currentUser.hp - damageAmount);
      }

      // Update HUD
      document.getElementById('hud-hp-val').innerText = Math.floor(window.FPSState.currentUser.hp);
      document.getElementById('hud-armor-val').innerText = Math.floor(window.FPSState.currentUser.armor);

      // Check player death
      if (window.FPSState.currentUser.hp <= 0) {
        if (window.FPSGameLoop) {
          window.FPSGameLoop.triggerMatchEnd(false);
        }
      }
    }
  }

  // Called by weaponSystem on hit
  registerHit(botObject, dmg) {
    const b = this.bots.find(x => x.mesh === botObject);
    if (!b || b.isDead) return;

    b.hp -= dmg;
    
    // Play headshot chime if shot landed high (head area)
    window.SynthAudio.playHeadshot();

    if (b.hp <= 0) {
      b.isDead = true;
      this.scene.remove(b.mesh);
      
      // Update score and kill feed
      window.FPSState.matchData.playerKills++;
      window.FPSState.currentUser.coins += 100; // reward money
      
      // Add entry to feed
      this.addKillFeedEntry(window.FPSState.currentUser.username, b.name);
      
      // Check if all bots are eliminated
      const aliveBots = this.bots.filter(x => !x.isDead);
      if (aliveBots.length === 0) {
        if (window.FPSGameLoop) {
          window.FPSGameLoop.triggerMatchEnd(true);
        }
      }
    }
  }

  addKillFeedEntry(killer, victim) {
    const feed = document.getElementById('hud-kill-feed');
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<span class="killer-name">${killer}</span> eliminated <span class="killed-name">${victim}</span>`;
    feed.appendChild(item);

    // Play multikill sound
    window.SynthAudio.playKill();

    setTimeout(() => {
      item.remove();
    }, 4000);
  }
}

// Hook registerHit helper globally so weaponSystem can easily invoke it
window.registerBotHit = function(botGroup, dmg) {
  if (window.FPSGameLoop && window.FPSGameLoop.bots) {
    window.FPSGameLoop.bots.registerHit(botGroup, dmg);
  }
};

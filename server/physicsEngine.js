/**
 * Server-side PVP Match Physics and AI Simulation Engine
 */

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
}

const PITCH_LENGTH = 115;
const PITCH_WIDTH = 75;
const GOAL_WIDTH = 14;
const GOAL_HEIGHT = 5.5;
const BALL_RADIUS = 0.32;

// Home uses normal coordinates (left to right), Away uses flipped coordinates (right to left)
const FORMATION_SLOTS = [
  { role: "GK", pos: { x: -PITCH_LENGTH/2 + 2.5, z: 0 } },  // 0
  { role: "LB", pos: { x: -35, z: -20 } },                  // 1
  { role: "LCB", pos: { x: -38, z: -7 } },                  // 2
  { role: "RCB", pos: { x: -38, z: 7 } },                   // 3
  { role: "RB", pos: { x: -35, z: 20 } },                   // 4
  { role: "LCM", pos: { x: -18, z: -15 } },                 // 5
  { role: "CM", pos: { x: -22, z: 0 } },                    // 6
  { role: "RCM", pos: { x: -18, z: 15 } },                  // 7
  { role: "LW", pos: { x: -5, z: -18 } },                   // 8
  { role: "ST", pos: { x: -2, z: 0 } },                     // 9
  { role: "RW", pos: { x: -5, z: 18 } }                     // 10
];

export class MatchSimulation {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.players = [];
    this.ball = {
      pos: new Vector3(0, BALL_RADIUS, 0),
      vel: new Vector3(0, 0, 0),
      dribblerId: null,
      lastKickedById: null,
      kickCooldown: 0
    };
    this.scores = { home: 0, away: 0 };
    this.matchTime = 0; // seconds
    this.tickNumber = 0;
    this.controlledPlayerIds = { home: 9, away: 20 };
    this.events = [];
    
    // Key bindings tracking
    this.playerInputs = {
      1: { tick: 0, moveX: 0, moveY: 0, sprint: false, pass: false, shoot: false, tackle: false, switch: false },
      2: { tick: 0, moveX: 0, moveY: 0, sprint: false, pass: false, shoot: false, tackle: false, switch: false }
    };
    
    this.initPlayers();
    this.resetKickoff(true);
  }

  initPlayers() {
    this.players = [];
    // Spawn Home Team (Red): IDs 0 - 10
    FORMATION_SLOTS.forEach((slot, i) => {
      this.players.push({
        id: i,
        team: 'home',
        role: slot.role,
        pos: new Vector3(slot.pos.x, 0, slot.pos.z),
        vel: new Vector3(0, 0, 0),
        rotY: 0,
        formationPos: new Vector3(slot.pos.x, 0, slot.pos.z),
        isGoalkeeper: slot.role === 'GK',
        stamina: 100.0,
        isFallen: false,
        fallTime: 0,
        isTackling: false,
        tackleCooldown: 0,
        performedAction: null // 'pass', 'shoot', 'tackle'
      });
    });

    // Spawn Away Team (Blue): IDs 11 - 21
    FORMATION_SLOTS.forEach((slot, i) => {
      // Invert coordinates for away team
      const startX = -slot.pos.x;
      const startZ = -slot.pos.z;
      this.players.push({
        id: i + 11,
        team: 'away',
        role: slot.role,
        pos: new Vector3(startX, 0, startZ),
        vel: new Vector3(0, 0, 0),
        rotY: Math.PI,
        formationPos: new Vector3(startX, 0, startZ),
        isGoalkeeper: slot.role === 'GK',
        stamina: 100.0,
        isFallen: false,
        fallTime: 0,
        isTackling: false,
        tackleCooldown: 0,
        performedAction: null
      });
    });
  }

  resetKickoff(homeKicksOff) {
    this.ball.pos.set(0, BALL_RADIUS, 0);
    this.ball.vel.set(0, 0, 0);
    this.ball.dribblerId = null;

    // Reset player positions to formation
    this.players.forEach(p => {
      p.pos.copy(p.formationPos);
      p.vel.set(0, 0, 0);
      p.rotY = p.team === 'home' ? 0 : Math.PI;
      p.isFallen = false;
      p.isTackling = false;
      p.performedAction = null;
    });

    // Assign ball to the kickoff striker
    if (homeKicksOff) {
      this.controlledPlayerIds.home = 9; // Striker
      this.ball.dribblerId = 9;
      this.players[9].pos.set(-0.8, 0, 0);
    } else {
      this.controlledPlayerIds.away = 20; // Striker
      this.ball.dribblerId = 20;
      this.players[20].pos.set(0.8, 0, 0);
    }
  }

  processInput(playerSlot, input) {
    if (playerSlot === 1 || playerSlot === 2) {
      this.playerInputs[playerSlot] = {
        tick: input.tick || 0,
        moveX: input.moveX || 0,
        moveY: input.moveY || 0,
        sprint: !!input.sprint,
        pass: !!input.pass,
        shoot: !!input.shoot,
        tackle: !!input.tackle,
        switch: !!input.switch
      };
    }
  }

  physicsTick(dt) {
    this.tickNumber++;
    this.matchTime += dt;

    if (this.ball.kickCooldown > 0) this.ball.kickCooldown -= dt;

    // 1. Process Human inputs
    const slots = [
      { slot: 1, pId: this.controlledPlayerIds.home, team: 'home' },
      { slot: 2, pId: this.controlledPlayerIds.away, team: 'away' }
    ];

    slots.forEach(s => {
      const p = this.players[s.pId];
      const input = this.playerInputs[s.slot];
      
      p.performedAction = null;

      if (!p.isFallen && !p.isTackling) {
        // Player Switch (switch closest to ball on click)
        if (input.switch) {
          input.switch = false; // consume
          let bestId = s.pId;
          let minDist = Infinity;
          this.players.forEach(other => {
            if (other.team === s.team && !other.isGoalkeeper && other.id !== s.pId) {
              const d = other.pos.distanceTo(this.ball.pos);
              if (d < minDist) {
                minDist = d;
                bestId = other.id;
              }
            }
          });
          if (s.team === 'home') this.controlledPlayerIds.home = bestId;
          else this.controlledPlayerIds.away = bestId;
          return; // Skip input processing for this tick to prevent misfires
        }

        // Move Vector
        const baseSpeed = 5.2;
        const sprintMultiplier = input.sprint && p.stamina > 10.0 ? 1.72 : 1.0;
        const speed = baseSpeed * sprintMultiplier;

        p.vel.set(input.moveX * speed, 0, input.moveY * speed);

        // Update rotation
        if (p.vel.length() > 0.1) {
          p.rotY = Math.atan2(input.moveX, input.moveY);
        }

        // Stamina consumption
        if (input.sprint && p.vel.length() > 0.1) {
          p.stamina = Math.max(0, p.stamina - 15.0 * dt);
        } else {
          p.stamina = Math.min(100.0, p.stamina + 6.0 * dt);
        }

        // Kick Action: Pass / Shoot
        if (this.ball.dribblerId === p.id && this.ball.kickCooldown <= 0) {
          if (input.pass) {
            input.pass = false; // consume
            this.executePass(p);
          } else if (input.shoot) {
            input.shoot = false; // consume
            this.executeShoot(p);
          }
        }

        // Tackle Action
        if (this.ball.dribblerId !== p.id && input.tackle && p.tackleCooldown <= 0) {
          input.tackle = false; // consume
          this.executeTackle(p);
        }
      } else {
        p.vel.set(0, 0, 0);
      }
    });

    // 2. Process AI Players (Other 20 players)
    this.players.forEach(p => {
      const isControlled = (p.id === this.controlledPlayerIds.home || p.id === this.controlledPlayerIds.away);
      if (isControlled) return;

      p.performedAction = null;

      // Handle Fallen flat timer
      if (p.isFallen) {
        p.fallTime -= dt;
        if (p.fallTime <= 0) {
          p.isFallen = false;
        }
        p.vel.set(0, 0, 0);
        return;
      }

      if (p.isTackling) {
        p.vel.set(0, 0, 0);
        return;
      }

      // Basic Soccer AI
      const distToBall = p.pos.distanceTo(this.ball.pos);

      if (p.isGoalkeeper) {
        // Goalkeeper tracking AI: stays inside goal area, shifts to block ball
        const goalCenter = p.team === 'home' ? -PITCH_LENGTH/2 : PITCH_LENGTH/2;
        const targetX = goalCenter + (p.team === 'home' ? 2.5 : -2.5);
        
        // Follow ball Z position, clamped to goal width
        const targetZ = Math.max(-GOAL_WIDTH / 2 - 0.5, Math.min(GOAL_WIDTH / 2 + 0.5, this.ball.pos.z * 0.4));
        const targetPos = new Vector3(targetX, 0, targetZ);
        
        // Move towards target
        const dir = targetPos.clone().sub(p.pos);
        if (dir.length() > 0.2) {
          p.vel.copy(dir.normalize().multiplyScalar(4.0));
          p.rotY = Math.atan2(p.vel.x, p.vel.z);
        } else {
          p.vel.set(0, 0, 0);
        }

        // Rush and grab ball if extremely close
        if (distToBall < 3.2 && this.ball.dribblerId === null) {
          const rushDir = this.ball.pos.clone().sub(p.pos).normalize();
          p.vel.copy(rushDir.multiplyScalar(5.5));
        }
      } else {
        // Outfielder AI
        // If ball is very close and free, run towards it
        const isBallDribbledByMe = (this.ball.dribblerId === p.id);
        const isBallDribbledByTeammate = (this.ball.dribblerId !== null && this.players[this.ball.dribblerId].team === p.team);
        const isBallDribbledByEnemy = (this.ball.dribblerId !== null && this.players[this.ball.dribblerId].team !== p.team);

        if (isBallDribbledByMe) {
          // AI Outfielder has ball -> check if they should pass forward
          const enemyGoalX = p.team === 'home' ? PITCH_LENGTH/2 : -PITCH_LENGTH/2;
          const goalCenter = new Vector3(enemyGoalX, 0, 0);

          let nearestDefenderDist = Infinity;
          this.players.forEach(opp => {
            if (opp.team !== p.team && !opp.isGoalkeeper) {
              const d = opp.pos.distanceTo(p.pos);
              if (d < nearestDefenderDist) nearestDefenderDist = d;
            }
          });

          let shouldPass = false;
          let bestTeammate = null;

          if (nearestDefenderDist < 7.0 || Math.random() < 0.02) {
            let bestScore = -Infinity;
            this.players.forEach(tm => {
              if (tm.team === p.team && tm.id !== p.id && !tm.isGoalkeeper && !tm.isStumbling && !tm.isFallen) {
                const distToTeammate = tm.pos.distanceTo(p.pos);
                if (distToTeammate > 7.0 && distToTeammate < 36.0) {
                  const myDistToGoal = Math.abs(p.pos.x - enemyGoalX);
                  const tmDistToGoal = Math.abs(tm.pos.x - enemyGoalX);
                  const isForward = tmDistToGoal < myDistToGoal;

                  if (isForward) {
                    let defendersNearTeammate = 0;
                    this.players.forEach(opp => {
                      if (opp.team !== p.team && !opp.isGoalkeeper) {
                        if (opp.pos.distanceTo(tm.pos) < 6.5) {
                          defendersNearTeammate++;
                        }
                      }
                    });

                    const progress = myDistToGoal - tmDistToGoal;
                    const score = progress - (defendersNearTeammate * 8.0);

                    if (score > bestScore) {
                      bestScore = score;
                      bestTeammate = tm;
                    }
                  }
                }
              }
            });

            if (bestTeammate && bestScore > -2.0) {
              shouldPass = true;
            }
          }

          if (shouldPass && bestTeammate) {
            p.performedAction = 'pass';
            this.ball.kickCooldown = 0.5;
            this.ball.dribblerId = null;

            const passDir = bestTeammate.pos.clone().sub(p.pos).normalize();
            const dist = bestTeammate.pos.distanceTo(p.pos);
            const passSpeed = Math.min(13.0 + dist * 0.18, 22.0);

            this.ball.vel.copy(passDir.multiplyScalar(passSpeed));
            this.ball.vel.y = dist > 22.0 ? 1.8 : 0.4;
            p.rotY = Math.atan2(passDir.x, passDir.z);
          } else {
            // Otherwise run forward towards goal and shoot if close
            const dir = goalCenter.clone().sub(p.pos);
            if (Math.abs(p.pos.x - enemyGoalX) < 26.0) {
              this.executeShoot(p);
            } else {
              p.vel.copy(dir.normalize().multiplyScalar(5.0));
              p.rotY = Math.atan2(p.vel.x, p.vel.z);
            }
          }
        } else if (distToBall < 18.0 && this.ball.dribblerId === null) {
          // Run to grab free ball
          const dir = this.ball.pos.clone().sub(p.pos).normalize();
          p.vel.copy(dir.multiplyScalar(4.8));
          p.rotY = Math.atan2(p.vel.x, p.vel.z);
        } else if (isBallDribbledByEnemy && distToBall < 15.0) {
          // Press the dribbler and tackle if very close
          const enemy = this.players[this.ball.dribblerId];
          const dir = enemy.pos.clone().sub(p.pos).normalize();
          p.vel.copy(dir.multiplyScalar(5.2));
          p.rotY = Math.atan2(p.vel.x, p.vel.z);

          if (distToBall < 1.9) {
            this.executeTackle(p);
          }
        } else {
          // Return to formation slot
          const targetPos = p.formationPos;
          const dir = targetPos.clone().sub(p.pos);
          if (dir.length() > 1.5) {
            p.vel.copy(dir.normalize().multiplyScalar(4.0));
            p.rotY = Math.atan2(p.vel.x, p.vel.z);
          } else {
            p.vel.set(0, 0, 0);
          }
        }
      }
    });

    // 3. Move players & apply pitch boundaries
    this.players.forEach(p => {
      p.pos.addScaledVector(p.vel, dt);
      
      // Pitch clamp
      p.pos.x = Math.max(-PITCH_LENGTH/2, Math.min(PITCH_LENGTH/2, p.pos.x));
      p.pos.z = Math.max(-PITCH_WIDTH/2, Math.min(PITCH_WIDTH/2, p.pos.z));
    });

    // 4. Update Ball Physics
    if (this.ball.dribblerId !== null) {
      const dribbler = this.players[this.ball.dribblerId];
      // Ball is glued slightly in front of the dribbler
      const angle = dribbler.rotY;
      const offsetDistance = 1.0;
      this.ball.pos.x = dribbler.pos.x + Math.sin(angle) * offsetDistance;
      this.ball.pos.y = BALL_RADIUS;
      this.ball.pos.z = dribbler.pos.z + Math.cos(angle) * offsetDistance;
      this.ball.vel.set(0, 0, 0);
    } else {
      // Free ball kinematics
      this.ball.pos.addScaledVector(this.ball.vel, dt);
      
      // Apply drag / friction on the ground
      if (this.ball.pos.y <= BALL_RADIUS) {
        this.ball.pos.y = BALL_RADIUS;
        this.ball.vel.x *= 0.96; // Ground friction
        this.ball.vel.z *= 0.96;
        if (Math.abs(this.ball.vel.y) > 1.5) {
          this.ball.vel.y = -this.ball.vel.y * 0.55; // Bounce bounce
        } else {
          this.ball.vel.y = 0;
        }
      } else {
        // Gravity
        this.ball.vel.y -= 9.81 * dt;
      }

      // Ball pitch boundaries & bouncing
      if (Math.abs(this.ball.pos.x) >= PITCH_LENGTH / 2) {
        // Check if inside Goalmouth
        if (Math.abs(this.ball.pos.z) <= GOAL_WIDTH / 2 && this.ball.pos.y <= GOAL_HEIGHT) {
          // It's a Goal! Goalmouth boundaries don't bounce, goal is registered below
        } else {
          // Bounce off back wall
          this.ball.pos.x = Math.sign(this.ball.pos.x) * (PITCH_LENGTH / 2 - 0.1);
          this.ball.vel.x = -this.ball.vel.x * 0.6;
        }
      }
      
      if (Math.abs(this.ball.pos.z) >= PITCH_WIDTH / 2) {
        // Bounce off touchline
        this.ball.pos.z = Math.sign(this.ball.pos.z) * (PITCH_WIDTH / 2 - 0.1);
        this.ball.vel.z = -this.ball.vel.z * 0.6;
      }
    }

    // 5. Automatic Dribble Collision Check (when ball is free)
    if (this.ball.dribblerId === null && this.ball.kickCooldown <= 0) {
      let closestPlayer = null;
      let minDist = 1.6; // Dribble grab radius

      this.players.forEach(p => {
        if (!p.isFallen) {
          const d = p.pos.distanceTo(this.ball.pos);
          if (d < minDist) {
            minDist = d;
            closestPlayer = p;
          }
        }
      });

      if (closestPlayer) {
        this.ball.dribblerId = closestPlayer.id;
      }
    }

    // 6. Check Goal Event
    const isGoal = this.checkGoal();
    if (isGoal) {
      return isGoal; // Returns { type: 'goal', team: 'home'/'away' }
    }

    return null;
  }

  executePass(kicker) {
    const kickerTeam = kicker.team;
    // Find closest teammate in the general heading direction
    let bestTeammate = null;
    let maxDot = -Infinity;

    const angle = kicker.rotY;
    const lookDir = new Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

    this.players.forEach(p => {
      if (p.team === kickerTeam && p.id !== kicker.id && !p.isGoalkeeper && !p.isFallen) {
        const toTeammate = p.pos.clone().sub(kicker.pos);
        const dist = toTeammate.length();
        if (dist < 40.0) { // Max pass distance
          toTeammate.normalize();
          const dot = toTeammate.x * lookDir.x + toTeammate.z * lookDir.z;
          if (dot > maxDot) {
            maxDot = dot;
            bestTeammate = p;
          }
        }
      }
    });

    this.ball.dribblerId = null;
    this.ball.lastKickedById = kicker.id;
    this.ball.kickCooldown = 0.4;
    kicker.performedAction = 'pass';

    if (bestTeammate && maxDot > 0.3) {
      // Direct pass to teammate
      const dir = bestTeammate.pos.clone().sub(kicker.pos).normalize();
      this.ball.vel.copy(dir.multiplyScalar(16.0));
      this.ball.vel.y = 0.5; // slight lob
    } else {
      // Standard kick forward
      this.ball.vel.copy(lookDir.multiplyScalar(13.0));
      this.ball.vel.y = 0.2;
    }
  }

  executeShoot(kicker) {
    const enemyGoalX = kicker.team === 'home' ? PITCH_LENGTH/2 : -PITCH_LENGTH/2;
    // Random height/width target inside goalpost
    const targetZ = (Math.random() - 0.5) * (GOAL_WIDTH - 2.0);
    const targetY = 1.0 + Math.random() * (GOAL_HEIGHT - 1.5);
    const target = new Vector3(enemyGoalX, targetY, targetZ);

    const dir = target.clone().sub(this.ball.pos).normalize();

    this.ball.dribblerId = null;
    this.ball.lastKickedById = kicker.id;
    this.ball.kickCooldown = 0.5;
    kicker.performedAction = 'shoot';

    // Shot speed
    this.ball.vel.copy(dir.multiplyScalar(24.0));
  }

  executeTackle(tackler) {
    tackler.isTackling = true;
    tackler.tackleCooldown = 1.2;
    tackler.performedAction = 'tackle';

    // If opponent is dribbling and close
    if (this.ball.dribblerId !== null) {
      const victim = this.players[this.ball.dribblerId];
      if (victim.team !== tackler.team) {
        const d = tackler.pos.distanceTo(victim.pos);
        if (d < 2.2) {
          // Lag compensation / tackle decision
          const roll = Math.random();
          if (roll < 0.70) {
            // Clean tackle: ball is poked free
            this.ball.dribblerId = null;
            this.ball.lastKickedById = tackler.id;
            this.ball.kickCooldown = 0.3;
            // Kick ball slightly away from victim
            const pokeDir = tackler.pos.clone().sub(victim.pos).normalize().multiplyScalar(-3.0);
            this.ball.vel.set(pokeDir.x, 0.1, pokeDir.z);
            
            this.events.push({ type: 'tackle', tacklerId: tackler.id, victimId: victim.id });
          } else {
            // Foul! Victim falls flat
            victim.isFallen = true;
            victim.fallTime = 1.8; // fall for 1.8 seconds
            this.ball.dribblerId = null;
            
            // Set ball velocity to 0
            this.ball.vel.set(0, 0, 0);

            this.events.push({ type: 'foul', tacklerId: tackler.id, victimId: victim.id });
          }
        }
      }
    }

    setTimeout(() => {
      tackler.isTackling = false;
    }, 400);
  }

  checkGoal() {
    const x = this.ball.pos.x;
    const z = this.ball.pos.z;
    const y = this.ball.pos.y;

    if (Math.abs(z) <= GOAL_WIDTH / 2 && y <= GOAL_HEIGHT) {
      if (x > PITCH_LENGTH / 2) {
        // Goal for Home!
        this.scores.home++;
        this.resetKickoff(false); // Away kicks off next
        return { type: 'goal', team: 'home' };
      } else if (x < -PITCH_LENGTH / 2) {
        // Goal for Away!
        this.scores.away++;
        this.resetKickoff(true); // Home kicks off next
        return { type: 'goal', team: 'away' };
      }
    }
    return null;
  }

  getStatePacket() {
    return {
      tick: this.tickNumber,
      ball: {
        x: this.ball.pos.x,
        y: this.ball.pos.y,
        z: this.ball.pos.z,
        vx: this.ball.vel.x,
        vy: this.ball.vel.y,
        vz: this.ball.vel.z
      },
      players: this.players.map(p => ({
        id: p.id,
        x: p.pos.x,
        y: p.pos.y,
        z: p.pos.z,
        rotY: p.rotY,
        stamina: p.stamina,
        isFallen: p.isFallen,
        action: p.performedAction,
        isControlled: (p.id === this.controlledPlayerIds.home || p.id === this.controlledPlayerIds.away)
      })),
      controlledIds: {
        home: this.controlledPlayerIds.home,
        away: this.controlledPlayerIds.away
      },
      scores: this.scores,
      matchTime: Math.floor(this.matchTime)
    };
  }
}

/**
 * Server-side PVP Match Simulation Manager
 */

import { MatchSimulation } from './physicsEngine.js';
import { roomManager, ROOM_STATES } from './roomManager.js';

class MatchManager {
  constructor() {
    this.activeMatches = {}; // roomCode -> MatchInstance Object
  }

  startMatch(roomCode, io) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    console.log(`Starting PVP Match simulation for Room ${roomCode}`);

    const sim = new MatchSimulation(roomCode);
    
    // Set active teams based on selections
    const homePlayer = room.players.find(p => p.slot === 1);
    const awayPlayer = room.players.find(p => p.slot === 2);

    const matchInstance = {
      roomCode,
      sim,
      physicsInterval: null,
      networkInterval: null,
      io,
      lastTickTime: Date.now(),
      state: ROOM_STATES.COUNTDOWN,
      countdownTimer: 3.0, // 3 seconds countdown
      matchDuration: 180.0, // 3 minutes total
      
      start() {
        room.state = ROOM_STATES.COUNTDOWN;
        this.io.to(this.roomCode).emit('pvp-match-started', {
          roomState: room.state,
          homeTeam: homePlayer ? homePlayer.team : 'FC Barcelona',
          awayTeam: awayPlayer ? awayPlayer.team : 'Real Madrid',
          countdown: this.countdownTimer
        });

        // 60 Hz Physics Loop
        this.physicsInterval = setInterval(() => {
          this.updatePhysics();
        }, 1000 / 60);

        // 30 Hz Network Broadcast Loop
        this.networkInterval = setInterval(() => {
          this.broadcastState();
        }, 1000 / 30);
      },

      updatePhysics() {
        const now = Date.now();
        const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
        this.lastTickTime = now;

        if (this.state === ROOM_STATES.COUNTDOWN) {
          this.countdownTimer -= dt;
          if (this.countdownTimer <= 0) {
            this.state = ROOM_STATES.FIRST_HALF;
            room.state = ROOM_STATES.FIRST_HALF;
            this.io.to(this.roomCode).emit('pvp-countdown-finished');
          }
          return;
        }

        if (this.state === ROOM_STATES.FIRST_HALF || this.state === ROOM_STATES.SECOND_HALF) {
          const matchEvent = this.sim.physicsTick(dt);
          
          // Check for Match Event (like goals or fouls)
          if (matchEvent) {
            if (matchEvent.type === 'goal') {
              this.io.to(this.roomCode).emit('pvp-event', {
                type: 'goal',
                team: matchEvent.team,
                scores: this.sim.scores
              });
            }
          }

          // Check for Half Time
          if (this.sim.matchTime >= this.matchDuration / 2 && this.state === ROOM_STATES.FIRST_HALF) {
            this.state = ROOM_STATES.HALFTIME;
            room.state = ROOM_STATES.HALFTIME;
            this.io.to(this.roomCode).emit('pvp-halftime', { scores: this.sim.scores });
            
            // Auto restart after 5 seconds
            setTimeout(() => {
              this.state = ROOM_STATES.SECOND_HALF;
              room.state = ROOM_STATES.SECOND_HALF;
              this.sim.resetKickoff(false); // Away kicks off 2nd half
              this.io.to(this.roomCode).emit('pvp-secondhalf-started');
            }, 5000);
          }

          // Check for Full Time
          if (this.sim.matchTime >= this.matchDuration && this.state === ROOM_STATES.SECOND_HALF) {
            this.state = ROOM_STATES.FULLTIME;
            room.state = ROOM_STATES.FULLTIME;
            this.io.to(this.roomCode).emit('pvp-fulltime', { scores: this.sim.scores });
            this.stop();
          }
        }
      },

      broadcastState() {
        const statePacket = this.sim.getStatePacket();
        statePacket.roomState = room.state;
        
        // Include any recently queued events
        if (this.sim.events.length > 0) {
          statePacket.events = [...this.sim.events];
          this.sim.events = []; // Clear
        }

        this.io.to(this.roomCode).emit('pvp-state', statePacket);
      },

      stop() {
        if (this.physicsInterval) clearInterval(this.physicsInterval);
        if (this.networkInterval) clearInterval(this.networkInterval);
        console.log(`PVP Match simulation for Room ${this.roomCode} stopped.`);
      }
    };

    matchInstance.start();
    this.activeMatches[roomCode] = matchInstance;
    room.match = matchInstance;
  }

  handleInput(roomCode, playerSlot, input) {
    const match = this.activeMatches[roomCode];
    if (match) {
      match.sim.processInput(playerSlot, input);
    }
  }

  stopMatch(roomCode) {
    const match = this.activeMatches[roomCode];
    if (match) {
      match.stop();
      delete this.activeMatches[roomCode];
    }
  }
}

export const matchManager = new MatchManager();

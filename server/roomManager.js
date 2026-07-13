/**
 * Server-side PVP Room Manager
 */

export const ROOM_STATES = {
  WAITING: 'WAITING',
  TEAM_SELECTION: 'TEAM_SELECTION',
  READY: 'READY',
  COUNTDOWN: 'COUNTDOWN',
  FIRST_HALF: 'FIRST_HALF',
  HALFTIME: 'HALFTIME',
  SECOND_HALF: 'SECOND_HALF',
  FULLTIME: 'FULLTIME',
  RESULTS: 'RESULTS'
};

class RoomManager {
  constructor() {
    this.rooms = {}; // roomCode -> Room Object
  }

  createRoom(roomCode, socketId) {
    this.rooms[roomCode] = {
      roomCode,
      state: ROOM_STATES.WAITING,
      players: [
        { socketId, team: null, username: 'Player 1', slot: 1, ready: false }
      ],
      match: null
    };
    return this.rooms[roomCode];
  }

  getRoom(roomCode) {
    return this.rooms[roomCode];
  }

  joinRoom(roomCode, socketId) {
    const room = this.rooms[roomCode];
    if (!room) return null;
    
    if (room.players.length >= 2) return null; // Room full

    const playerObj = { 
      socketId, 
      team: null, 
      username: 'Player 2', 
      slot: 2, 
      ready: false 
    };
    room.players.push(playerObj);
    room.state = ROOM_STATES.TEAM_SELECTION;
    return room;
  }

  selectTeam(roomCode, socketId, teamName) {
    const room = this.rooms[roomCode];
    if (!room) return null;

    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      player.team = teamName;
    }
    return room;
  }

  setPlayerReady(roomCode, socketId, isReady) {
    const room = this.rooms[roomCode];
    if (!room) return null;

    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      player.ready = isReady;
    }

    // If both are ready, transition to READY
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.state = ROOM_STATES.READY;
    } else {
      room.state = ROOM_STATES.TEAM_SELECTION;
    }
    return room;
  }

  removePlayer(socketId) {
    const affectedRooms = [];
    for (const [code, room] of Object.entries(this.rooms)) {
      const idx = room.players.findIndex(p => p.socketId === socketId);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.match) {
          room.match.stop();
          room.match = null;
        }
        if (room.players.length === 0) {
          delete this.rooms[code];
        } else {
          room.state = ROOM_STATES.WAITING;
          room.players[0].ready = false; // reset ready flag
          affectedRooms.push(room);
        }
      }
    }
    return affectedRooms;
  }
}

export const roomManager = new RoomManager();

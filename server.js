import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import qrcode from 'qrcode';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';
import { roomManager, ROOM_STATES } from './server/roomManager.js';
import { matchManager } from './server/matchManager.js';
import { registerSocket as registerPvP } from './server/pvpManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with default transport fallbacks (polling -> websocket)
// This guarantees connection success on all Wi-Fi setups
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static assets from public folder with Cache-Control headers to prevent HTML caching
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Client error logging endpoint
app.post('/log', express.text({ type: '*/*' }), (req, res) => {
  console.error('\n================= CLIENT ERROR =================');
  console.error(req.body);
  console.error('================================================\n');
  try {
    fs.appendFileSync(path.join(__dirname, 'client_errors.log'), new Date().toISOString() + ': ' + req.body + '\n');
  } catch(e) {}
  res.sendStatus(200);
});


// QR code generation endpoint
app.get('/qrcode', async (req, res) => {
  const text = req.query.text;
  if (!text) {
    return res.status(400).send('Missing "text" query parameter.');
  }
  try {
    const qrBuffer = await qrcode.toBuffer(text, {
      type: 'png',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',  // deep slate
        light: '#ffffff'  // white
      }
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    console.error('QR Code error:', err);
    res.status(500).send('Failed to generate QR Code.');
  }
});

// Detect the local Wi-Fi / Ethernet IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    const isVirtual = name.toLowerCase().includes('wsl') || 
                      name.toLowerCase().includes('virtual') || 
                      name.toLowerCase().includes('vbox') || 
                      name.toLowerCase().includes('vmware') || 
                      name.toLowerCase().includes('hyper-v') ||
                      name.toLowerCase().includes('loopback');
                      
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!isVirtual) {
          return iface.address;
        } else if (fallbackIp === 'localhost') {
          fallbackIp = iface.address;
        }
      }
    }
  }
  return fallbackIp;
}

const PORT = process.env.PORT || 3000;
const localIp = getLocalIp();

// Active rooms structure
// { [roomCode]: { pcSocketId, phoneSockets: [], layoutState, disconnectTimeout } }
const rooms = {};
const onlineUsers = {}; // uid -> { socketId, username, activity, roomCode }
const fpsRooms = {}; // FPS PvP Rooms

// Helper to generate a 4-letter room code
function generateRoomCode() {
  let code = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing chars like I, O, 1, 0
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Guarantee uniqueness
  if (rooms[code]) return generateRoomCode();
  return code;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ── Universal PvP: Challenges + Matchmaking (all games) ──
  registerPvP(socket, io, onlineUsers);

  // Presence & Friends Hub listeners
  socket.on('presence-update', ({ uid, username, activity, roomCode }) => {
    if (!uid) return;
    socket.userUid = uid;
    onlineUsers[uid] = {
      socketId: socket.id,
      username: username || 'Gamer',
      activity: activity || 'Idle',
      roomCode: roomCode || null
    };
    console.log(`Presence update: User ${username} (${uid}) is ${activity}`);
    socket.broadcast.emit('presence-changed', { uid, username, activity, roomCode });
  });

  socket.on('get-friends-presence', ({ friendUids }) => {
    if (!friendUids || !Array.isArray(friendUids)) return;
    const statusMap = {};
    friendUids.forEach(uid => {
      const u = onlineUsers[uid];
      if (u) {
        statusMap[uid] = { online: true, activity: u.activity, roomCode: u.roomCode };
      } else {
        statusMap[uid] = { online: false, activity: 'Offline', roomCode: null };
      }
    });
    socket.emit('friends-presence-response', statusMap);
  });

  // 1. PC Client requests room creation
  socket.on('join-room-pc', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      pcSocketId: socket.id,
      phoneSockets: [],
      layoutState: 'bowling', // Default starting layout for the controller in PvP
      disconnectTimeout: null
    };

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isPC = true;

    socket.emit('room-created', {
      roomCode,
      localIp,
      port: PORT
    });
    console.log(`Room created: ${roomCode} by PC socket ${socket.id}`);
  });

  // 2. Phone Client joins room
  socket.on('join-room-phone', ({ roomCode, slot }) => {
    const upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    const room = rooms[upperCode];

    if (!room) {
      socket.emit('room-error', 'Room not found. Check the code.');
      return;
    }

    // Cancel disconnect timeout if any
    if (room.disconnectTimeout) {
      clearTimeout(room.disconnectTimeout);
      room.disconnectTimeout = null;
    }

    socket.join(upperCode);
    socket.roomCode = upperCode;
    socket.isPC = false;

    // Assign phone slot number based on requested slot or auto index
    let phoneSlot = 1;
    if (slot === 'PLAYER_1') {
      phoneSlot = 1;
      room.phoneSockets[0] = socket.id;
    } else if (slot === 'PLAYER_2') {
      phoneSlot = 2;
      room.phoneSockets[1] = socket.id;
    } else {
      if (!room.phoneSockets[0]) {
        room.phoneSockets[0] = socket.id;
        phoneSlot = 1;
      } else if (!room.phoneSockets[1]) {
        room.phoneSockets[1] = socket.id;
        phoneSlot = 2;
      } else {
        room.phoneSockets.push(socket.id);
        phoneSlot = room.phoneSockets.length;
      }
    }

    socket.emit('phone-joined', { 
      roomCode: upperCode,
      phoneSlot,
      layout: room.layoutState // Emit cached layout state immediately to avoid race conditions
    });

    // Notify PC client that a phone connected
    io.to(room.pcSocketId).emit('phone-connected', { phoneSlot, socketId: socket.id });
    console.log(`Phone socket ${socket.id} joined Room ${upperCode} as Phone ${phoneSlot} (Slot: ${slot || 'auto'})`);
  });

  // 3. Phone Client attempts to rejoin room (reconnection)
  socket.on('rejoin-room-phone', ({ roomCode, slot }) => {
    const upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    const room = rooms[upperCode];

    if (!room) {
      socket.emit('room-error', 'Session expired. Please scan the QR code again.');
      return;
    }

    if (room.disconnectTimeout) {
      clearTimeout(room.disconnectTimeout);
      room.disconnectTimeout = null;
    }

    socket.join(upperCode);
    socket.roomCode = upperCode;
    socket.isPC = false;

    let phoneSlot = 1;
    if (slot === 'PLAYER_1') {
      phoneSlot = 1;
      room.phoneSockets[0] = socket.id;
    } else if (slot === 'PLAYER_2') {
      phoneSlot = 2;
      room.phoneSockets[1] = socket.id;
    } else {
      const existingIdx = room.phoneSockets.indexOf(socket.id);
      if (existingIdx !== -1) {
        phoneSlot = existingIdx + 1;
      } else {
        if (!room.phoneSockets[0]) {
          room.phoneSockets[0] = socket.id;
          phoneSlot = 1;
        } else if (!room.phoneSockets[1]) {
          room.phoneSockets[1] = socket.id;
          phoneSlot = 2;
        } else {
          room.phoneSockets.push(socket.id);
          phoneSlot = room.phoneSockets.length;
        }
      }
    }

    socket.emit('phone-rejoined', { 
      roomCode: upperCode, 
      phoneSlot,
      layout: room.layoutState // Emit cached layout immediately
    });

    io.to(room.pcSocketId).emit('phone-connected', { phoneSlot, socketId: socket.id });
    console.log(`Phone socket ${socket.id} REJOINED Room ${upperCode} as Phone ${phoneSlot} (Slot: ${slot || 'auto'})`);
  });

  // 4. PC Client changes layout (BATTING/BOWLING)
  socket.on('layout-change', ({ layout }) => {
    const room = rooms[socket.roomCode];
    if (room) {
      room.layoutState = layout;
      // Emit layout change to all phone controllers in the room
      socket.to(socket.roomCode).emit('layout-change', { layout });
      console.log(`Room ${socket.roomCode} layout state updated to: ${layout}`);
    }
  });

  socket.on('trigger-vibration', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('trigger-vibration', data);
    }
  });

  // 5. Relay controller inputs directly to PC client in the room
  socket.on('controller-input', (data) => {
    if (socket.roomCode) {
      // Find the phone slot number to identify which controller sent it
      const room = rooms[socket.roomCode];
      let phoneSlot = 1;
      if (room) {
        phoneSlot = room.phoneSockets.indexOf(socket.id) + 1;
      }
      socket.to(socket.roomCode).emit('controller-input', { ...data, phoneSlot });
    }
  });

  // ── PVP MODULE LISTENERS ──
  socket.on('pvp-create-room', () => {
    const roomCode = 'PVP-' + generateRoomCode();
    const room = roomManager.createRoom(roomCode, socket.id);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.pvpSlot = 1;
    
    socket.emit('pvp-room-created', { roomCode, players: room.players, state: room.state });
    console.log(`PVP Room created: ${roomCode} by ${socket.id}`);
  });

  socket.on('pvp-join-room', ({ roomCode }) => {
    const upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    const room = roomManager.getRoom(upperCode);
    if (!room) {
      socket.emit('pvp-error', 'PVP Room not found. Check the code.');
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('pvp-error', 'PVP Room is full.');
      return;
    }

    const updatedRoom = roomManager.joinRoom(upperCode, socket.id);
    socket.join(upperCode);
    socket.roomCode = upperCode;
    socket.pvpSlot = 2;

    io.to(upperCode).emit('pvp-room-joined', {
      roomCode: upperCode,
      players: updatedRoom.players,
      state: updatedRoom.state
    });
    console.log(`PVP socket ${socket.id} joined PVP Room ${upperCode}`);
  });

  socket.on('pvp-select-team', ({ teamName }) => {
    if (socket.roomCode) {
      const room = roomManager.selectTeam(socket.roomCode, socket.id, teamName);
      if (room) {
        io.to(socket.roomCode).emit('pvp-room-updated', { players: room.players, state: room.state });
      }
    }
  });

  socket.on('pvp-ready', ({ ready }) => {
    if (socket.roomCode) {
      const room = roomManager.setPlayerReady(socket.roomCode, socket.id, ready);
      if (room) {
        io.to(socket.roomCode).emit('pvp-room-updated', { players: room.players, state: room.state });
        
        if (room.state === ROOM_STATES.READY) {
          matchManager.startMatch(socket.roomCode, io);
        }
      }
    }
  });

  socket.on('pvp-input', (inputData) => {
    if (socket.roomCode && socket.pvpSlot) {
      matchManager.handleInput(socket.roomCode, socket.pvpSlot, inputData);
    }
  });

  // ── FPS PVP LISTENERS ──
  socket.on('fps-pvp-create-room', ({ agentId, username }) => {
    const roomCode = 'FPS-' + generateRoomCode().substring(0, 4);
    fpsRooms[roomCode] = {
      players: [
        { socketId: socket.id, agentId, username, status: 'LOBBY' }
      ]
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isFPS = true;
    socket.emit('fps-pvp-room-created', { roomCode, players: fpsRooms[roomCode].players });
    console.log(`FPS PVP Room created: ${roomCode} by socket ${socket.id}`);
  });

  socket.on('fps-pvp-join-room', ({ roomCode, agentId, username }) => {
    let upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    if (upperCode && !upperCode.startsWith('FPS-') && upperCode.length === 4) {
      upperCode = 'FPS-' + upperCode;
    }
    console.log(`[FPS-PVP] Join attempt: roomCode="${roomCode}", upperCode="${upperCode}"`);
    let room = fpsRooms[upperCode];
    if (!room) {
      // Auto-create room if it doesn't exist yet
      fpsRooms[upperCode] = {
        players: [
          { socketId: socket.id, agentId, username, status: 'LOBBY' }
        ]
      };
      socket.join(upperCode);
      socket.roomCode = upperCode;
      socket.isFPS = true;
      socket.emit('fps-pvp-room-created', { roomCode: upperCode, players: fpsRooms[upperCode].players });
      console.log(`FPS PVP Room auto-created on join: ${upperCode} by ${socket.id}`);
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('fps-pvp-error', 'Lobby is full (Max 2 players for 1v1 PvP).');
      return;
    }

    room.players.push({ socketId: socket.id, agentId, username, status: 'LOBBY' });
    socket.join(upperCode);
    socket.roomCode = upperCode;
    socket.isFPS = true;

    io.to(upperCode).emit('fps-pvp-room-joined', { roomCode: upperCode, players: room.players });
    console.log(`FPS socket ${socket.id} joined FPS Room ${upperCode}`);
  });

  socket.on('fps-pvp-start-match', () => {
    const roomCode = socket.roomCode;
    const room = fpsRooms[roomCode];
    if (room) {
      io.to(roomCode).emit('fps-pvp-match-started');
      console.log(`FPS Match started in room ${roomCode}`);
    }
  });

  socket.on('fps-pvp-player-update', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-player-update', data);
    }
  });

  socket.on('fps-pvp-shoot', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-shoot', data);
    }
  });

  socket.on('fps-pvp-hit', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-hit', data);
    }
  });

  socket.on('fps-pvp-ability', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-ability', data);
    }
  });

  socket.on('fps-pvp-spike-plant', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-spike-plant', data);
    }
  });

  socket.on('fps-pvp-spike-defuse', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('fps-pvp-spike-defuse', data);
    }
  });

  // 6. Handle Disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // PvP room cleanup
    if (socket.roomCode && socket.roomCode.startsWith('PVP-')) {
      const roomCode = socket.roomCode;
      const affectedRooms = roomManager.removePlayer(socket.id);
      matchManager.stopMatch(roomCode);
      
      affectedRooms.forEach(room => {
        io.to(room.roomCode).emit('pvp-player-left', {
          players: room.players,
          state: room.state
        });
      });
      console.log(`PVP socket ${socket.id} disconnected, cleaned up PVP Room ${roomCode}`);
      return;
    }

    // FPS PvP room cleanup
    if (socket.roomCode && socket.roomCode.startsWith('FPS-')) {
      const roomCode = socket.roomCode;
      const room = fpsRooms[roomCode];
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socket.id);
        if (room.players.length === 0) {
          delete fpsRooms[roomCode];
          console.log(`FPS Room ${roomCode} empty. Cleaned up.`);
        } else {
          socket.to(roomCode).emit('fps-pvp-player-left');
          console.log(`Player left FPS Room ${roomCode}. Informing remaining player.`);
        }
      }
    }

    // Presence registry cleanup on disconnect
    if (socket.userUid && onlineUsers[socket.userUid]) {
      const u = onlineUsers[socket.userUid];
      console.log(`User offline: ${u.username} (${socket.userUid})`);
      delete onlineUsers[socket.userUid];
      socket.broadcast.emit('presence-changed', {
        uid: socket.userUid,
        username: u.username,
        activity: 'Offline',
        roomCode: null
      });
    }

    const roomCode = socket.roomCode;
    if (!roomCode) return;

    const room = rooms[roomCode];
    if (!room) return;

    if (socket.isPC) {
      // If PC disconnects, clear the entire room immediately
      console.log(`PC disconnected. Tearing down Room ${roomCode}`);
      socket.to(roomCode).emit('pc-disconnected');
      delete rooms[roomCode];
    } else {
      // Remove phone from room list
      const idx = room.phoneSockets.indexOf(socket.id);
      if (idx !== -1) {
        room.phoneSockets[idx] = null;
      }

      console.log(`Phone disconnected from Room ${roomCode}. Waiting 30s to clean up...`);
      io.to(room.pcSocketId).emit('phone-disconnected', { phoneSlot: idx + 1 });

      room.disconnectTimeout = setTimeout(() => {
        const activeRoom = rooms[roomCode];
        if (activeRoom && activeRoom.phoneSockets.length === 0) {
          console.log(`Room ${roomCode} phone cleanup timeout reached. Resetting controller slots.`);
        }
      }, 30000);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`CRICKET GAME RUNNING SUCCESSFULLY!`);
  console.log(`PC View URL: http://localhost:${PORT}`);
  console.log(`Phone Controller: http://${localIp}:${PORT}/controller.html`);
  console.log(`=========================================`);
});

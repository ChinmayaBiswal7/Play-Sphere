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

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.post('/log', express.text({ type: '*/*' }), (req, res) => {
  console.error('\n================= CLIENT ERROR =================');
  console.error(req.body);
  console.error('================================================\n');
  try {
    fs.appendFileSync(path.join(__dirname, 'client_errors.log'), new Date().toISOString() + ': ' + req.body + '\n');
  } catch(e) {}
  res.sendStatus(200);
});

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
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    console.error('QR Code error:', err);
    res.status(500).send('Failed to generate QR Code.');
  }
});

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

const rooms = {};
const onlineUsers = {};
const fpsRooms = {};
const footballRooms = {};
const footballQueues = {
  '1v1': [],
  '2v2': [],
  '3v3': [],
  '5v5': []
};

function generateRoomCode() {
  let code = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms[code]) return generateRoomCode();
  return code;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  registerPvP(socket, io, onlineUsers);

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

  socket.on('join-room-pc', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      pcSocketId: socket.id,
      phoneSockets: [],
      layoutState: 'bowling',
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

  socket.on('join-room-phone', ({ roomCode, slot }) => {
    const upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    const room = rooms[upperCode];

    if (!room) {
      socket.emit('room-error', 'Room not found. Check the code.');
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
      layout: room.layoutState
    });

    io.to(room.pcSocketId).emit('phone-connected', { phoneSlot, socketId: socket.id });
    console.log(`Phone socket ${socket.id} joined Room ${upperCode} as Phone ${phoneSlot}`);
  });

  socket.on('rejoin-room-phone', ({ roomCode, slot }) => {
    const upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    const room = rooms[upperCode];

    if (!room) {
      socket.emit('room-error', 'Session expired. Please scan QR code again.');
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
      layout: room.layoutState
    });

    io.to(room.pcSocketId).emit('phone-connected', { phoneSlot, socketId: socket.id });
  });

  socket.on('layout-change', ({ layout }) => {
    const room = rooms[socket.roomCode];
    if (room) {
      room.layoutState = layout;
      socket.to(socket.roomCode).emit('layout-change', { layout });
    }
  });

  socket.on('trigger-vibration', (data) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('trigger-vibration', data);
    }
  });

  socket.on('controller-input', (data) => {
    if (socket.roomCode) {
      const room = rooms[socket.roomCode];
      let phoneSlot = 1;
      if (room) {
        phoneSlot = room.phoneSockets.indexOf(socket.id) + 1;
      }
      socket.to(socket.roomCode).emit('controller-input', { ...data, phoneSlot });
    }
  });

  // ── REMATCH FOOTBALL MULTIPLAYER LISTENERS ──
  socket.on('rematch-pvp-create-room', ({ format = '1v1', username = 'Player' }) => {
    const code = 'FOOT-' + generateRoomCode();
    footballRooms[code] = {
      code,
      format,
      hostId: socket.id,
      players: [
        { socketId: socket.id, username, team: 'red', slot: 1 }
      ]
    };
    socket.join(code);
    socket.footballRoomCode = code;
    socket.emit('rematch-pvp-room-created', { 
      roomCode: code, 
      format, 
      isHost: true, 
      players: footballRooms[code].players 
    });
    console.log(`[FOOTBALL] Private Room created: ${code} (${format}) by ${username}`);
  });

  socket.on('rematch-pvp-join-room', ({ roomCode, username = 'Player' }) => {
    let upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    if (upperCode && !upperCode.startsWith('FOOT-') && upperCode.length === 4) {
      upperCode = 'FOOT-' + upperCode;
    }
    const room = footballRooms[upperCode];
    if (!room) {
      socket.emit('rematch-pvp-error', 'Football Room not found. Check the code.');
      return;
    }

    const maxCapacityMap = { '1v1': 2, '2v2': 4, '3v3': 6, '5v5': 10 };
    const maxPlayers = maxCapacityMap[room.format] || 2;

    if (room.players.length >= maxPlayers) {
      socket.emit('rematch-pvp-error', `Room is full for ${room.format} format.`);
      return;
    }

    const team = room.players.length % 2 === 0 ? 'red' : 'blue';
    const slot = room.players.length + 1;

    room.players.push({ socketId: socket.id, username, team, slot });
    socket.join(upperCode);
    socket.footballRoomCode = upperCode;

    io.to(upperCode).emit('rematch-pvp-room-joined', { 
      roomCode: upperCode, 
      format: room.format, 
      players: room.players 
    });
    console.log(`[FOOTBALL] ${username} joined Private Room ${upperCode} as Team ${team.toUpperCase()}`);
  });

  socket.on('rematch-pvp-find-match', ({ format = '1v1', username = 'Player' }) => {
    const queue = footballQueues[format] || [];
    queue.push({ socketId: socket.id, username, socket });

    const requiredMap = { '1v1': 2, '2v2': 4, '3v3': 6, '5v5': 10 };
    const requiredPlayers = requiredMap[format] || 2;

    socket.emit('rematch-pvp-searching', { format, queuedCount: queue.length });

    if (queue.length >= requiredPlayers) {
      const matchCode = 'FOOT-ONLINE-' + generateRoomCode();
      const matched = queue.splice(0, requiredPlayers);

      const playersList = matched.map((item, idx) => ({
        socketId: item.socketId,
        username: item.username,
        team: idx % 2 === 0 ? 'red' : 'blue',
        slot: idx + 1
      }));

      footballRooms[matchCode] = {
        code: matchCode,
        format,
        hostId: matched[0].socketId,
        players: playersList
      };

      matched.forEach((item) => {
        item.socket.join(matchCode);
        item.socket.footballRoomCode = matchCode;
      });

      io.to(matchCode).emit('rematch-pvp-match-found', {
        roomCode: matchCode,
        format,
        players: playersList
      });
      console.log(`[FOOTBALL] ONLINE MATCHMAKING SUCCESS: ${matchCode} (${format}) paired ${requiredPlayers} players!`);
    }
  });

  socket.on('rematch-pvp-player-update', (data) => {
    if (socket.footballRoomCode) {
      socket.to(socket.footballRoomCode).emit('rematch-pvp-player-update', {
        socketId: socket.id,
        ...data
      });
    }
  });

  socket.on('rematch-pvp-ball-update', (data) => {
    if (socket.footballRoomCode) {
      socket.to(socket.footballRoomCode).emit('rematch-pvp-ball-update', data);
    }
  });

  socket.on('rematch-pvp-goal-scored', (data) => {
    if (socket.footballRoomCode) {
      io.to(socket.footballRoomCode).emit('rematch-pvp-goal-scored', data);
    }
  });

  // FPS PVP LISTENERS
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
  });

  socket.on('fps-pvp-join-room', ({ roomCode, agentId, username }) => {
    let upperCode = roomCode ? roomCode.toUpperCase().trim() : '';
    if (upperCode && !upperCode.startsWith('FPS-') && upperCode.length === 4) {
      upperCode = 'FPS-' + upperCode;
    }
    let room = fpsRooms[upperCode];
    if (!room) {
      fpsRooms[upperCode] = {
        players: [
          { socketId: socket.id, agentId, username, status: 'LOBBY' }
        ]
      };
      socket.join(upperCode);
      socket.roomCode = upperCode;
      socket.isFPS = true;
      socket.emit('fps-pvp-room-created', { roomCode: upperCode, players: fpsRooms[upperCode].players });
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
  });

  socket.on('fps-pvp-start-match', () => {
    if (socket.roomCode && fpsRooms[socket.roomCode]) {
      io.to(socket.roomCode).emit('fps-pvp-match-started');
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

  // Handle Disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Football room & queue cleanup
    if (socket.footballRoomCode) {
      const fCode = socket.footballRoomCode;
      const fRoom = footballRooms[fCode];
      if (fRoom) {
        fRoom.players = fRoom.players.filter(p => p.socketId !== socket.id);
        if (fRoom.players.length === 0) {
          delete footballRooms[fCode];
        } else {
          socket.to(fCode).emit('rematch-pvp-player-left', { socketId: socket.id });
        }
      }
    }

    Object.keys(footballQueues).forEach(fmt => {
      footballQueues[fmt] = footballQueues[fmt].filter(item => item.socketId !== socket.id);
    });

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
      return;
    }

    if (socket.roomCode && socket.roomCode.startsWith('FPS-')) {
      const roomCode = socket.roomCode;
      const room = fpsRooms[roomCode];
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socket.id);
        if (room.players.length === 0) {
          delete fpsRooms[roomCode];
        } else {
          socket.to(roomCode).emit('fps-pvp-player-left');
        }
      }
    }

    if (socket.userUid && onlineUsers[socket.userUid]) {
      const u = onlineUsers[socket.userUid];
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
      socket.to(roomCode).emit('pc-disconnected');
      delete rooms[roomCode];
    } else {
      const idx = room.phoneSockets.indexOf(socket.id);
      if (idx !== -1) {
        room.phoneSockets[idx] = null;
      }
      io.to(room.pcSocketId).emit('phone-disconnected', { phoneSlot: idx + 1 });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`PLAYSPHERE GAMING CONSOLE ONLINE!`);
  console.log(`PC View URL: http://localhost:${PORT}`);
  console.log(`Phone Controller: http://${localIp}:${PORT}/controller.html`);
  console.log(`=========================================`);
});

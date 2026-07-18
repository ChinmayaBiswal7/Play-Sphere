/**
 * pvpManager.js
 * PlaySphere Universal PvP Manager
 * Handles: Friend Challenges + Random Matchmaking across all 6 games
 * Games: cricket | fps | football | f1 | tennis | wwe
 */

// ── In-memory stores ──────────────────────────────────────────────────────────
const pendingChallenges = {};    // challengeId -> challenge object
const matchmakingQueues = {      // gameName -> [ { socketId, uid, username } ]
  cricket: [],
  fps:     [],
  football:[],
  f1:      [],
  tennis:  [],
  wwe:     []
};
let challengeCounter = 0;

// ── Room code generator ───────────────────────────────────────────────────────
const GAME_PREFIX = {
  cricket:  'CRT',
  fps:      'FPS',
  football: 'FTB',
  f1:       'F1R',
  tennis:   'TNS',
  wwe:      'WWE'
};

function generateCode(game) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return (GAME_PREFIX[game] || 'PS') + '-' + code;
}

// ── Socket registration ───────────────────────────────────────────────────────
/**
 * Register a socket's connection (called on each socket.on('connection'))
 */
function registerSocket(socket, io, onlineUsers) {

  // ── FRIEND CHALLENGE ────────────────────────────────────────────────────────

  socket.on('ps-challenge-send', ({ toUid, game, fromUsername }) => {
    const targetUser = onlineUsers[toUid];
    if (!targetUser) {
      socket.emit('ps-challenge-error', 'Friend is offline right now.');
      return;
    }

    const challengeId = 'CH-' + (++challengeCounter);
    pendingChallenges[challengeId] = {
      challengeId,
      fromSocketId: socket.id,
      fromUid: socket.userUid || null,
      fromUsername: fromUsername || 'A friend',
      toSocketId: targetUser.socketId,
      toUid,
      game,
      createdAt: Date.now()
    };

    // Notify the target player
    io.to(targetUser.socketId).emit('ps-challenge-incoming', {
      challengeId,
      fromUsername: fromUsername || 'A friend',
      game
    });

    // Confirm to sender
    socket.emit('ps-challenge-sent', { challengeId, toUsername: targetUser.username });

    // Auto-expire after 30 seconds
    setTimeout(() => {
      if (pendingChallenges[challengeId]) {
        delete pendingChallenges[challengeId];
        socket.emit('ps-challenge-expired', { challengeId });
      }
    }, 30000);

    console.log(`[PvP] Challenge ${challengeId}: ${fromUsername} -> ${targetUser.username} (${game})`);
  });

  socket.on('ps-challenge-respond', ({ challengeId, accepted }) => {
    const ch = pendingChallenges[challengeId];
    if (!ch) {
      socket.emit('ps-challenge-error', 'Challenge no longer valid.');
      return;
    }

    delete pendingChallenges[challengeId];

    if (!accepted) {
      io.to(ch.fromSocketId).emit('ps-challenge-declined', { game: ch.game });
      return;
    }

    // Create the match room and notify both players
    const roomCode = generateCode(ch.game);
    const matchData = {
      roomCode,
      game: ch.game,
      host: { socketId: ch.fromSocketId, username: ch.fromUsername },
      guest: { socketId: ch.toSocketId }
    };

    io.to(ch.fromSocketId).emit('ps-match-start', matchData);
    io.to(ch.toSocketId).emit('ps-match-start', matchData);

    console.log(`[PvP] Match started: ${roomCode} (${ch.game}) - ${ch.fromUsername} vs guest`);
  });

  // ── RANDOM MATCHMAKING ──────────────────────────────────────────────────────

  socket.on('ps-matchmaking-join', ({ game, uid, username }) => {
    if (!matchmakingQueues[game]) {
      socket.emit('ps-matchmaking-error', 'Unknown game: ' + game);
      return;
    }

    // Remove any stale entry for this socket first
    dequeueSocket(socket.id);

    const entry = { socketId: socket.id, uid, username: username || 'Player', game };
    matchmakingQueues[game].push(entry);
    socket.emit('ps-matchmaking-queued', { game, position: matchmakingQueues[game].length });

    console.log(`[Matchmaking] ${username} queued for ${game} (queue size: ${matchmakingQueues[game].length})`);

    // Try to pair immediately
    tryPair(game, io);
  });

  socket.on('ps-matchmaking-cancel', () => {
    dequeueSocket(socket.id);
    socket.emit('ps-matchmaking-cancelled');
    console.log(`[Matchmaking] Socket ${socket.id} cancelled search`);
  });

  // ── GAME SESSION JOIN & SYNC RELAY ──────────────────────────────────────────
  socket.on('ps-game-join', ({ roomCode, game, isHost }) => {
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.activeGame = game;
    console.log(`[PvP] Socket ${socket.id} joined game room ${roomCode} (${game}, isHost: ${isHost})`);
  });

  socket.on('ps-game-message', ({ roomCode, event, data }) => {
    const rCode = roomCode || socket.roomCode;
    if (rCode) {
      socket.to(rCode).emit('ps-game-message', { event, data });
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    dequeueSocket(socket.id);
    // Cancel any pending challenges involving this socket
    for (const [id, ch] of Object.entries(pendingChallenges)) {
      if (ch.fromSocketId === socket.id || ch.toSocketId === socket.id) {
        const otherSocket = ch.fromSocketId === socket.id ? ch.toSocketId : ch.fromSocketId;
        io.to(otherSocket).emit('ps-challenge-expired', { challengeId: id });
        delete pendingChallenges[id];
      }
    }
  });
}

function dequeueSocket(socketId) {
  for (const game of Object.keys(matchmakingQueues)) {
    matchmakingQueues[game] = matchmakingQueues[game].filter(e => e.socketId !== socketId);
  }
}

function tryPair(game, io) {
  const queue = matchmakingQueues[game];
  if (queue.length < 2) return;

  const p1 = queue.shift();
  const p2 = queue.shift();

  const roomCode = generateCode(game);
  const matchData = {
    roomCode,
    game,
    host: { socketId: p1.socketId, username: p1.username },
    guest: { socketId: p2.socketId, username: p2.username }
  };

  io.to(p1.socketId).emit('ps-matchmaking-found', matchData);
  io.to(p2.socketId).emit('ps-matchmaking-found', matchData);

  console.log(`[Matchmaking] Paired: ${p1.username} vs ${p2.username} -> ${roomCode} (${game})`);
}

export { registerSocket };

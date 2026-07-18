/**
 * Football Pro 2026 - Socket.io Multi-touch Remote pairing Module
 */

export const SocketController = {
  socket: null,
  roomCode: '',
  phoneConnected: false,
  controllerInput: {
    joystickX: 0,
    joystickY: 0,
    btnCross: false,    // Pass
    btnCircle: false,   // Shoot
    btnSquare: false,   // Tackle
    btnR1: false        // Sprint
  },

  init() {
    window.SocketController = this;
    if (typeof io === 'undefined') {
      console.warn("Socket.io client not loaded. Running in local control mode.");
      return;
    }
    this.socket = io();

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      this.roomCode = room.toUpperCase().trim();
      this.socket.on('connect', () => {
        console.log("Football client connected to WebSocket. Joining room:", this.roomCode);
        this.socket.emit('rejoin-room-phone', { roomCode: this.roomCode });
      });
    }

    this.socket.on('phone-joined', ({ phoneSlot }) => {
      this.setConnected(true);
      console.log("Remote controller connected. Phone slot:", phoneSlot);
      this.socket.emit('layout-change', { layout: 'football' });
    });

    this.socket.on('phone-rejoined', ({ phoneSlot }) => {
      this.setConnected(true);
      console.log("Remote controller re-joined. Phone slot:", phoneSlot);
      this.socket.emit('layout-change', { layout: 'football' });
    });

    this.socket.on('phone-disconnected', () => {
      this.setConnected(false);
      console.log("Remote controller disconnected.");
    });

    this.socket.on('phone-input', (inputData) => {
      this.controllerInput.joystickX = inputData.x || 0;
      this.controllerInput.joystickY = inputData.y || 0;
      this.controllerInput.btnCross = !!inputData.cross;
      this.controllerInput.btnCircle = !!inputData.circle;
      this.controllerInput.btnSquare = !!inputData.square;
      this.controllerInput.btnR1 = !!inputData.r1;
    });
  },

  setConnected(status) {
    this.phoneConnected = status;
    const dot = document.querySelector('.pair-dot');
    const label = document.getElementById('remote-label');
    const ind = document.getElementById('remote-indicator');
    const lobbyStatus = document.getElementById('lobby-pair-status');

    if (status) {
      if (dot) dot.classList.add('connected');
      if (label) label.innerText = "DUALSENSE REMOTE LINKED";
      if (ind) ind.style.borderColor = "#34d399";
      if (lobbyStatus) lobbyStatus.innerText = "Lobby: Controller Linked";
    } else {
      if (dot) dot.classList.remove('connected');
      if (label) label.innerText = "KEYBOARD CONTROL";
      if (ind) ind.style.borderColor = "rgba(255,255,255,0.1)";
      if (lobbyStatus) lobbyStatus.innerText = "Lobby: Standalone";
    }
  }
};

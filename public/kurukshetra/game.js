import { KurukshetraAI } from './ai.js';
import { KurukshetraUI } from './ui.js';

export class KurukshetraGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.state = 'MENU';
    this.playerKarma = 5;
    this.ai = new KurukshetraAI('medium');
    this.ui = new KurukshetraUI(this);
    this.troops = [];
    this.towers = [];
  }

  init(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset();
    this.start();
  }

  reset() {
    this.playerKarma = 5;
    this.troops = [];
    this.towers = [
      { id: 'p_king', x: 400, y: 700, hp: 1500, maxHp: 1500, isPlayer: true },
      { id: 'p_left', x: 150, y: 600, hp: 800, maxHp: 800, isPlayer: true },
      { id: 'p_right', x: 650, y: 600, hp: 800, maxHp: 800, isPlayer: true },
      { id: 'e_king', x: 400, y: 100, hp: 1500, maxHp: 1500, isPlayer: false },
      { id: 'e_left', x: 150, y: 200, hp: 800, maxHp: 800, isPlayer: false },
      { id: 'e_right', x: 650, y: 200, hp: 800, maxHp: 800, isPlayer: false }
    ];
  }

  start() {
    this.state = 'BATTLE';
    this.lastTime = Date.now();
    this.loop();
  }

  loop() {
    if (this.state !== 'BATTLE') return;
    requestAnimationFrame(() => this.loop());
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    this.update(dt);
    this.draw();
  }

  update(dt) {
    // Logic updates
    const action = this.ai.makeDecision(this);
    if (action) {
      this.troops.push({ x: action.x, y: action.y, isPlayer: false, hp: 100 });
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw towers
    this.towers.forEach(t => {
      this.ctx.fillStyle = t.isPlayer ? 'blue' : 'red';
      this.ctx.fillRect(t.x - 25, t.y - 25, 50, 50);
    });

    // Draw troops
    this.troops.forEach(t => {
      this.ctx.fillStyle = t.isPlayer ? 'cyan' : 'orange';
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
}

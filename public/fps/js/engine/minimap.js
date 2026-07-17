/* ==========================================================================
   DELHI DEFIANCE — MINIMAP RENDERER
   Draws a top-down canvas 2D minimap showing zone layout and player position.
   World: -75 to +75 in X and Z. Canvas: 128×128 px.
   Orientation: South (ATK) = bottom, North (DEF) = top (matches in-game).
   ========================================================================== */

class MiniMapRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.scale = 128 / 150;  // px per world unit
    this.offset = 75;         // world center offset
    this.staticImage = null;
    this.ready = false;
  }

  /* World → canvas pixel */
  w2m(wx, wz) {
    return {
      x: (wx + this.offset) * this.scale,
      y: (wz + this.offset) * this.scale   // south (+Z) at bottom, north (-Z) at top
    };
  }

  /* Fill a world-space rectangle on the canvas */
  fillZone(cx, cz, w, d, fillStyle, alpha) {
    const tl = this.w2m(cx - w / 2, cz - d / 2);
    const pw = w * this.scale;
    const ph = d * this.scale;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = fillStyle;
    this.ctx.fillRect(tl.x, tl.y, pw, ph);
  }

  init() {
    this.canvas = document.getElementById('hud-minimap-canvas');
    if (!this.canvas) return;
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');
    this.drawStaticBackground();
    this.ready = true;
  }

  drawStaticBackground() {
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#07091a';
    ctx.fillRect(0, 0, 128, 128);

    // ── Corridors & rooms (lighter zones represent walkable space) ──
    const walkable = '#1e2d42';
    const atkCol   = '#192a18';
    const defCol   = '#152030';
    const siteColA = '#2a1818';
    const siteColB = '#18182a';

    // Attacker Spawn
    this.fillZone(0, 67, 28, 14, atkCol, 0.95);
    // ATK → B Main connecting hall
    this.fillZone(-22, 60, 16, 6, walkable, 0.9);
    // ATK → A Main connecting hall
    this.fillZone( 22, 60, 16, 6, walkable, 0.9);
    // B Main corridor
    this.fillZone(-35, 27.5, 8, 59, walkable, 0.9);
    // A Main corridor
    this.fillZone( 35, 27.5, 8, 59, walkable, 0.9);
    // Mid Tunnel
    this.fillZone(0, 35.5, 9, 43, defCol, 0.9);
    // Mid Plaza
    this.fillZone(0, -3, 34, 28, walkable, 0.9);
    // Mid Tower
    this.fillZone(0, -33, 16, 14, defCol, 0.95);
    // Mid → Tower connector
    this.fillZone(0, -22, 10, 10, walkable, 0.85);
    // B Link
    this.fillZone(-25, -12, 16, 10, walkable, 0.9);
    // A Link
    this.fillZone( 25, -12, 16, 10, walkable, 0.9);
    // B Site
    this.fillZone(-45, -17, 26, 22, siteColB, 0.95);
    // A Site
    this.fillZone( 45, -17, 26, 22, siteColA, 0.95);
    // B Heaven
    this.fillZone(-45, -37, 20, 12, atkCol, 0.9);
    // A Heaven
    this.fillZone( 45, -37, 20, 12, atkCol, 0.9);
    // B Tower side wing
    this.fillZone(-11, -43, 6, 14, walkable, 0.85);
    // A Tower side wing
    this.fillZone( 11, -43, 6, 14, walkable, 0.85);
    // DEF left connector
    this.fillZone(-20, -52, 12, 15, defCol, 0.9);
    // DEF right connector
    this.fillZone( 20, -52, 12, 15, defCol, 0.9);
    // Defender Spawn
    this.fillZone(0, -67, 28, 14, defCol, 0.95);

    // ── Zone labels ──
    ctx.globalAlpha = 1;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';

    const aPos = this.w2m(45, -17);
    ctx.fillStyle = '#ff3366'; ctx.fillText('A', aPos.x, aPos.y + 3);

    const bPos = this.w2m(-45, -17);
    ctx.fillStyle = '#00d2ff'; ctx.fillText('B', bPos.x, bPos.y + 3);

    ctx.font = '6px monospace';
    ctx.fillStyle = '#556';
    const atkP = this.w2m(0, 67); ctx.fillText('ATK', atkP.x, atkP.y + 3);
    const defP = this.w2m(0, -67); ctx.fillText('DEF', defP.x, defP.y + 3);
    const midP = this.w2m(0, -33); ctx.fillText('TOWER', midP.x, midP.y + 3);

    // ── Outer ring border ──
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(1, 1, 126, 126);
    ctx.globalAlpha = 1;

    // Save static snapshot
    this.staticImage = ctx.getImageData(0, 0, 128, 128);
  }

  update(playerX, playerZ, playerYaw) {
    if (!this.ready || !this.ctx || !this.staticImage) return;

    // Restore static background
    this.ctx.putImageData(this.staticImage, 0, 0);

    // ── Draw bots (if any) as small red dots ──
    if (window.FPSGameLoop?.bots?.bots) {
      window.FPSGameLoop.bots.bots.forEach(b => {
        if (b.isDead) return;
        const bp = this.w2m(b.mesh.position.x, b.mesh.position.z);
        this.ctx.fillStyle = '#ff3333';
        this.ctx.globalAlpha = 0.85;
        this.ctx.beginPath();
        this.ctx.arc(bp.x, bp.y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1;
    }

    // ── Player triangle ──
    const p = this.w2m(playerX, playerZ);
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    // In Three.js, yaw 0 = looking in -Z direction (north on minimap = up).
    // Canvas up is -Y. So player yaw 0 should show triangle pointing up (canvas -Y).
    // Three.js yaw increases counter-clockwise seen from above (positive angle = turning left).
    // We rotate by -yaw to match: yaw=0 → pointing up, yaw=PI/2 → pointing left, etc.
    this.ctx.rotate(-playerYaw);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -5);   // tip (forward)
    this.ctx.lineTo(-3, 4);
    this.ctx.lineTo( 3, 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Outer white ring (position dot)
    this.ctx.strokeStyle = '#00d2ff';
    this.ctx.lineWidth = 0.8;
    this.ctx.stroke();

    this.ctx.restore();
  }
}

window.MiniMapRenderer = new MiniMapRenderer();

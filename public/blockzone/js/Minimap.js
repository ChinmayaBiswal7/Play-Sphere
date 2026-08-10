/**
 * BLOCK ZONE: Single Top-Right 2D Minimap Canvas Renderer
 */
class Minimap {
  constructor(worldSize = 500, canvasId = 'minimap-canvas') {
    this.worldSize = worldSize;
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.width = this.canvas.width;
      this.height = this.canvas.height;
    }
  }

  worldToMap(x, z) {
    const mx = ((x + this.worldSize / 2) / this.worldSize) * this.width;
    const my = ((z + this.worldSize / 2) / this.worldSize) * this.height;
    return { x: mx, y: my };
  }

  update(player, bots, safeZone, lootSystem) {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Terrain Grass Background
    this.ctx.fillStyle = '#2d5a27';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Main Roads
    this.ctx.strokeStyle = '#4a5568';
    this.ctx.lineWidth = 4;
    // N-S road
    const pTop = this.worldToMap(0, -200);
    const pBottom = this.worldToMap(0, 200);
    this.ctx.beginPath();
    this.ctx.moveTo(pTop.x, pTop.y);
    this.ctx.lineTo(pBottom.x, pBottom.y);
    this.ctx.stroke();

    // E-W road
    const pLeft = this.worldToMap(-200, 0);
    const pRight = this.worldToMap(200, 0);
    this.ctx.beginPath();
    this.ctx.moveTo(pLeft.x, pLeft.y);
    this.ctx.lineTo(pRight.x, pRight.y);
    this.ctx.stroke();

    // 3. Blue Lake
    const lakePos = this.worldToMap(0, 150);
    this.ctx.fillStyle = '#3182ce';
    this.ctx.beginPath();
    this.ctx.ellipse(lakePos.x, lakePos.y, (40 / this.worldSize) * this.width, (28 / this.worldSize) * this.height, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 4. Safe Zones
    if (safeZone) {
      // Next Safe Zone (White Dashed Circle)
      const nextPos = this.worldToMap(safeZone.nextCenter.x, safeZone.nextCenter.z);
      const nextR = (safeZone.nextRadius / this.worldSize) * this.width;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([3, 3]);
      this.ctx.beginPath();
      this.ctx.arc(nextPos.x, nextPos.y, Math.max(1, nextR), 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Current Safe Zone (Glowing Cyan Circle)
      const curPos = this.worldToMap(safeZone.center.x, safeZone.center.z);
      const curR = (safeZone.currentRadius / this.worldSize) * this.width;
      this.ctx.strokeStyle = '#00d2ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(curPos.x, curPos.y, Math.max(1, curR), 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 5. Loot Items (Small Gold Dots)
    if (lootSystem && lootSystem.lootItems) {
      this.ctx.fillStyle = '#facc15';
      lootSystem.lootItems.forEach(item => {
        if (item.active && item.mesh) {
          const lp = this.worldToMap(item.mesh.position.x, item.mesh.position.z);
          this.ctx.beginPath();
          this.ctx.arc(lp.x, lp.y, 1.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    }

    // 6. Bots (Red Dots)
    if (bots) {
      this.ctx.fillStyle = '#ef4444';
      bots.forEach(bot => {
        if (bot.health > 0 && bot.mesh) {
          const bp = this.worldToMap(bot.mesh.position.x, bot.mesh.position.z);
          this.ctx.beginPath();
          this.ctx.arc(bp.x, bp.y, 2.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    }

    // 7. Player (Cyan Arrow / Triangle with Direction)
    if (player && player.health > 0 && player.mesh) {
      const pp = this.worldToMap(player.mesh.position.x, player.mesh.position.z);
      const yaw = player.mesh.rotation.y;

      this.ctx.save();
      this.ctx.translate(pp.x, pp.y);
      this.ctx.rotate(-yaw);

      this.ctx.fillStyle = '#00d2ff';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;

      this.ctx.beginPath();
      this.ctx.moveTo(0, -6);
      this.ctx.lineTo(4, 4);
      this.ctx.lineTo(0, 2);
      this.ctx.lineTo(-4, 4);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    }
  }
}

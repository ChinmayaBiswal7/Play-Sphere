class Minimap {
    constructor(worldSize, canvasId) {
        this.worldSize = worldSize;
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            this.canvas.width = 200;
            this.canvas.height = 200;
            this.canvas.style.position = 'absolute';
            this.canvas.style.bottom = '20px';
            this.canvas.style.right = '20px';
            this.canvas.style.border = '2px solid white';
            this.canvas.style.borderRadius = '50%';
            this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    update(player, bots, safeZone) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Safe Zone
        const szX = (safeZone.center.x / this.worldSize) * this.width + this.width / 2;
        const szY = (safeZone.center.z / this.worldSize) * this.height + this.height / 2;
        const szRadius = (safeZone.radius / this.worldSize) * this.width;

        this.ctx.beginPath();
        this.ctx.arc(szX, szY, szRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(szX, szY, (safeZone.nextRadius / this.worldSize) * this.width, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw Bots
        this.ctx.fillStyle = 'red';
        bots.forEach(bot => {
            if (bot.health > 0) {
                const bx = (bot.mesh.position.x / this.worldSize) * this.width + this.width / 2;
                const by = (bot.mesh.position.z / this.worldSize) * this.height + this.height / 2;
                this.ctx.beginPath();
                this.ctx.arc(bx, by, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Draw Player
        if (player.health > 0) {
            this.ctx.fillStyle = 'blue';
            const px = (player.mesh.position.x / this.worldSize) * this.width + this.width / 2;
            const py = (player.mesh.position.z / this.worldSize) * this.height + this.height / 2;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

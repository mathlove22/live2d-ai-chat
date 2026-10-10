export class ParticleManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x, y, count = 25, type = 'heart') {
    const originX = x ?? window.innerWidth / 2;
    const originY = y ?? window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      const size = Math.random() * 12 + 10;
      const life = Math.random() * 40 + 50;

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size,
        life,
        maxLife: life,
        type,
        color: type === 'heart' ? (Math.random() > 0.4 ? '#ff5376' : '#ff85a2') : '#ffd166',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.1
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // subtle gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.vRot;
      p.life--;

      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = alpha;

      if (p.type === 'heart') {
        this.drawHeart(0, 0, p.size, p.color);
      } else {
        this.drawSparkle(0, 0, p.size, p.color);
      }

      this.ctx.restore();

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawHeart(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // Top left curve
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    // Bottom left curve
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
    // Bottom right curve
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    // Top right curve
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
  }

  drawSparkle(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

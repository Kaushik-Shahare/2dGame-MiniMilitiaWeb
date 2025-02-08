export default class Bullet {
  constructor(startX, startY, angle) {
    this.damage = 10;
    this.x = startX;
    this.y = startY;
    this.speed = 8; // Bullet speed
    this.velocityX = Math.cos(angle) * this.speed;
    this.velocityY = Math.sin(angle) * this.speed;
    // Initialize trail array for smooth motion effect
    this.trail = [];

    // Load bullet sound
    this.sound = new Audio("/sounds/submachineGun.mp3");
    this.sound.volume = 0.5; // Adjust volume
  }

  playSound() {
    this.sound.currentTime = 0; // Reset sound to start
    // this.sound.play();
  }

  checkCollisionWithPlayer(player) {
    return (
      this.x >= player.x &&
      this.x <= player.x + player.width &&
      this.y >= player.y &&
      this.y <= player.y + player.height
    );
  }

  update(environment, canvasWidth, canvasHeight, dt = 1) {
    // Add current position to trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) {
      this.trail.shift();
    }

    // Use dt multiplier for smooth movement
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Check collision with environment if defined
    if (
      environment &&
      typeof environment.checkGunCollision === "function" &&
      environment.checkGunCollision(this.x, this.y)
    ) {
      return false; // Remove bullet
    }

    // Check canvas bounds only if dimensions are provided
    if (
      typeof canvasWidth === "number" &&
      typeof canvasHeight === "number" &&
      (this.x < 0 ||
        this.x > canvasWidth ||
        this.y < 0 ||
        this.y > canvasHeight)
    ) {
      return false;
    }
    return true;
  }

  render(ctx) {
    // Render trail for smooth animation effect
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const opacity = (i + 1) / this.trail.length;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw bullet on top
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

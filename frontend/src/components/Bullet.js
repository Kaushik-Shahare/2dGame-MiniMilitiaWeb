export default class Bullet {
  constructor(startX, startY, angle) {
    this.damage = 10;
    this.x = startX;
    this.y = startY;
    this.speed = 10; // Bullet speed
    this.velocityX = Math.cos(angle) * this.speed;
    this.velocityY = Math.sin(angle) * this.speed;

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

  update(environment, canvasWidth, canvasHeight) {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Bullet-environment interaction
    if (environment.checkGunCollision(this.x, this.y)) {
      return false; // Remove bullet
    }

    // Bounds check
    if (
      this.x < 0 ||
      this.x > canvasWidth ||
      this.y < 0 ||
      this.y > canvasHeight
    ) {
      return false;
    }
    return true;
  }

  render(ctx) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

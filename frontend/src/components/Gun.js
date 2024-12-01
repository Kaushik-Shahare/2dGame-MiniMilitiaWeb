const gunLength = 30;
const gunWidth = 5;
const bulletSpeed = 10;

export default class Gun {
  constructor(player) {
    this.player = player; // Reference to the player

    this.gunLength = gunLength;
    this.gunWidth = gunWidth;
    this.gunAngle = 0;

    this.bullets = [];
    this.bulletSpeed = bulletSpeed;

    // Gun sound effects
    this.bulletSound = new Audio("/sounds/submachineGun.mp3");
    this.bulletSound.volume = 0.5; // Adjust volume
  }

  handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const dx = this.mouseX - (this.player.x + this.player.width / 2);
    const dy = this.mouseY - (this.player.y + this.player.height / 2);
    this.gunAngle = Math.atan2(dy, dx);
  }

  handleMouseDown() {
    // Shoot a bullet
    const bulletSpeedX = Math.cos(this.gunAngle) * this.bulletSpeed;
    const bulletSpeedY = Math.sin(this.gunAngle) * this.bulletSpeed;

    // Position the bullet at the tip of the gun
    const startX =
      this.player.x +
      this.player.width / 2 +
      Math.cos(this.gunAngle) * this.gunLength;
    const startY =
      this.player.y +
      this.player.height / 2 +
      Math.sin(this.gunAngle) * this.gunLength;

    this.bullets.push({
      x: startX,
      y: startY,
      velocityX: bulletSpeedX,
      velocityY: bulletSpeedY,
    });

    // Play gun sound
    this.bulletSound.currentTime = 0; // Reset sound to start
    this.bulletSound.play();
  }

  updateBullets(environment, canvasWidth, canvasHeight) {
    //  Update bullets
    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;

      // Bullet-environment interaction
      if (environment.checkGunCollision(bullet.x, bullet.y)) {
        return false; // Remove bullet
      }

      // Bounds check
      if (
        bullet.x < 0 ||
        bullet.x > canvasWidth ||
        bullet.y < 0 ||
        bullet.y > canvasHeight
      ) {
        return false;
      }
      return true;
    });
  }

  render(ctx) {
    // Render gun
    ctx.save();
    ctx.translate(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    ctx.rotate(this.gunAngle);
    ctx.fillStyle = "red";
    ctx.fillRect(
      this.gunLength / 2,
      -this.gunWidth / 2,
      this.gunLength,
      this.gunWidth
    );
    ctx.restore();

    // Render bullets
    this.bullets.forEach((bullet) => {
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

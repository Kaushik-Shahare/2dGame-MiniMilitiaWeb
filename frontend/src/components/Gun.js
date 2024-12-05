import Bullet from "./Bullet";

const gunLength = 30;
const gunWidth = 5;

export default class Gun {
  constructor(player) {
    this.player = player; // Reference to the player

    this.gunLength = gunLength;
    this.gunWidth = gunWidth;
    this.gunAngle = 0;

    // Load gun skin image
    this.gunSkin = new Image();
    this.gunSkin.src = "/Ak-47.png";

    this.bullets = [];
  }

  handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const dx = this.mouseX - (this.player.x + this.player.width / 2);
    const dy = this.mouseY - (this.player.y + this.player.height / 2);
    this.gunAngle = Math.atan2(dy, dx);
  }

  handleMouseDown() {
    // Position the bullet at the tip of the gun
    const startX =
      this.player.x +
      this.player.width / 2 +
      Math.cos(this.gunAngle) * this.gunLength;
    const startY =
      this.player.y +
      this.player.height / 2 +
      Math.sin(this.gunAngle) * this.gunLength;

    // Create a new bullet
    const bullet = new Bullet(startX, startY, this.gunAngle);
    bullet.playSound(); // Play bullet sound when fired
    this.bullets.push(bullet);
  }

  updateBullets(environment, canvasWidth, canvasHeight) {
    this.bullets = this.bullets.filter((bullet) =>
      bullet.update(environment, canvasWidth, canvasHeight)
    );
  }

  render(ctx) {
    // Render gun
    ctx.save();
    ctx.translate(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    ctx.rotate(this.gunAngle);

    // Draw the gun skin
    if (this.gunSkin.complete) {
      const imgWidth = this.gunLength + 30; // Adjust dimensions as needed
      const imgHeight = this.gunWidth + 20;
      ctx.drawImage(
        this.gunSkin,
        this.gunLength / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
    } else {
      // Fallback: Render a rectangle if the image isn't loaded
      ctx.fillStyle = "red";
      ctx.fillRect(
        this.gunLength / 2,
        -this.gunWidth / 2,
        this.gunLength,
        this.gunWidth
      );
    }

    ctx.restore();

    // Render bullets
    this.bullets.forEach((bullet) => bullet.render(ctx));
  }
}

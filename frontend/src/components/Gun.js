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
    this.cursorPosition = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    };
  }

  handleMouseMove(event) {
    let movementX = event.movementX || 0;
    let movementY = event.movementY || 0;

    // Update cursor position with limits
    this.cursorPosition.x += movementX;
    this.cursorPosition.y += movementY;

    // Calculate player's center
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const dx = this.cursorPosition.x - playerCenterX;
    const dy = this.cursorPosition.y - playerCenterY;
    const distance = Math.hypot(dx, dy);

    if (distance > 100) {
      const angle = Math.atan2(dy, dx);
      this.cursorPosition.x = playerCenterX + 100 * Math.cos(angle);
      this.cursorPosition.y = playerCenterY + 100 * Math.sin(angle);
    }

    // Update gun angle
    this.gunAngle = Math.atan2(
      this.cursorPosition.y - playerCenterY,
      this.cursorPosition.x - playerCenterX
    );
  }

  handleMouseDown(socket = null, roomId = null) {
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

    // Send shooting information to the server
    if (socket && roomId && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "SHOOT",
          roomId: roomId,
          position: {
            x: startX,
            y: startY,
            angle: this.gunAngle,
          },
        })
      );
    }
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

    if (this.gunAngle < -Math.PI / 2 || this.gunAngle > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    // Draw the gun skin
    if (this.gunSkin.complete) {
      const imgWidth = this.gunLength + 30;
      const imgHeight = this.gunWidth + 20;
      ctx.drawImage(
        this.gunSkin,
        // gun offset
        // this.gunLength / 2,
        0,
        -imgHeight / 2,

        // gun dimentions
        imgWidth - 15,
        imgHeight - 5
      );
    } else {
      // Fallback: Render a rectangle if the image isn't loaded
      ctx.fillStyle = "red";
      ctx.fillRect(
        // gun offset
        // this.gunLength / 2,
        0,
        -this.gunWidth / 2,

        // gun dimentions
        this.gunLength,
        this.gunWidth
      );
    }

    ctx.restore();

    // Render custom cursor as two dots on the same imaginary line
    const dotDistance = 20; // Distance between the two dots
    const angle = Math.atan2(
      this.cursorPosition.y - (this.player.y + this.player.height / 2),
      this.cursorPosition.x - (this.player.x + this.player.width / 2)
    );

    const dot1X = this.cursorPosition.x - Math.cos(angle) * dotDistance;
    const dot1Y = this.cursorPosition.y - Math.sin(angle) * dotDistance;
    const dot2X = this.cursorPosition.x + Math.cos(angle) * dotDistance;
    const dot2Y = this.cursorPosition.y + Math.sin(angle) * dotDistance;
    const dot3X = this.cursorPosition.x;
    const dot3Y = this.cursorPosition.y;

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(dot1X, dot1Y, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(dot2X, dot2Y, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(dot3X, dot3Y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Render bullets
    this.bullets.forEach((bullet) => bullet.render(ctx));
  }
}

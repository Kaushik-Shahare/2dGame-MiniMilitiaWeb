import Bullet from "./Bullet";

export default class Gun {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.ammo = 25;
    this.maxAmmo = 25;
    this.reloadTime = 4000;
    this.isReloading = false;
    
    // Preload gun image if needed (or use a texture key already loaded)
    this.gunLength = 30;
    this.gunWidth = 5;
    this.gunAngle = 0;

    // Load gun skin image
    this.gunSkin = new Image();
    this.gunSkin.src = "/Ak-47.png";

    this.bullets = [];
    this.cursorPosition = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    };

    this.reloadSVG = new Image();
    this.reloadSVG.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="white" d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160 352 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l111.5 0c0 0 0 0 0 0l.4 0c17.7 0 32-14.3 32-32l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 35.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1L16 432c0 17.7 14.3 32 32 32s32-14.3 32-32l0-35.1 17.6 17.5c0 0 0 0 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.8c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352l34.4 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L48.4 288c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z"/></svg>';
  }
  
  // Update aiming based on pointer position
  handleMouseMove(pointer) {
    const playerCenterX = this.player.x + this.player.baseWidth/2;
    const playerCenterY = this.player.y - this.player.baseHeight; // since origin bottom-center
    const dx = pointer.worldX - playerCenterX;
    const dy = pointer.worldY - playerCenterY;
    this.gunAngle = Math.atan2(dy, dx);
  }
  
  // Fire bullet on left click
  handleMouseDown() {
    if (this.ammo <= 0) {
      this.reload();
      return;
    }
    const offset = 20;
    const startX = this.player.x + this.player.baseWidth/2 + offset * Math.cos(this.gunAngle);
    const startY = this.player.y - this.player.baseHeight + offset * Math.sin(this.gunAngle);
    new Bullet(this.scene, startX, startY, this.gunAngle);
    this.ammo--;
  }
  
  reload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.scene.time.delayedCall(this.reloadTime, () => {
      this.ammo = this.maxAmmo;
      this.isReloading = false;
    });
  }
  
  update() {
    // Optionally update gun position/rotation based on player and pointer.
  }

  handleKeyDown(event) {
    if (
      event.key.toLowerCase() === "r" &&
      this.ammo < this.maxAmmo &&
      !this.isReloading
    ) {
      this.reload();
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

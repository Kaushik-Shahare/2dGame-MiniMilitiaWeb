const fixedWidth = 1280; // Example width
const fixedHeight = 720;

class Environment {
  constructor() {
    this.groundLevel = fixedHeight - 200;

    // Initialize background and ground images
    this.backgroundImage = new Image();
    this.backgroundImage.src = "/bg2.jpeg"; // Set your background image path here

    this.groundImage = new Image();
    this.groundImage.src = "/surface.png"; // Set your ground image path here

    this.obstacles = [
      { x: 400, y: fixedHeight - 250, width: 100, height: 50 },
      { x: 300, y: fixedHeight - 450, width: 100, height: 50 },
      { x: 600, y: fixedHeight - 550, width: 100, height: 50 },
    ];
  }

  getGroundLevel(x, width) {
    return this.groundLevel;
  }

  checkGunCollision(x, y) {
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x >= obs.x &&
        x <= obs.x + obs.width &&
        y >= obs.y &&
        y <= obs.y + obs.height
      ) {
        return true; // Collision detected
      }
    }

    // Check collision with the ground
    if (y >= this.groundLevel) {
      return true;
    }

    return false; // No collision
  }

  checkCollisionOnX(x, y, width, height, velocityX) {
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x + velocityX < obs.x + obs.width &&
        x + width + velocityX > obs.x &&
        y < obs.y + obs.height &&
        y + height > obs.y
      ) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  checkCollisionOnY(x, y, width, height, velocityY) {
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x < obs.x + obs.width &&
        x + width > obs.x &&
        y + velocityY < obs.y + obs.height &&
        y + height + velocityY > obs.y
      ) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  render(ctx, scaleX, scaleY) {
    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Draw background image (once, without repeating)
    if (this.backgroundImage.complete) {
      ctx.drawImage(
        this.backgroundImage,
        0, // X position of the image (start at 0)
        0, // Y position of the image (start at the top)
        fixedWidth, // Stretch the image across the full width
        fixedHeight // Stretch the image to cover the full height
      );
    } else {
      // Fallback color if background image is not loaded
      ctx.fillStyle = "skyblue";
      ctx.fillRect(0, 0, fixedWidth, fixedHeight);
    }

    // Draw ground image (repeat across the canvas width)
    if (this.groundImage.complete) {
      let imageWidth = this.groundImage.width;
      let canvasWidth = fixedWidth;

      // Draw the ground image repeatedly across the screen
      for (let x = 0; x < canvasWidth; x += imageWidth) {
        ctx.drawImage(
          this.groundImage,
          x,
          this.groundLevel,
          imageWidth,
          fixedHeight - this.groundLevel // Stretch the ground to fit height
        );
      }
    } else {
      // Fallback color for ground if image is not loaded
      ctx.fillRect(
        0,
        this.groundLevel,
        fixedWidth,
        fixedHeight - this.groundLevel
      );
    }

    // Draw obstacles
    ctx.fillStyle = "gray";
    this.obstacles.forEach((obs) => {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    ctx.restore();
  }
}

export default Environment;

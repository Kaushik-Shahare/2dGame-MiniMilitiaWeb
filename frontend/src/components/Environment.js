class Environment {
  constructor() {
    this.groundLevel = window.innerHeight - 200;

    // Initialize background and ground images
    this.backgroundImage = new Image();
    this.backgroundImage.src = "/bg2.jpeg"; // Set your background image path here

    this.groundImage = new Image();
    this.groundImage.src = "/surface.png"; // Set your ground image path here

    this.obstacles = [
      { x: 300, y: window.innerHeight - 250, width: 100, height: 50 },
      { x: 300, y: window.innerHeight - 450, width: 100, height: 50 },
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
        // Collision detected with player id ${player.id}

        return true; // Collision detected
      }
    }

    // Check collision with the ground
    if (y >= this.groundLevel) {
      return true;
    }

    return false; // No collision
  }

  checkCollision(x, y, width, height) {
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x < obs.x + obs.width &&
        x + width > obs.x &&
        y < obs.y + obs.height &&
        y + height > obs.y
      ) {
        return true; // Collision detected
      }
    }

    // Check collision with the ground
    if (y + height >= this.groundLevel) {
      return true; // Ground collision
    }

    return false; // No collision
  }

  render(ctx) {
    // Draw background image (once, without repeating)
    if (this.backgroundImage.complete) {
      ctx.drawImage(
        this.backgroundImage,
        0, // X position of the image (start at 0)
        0, // Y position of the image (start at the top)
        window.innerWidth, // Stretch the image across the full width
        window.innerHeight // Stretch the image to cover the full height
      );
    } else {
      // Fallback color if background image is not loaded
      ctx.fillStyle = "skyblue";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    // Draw ground image (repeat across the canvas width)
    if (this.groundImage.complete) {
      let imageWidth = this.groundImage.width;
      let canvasWidth = window.innerWidth;

      // Draw the ground image repeatedly across the screen
      for (let x = 0; x < canvasWidth; x += imageWidth) {
        ctx.drawImage(
          this.groundImage,
          x,
          this.groundLevel,
          imageWidth,
          window.innerHeight - this.groundLevel // Stretch the ground to fit height
        );
      }
    } else {
      // Fallback color for ground if image is not loaded
      ctx.fillRect(
        0,
        this.groundLevel,
        window.innerWidth,
        window.innerHeight - this.groundLevel
      );
    }

    // Draw obstacles
    ctx.fillStyle = "red";
    this.obstacles.forEach((obs) => {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });
  }
}

export default Environment;

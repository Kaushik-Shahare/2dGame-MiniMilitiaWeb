export default class PlayerSkin {
  constructor(isMainPlayer) {
    this.spriteSheet = new Image();
    this.spriteSheet.src = isMainPlayer
      ? "/sprite/character_sprite1_right.png"
      : "/sprite/character_sprite1_right.png";

    this.imagesLoaded = false;
    this.spriteSheet.onload = () => {
      this.imagesLoaded = true;
    };
    this.spriteSheet.onerror = () => {
      console.error("Failed to load player sprite sheet");
    };

    this.currentFrame = 0;
    this.frameCount = 4; // Number of frames in the sprite sheet
    this.frameInterval = 100; // Time interval between frames in milliseconds
    this.lastFrameTime = 0;
  }

  updateFrame(velocityX) {
    if (velocityX !== 0) {
      const now = Date.now();
      if (now - this.lastFrameTime > this.frameInterval) {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        this.lastFrameTime = now;
      }
    } else {
      this.currentFrame = 0; // Reset to the first frame when not moving
    }
  }

  render(ctx, width, height, isUsingJetpack, velocityX) {
    if (this.imagesLoaded) {
      const spriteWidth = 380 / 4; // Width of each sprite in the sheet
      const spriteHeight = 335 / 2 - 16; // Height of each sprite in the sheet

      // Determine the y-offset based on whether the jetpack is on
      const yOffset = isUsingJetpack ? spriteHeight : 0;

      // Update the current frame based on velocityX
      this.updateFrame(velocityX);

      // Calculate the x-offset for the current frame
      const xOffset = this.currentFrame * spriteWidth;

      ctx.drawImage(
        this.spriteSheet,
        xOffset,
        yOffset,
        spriteWidth,
        spriteHeight, // Current frame
        -width / 2,
        -height / 2,
        width,
        height
      );
    } else {
      // Fallback: Render a rectangle if the sprite sheet isn't loaded
      ctx.fillStyle = "blue";
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }
  }
}

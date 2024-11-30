export default class Environment {
  constructor() {
    this.groundLevel = window.innerHeight - 200;

    // Initialize background and ground images
    this.backgroundImage = new Image();
    this.backgroundImage.src = "/bg2.jpeg"; // Set your background image path here

    this.groundImage = new Image();
    this.groundImage.src = "/surface.png"; // Set your ground image path here

    // Optional: Ensure the images are loaded before rendering
    this.backgroundImage.onload = () => {
      console.log("Background image loaded successfully");
    };

    this.groundImage.onload = () => {
      console.log("Ground image loaded successfully");
    };
  }

  getGroundLevel(x, width) {
    return this.groundLevel;
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
      // ctx.fillStyle = "brown";
      ctx.fillRect(
        0,
        this.groundLevel,
        window.innerWidth,
        window.innerHeight - this.groundLevel
      );
    }
  }
}

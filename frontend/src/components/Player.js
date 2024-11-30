export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 1;
    this.jumpStrength = -15;
    this.speed = 5;
    this.onGround = false;

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  handleKeyDown(e) {
    if (e.key === "ArrowRight") this.velocityX = this.speed;
    if (e.key === "ArrowLeft") this.velocityX = -this.speed;
    if (e.key === "ArrowUp" && this.onGround)
      this.velocityY = this.jumpStrength;
  }

  handleKeyUp(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") this.velocityX = 0;
  }

  update(environment) {
    this.y += this.velocityY;
    this.x += this.velocityX;

    this.velocityY += this.gravity;

    // Prevent player from going out of bounds vertically (Top and Bottom)
    const canvasHeight = window.innerHeight;
    const canvasWidth = window.innerWidth;

    // Prevent player from going below the ground level
    const groundLevel = environment.getGroundLevel(this.x, this.width);
    if (this.y + this.height > groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Prevent player from moving off the screen horizontally (left and right)
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;

    // Prevent player from going above the top
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight)
      this.y = canvasHeight - this.height;
  }

  render(ctx) {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}

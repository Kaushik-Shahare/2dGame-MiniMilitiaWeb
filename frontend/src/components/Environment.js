export default class Environment {
  constructor() {
    this.groundLevel = window.innerHeight - 100; // Flat ground for now
  }

  getGroundLevel(x, width) {
    return this.groundLevel;
  }

  render(ctx) {
    ctx.fillStyle = "brown";
    ctx.fillRect(
      0,
      this.groundLevel,
      window.innerWidth,
      window.innerHeight - this.groundLevel
    );
  }
}

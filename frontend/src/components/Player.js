const height = 70;
const jetpack_fuel_max = 100;
const jetpack_force = -0.3; // Upward force from the jetpack
const jetpack_fuel_depletion = 1; // Fuel depletion rate
const jetpack_fuel_regen = 0.5; // Fuel regeneration rate
const jetpack_regen_delay = 2; // Delay before fuel regeneration starts (in ms)

export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = height;
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 1;
    this.jumpStrength = -15;
    this.speed = 5;
    this.onGround = false;

    // Crouch state and height adjustment
    this.isCrouching = false;

    // Jetpack properties
    this.jetpackFuel = jetpack_fuel_max; // Current jetpack fuel
    this.isUsingJetpack = false; // Whether the jetpack is currently in use
    this.jetpackRegenTimeout = null; // Timeout for fuel regeneration

    // Gun properties
    this.gunLength = 30;
    this.gunWidth = 5;
    this.gunAngle = 0;

    // Track mouse position
    this.mouseX = 0;
    this.mouseY = 0;

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
  }

  handleKeyDown(e) {
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      this.velocityX = this.speed;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      this.velocityX = -this.speed;
    }
    if (
      e.key === "ArrowUp" ||
      e.key === "w" ||
      e.key === "W" ||
      e.key === " "
    ) {
      if (this.onGround) {
        // Perform normal jump
        this.velocityY = this.jumpStrength;
      } else if (this.jetpackFuel > 0) {
        // Activate jetpack if fuel is available
        this.isUsingJetpack = true;
      }
    }

    // Toggle crouch when Ctrl key is pressed
    if (
      e.key === "Control" ||
      e.key === "ControlLeft" ||
      e.key === "ControlRight"
    ) {
      this.isCrouching = true;
      this.height = height * (3 / 4);
    }
  }

  handleKeyUp(e) {
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "d" ||
      e.key === "a" ||
      e.key === "D" ||
      e.key === "A"
    ) {
      this.velocityX = 0;
    }

    if (
      e.key === "ArrowUp" ||
      e.key === "w" ||
      e.key === "W" ||
      e.key === " "
    ) {
      // Stop using the jetpack
      this.isUsingJetpack = false;
    }

    if (
      e.key === "Control" ||
      e.key === "ControlLeft" ||
      e.key === "ControlRight"
    ) {
      this.isCrouching = false;
      this.height = height;
    }
  }

  handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const dx = this.mouseX - (this.x + this.width / 2);
    const dy = this.mouseY - (this.y + this.height / 2);
    this.gunAngle = Math.atan2(dy, dx);
  }

  update(environment) {
    this.y += this.velocityY;
    this.x += this.velocityX;

    // Apply gravity if the jetpack is not in use
    if (!this.isUsingJetpack) {
      this.velocityY += this.gravity;
    }

    // Apply jetpack force and deplete fuel
    if (this.isUsingJetpack && this.jetpackFuel > 0) {
      this.velocityY += jetpack_force;
      this.jetpackFuel -= jetpack_fuel_depletion;
      if (this.jetpackFuel <= 0) {
        this.jetpackFuel = 0;
        this.isUsingJetpack = false;
      }
    }

    const canvasHeight = window.innerHeight;
    const canvasWidth = window.innerWidth;

    // Ground level logic
    const groundLevel = environment.getGroundLevel(this.x, this.width);
    if (this.y + this.height > groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      if (!this.onGround) {
        this.onGround = true;

        // Start jetpack fuel regeneration after a delay
        clearTimeout(this.jetpackRegenTimeout);
        this.jetpackRegenTimeout = setTimeout(() => {
          this.regenerateFuel();
        }, jetpack_regen_delay);
      }
    } else {
      this.onGround = false;
    }

    // Prevent player from moving out of bounds
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight)
      this.y = canvasHeight - this.height;
  }

  regenerateFuel() {
    const regenInterval = setInterval(() => {
      if (this.jetpackFuel >= jetpack_fuel_max || !this.onGround) {
        clearInterval(regenInterval);
      } else {
        this.jetpackFuel += jetpack_fuel_regen;
        if (this.jetpackFuel > jetpack_fuel_max) {
          this.jetpackFuel = jetpack_fuel_max;
        }
      }
    }, 100);
  }

  render(ctx) {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.gunAngle);
    ctx.fillStyle = "red";
    ctx.fillRect(
      this.gunLength / 2,
      -this.gunWidth / 2,
      this.gunLength,
      this.gunWidth
    );
    ctx.restore();

    // Draw jetpack fuel bar
    ctx.fillStyle = "green";
    ctx.fillRect(
      this.x,
      this.y - 10,
      (this.jetpackFuel / jetpack_fuel_max) * this.width,
      5
    );
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}

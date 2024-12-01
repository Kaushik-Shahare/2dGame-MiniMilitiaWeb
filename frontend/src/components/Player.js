const width = 50;
const height = 70;
const gravity = 1;
const jumpStrength = -15;
const speed = 5;

const jetpack_fuel_max = 100;
const jetpack_force = -0.4; // Upward force from the jetpack
const jetpack_force_max = -10; // Maximum upward force from the jetpack
const jetpack_fuel_depletion = 0.4; // Fuel depletion rate
const jetpack_fuel_regen = 0.06; // Fuel regeneration rate
const jetpack_regen_delay = 2; // Delay before fuel regeneration starts (in ms);

export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = gravity;
    this.jumpStrength = jumpStrength;
    this.speed = speed;
    this.onGround = false;

    // Crouch state and height adjustment
    this.isCrouching = false;

    // Jetpack properties
    this.jetpackFuel = jetpack_fuel_max;
    this.isUsingJetpack = false;
    this.jetpackRegenTimeout = null;

    // Jetpack sound
    this.jetpackSound = new Audio("/sounds/jetpack.mp3");
    this.jetpackSound.loop = true; // To continuously play the sound

    // Gun properties
    this.gunLength = 30;
    this.gunWidth = 5;
    this.gunAngle = 0;

    // Track mouse position
    this.mouseX = 0;
    this.mouseY = 0;

    // Bullet properties
    this.bullets = [];
    this.bulletSpeed = 10;

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    window.addEventListener("mousedown", this.handleMouseDown.bind(this));
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
        this.velocityY = this.jumpStrength;
      } else if (this.jetpackFuel > 0) {
        this.isUsingJetpack = true;
        this.playJetpackSound();
      }
    }
    if (
      e.key === "Control" ||
      e.key === "ControlLeft" ||
      e.key === "ControlRight"
    ) {
      this.isCrouching = true;
      this.speed = speed / 3;
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
      this.isUsingJetpack = false;
      this.stopJetpackSound();
    }
    if (
      e.key === "Control" ||
      e.key === "ControlLeft" ||
      e.key === "ControlRight"
    ) {
      this.isCrouching = false;
      this.speed = speed;
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

  handleMouseDown() {
    // Shoot a bullet
    const bulletSpeedX = Math.cos(this.gunAngle) * this.bulletSpeed;
    const bulletSpeedY = Math.sin(this.gunAngle) * this.bulletSpeed;
    this.bullets.push({
      x: this.x + this.width / 2 + Math.cos(this.gunAngle) * this.gunLength,
      y: this.y + this.height / 2 + Math.sin(this.gunAngle) * this.gunLength,
      velocityX: bulletSpeedX,
      velocityY: bulletSpeedY,
    });
    // Add sound effect for firing the bullet
    this.bulletSound = new Audio("/sounds/submachineGun.mp3");
    this.bulletSound.volume = 0.5; // Adjust the volume
    this.bulletSound.play();
  }

  playJetpackSound() {
    if (!this.jetpackSound.paused) return; // Prevent restarting if already playing
    this.jetpackSound.play();
  }

  stopJetpackSound() {
    if (this.jetpackSound.paused) return;
    this.jetpackSound.pause();
    this.jetpackSound.currentTime = 0; // Reset to the beginning
  }

  update(environment) {
    this.y += this.velocityY;
    this.x += this.velocityX;

    // Apply gravity
    if (!this.isUsingJetpack) {
      this.velocityY += this.gravity;
    }

    // Jetpack force and fuel depletion
    if (this.isUsingJetpack && this.jetpackFuel > 0) {
      if (this.velocityY > jetpack_force_max) {
        this.velocityY += jetpack_force;
      }
      this.jetpackFuel -= jetpack_fuel_depletion;
      if (this.jetpackFuel <= 0) {
        this.jetpackFuel = 0;
        this.isUsingJetpack = false;
        this.stopJetpackSound();
      }
    }

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const groundLevel = environment.getGroundLevel(this.x, this.width);

    // Handle ground level logic
    if (this.y + this.height > groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      if (!this.onGround) {
        this.onGround = true;
        clearTimeout(this.jetpackRegenTimeout);
        this.jetpackRegenTimeout = setTimeout(
          () => this.regenerateFuel(),
          jetpack_regen_delay
        );
      }
    } else {
      this.onGround = false;
    }

    // Player Bounds
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight)
      this.y = canvasHeight - this.height;

    // Update bullets
    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;

      // Bullet-environment interaction
      if (environment.checkCollision(bullet.x, bullet.y)) {
        return false; // Remove bullet
      }

      // Bounds check
      if (
        bullet.x < 0 ||
        bullet.x > canvasWidth ||
        bullet.y < 0 ||
        bullet.y > canvasHeight
      ) {
        return false;
      }
      return true;
    });
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
      // image,
      this.gunLength / 2,
      -this.gunWidth / 2,
      this.gunLength,
      this.gunWidth
    );
    ctx.restore();

    // Draw bullets
    this.bullets.forEach((bullet) => {
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw jetpack fuel bar
    ctx.fillStyle = "blue";
    ctx.fillRect(
      this.x,
      this.y + this.height + 10,
      (this.jetpackFuel / jetpack_fuel_max) * this.width,
      5
    );
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}

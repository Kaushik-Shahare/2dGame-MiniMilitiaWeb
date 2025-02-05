import Gun from "./Gun";
import PlayerSkin from "./PlayerSkin";

const fixedWidth = 1280; // Example width
const fixedHeight = 720;

const health = 100;
const width = 50;
const height = 70;
const gravity = 0.8;
const jumpStrength = -10;
const speed = 5;

const jetpack_fuel_max = 100;
const jetpack_force = -0.4; // Upward force from the jetpack
const jetpack_force_max = -4.5; // Maximum upward force from the jetpack
const jetpack_fuel_depletion = 0.4; // Fuel depletion rate
const jetpack_fuel_regen = 0.5; // Fuel regeneration rate
const jetpack_regen_delay = 8; // Delay before fuel regeneration starts (in ms);

export default class Player {
  constructor(x, y, isMainPlayer = true) {
    // Assign a unique id to each player instance
    this.id = Math.random().toString(36).substring(2, 10);

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
    this.color = "blue";

    // Crouch state and height adjustment
    this.isCrouching = false;

    // Jetpack properties
    this.jetpackFuel = jetpack_fuel_max;
    this.isUsingJetpack = false;
    this.jetpackRegenTimeout = null;

    // Jetpack sound
    this.jetpackSound = new Audio("/sounds/jetpack.mp3");
    this.jetpackSound.loop = true; // To continuously play the sound

    // Gun
    this.gun = new Gun(this);

    this.health = health;
    this.isDead = false; // Initialize dead flag

    if (!isMainPlayer) {
      this.color = "red";
    }

    if (isMainPlayer === true) {
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
      window.addEventListener("keyup", this.handleKeyUp.bind(this));
      window.addEventListener(
        "mousemove",
        this.gun.handleMouseMove.bind(this.gun)
      );
      window.addEventListener("mousedown", (e) => this.gun.handleMouseDown(e));
    }

    // Initialize PlayerSkin
    this.playerSkin = new PlayerSkin(isMainPlayer);
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
    }
  }

  playJetpackSound() {
    // Play jetpack sound if fuel is available and sound is not already playing
    if (this.jetpackSound.paused && this.jetpackFuel > 1) {
      // this.jetpackSound.play();
    } else {
      // Restart sound if it's already playing
      this.jetpackSound.currentTime = 0;
    }
  }

  stopJetpackSound() {
    if (!this.jetpackSound.paused) {
      // this.jetpackSound.pause();
      this.jetpackSound.currentTime = 0;
    }
  }

  update(environment) {
    if (this.isDead) return; // Do not update if the player is dead

    this.y += this.velocityY;
    this.x += this.velocityX;

    // Adjust player height when crouching
    if (this.isCrouching) {
      this.speed = speed / 3;
      this.height = height * (3 / 4);
    } else {
      this.speed = speed;
      this.height = height;
    }

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

    const canvasWidth = fixedWidth;
    const canvasHeight = fixedHeight;
    const groundLevel = environment.getGroundLevel(this.x, this.width);

    // Handle ground level logic
    if (this.y + this.height > groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      if (!this.onGround) {
        this.onGround = true;
      }
      // NEW: Instead of scheduling regeneration via setTimeout/interval,
      // immediately regenerate fuel each frame when on the ground.
      if (!this.isUsingJetpack && this.jetpackFuel < jetpack_fuel_max) {
        this.jetpackFuel += jetpack_fuel_regen; // per frame increase
        if (this.jetpackFuel > jetpack_fuel_max) {
          this.jetpackFuel = jetpack_fuel_max;
        }
      }
    } else {
      this.onGround = false;
    }

    // Check for collisions on the x and y axes
    if (
      environment.checkCollisionOnX(
        this.x,
        this.y,
        this.width,
        this.height,
        this.velocityX
      )
    ) {
      this.x -= this.velocityX;
      this.velocityX = 0;
    }

    if (
      environment.checkCollisionOnY(
        this.x,
        this.y,
        this.width,
        this.height,
        this.velocityY
      )
    ) {
      this.y -= this.velocityY;
      this.velocityY = 0;
    }

    // Ensure health does not go below 0
    if (this.health < 0) {
      this.health = 0;
    }

    // Player Bounds
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight)
      this.y = canvasHeight - this.height;

    this.gun.updateBullets(environment, canvasWidth, canvasHeight);
  }

  render(ctx) {
    if (this.isDead) return; // Do not render if the player is dead

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // Rotate the player if aiming left
    if (this.gun.gunAngle < -Math.PI / 2 || this.gun.gunAngle > Math.PI / 2) {
      ctx.scale(-1, 1);
    }

    // Render the player skin
    this.playerSkin.render(
      ctx,
      this.width,
      this.height,
      this.isUsingJetpack,
      this.velocityX
    );

    ctx.restore();

    this.gun.render(ctx);

    // New: Render player id below the character and health bar above
    ctx.save();
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    // Draw the player id below the sprite
    ctx.fillText(this.id, this.x + this.width / 2, this.y + this.height + 15);
    // Draw health bar above the sprite
    const healthBarWidth = this.width;
    const healthBarHeight = 5;
    // Draw background (red)
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 10, healthBarWidth, healthBarHeight);
    // Draw current health (green)
    ctx.fillStyle = "green";
    ctx.fillRect(
      this.x,
      this.y - 10,
      (this.health / 100) * healthBarWidth,
      healthBarHeight
    );
    ctx.restore();
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  getPlayerData() {
    return {
      x: this.x,
      y: this.y,
      isCrouching: this.isCrouching,
      gunAngle: this.gun.gunAngle,
    };
  }

  updatePosition(x, y, isCrouching, gunAngle) {
    this.x = x;
    this.y = y;
    this.isCrouching = isCrouching;

    // Adjust player height when crouching
    if (isCrouching) {
      this.height = height * (3 / 4);
    } else {
      this.height = height;
    }

    this.gun.gunAngle = gunAngle;
  }

  respawn() {
    this.isDead = false;
    this.health = health; // health constant defined above (100)
    // Reset to spawn coordinates (ensure these match your level design)
    this.x = 100;
    this.y = 500;
    this.velocityX = 0;
    this.velocityY = 0;
  }
}

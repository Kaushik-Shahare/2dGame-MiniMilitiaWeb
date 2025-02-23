import Phaser from "phaser";
import Gun from "./Gun";
import PlayerSkin from "./PlayerSkin";

// Update frame dimensions remain unchanged.
const fixedWidth = 1280;
const fixedHeight = 720;
const health = 100;
const baseWidth = 150;
const baseHeight = 300;
const gravity = 0.8;
const jumpStrength = -300;  // Updated strength for a noticeable jump
const speed = 5;
const jetpack_fuel_max = 100;
const jetpack_force = -0.4;
const jetpack_force_max = -4.5;
const jetpack_fuel_depletion = 0.4;
const jetpack_fuel_regen = 0.5;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, isMainPlayer = true) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 1);

    this.id = Math.random().toString(36).substring(2, 10);
    this.health = health;
    this.speed = 200;
    this.isMainPlayer = isMainPlayer;
    
    this.gun = new Gun(scene, this);
    PlayerSkin.setupAnimations(scene, isMainPlayer);
    this.play("idle");

    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.onGround = false;
    this.isCrouching = false;
    this.jetpackFuel = jetpack_fuel_max;
    this.isUsingJetpack = false;
    this.jetpackSound = new Audio("/sounds/jetpack.mp3");
    this.jetpackSound.loop = true;
    this.isDead = false;
  }
  
  update(cursors, environment) {
    const keys = this.scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    let vx = 0;
    if (cursors.left.isDown || keys.A.isDown) {
      vx = -this.speed;
    } else if (cursors.right.isDown || keys.D.isDown) {
      vx = this.speed;
    }
    this.setVelocityX(vx);

    // Jump if onGround (collider now sets onGround).
    if ((keys.W.isDown || keys.SPACE.isDown) && this.onGround) {
      this.setVelocityY(this.jumpStrength);
    }

    // Update aiming using active pointer.
    const pointer = this.scene.input.activePointer;
    this.gun.handleMouseMove(pointer);

    if (this.isUsingJetpack) {
      this.play("jetpack", true);
    } else {
      this.play(vx !== 0 ? "walk" : "idle", true);
    }
    this.gun.update();

    // Remove manual ground collision checks since physics handles it.

    // Constrain within canvas bounds.
    if (this.x < 0) this.setX(0);
    if (this.x + this.baseWidth > fixedWidth) this.setX(fixedWidth - this.baseWidth);
    if (this.y < 0) this.setY(0);
    if (this.y + this.baseHeight > fixedHeight) this.setY(fixedHeight - this.baseHeight);

    this.gun.updateBullets && this.gun.updateBullets(environment, fixedWidth, fixedHeight);
  }
  
  respawn() {
    this.health = health;
    this.setPosition(100, 500);
    this.setVelocity(0, 0);
    this.isDead = false;
  }

  // Optional: manual keyboard event handlers (if still needed)
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
      this.baseHeight = baseHeight * (3 / 4);
    } else {
      this.baseHeight = baseHeight;
    }

    this.gun.gunAngle = gunAngle;
  }
}

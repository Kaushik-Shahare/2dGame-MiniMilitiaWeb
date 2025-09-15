/**
 * Server-side Player class with authoritative physics and state management
 */
class ServerPlayer {
  constructor(x, y, clientId, name = "Player") {
    this.id = clientId;
    this.name = name;
    
    // Position and dimensions
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 70;
    
    // Physics
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 0.8;
    this.jumpStrength = -10;
    this.speed = 5;
    this.onGround = false;
    
    // State
    this.health = 100;
    this.isDead = false;
    this.isCrouching = false;
    
    // Jetpack
    this.jetpackFuel = 100;
    this.isUsingJetpack = false;
    this.jetpackRegenTimeout = null;
    
    // Gun state
    this.gunAngle = 0;
    this.ammo = 25;
    this.isReloading = false;
    this.lastShot = 0;
    
    // Input state
    this.keys = {
      left: false,
      right: false,
      up: false,
      crouch: false
    };
    
    // Network optimization
    this.lastStateUpdate = 0;
    this.stateChanged = false;
  }

  // Update player input state
  updateInput(keys, gunAngle) {
    this.keys = { ...keys };
    this.gunAngle = gunAngle;
    this.stateChanged = true;
  }

  // Server-authoritative update
  update(environment, deltaTime = 16.67) { // ~60 FPS
    if (this.isDead) return;

    const dt = deltaTime / 16.67; // Normalize to 60 FPS baseline

    // Apply input to velocities
    this.velocityX = 0;
    if (this.keys.left) this.velocityX = -this.speed;
    if (this.keys.right) this.velocityX = this.speed;

    // Jetpack logic
    if (this.keys.up && this.jetpackFuel > 0) {
      this.isUsingJetpack = true;
      this.velocityY = Math.max(this.velocityY - 0.4, -4.5);
      this.jetpackFuel -= 0.4;
      
      if (this.jetpackRegenTimeout) {
        clearTimeout(this.jetpackRegenTimeout);
      }
      this.jetpackRegenTimeout = setTimeout(() => {
        const regenInterval = setInterval(() => {
          if (this.jetpackFuel < 100 && !this.isUsingJetpack) {
            this.jetpackFuel = Math.min(100, this.jetpackFuel + 0.5);
          } else {
            clearInterval(regenInterval);
          }
        }, 16);
      }, 8);
    } else {
      this.isUsingJetpack = false;
    }

    // Apply gravity
    if (!this.isUsingJetpack) {
      this.velocityY += this.gravity * dt;
    }

    // Crouching
    this.isCrouching = this.keys.crouch;
    if (this.isCrouching) {
      this.height = 50;
    } else {
      this.height = 70;
    }

    // Update position with collision detection
    this.updatePosition(environment, dt);

    // Handle ground collision and physics
    this.handleGroundPhysics(environment);

    // Ensure health bounds
    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;
      this.stateChanged = true;
    }

    // Mark state as changed if position changed
    if (this.velocityX !== 0 || this.velocityY !== 0) {
      this.stateChanged = true;
    }
  }

  updatePosition(environment, dt) {
    const newX = this.x + this.velocityX * dt;
    const newY = this.y + this.velocityY * dt;

    // Check X collision
    if (!environment.checkCollisionOnX(newX, this.y, this.width, this.height, this.velocityX * dt)) {
      this.x = newX;
      
      // Bounds checking
      if (this.x < 0) this.x = 0;
      if (this.x + this.width > 1280) this.x = 1280 - this.width;
    } else {
      this.velocityX = 0;
    }

    // Check Y collision
    if (!environment.checkCollisionOnY(this.x, newY, this.width, this.height, this.velocityY * dt)) {
      this.y = newY;
      
      // Bounds checking
      if (this.y < 0) this.y = 0;
      if (this.y + this.height > 720) this.y = 720 - this.height;
    } else {
      if (this.velocityY > 0) {
        this.onGround = true;
      }
      this.velocityY = 0;
    }
  }

  handleGroundPhysics(environment) {
    const groundLevel = environment.getGroundLevel(this.x, this.width);
    
    if (this.y + this.height >= groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  // Handle jump input
  jump() {
    if (this.onGround && !this.isDead) {
      this.velocityY = this.jumpStrength;
      this.onGround = false;
      this.stateChanged = true;
    }
  }

  // Handle shooting
  shoot() {
    if (this.isDead || this.isReloading || this.ammo <= 0) {
      return null;
    }

    const now = Date.now();
    if (now - this.lastShot < 100) { // Rate limiting: 600 RPM max
      return null;
    }

    this.ammo--;
    this.lastShot = now;
    this.stateChanged = true;

    // Auto-reload when empty
    if (this.ammo === 0) {
      this.reload();
    }

    // Calculate bullet spawn position at gun tip
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    
    // Add spread for realism
    const spread = (Math.random() - 0.5) * 0.1;
    const bulletAngle = this.gunAngle + spread;
    
    const gunLength = 30;
    const bulletX = playerCenterX + Math.cos(bulletAngle) * gunLength;
    const bulletY = playerCenterY + Math.sin(bulletAngle) * gunLength;

    return {
      x: bulletX,
      y: bulletY,
      angle: bulletAngle,
      ownerId: this.id,
      damage: 10
    };
  }

  reload() {
    if (this.isReloading || this.ammo === 25) return;

    this.isReloading = true;
    this.stateChanged = true;
    
    setTimeout(() => {
      this.ammo = 25;
      this.isReloading = false;
      this.stateChanged = true;
    }, 4000);
  }

  // Take damage
  takeDamage(damage) {
    if (this.isDead) return false;
    
    this.health = Math.max(0, this.health - damage);
    this.stateChanged = true;
    
    if (this.health === 0) {
      this.isDead = true;
    }
    
    return true;
  }

  // Respawn player
  respawn() {
    this.isDead = false;
    this.health = 100;
    this.x = 100 + Math.random() * 1080; // Random spawn position
    this.y = 100;
    this.velocityX = 0;
    this.velocityY = 0;
    this.ammo = 25;
    this.isReloading = false;
    this.jetpackFuel = 100;
    this.stateChanged = true;
  }

  // Get state for network synchronization
  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      health: this.health,
      isDead: this.isDead,
      isCrouching: this.isCrouching,
      isUsingJetpack: this.isUsingJetpack,
      gunAngle: this.gunAngle,
      ammo: this.ammo,
      isReloading: this.isReloading,
      jetpackFuel: this.jetpackFuel,
      onGround: this.onGround
    };
  }

  // Check if state needs to be sent to clients
  shouldSendUpdate() {
    if (!this.stateChanged) return false;
    
    const now = Date.now();
    if (now - this.lastStateUpdate < 16) return false; // Limit to ~60 FPS
    
    this.lastStateUpdate = now;
    this.stateChanged = false;
    return true;
  }
}

module.exports = ServerPlayer;
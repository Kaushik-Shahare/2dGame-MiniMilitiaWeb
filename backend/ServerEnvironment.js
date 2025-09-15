/**
 * Server-side Environment class with authoritative collision detection
 */
class ServerEnvironment {
  constructor() {
    // Fixed dimensions
    this.fixedWidth = 1280;
    this.fixedHeight = 720;
    this.groundLevel = this.fixedHeight - 200;

    // Obstacles for collision detection
    this.obstacles = [
      { x: 400, y: this.fixedHeight - 250, width: 100, height: 50 },
      { x: 300, y: this.fixedHeight - 450, width: 100, height: 50 },
      { x: 600, y: this.fixedHeight - 550, width: 100, height: 50 },
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
        return true; // Collision detected
      }
    }

    // Check collision with the ground
    if (y >= this.groundLevel) {
      return true;
    }

    return false; // No collision
  }

  checkCollisionOnX(x, y, width, height, velocityX) {
    const newX = x + velocityX;
    
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        newX < obs.x + obs.width &&
        newX + width > obs.x &&
        y < obs.y + obs.height &&
        y + height > obs.y
      ) {
        return true; // Collision detected
      }
    }
    
    // Check world boundaries
    if (newX < 0 || newX + width > this.fixedWidth) {
      return true;
    }
    
    return false; // No collision
  }

  checkCollisionOnY(x, y, width, height, velocityY) {
    const newY = y + velocityY;
    
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x < obs.x + obs.width &&
        x + width > obs.x &&
        newY < obs.y + obs.height &&
        newY + height > obs.y
      ) {
        return true; // Collision detected
      }
    }
    
    // Check world boundaries
    if (newY < 0 || newY + height > this.fixedHeight) {
      return true;
    }
    
    return false; // No collision
  }

  // Check if a rectangular area overlaps with any obstacle
  checkAreaCollision(x, y, width, height) {
    for (let obs of this.obstacles) {
      if (
        x < obs.x + obs.width &&
        x + width > obs.x &&
        y < obs.y + obs.height &&
        y + height > obs.y
      ) {
        return true;
      }
    }
    return false;
  }

  // Get a safe spawn position that doesn't collide with obstacles
  getSafeSpawnPosition() {
    const maxAttempts = 50;
    const playerWidth = 50;
    const playerHeight = 70;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * (this.fixedWidth - playerWidth);
      const y = Math.random() * (this.groundLevel - playerHeight - 100) + 50; // Above ground, below ceiling
      
      if (!this.checkAreaCollision(x, y, playerWidth, playerHeight)) {
        return { x, y };
      }
    }
    
    // Fallback to default positions if no safe spawn found
    const fallbackPositions = [
      { x: 100, y: 100 },
      { x: this.fixedWidth - 150, y: 100 },
      { x: this.fixedWidth / 2 - 25, y: 100 }
    ];
    
    for (let pos of fallbackPositions) {
      if (!this.checkAreaCollision(pos.x, pos.y, playerWidth, playerHeight)) {
        return pos;
      }
    }
    
    // Last resort
    return { x: 100, y: 100 };
  }

  // Get environment state for clients (obstacles and boundaries)
  getState() {
    return {
      fixedWidth: this.fixedWidth,
      fixedHeight: this.fixedHeight,
      groundLevel: this.groundLevel,
      obstacles: this.obstacles
    };
  }
}

module.exports = ServerEnvironment;
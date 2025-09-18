/**
 * Server-side Environment class with authoritative collision detection
 */
class ServerEnvironment {
  constructor() {
    // Base dimensions for camera viewport
    this.baseWidth = 1280;
    this.baseHeight = 720;
    
    // Large world dimensions - 3x wider than height (like real Mini Militia)
    this.worldWidth = 720 * 3; // 2160 pixels - large horizontal world
    this.worldHeight = 720;
    
    this.groundLevel = this.baseHeight - 100; // Lowered from 200 to 100 for more vertical space

    // Obstacles distributed across the large world for varied gameplay
    this.obstacles = [
      // Left section
      { x: 200, y: this.baseHeight - 150, width: 100, height: 50 },
      { x: 100, y: this.baseHeight - 300, width: 100, height: 50 },
      
      // Center section (original area)
      { x: 700, y: this.baseHeight - 150, width: 100, height: 50 },
      { x: 600, y: this.baseHeight - 300, width: 100, height: 50 },
      { x: 900, y: this.baseHeight - 400, width: 100, height: 50 },
      
      // Right section  
      { x: 1400, y: this.baseHeight - 200, width: 100, height: 50 },
      { x: 1600, y: this.baseHeight - 350, width: 100, height: 50 },
      { x: 1800, y: this.baseHeight - 250, width: 100, height: 50 },
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
    
    // Check world boundaries - use extended world width
    if (newX < 0 || newX + width > this.worldWidth) {
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
    
    // Check world boundaries - use extended world dimensions  
    if (newY < 0 || newY + height > this.worldHeight) {
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
      const x = Math.random() * (this.worldWidth - playerWidth); // Use world width for spawning
      const y = Math.random() * (this.groundLevel - playerHeight - 100) + 50; // Above ground, below ceiling
      
      if (!this.checkAreaCollision(x, y, playerWidth, playerHeight)) {
        return { x, y };
      }
    }
    
    // Fallback to default positions if no safe spawn found
    const fallbackPositions = [
      { x: 100, y: 100 },
      { x: this.worldWidth - 150, y: 100 }, // Use world width
      { x: this.worldWidth / 2 - 25, y: 100 } // Use world width
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
      baseWidth: this.baseWidth,
      baseHeight: this.baseHeight, 
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      groundLevel: this.groundLevel,
      obstacles: this.obstacles
    };
  }
}

module.exports = ServerEnvironment;
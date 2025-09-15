/**
 * Server-side Bullet class with authoritative physics and collision detection
 */
class ServerBullet {
  constructor(x, y, angle, ownerId, id = null) {
    this.id = id || this.generateId();
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.ownerId = ownerId;
    
    // Physics
    this.speed = 8;
    this.velocityX = Math.cos(angle) * this.speed;
    this.velocityY = Math.sin(angle) * this.speed;
    
    // Properties
    this.damage = 10;
    this.active = true;
    this.createdAt = Date.now();
    this.maxLifetime = 5000; // 5 seconds max lifetime
    
    // Trail for visual effect (positions for client rendering)
    this.trail = [{ x: this.x, y: this.y }];
  }

  generateId() {
    return `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  update(environment, deltaTime = 16.67) {
    if (!this.active) return false;

    const dt = deltaTime / 16.67; // Normalize to 60 FPS baseline

    // Update position
    const newX = this.x + this.velocityX * dt;
    const newY = this.y + this.velocityY * dt;

    // Check collision with environment
    if (environment && environment.checkGunCollision(newX, newY)) {
      this.active = false;
      return false;
    }

    // Check bounds (1280x720 canvas)
    if (newX < 0 || newX > 1280 || newY < 0 || newY > 720) {
      this.active = false;
      return false;
    }

    // Check lifetime
    if (Date.now() - this.createdAt > this.maxLifetime) {
      this.active = false;
      return false;
    }

    // Update position
    this.x = newX;
    this.y = newY;

    // Update trail for visual effects
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) {
      this.trail.shift();
    }

    return true;
  }

  // Check collision with a player
  checkPlayerCollision(player) {
    if (!this.active || player.isDead || player.id === this.ownerId) {
      return false;
    }

    // Simple AABB collision detection
    return (
      this.x >= player.x &&
      this.x <= player.x + player.width &&
      this.y >= player.y &&
      this.y <= player.y + player.height
    );
  }

  // Get state for network synchronization
  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      ownerId: this.ownerId,
      trail: this.trail.slice(-3), // Send only last 3 trail points for optimization
      active: this.active
    };
  }

  // Mark bullet as inactive
  destroy() {
    this.active = false;
  }
}

module.exports = ServerBullet;
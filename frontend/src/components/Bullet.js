/**
 * Client-side Bullet - Only handles rendering
 * All physics handled server-side
 */
export default class ClientBullet {
  constructor(bulletState) {
    this.id = bulletState.id;
    this.x = bulletState.x;
    this.y = bulletState.y;
    this.angle = bulletState.angle;
    this.ownerId = bulletState.ownerId;
    this.active = bulletState.active;
    
    // Client-side rendering properties
    this.trail = bulletState.trail || [];
    this.lastUpdate = Date.now();
    
    // Interpolation for smooth movement
    this.targetX = this.x;
    this.targetY = this.y;
    this.interpolationSpeed = 0.8;
    
    // Visual effects
    this.opacity = 1;
    this.fadeOut = false;
  }

  // Update from server state
  updateFromServer(bulletState) {
    this.targetX = bulletState.x;
    this.targetY = bulletState.y;
    this.trail = bulletState.trail || [];
    this.active = bulletState.active;
    this.lastUpdate = Date.now();
    
    if (!this.active) {
      this.fadeOut = true;
    }
  }

  // Client-side interpolation and rendering update
  update(deltaTime = 16.67) {
    if (!this.active && this.opacity <= 0) {
      return false; // Remove bullet
    }
    
    // Fade out effect when bullet is destroyed
    if (this.fadeOut) {
      this.opacity -= 0.05;
      if (this.opacity <= 0) {
        return false;
      }
    }
    
    // Smooth interpolation to target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    this.x += dx * this.interpolationSpeed;
    this.y += dy * this.interpolationSpeed;
    
    // Snap if very close
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
    
    return true;
  }

  // Render the bullet with trail effect
  render(ctx) {
    if (!this.active && this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Render trail for visual effect
    if (this.trail && this.trail.length > 0) {
      for (let i = 0; i < this.trail.length; i++) {
        const point = this.trail[i];
        const trailOpacity = ((i + 1) / this.trail.length) * 0.5 * this.opacity;
        ctx.fillStyle = `rgba(255, 100, 0, ${trailOpacity})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Render main bullet
    ctx.fillStyle = this.active ? "rgba(255, 0, 0, 1)" : "rgba(255, 100, 0, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect
    ctx.shadowColor = "red";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  // Check if bullet should be removed
  shouldRemove() {
    return !this.active && this.opacity <= 0;
  }
}
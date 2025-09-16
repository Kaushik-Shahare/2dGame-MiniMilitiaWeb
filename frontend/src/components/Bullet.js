/**
 * Client-side Bullet - Only handles rendering
 * All physics handled server-side
 */
export default class Bullet {
  constructor(bulletState) {
    this.id = bulletState.id;
    this.x = bulletState.x;
    this.y = bulletState.y;
    this.angle = bulletState.angle;
    this.ownerId = bulletState.ownerId;
    this.active = bulletState.active !== false; // Default to true if not specified
    
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
    
    // Render trail for visual effect (smaller, more realistic)
    if (this.trail && this.trail.length > 0) {
      for (let i = 0; i < this.trail.length; i++) {
        const point = this.trail[i];
        const trailOpacity = ((i + 1) / this.trail.length) * 0.2 * this.opacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`; // White smoke trail
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Realistic bullet rendering oriented to direction
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    const bulletLength = 8;
    const bulletWidth = 3;
    
    // Bullet body (metallic brass/copper color)
    ctx.fillStyle = "#CD7F32"; // Bronze color
    ctx.fillRect(-bulletLength/2, -bulletWidth/2, bulletLength, bulletWidth);
    
    // Bullet tip (darker metal)
    ctx.fillStyle = "#4A4A4A"; // Dark gray
    ctx.beginPath();
    ctx.arc(bulletLength/2, 0, bulletWidth/2, -Math.PI/2, Math.PI/2);
    ctx.fill();
    
    // Bullet base (brass)
    ctx.fillStyle = "#B8860B"; // Dark golden rod
    ctx.fillRect(-bulletLength/2 - 2, -bulletWidth/2, 2, bulletWidth);
    
    // Add a subtle glow effect
    if (this.active) {
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 3;
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1;
      ctx.strokeRect(-bulletLength/2, -bulletWidth/2, bulletLength + 2, bulletWidth);
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
  }

  // Check if bullet should be removed
  shouldRemove() {
    return !this.active && this.opacity <= 0;
  }
}
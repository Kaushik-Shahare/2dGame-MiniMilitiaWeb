import PlayerSkin from './PlayerSkin';

/**
 * Client-side Player - Only handles rendering and local input
 * All physics and state management now handled server-side
 */
export default class ClientPlayer {
  constructor(x, y, isMainPlayer = true) {
    // Visual properties
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 70;
    this.id = null;
    
    // Rendering state (received from server)
    this.health = 100;
    this.isDead = false;
    this.isCrouching = false;
    this.isUsingJetpack = false;
    this.gunAngle = 0;
    this.ammo = 25;
    this.maxAmmo = 25;
    this.isReloading = false;
    this.jetpackFuel = 100;
    this.onGround = true;
    this.lastShot = 0;
    
    // Gun image
    this.gunImage = null;
    
    // Rendering properties
    this.color = isMainPlayer ? "blue" : "red";
    this.playerSkin = new PlayerSkin(isMainPlayer);
    
    // Client-side prediction state (for main player only)
    this.isMainPlayer = isMainPlayer;
    this.predictedX = x;
    this.predictedY = y;
    this.predictedVelocityX = 0;
    this.predictedVelocityY = 0;
    
    // Input state (for main player)
    this.keys = {
      left: false,
      right: false,
      up: false,
      crouch: false
    };
    
    // Smooth interpolation
    this.targetX = x;
    this.targetY = y;
    this.interpolationSpeed = 0.2; // Increased for more responsive movement
    
    // For lag compensation
    this.lastServerUpdate = 0;
    this.serverDelay = 0;
  }

  // Update from authoritative server state
  updateFromServer(serverState) {
    // Update all server-authoritative state
    this.health = serverState.health;
    this.isDead = serverState.isDead;
    this.isCrouching = serverState.isCrouching;
    this.isUsingJetpack = serverState.isUsingJetpack;
    this.gunAngle = serverState.gunAngle;
    this.ammo = serverState.ammo;
    this.maxAmmo = serverState.maxAmmo || 25;
    this.isReloading = serverState.isReloading;
    this.jetpackFuel = serverState.jetpackFuel;
    this.onGround = serverState.onGround;
    this.id = serverState.id;
    
    // Initialize lastShot if not present (for other players)
    if (!this.lastShot) {
      this.lastShot = 0;
    }
    
    // Update rendering height based on crouching
    this.height = this.isCrouching ? 50 : 70;
    
    this.lastServerUpdate = Date.now();
    
    // Handle position updates differently for main player vs others
    if (this.isMainPlayer) {
      // For main player, use server position as authoritative
      // but allow smooth interpolation to it
      this.targetX = serverState.x;
      this.targetY = serverState.y;
      this.reconcileWithServer(serverState);
    } else {
      // For other players, store target for interpolation
      this.targetX = serverState.x;
      this.targetY = serverState.y;
    }
  }

  // Reconcile client prediction with server state (for main player)
  reconcileWithServer(serverState) {
    // Use smooth interpolation to server position instead of snapping
    const timeSinceUpdate = Date.now() - this.lastServerUpdate;
    const maxInterpolationTime = 100; // ms
    
    // If it's been too long since last update, snap to server position
    if (timeSinceUpdate > maxInterpolationTime) {
      console.log(`[Main Player] Snapping due to old update: ${timeSinceUpdate}ms ago`);
      this.x = serverState.x;
      this.y = serverState.y;
      this.predictedX = serverState.x;
      this.predictedY = serverState.y;
      return;
    }
    
    // Calculate position difference
    const positionThreshold = 15; // Increased threshold to reduce corrections
    const xDiff = Math.abs(this.x - serverState.x);
    const yDiff = Math.abs(this.y - serverState.y);
    
    // Log position differences for debugging
    if (xDiff > 1 || yDiff > 1) {
      console.log(`[Main Player] Position diff: dx=${xDiff.toFixed(1)}, dy=${yDiff.toFixed(1)}, client(${this.x.toFixed(1)}, ${this.y.toFixed(1)}), server(${serverState.x.toFixed(1)}, ${serverState.y.toFixed(1)})`);
    }
    
    // If prediction is significantly off, smoothly correct it
    if (xDiff > positionThreshold || yDiff > positionThreshold) {
      console.log(`[Main Player] Large deviation detected - letting interpolation handle correction`);
    }
    
    // Reset prediction to server position
    this.predictedX = serverState.x;
    this.predictedY = serverState.y;
  }

  // Client-side prediction update (for main player only)
  predictiveUpdate(keys, deltaTime = 16.67) {
    if (!this.isMainPlayer || this.isDead) return;
    
    // Store input for server
    this.keys = { ...keys };
    
    // Smooth interpolation to server position with adaptive speed
    const timeSinceUpdate = Date.now() - this.lastServerUpdate;
    let interpolationSpeed = 0.3; // Base speed
    
    // If server update is recent, use faster interpolation
    if (timeSinceUpdate < 50) {
      interpolationSpeed = 0.4;
    } else if (timeSinceUpdate > 200) {
      // If server update is old, be more cautious
      interpolationSpeed = 0.1;
    }
    
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    this.x += dx * interpolationSpeed;
    this.y += dy * interpolationSpeed;
    
    // Snap if very close to avoid floating point precision issues
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  // Smooth interpolation update (for other players)
  interpolateUpdate() {
    if (this.isMainPlayer) return;
    
    // Smooth interpolation to target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    this.x += dx * this.interpolationSpeed;
    this.y += dy * this.interpolationSpeed;
    
    // Snap to target if very close
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  // Handle input events (main player only)
  handleKeyDown(e) {
    if (!this.isMainPlayer) return;
    
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      this.keys.right = true;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      this.keys.left = true;
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
      this.keys.up = true;
    }
    if (e.key === "Control" || e.key === "ControlLeft" || e.key === "ControlRight") {
      this.keys.crouch = true;
    }
  }

  handleKeyUp(e) {
    if (!this.isMainPlayer) return;
    
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "d" || e.key === "a" || e.key === "D" || e.key === "A") {
      this.keys.right = false;
      this.keys.left = false;
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
      this.keys.up = false;
    }
    if (e.key === "Control" || e.key === "ControlLeft" || e.key === "ControlRight") {
      this.keys.crouch = false;
    }
  }

  // Render the player
  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // Rotate the player if aiming left
    const facingLeft = this.gunAngle < -Math.PI / 2 || this.gunAngle > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // Use PlayerSkin for rendering
    this.playerSkin.render(
      ctx,
      this.width,
      this.height,
      this.isUsingJetpack,
      this.keys.left || this.keys.right ? (this.keys.right ? 1 : -1) : 0
    );

    // Render gun
    this.renderGun(ctx, facingLeft);

    ctx.restore();

    // Render health bar
    this.renderHealthBar(ctx);
    
    // Render jetpack fuel bar
    this.renderJetpackFuelBar(ctx);
    
    // Render ammo counter (for main player)
    if (this.isMainPlayer) {
      this.renderAmmoCounter(ctx);
    }
  }

  // Render the gun
  renderGun(ctx, facingLeft) {
    ctx.save();
    
    // Use single gun image for both directions
    // const gunImageSrc = "/sprite/enemy_gun.PNG";
    // const gunImageSrc = facingLeft ? "/sprite/enemy_gun_left.PNG" : "/sprite/enemy_gun.PNG";
    const gunImageSrc = facingLeft ? "/sprite/hand_with_gun_left.PNG" : "/sprite/hand_with_gun.PNG";
    
    if (!this.gunImage || this.gunImage.src !== window.location.origin + gunImageSrc) {
      this.gunImage = new Image();
      this.gunImage.src = gunImageSrc;
    }
    
    // Position gun at player's hand
    const gunOffsetX = facingLeft ? -20 : 20;
    const gunOffsetY = 0;
    
    // Flip image on x and y axis when facing left
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    
    // Rotate gun based on aim angle
    ctx.rotate(this.gunAngle);
    
    // Draw gun
    const gunWidth = 45;
    const gunHeight = 20;
    
    if (this.gunImage?.complete) {
      ctx.drawImage(
        this.gunImage,
        gunOffsetX - gunWidth/2,
        gunOffsetY - gunHeight/2,
        gunWidth,
        gunHeight
      );
    } else {
      // Fallback rectangle gun while loading
      ctx.fillStyle = this.color === "blue" ? "#333" : "#555";
      ctx.fillRect(gunOffsetX - gunWidth/2, gunOffsetY - gunHeight/2, gunWidth, gunHeight);
      
      // Gun barrel
      ctx.fillStyle = "#222";
      ctx.fillRect(gunOffsetX + gunWidth/2 - 5, gunOffsetY - 2, 8, 4);
    }
    
    ctx.restore();
  }

  renderHealthBar(ctx) {
    const barWidth = this.width;
    const barHeight = 6;
    const barX = this.x;
    const barY = this.y - 15;

    // Background
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health bar
    const healthPercent = this.health / 100;
    ctx.fillStyle = healthPercent > 0.5 ? "green" : healthPercent > 0.25 ? "orange" : "red";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  renderJetpackFuelBar(ctx) {
    const barWidth = this.width;
    const barHeight = 4;
    const barX = this.x;
    const barY = this.y - 8;

    // Background
    ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fuel bar
    const fuelPercent = this.jetpackFuel / 100;
    ctx.fillStyle = "cyan";
    ctx.fillRect(barX, barY, barWidth * fuelPercent, barHeight);

    // Border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  renderAmmoCounter(ctx) {
    ctx.fillStyle = this.isReloading ? "orange" : "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(
      this.isReloading ? "RELOADING..." : `${this.ammo}/25`,
      1270,
      50
    );
  }

  // Get current position
  getPosition() {
    return { x: this.x, y: this.y };
  }

  // Get input state for sending to server
  getInputState() {
    if (!this.isMainPlayer) return null;
    
    return {
      keys: { ...this.keys },
      gunAngle: this.gunAngle
    };
  }

  // Update gun angle (from mouse movement)
  updateGunAngle(mouseX, mouseY) {
    if (!this.isMainPlayer) return;
    
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    
    this.gunAngle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);
  }
}
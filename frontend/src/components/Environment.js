class Environment {
  constructor() {
    // Camera viewport dimensions (what player sees)
    this.baseWidth = 1280;
    this.baseHeight = 720;
    
    // Large world dimensions - 3x wider than height (like real Mini Militia)
    this.worldWidth = 720 * 3; // 2160 pixels - large horizontal world
    this.worldHeight = 720;
    
    this.groundLevel = this.baseHeight - 100; // Lowered from 200 to 100 for more vertical space

    // Initialize background and ground images
    this.backgroundImage = new Image();
    this.backgroundImage.src = "/bg2.jpeg";

    this.groundImage = new Image();
    this.groundImage.src = "/surface.png";

    this.treeImage = new Image();
    this.treeImage.src = "/sprite/tree.png";

    // Load grass and sand images for obstacles
    this.grassImage = new Image();
    this.grassImage.src = "/sprite/grass.png";
    this.sandImage = new Image();
    this.sandImage.src = "/sprite/sand.png";

    // Obstacles distributed across the large world (matching server)
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

  getObstacles() {
    return this.obstacles;
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
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x + velocityX < obs.x + obs.width &&
        x + width + velocityX > obs.x &&
        y < obs.y + obs.height &&
        y + height > obs.y
      ) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  checkCollisionOnY(x, y, width, height, velocityY) {
    // Check collision with obstacles
    for (let obs of this.obstacles) {
      if (
        x < obs.x + obs.width &&
        x + width > obs.x &&
        y + velocityY < obs.y + obs.height &&
        y + height + velocityY > obs.y
      ) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  render(ctx, scaleX, scaleY, canvasWidth, canvasHeight, cameraX = 0, cameraY = 0) {
    ctx.save();
    
    // For the background, we want it to fill the entire screen
    ctx.save();
    // Draw background image to fill entire canvas (screen fitting)
    if (this.backgroundImage.complete) {
      ctx.drawImage(
        this.backgroundImage,
        0,
        0,
        canvasWidth,
        canvasHeight,
      );
    } else {
      ctx.fillStyle = "skyblue";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.restore();
    
    // Apply camera translation and scaling for game world elements
    ctx.scale(scaleX, scaleY);
    ctx.translate(-cameraX, -cameraY);

    // Calculate visible area bounds for culling
    const viewLeft = cameraX;
    const viewRight = cameraX + (canvasWidth / scaleX);
    const viewTop = cameraY;
    const viewBottom = cameraY + (canvasHeight / scaleY);
    
    // Calculate effective game world height in scaled coordinates
    const gameWorldHeight = canvasHeight / scaleY;

    // Draw ground image only in visible area
    if (this.groundImage.complete) {
      let imageWidth = this.groundImage.width;
      const startX = Math.floor(viewLeft / imageWidth) * imageWidth;
      const endX = Math.ceil(viewRight / imageWidth) * imageWidth;

      for (let x = startX; x < endX && x < this.worldWidth; x += imageWidth) {
        if (x + imageWidth >= viewLeft && x <= viewRight) { // Visible check
          ctx.drawImage(
            this.groundImage,
            x,
            this.groundLevel,
            imageWidth,
            gameWorldHeight - this.groundLevel + cameraY,
          );
        }
      }
    } else {
      ctx.fillStyle = "brown";
      ctx.fillRect(
        viewLeft,
        this.groundLevel,
        viewRight - viewLeft,
        gameWorldHeight - this.groundLevel + cameraY,
      );
    }

    // Draw trees only if visible
    const treePositions = [
      { x: 150, section: 'left' },
      { x: 400, section: 'left' },
      { x: 800, section: 'center' },
      { x: 1100, section: 'center' },
      { x: 1500, section: 'right' },
      { x: 1800, section: 'right' },
    ];
    
    treePositions.forEach(tree => {
      const treeRight = tree.x + 300;
      if (tree.x < viewRight && treeRight > viewLeft && tree.x < this.worldWidth - 300) {
        ctx.drawImage(
          this.treeImage,
          tree.x,
          this.groundLevel - this.treeImage.height + 226,
          300,
          400,
        );
      }
    });

    // Render obstacles only if visible
    this.obstacles.forEach((obs) => {
      const obsRight = obs.x + obs.width;
      const obsBottom = obs.y + obs.height;
      
      // Check if obstacle is within visible bounds
      if (obs.x < viewRight && obsRight > viewLeft && 
          obs.y < viewBottom && obsBottom > viewTop) {
        
        // Draw grass covering the top half of the obstacle
        if (this.grassImage.complete) {
          ctx.drawImage(
            this.grassImage,
            obs.x,
            obs.y - 10,
            obs.width,
            obs.height / 2,
          );
        } else {
          ctx.fillStyle = "green";
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height / 2);
        }

        // Draw sand covering the bottom half of the obstacle
        if (this.sandImage.complete) {
          ctx.drawImage(
            this.sandImage,
            obs.x,
            obs.y + obs.height / 2 - 10,
            obs.width,
            obs.height / 2 + 10,
          );
        } else {
          ctx.fillStyle = "yellow";
          ctx.fillRect(obs.x, obs.y + obs.height / 2, obs.width, obs.height / 2);
        }
      }
    });

    ctx.restore();
  }
}

export default Environment;

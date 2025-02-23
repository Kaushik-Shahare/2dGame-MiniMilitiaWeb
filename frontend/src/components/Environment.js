import Phaser from "phaser";

export default class Environment {
  constructor(scene) {
    this.scene = scene;
    this.groundLevel = 520; // Adjust as needed

    if (!scene.background) {
      scene.background = scene.add.image(640, 360, "background").setDisplaySize(1280, 720);
    }
    if (!scene.ground) {
      scene.ground = scene.add.tileSprite(640, this.groundLevel + 40, 1280, 80, "ground");
      scene.physics.add.existing(scene.ground, true);
    }

    // Create obstacles as a static physics group.
    this.obstaclesGroup = scene.physics.add.staticGroup();
    const obsData = [
      { x: 400, y: this.groundLevel - 50, width: 100, height: 50 },
      { x: 300, y: this.groundLevel - 150, width: 100, height: 50 },
      { x: 600, y: this.groundLevel - 200, width: 100, height: 50 }
    ];
    obsData.forEach((obs) => {
      const obstacle = scene.add.rectangle(obs.x, obs.y, obs.width, obs.height, 0x964B00).setOrigin(0, 0);
      this.obstaclesGroup.add(obstacle);
    });

    if (!scene.tree) {
      scene.tree = scene.add.image(100, this.groundLevel - 100, "tree").setScale(0.5);
    }
  }
  
  getGroundLevel(x, width) {
    return this.groundLevel;
  }
  
  checkGunCollision(x, y) {
    // Check collision with obstacles
    for (let obs of this.obstaclesGroup.getChildren()) {
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
    for (let obs of this.obstaclesGroup.getChildren()) {
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
    for (let obs of this.obstaclesGroup.getChildren()) {
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
}

import Phaser from "phaser";

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, angle) {
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.speed = 500;
    this.setAngle(Phaser.Math.RadToDeg(angle));
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    this.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;
    scene.physics.world.on("worldbounds", (body) => {
      if (body.gameObject === this) {
        this.destroy();
      }
    });
  }
}

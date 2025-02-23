export default class PlayerSkin {
  static setupAnimations(scene, isMainPlayer) {
    // For a sprite sheet now with each frame 150x300 pixels in a single row of 3 frames:
    if (!scene.anims.get("idle")) {
      scene.anims.create({
        key: "idle",
        frames: [{ key: "player", frame: 0 }],
        frameRate: 1
      });
    }
    if (!scene.anims.get("walk")) {
      scene.anims.create({
        key: "walk",
        frames: scene.anims.generateFrameNumbers("player", { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!scene.anims.get("jetpack")) {
      // For example, use frame 2 as jetpack state
      scene.anims.create({
        key: "jetpack",
        frames: [{ key: "player", frame: 2 }],
        frameRate: 1
      });
    }
  }
}

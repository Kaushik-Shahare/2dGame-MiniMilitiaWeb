import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import Player from "./Player";
import Environment from "./Environment";
import RoomDialog from "./RoomDialog";
// ...import other modules if needed...

const GameCanvas = ({ socket }) => {
  const containerRef = useRef(null);
  // (Keep your dialog and state hooks as before)
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(true);
  const roomIdRef = useRef(null);
  const [notification, setNotification] = useState(null);
  // ...other state variables as needed

  useEffect(() => {
    // Define an inline Phaser scene that implements your game mechanics.
    class MainScene extends Phaser.Scene {
      constructor() {
        super("MainScene");
        this.remotePlayers = {}; // dictionary keyed by clientId
      }
      
      preload() {
        // Load assets
        this.load.image("background", "/bg2.jpeg");
        this.load.image("ground", "/surface.png");
        this.load.image("tree", "/sprite/tree.png");
        this.load.spritesheet("player", "/sprite/character_sprite1_right.png", {
          frameWidth: 380 / 4,
          frameHeight: 335 / 2 - 16
        });
        this.load.image("bullet", "/sprite/bullet.png");
        // (Preload any additional assets used by Environment, Gun, etc.)
      }
      
      create() {
        // Create environment (Phaser objects)
        this.environment = new Environment(this);
        
        // Create local player using your Phaser-based Player class
        this.localPlayer = new Player(this, 100, this.environment.groundLevel, true);
        // Adjust player to start exactly on ground.
        this.localPlayer.setY(this.environment.groundLevel);
        this.cameras.main.startFollow(this.localPlayer);
        
        // Set up inputs (using Phaser’s built‐in keyboard)
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add colliders for ground and obstacles so collisions are handled by physics.
        this.physics.add.collider(this.localPlayer, this.environment.ground);
        this.physics.add.collider(this.localPlayer, this.environment.obstaclesGroup, () => {
          // When collision occurs, set onGround flag.
          this.localPlayer.onGround = true;
        });

        // Listen for pointerdown (left click) to fire gun.
        this.input.on("pointerdown", (pointer) => {
          if (pointer.leftButtonDown()) {
            this.localPlayer.gun.handleMouseDown();
          }
        });

        // Use the provided socket or create your own WebSocket connection
        this.socket = socket || new WebSocket("ws://localhost:3001");
        this.socket.onopen = () => {
          console.log("Phaser: Connected to server");
          // Optionally send join messages here.
        };
        this.socket.onmessage = (event) => {
          let data = JSON.parse(event.data);
          this.handleServerMessage(data);
        };
      }
      
      update(time, delta) {
        // Update local player with input and environment collisions
        this.localPlayer.update(this.cursors, this.environment);
        // Send current position to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: "MOVE",
            position: {
              x: this.localPlayer.x,
              y: this.localPlayer.y,
              isCrouching: this.localPlayer.isCrouching,
              gunAngle: this.localPlayer.gun.gunAngle
            }
          }));
        }
      }
      
      handleServerMessage(data) {
        switch(data.type) {
          case "UPDATE_POSITION":
            if (data.clientId !== this.localPlayer.id) {
              if (!this.remotePlayers[data.clientId]) {
                // Create a new remote player instance using your Player class
                const remote = new Player(this, data.position.x, data.position.y, false);
                remote.id = data.clientId;
                this.remotePlayers[data.clientId] = remote;
              } else {
                this.remotePlayers[data.clientId].setPosition(
                  data.position.x, data.position.y
                );
              }
            }
            break;
          case "SHOOT":
            // Create bullet for remote shoot event (simple demo)
            const bullet = this.physics.add.image(
              data.position.x, data.position.y, "bullet"
            );
            bullet.setVelocity(300, 0);
            this.time.delayedCall(500, () => bullet.destroy());
            break;
          case "PLAYER_HIT":
            if (data.health && data.health[this.localPlayer.id] !== undefined) {
              this.localPlayer.health = data.health[this.localPlayer.id];
            }
            // Update health for remote players
            for (let id in data.health) {
              if (this.remotePlayers[id]) {
                this.remotePlayers[id].health = data.health[id];
              }
            }
            break;
          case "PLAYER_DEATH":
            if (data.playerId === this.localPlayer.id) {
              this.localPlayer.health = 0;
              // Display a respawn notification (using Phaser text if desired)
              // For demo, simply respawn after delay:
              this.time.delayedCall(5000, () => this.localPlayer.respawn());
            } else if (this.remotePlayers[data.playerId]) {
              this.remotePlayers[data.playerId].health = 0;
            }
            break;
          case "PLAYER_RESPAWN":
            if (data.playerId === this.localPlayer.id) {
              this.localPlayer.respawn();
            } else if (this.remotePlayers[data.playerId]) {
              this.remotePlayers[data.playerId].respawn();
            }
            break;
          case "ROUND_TIME":
            // Optionally update a timer UI here
            break;
          case "SCORE_UPDATE":
            // Update local score if needed
            this.localPlayer.score = data.scores
              ? data.scores[this.localPlayer.id] || 0
              : 0;
            break;
          case "ROUND_OVER":
            // Display end-of-round notification if desired
            break;
          default:
            break;
        }
      }
    }
    
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 300 } }
      },
      scene: [MainScene],
      backgroundColor: "#000000"
    };
    const game = new Phaser.Game(config);
    
    return () => {
      game.destroy(true);
    };
  }, [socket]); // Re-run if socket changes

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh" }}>
      {/* RoomDialog and other UI elements can be rendered here as needed */}
      <RoomDialog
        isOpen={isRoomDialogOpen}
        onClose={() => setIsRoomDialogOpen(false)}
        roomIdRef={roomIdRef}
        createRoom={() => {
          // Implement room creation logic
          socket.send(JSON.stringify({
            type: "CREATE_ROOM",
            clientId: "your_client_id" // adjust as needed
          }));
        }}
        joinRoom={() => {
          // Implement join room logic
          socket.send(JSON.stringify({
            type: "JOIN_ROOM",
            roomId: roomIdRef.current.value,
            clientId: "your_client_id" // adjust as needed
          }));
        }}
        toggleFullScreen={() => {
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => {});
          } else {
            document.exitFullscreen().then(() => {});
          }
          setIsRoomDialogOpen(false);
        }}
      />
    </div>
  );
};

export default GameCanvas;

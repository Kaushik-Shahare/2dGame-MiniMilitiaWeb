import React, { useEffect, useRef, useState } from "react";
import Environment from "./Environment";
import Player from "./Player";
import Bullet from "./Bullet";
import RoomDialog from "./RoomDialog";

const GameCanvas = ({ socket }) => {
  const canvasRef = useRef(null);
  const roomIdRef = useRef(null);
  const player = useRef(new Player(100, 500)); // Main player instance
  const opponentPlayer = useRef(null); // Opponent player instance
  const environment = new Environment();
  const animationFrameId = useRef(null);
  const fixedWidth = 1280; // Example width
  const fixedHeight = 720;
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(true);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(300); // 5 minutes timer
  const [isRespawning, setIsRespawning] = useState(false);
  const [isOpponentDead, setIsOpponentDead] = useState(false);
  const cursorPosition = useRef({ x: fixedWidth / 2, y: fixedHeight / 2 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = fixedWidth;
    canvas.height = fixedHeight;

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale the canvas
      const scaleX = canvas.width / fixedWidth;
      const scaleY = canvas.height / fixedHeight;
      ctx.save();
      ctx.scale(scaleX, scaleY);

      // Render environment and main player
      environment.render(ctx, scaleX, scaleY);
      if (!isRespawning) {
        player.current.update(environment);
        player.current.render(ctx);
      }

      // Render the opponent player
      if (opponentPlayer.current && !isOpponentDead) {
        opponentPlayer.current.render(ctx);
        opponentPlayer.current.gun.updateBullets(
          environment,
          fixedWidth,
          fixedHeight
        );
      }

      // Render current player's health bar at the top right side
      ctx.fillStyle = "red";
      ctx.fillRect(fixedWidth - 210, 10, 200, 20);
      ctx.fillStyle = "green";
      ctx.fillRect(
        fixedWidth - 210,
        10,
        (player.current.health / 100) * 200,
        20
      );

      // Render current player's jetpack fuel bar below the health bar
      ctx.fillStyle = "blue";
      ctx.fillRect(
        fixedWidth - 210,
        40,
        (player.current.jetpackFuel / 100) * 200,
        20
      );

      // Render game score
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${score}`, 550, 30);

      // Render game timer
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      ctx.fillText(
        `Time: ${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
        550,
        60
      );

      // Check collisions for bullets fired by the main player
      player.current.gun.bullets = player.current.gun.bullets.filter(
        (bullet) => {
          if (
            opponentPlayer.current &&
            bullet.checkCollisionWithPlayer(opponentPlayer.current)
          ) {
            // Bullet hit opponent player
            opponentPlayer.current.health -= 20;
            if (opponentPlayer.current.health <= 0) {
              opponentPlayer.current.health = 0;
              handlePlayerDeath(opponentPlayer.current.id);
            }
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "PLAYER_HIT",
                  roomId: roomIdRef.current.value,
                  health: opponentPlayer.current.health,
                })
              );
            }
            setScore((prevScore) => prevScore + 10); // Increase score
            return false; // Remove bullet
          }
          return bullet.update(environment, canvas.width, canvas.height);
        }
      );

      // Check collisions for bullets fired by the opponent player
      if (opponentPlayer.current) {
        opponentPlayer.current.gun.bullets =
          opponentPlayer.current.gun.bullets.filter((bullet) => {
            if (bullet.checkCollisionWithPlayer(player.current)) {
              // Bullet hit main player
              player.current.health -= 20;
              if (player.current.health <= 0) {
                player.current.health = 0;
                handlePlayerDeath(player.current.id);
              }
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: "PLAYER_HIT",
                    roomId: roomIdRef.current.value,
                    health: player.current.health,
                  })
                );
              }
              return false; // Remove bullet
            }
            return bullet.update(environment, canvas.width, canvas.height);
          });
      }

      ctx.restore();

      // Send player position to the server
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "MOVE",
            roomId: roomIdRef.current.value,
            position: {
              x: player.current.x,
              y: player.current.y,
              isCrouching: player.current.isCrouching,
              gunAngle: player.current.gun.gunAngle,
            },
          })
        );
      }

      animationFrameId.current = requestAnimationFrame(update);
    };
    canvas.addEventListener("mousedown", handleMouseDown);

    update();

    // Cleanup animation frame and resize listener
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      canvas.removeEventListener("mousedown", handleMouseDown);
    };
  }, [socket, isFullScreen, score, timer, isRespawning, isOpponentDead]);

  useEffect(() => {
    const handleSocketMessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "UPDATE_POSITION":
          const { clientId, position } = data;

          if (!opponentPlayer.current) {
            opponentPlayer.current = new Player(position.x, position.y, false);
          } else {
            opponentPlayer.current.updatePosition(
              position.x,
              position.y,
              position.isCrouching,
              position.gunAngle
            );
          }
          break;

        case "SHOOT":
          const { position: shootPosition } = data;

          // Create a new bullet for the opponent
          if (opponentPlayer.current) {
            const bullet = new Bullet(
              shootPosition.x,
              shootPosition.y,
              shootPosition.angle
            );
            opponentPlayer.current.gun.bullets.push(bullet);
          }
          break;

        case "PLAYER_HIT":
          if (opponentPlayer.current) {
            opponentPlayer.current.health = data.health;
          }
          break;

        case "PLAYER_DEATH":
          if (data.playerId === player.current.id) {
            setIsRespawning(true);
            player.current.isDead = true;
            setTimeout(() => {
              player.current.respawn();
              setIsRespawning(false);
            }, 5000);
          } else if (
            opponentPlayer.current &&
            data.playerId === opponentPlayer.current.id
          ) {
            setIsOpponentDead(true);
            opponentPlayer.current.isDead = true;
          }
          break;

        case "PLAYER_RESPAWN":
          if (
            opponentPlayer.current &&
            data.playerId === opponentPlayer.current.id
          ) {
            opponentPlayer.current.respawn();
            setIsOpponentDead(false);
          }
          break;

        default:
          break;
      }
    };

    if (socket) {
      socket.addEventListener("message", handleSocketMessage);
    }

    return () => {
      if (socket) {
        socket.removeEventListener("message", handleSocketMessage);
      }
    };
  }, [socket]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      player.current.gun.handleMouseMove(event);
    };

    if (isFullScreen) {
      canvasRef.current.requestPointerLock();
      document.addEventListener("mousemove", handleMouseMove);
    }

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvasRef.current) {
        document.removeEventListener("mousemove", handleMouseMove);
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isFullScreen]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimer((prevTimer) => (prevTimer > 0 ? prevTimer - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleMouseDown = () => {
    if (player.current && roomIdRef.current) {
      player.current.gun.handleMouseDown(socket, roomIdRef.current.value);
    }
  };

  const createRoom = () => {
    socket.send(
      JSON.stringify({
        type: "CREATE_ROOM",
        clientId: socket.id,
      })
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ROOM_CREATED") {
        roomIdRef.current.value = data.roomId;
      }
    };
  };

  const joinRoom = () => {
    const roomId = roomIdRef.current.value; // Get the value from the textarea
    if (roomId) {
      socket.send(
        JSON.stringify({
          type: "JOIN_ROOM",
          roomId,
          clientId: socket.id,
        })
      );
    }
  };

  const toggleFullScreen = () => {
    const canvas = canvasRef.current;
    if (!document.fullscreenElement) {
      canvas.requestFullscreen().then(() => {
        setIsFullScreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      });
    }
  };

  const handlePlayerDeath = (playerId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "PLAYER_DEATH",
          roomId: roomIdRef.current.value,
          playerId,
        })
      );
    }
  };

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      <RoomDialog
        isOpen={isRoomDialogOpen}
        onClose={() => setIsRoomDialogOpen(false)}
        roomIdRef={roomIdRef}
        createRoom={createRoom}
        joinRoom={joinRoom}
        toggleFullScreen={toggleFullScreen}
      />
    </div>
  );
};

export default GameCanvas;

import React, { useEffect, useRef, useState } from "react";
import Environment from "./Environment";
import Player from "./Player";
import Bullet from "./Bullet";
import RoomDialog from "./RoomDialog";

const GameCanvas = ({ socket }) => {
  const containerRef = useRef(null); // NEW: container reference for fullscreen
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
  const [localScore, setLocalScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timer, setTimer] = useState(300); // 5 minutes timer
  const [isRespawning, setIsRespawning] = useState(false);
  const [isOpponentDead, setIsOpponentDead] = useState(false);
  const [respawnCountdown, setRespawnCountdown] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const cursorPosition = useRef({ x: fixedWidth / 2, y: fixedHeight / 2 });
  const [notification, setNotification] = useState(null); // New: Notification state

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = fixedWidth;
    canvas.height = fixedHeight;

    // Preload SVG images as data URLs
    const healthIcon = new Image();
    healthIcon.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z" fill="white"/></svg>';
    const jetpackIcon = new Image();
    jetpackIcon.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M153.6 29.9l16-21.3C173.6 3.2 180 0 186.7 0C198.4 0 208 9.6 208 21.3V43.5c0 13.1 5.4 25.7 14.9 34.7L307.6 159C356.4 205.6 384 270.2 384 337.7C384 434 306 512 209.7 512H192C86 512 0 426 0 320v-3.8c0-48.8 19.4-95.6 53.9-130.1l3.5-3.5c4.2-4.2 10-6.6 16-6.6C85.9 176 96 186.1 96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9z" fill="white"/></svg>';

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

      // ****************************************************************************************************
      // Render current player's health bar with a lighter purple (lavender) color
      const healthBarX = fixedWidth - 230;
      const healthBarY = 30;
      const healthBarWidth = 200;
      const healthBarHeight = 20;
      ctx.fillStyle = "#A020F0";
      ctx.fillRect(
        healthBarX,
        healthBarY,
        (player.current.health / 100) * healthBarWidth,
        healthBarHeight
      );
      // Add white border around the health bar container
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      // Render current player's jetpack fuel bar below the health bar
      const jetpackFuelX = fixedWidth - 230;
      const jetpackFuelY = 60;
      const jetpackFuelWidth = 200;
      const jetpackFuelHeight = 20;
      ctx.fillStyle = "blue";
      ctx.fillRect(
        jetpackFuelX,
        jetpackFuelY,
        (player.current.jetpackFuel / 100) * jetpackFuelWidth,
        jetpackFuelHeight
      );
      // Add white border around the fuel bar container
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        jetpackFuelX,
        jetpackFuelY,
        jetpackFuelWidth,
        jetpackFuelHeight
      );

      // Draw icons for health and jetpack fuel
      const iconWidth = 20,
        iconHeight = 20;
      ctx.drawImage(
        healthIcon,
        healthBarX - iconWidth - 10,
        healthBarY,
        iconWidth,
        iconHeight
      );
      ctx.drawImage(
        jetpackIcon,
        jetpackFuelX - iconWidth - 10,
        jetpackFuelY,
        iconWidth,
        iconHeight
      );

      // Border around the health and jetpack fuel bars
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        healthBarX - iconWidth - 15,
        healthBarY - 10,
        healthBarWidth + iconWidth + 20,
        healthBarHeight + jetpackFuelHeight + 30
      );

      // *******************************************************************************************
      // Updated: Draw score UI with rounded boxes
      function drawRoundedRect(ctx, x, y, width, height, radius, fillColor) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      const boxWidth = 100,
        boxHeight = 40;
      // Local player score box on left
      const localBoxX = fixedWidth / 2 - 160,
        localBoxY = 10;
      drawRoundedRect(
        ctx,
        localBoxX,
        localBoxY,
        boxWidth,
        boxHeight,
        10,
        "blue"
      );
      // Opponent score box on right
      const oppBoxX = fixedWidth / 2 + 80,
        oppBoxY = 10;
      drawRoundedRect(ctx, oppBoxX, oppBoxY, boxWidth, boxHeight, 10, "red");
      ctx.fillStyle = "white";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        localScore,
        localBoxX + boxWidth / 2,
        localBoxY + boxHeight / 2
      );
      ctx.fillText(
        opponentScore,
        oppBoxX + boxWidth / 2,
        oppBoxY + boxHeight / 2
      );

      // Render game timer
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      const timerBoxX = fixedWidth / 2 - boxWidth / 2;
      const timerBoxY = 10;
      const timerBoxWidth = 120;
      const timerBoxHeight = 50;
      drawRoundedRect(
        ctx,
        timerBoxX,
        timerBoxY,
        timerBoxWidth,
        timerBoxHeight,
        10,
        "black"
      );
      ctx.fillStyle = "white";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
        timerBoxX + timerBoxWidth / 2,
        timerBoxY + timerBoxHeight / 2
      );

      // Check collisions for bullets fired by the main player
      player.current.gun.bullets = player.current.gun.bullets.filter(
        (bullet) => {
          if (
            opponentPlayer.current &&
            bullet.checkCollisionWithPlayer(opponentPlayer.current)
          ) {
            // Calculate new health without directly mutating local object
            const newHealth = Math.max(opponentPlayer.current.health - 20, 0);
            if (socket && socket.readyState === WebSocket.OPEN) {
              const roomId = roomIdRef.current ? roomIdRef.current.value : "";
              socket.send(
                JSON.stringify({
                  type: "PLAYER_HIT",
                  roomId, // safe access
                  clientId: opponentPlayer.current.id,
                  health: newHealth,
                  attackerId: player.current.id,
                })
              );
            }
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
              // NEW: Only apply damage if player is not dead
              if (!player.current.isDead) {
                player.current.health -= 20;
                if (player.current.health < 0) {
                  player.current.health = 0;
                }
                if (socket && socket.readyState === WebSocket.OPEN) {
                  const roomId = roomIdRef.current
                    ? roomIdRef.current.value
                    : "";
                  socket.send(
                    JSON.stringify({
                      type: "PLAYER_HIT",
                      roomId, // safe access
                      clientId: player.current.id,
                      health: player.current.health,
                      attackerId: opponentPlayer.current.id,
                    })
                  );
                }
              }
              return false; // Remove bullet
            }
            return bullet.update(environment, canvas.width, canvas.height);
          });
      }

      ctx.restore();

      // Send player position to the server
      if (socket && socket.readyState === WebSocket.OPEN) {
        const roomId = roomIdRef.current ? roomIdRef.current.value : "";
        socket.send(
          JSON.stringify({
            type: "MOVE",
            roomId, // safe access
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
  }, [
    socket,
    isFullScreen,
    localScore,
    opponentScore,
    timer,
    isRespawning,
    isOpponentDead,
  ]);

  useEffect(() => {
    const handleSocketMessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "UPDATE_POSITION":
          const { clientId, position } = data;
          if (!opponentPlayer.current) {
            opponentPlayer.current = new Player(position.x, position.y, false);
            opponentPlayer.current.id = clientId; // assign opponent id
          } else {
            if (!opponentPlayer.current.id) {
              opponentPlayer.current.id = clientId; // ensure id is set
            }
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
          // data.health is an object mapping playerId -> health
          const healthData = data.health;
          if (healthData && typeof healthData === "object") {
            if (healthData[player.current.id] !== undefined) {
              player.current.health = healthData[player.current.id];
            }
            if (
              opponentPlayer.current &&
              healthData[opponentPlayer.current.id] !== undefined
            ) {
              opponentPlayer.current.health =
                healthData[opponentPlayer.current.id];
            }
          }
          break;

        case "PLAYER_DEATH":
          if (data.playerId === player.current.id) {
            // If current player dies, update opponent score if applicable and mark as dead.
            if (
              opponentPlayer.current &&
              data.attackerId === opponentPlayer.current.id
            ) {
              setOpponentScore((prev) => prev + 10);
            }
            player.current.isDead = true;
            setIsRespawning(true);
            setRespawnCountdown(5);
            // Removed duplicate setTimeout respawn here; will wait for PLAYER_RESPAWN event.
          } else if (
            opponentPlayer.current &&
            data.playerId === opponentPlayer.current.id
          ) {
            // If opponent dies, update local score and mark opponent as dead.
            if (data.attackerId === player.current.id) {
              setLocalScore((prev) => prev + 10);
            }
            opponentPlayer.current.isDead = true;
            setIsOpponentDead(true);
            // Removed duplicate setTimeout respawn here.
          }
          break;

        case "PLAYER_RESPAWN":
          if (data.playerId === player.current.id) {
            player.current.respawn();
            setIsRespawning(false);
            setRespawnCountdown(0);
          } else if (
            opponentPlayer.current &&
            data.playerId === opponentPlayer.current.id
          ) {
            opponentPlayer.current.respawn();
            setIsOpponentDead(false);
          }
          break;

        // New: Handle round time from server
        case "ROUND_TIME":
          setTimer(data.roundTime);
          break;
        // New: Handle score update from server
        case "SCORE_UPDATE":
          if (data.scores) {
            const localId = player.current.id;
            setLocalScore(data.scores[localId] || 0);
            const opponentId = opponentPlayer.current
              ? opponentPlayer.current.id
              : null;
            setOpponentScore(
              opponentId && data.scores[opponentId]
                ? data.scores[opponentId]
                : 0
            );
          }
          break;

        case "ROUND_OVER":
          setIsRoundOver(true);
          // Compute ranking using server scores
          let ranks = [];
          if (opponentPlayer.current) {
            ranks = [
              { id: "You", score: localScore },
              { id: "Opponent", score: opponentScore },
            ];
          } else {
            ranks = [{ id: "You", score: localScore }];
          }
          ranks.sort((a, b) => b.score - a.score);
          setRanking(ranks);
          break;

        case "PLAYER_LEFT":
          setNotification(data.message);
          setTimeout(() => {
            setNotification(null);
          }, 3000);
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
  }, [socket, localScore, opponentScore]);

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
    // Countdown effect when respawning is active
    if (isRespawning && respawnCountdown > 0) {
      const countdownInterval = setInterval(() => {
        setRespawnCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [isRespawning, respawnCountdown]);

  // Remove or comment out the local timer decrement effect:
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     setTimer((prevTimer) => (prevTimer > 0 ? prevTimer - 1 : 0));
  //   }, 1000);
  //   return () => clearInterval(intervalId);
  // }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        player.current &&
        player.current.gun &&
        typeof player.current.gun.handleKeyDown === "function"
      ) {
        player.current.gun.handleKeyDown(event);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
        clientId: player.current.id, // use current player's id
      })
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ROOM_CREATED" && roomIdRef.current) {
        roomIdRef.current.value = data.roomId;
      }
    };
  };

  const joinRoom = () => {
    if (!roomIdRef.current) return;
    const roomId = roomIdRef.current.value; // Get the value from the textarea
    if (roomId) {
      socket.send(
        JSON.stringify({
          type: "JOIN_ROOM",
          roomId,
          clientId: player.current.id, // use current player's id
        })
      );
    }
    toggleFullScreen();
  };

  const toggleFullScreen = () => {
    // Change to request fullscreen on the container div instead of canvas
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullScreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      });
    }
    isRoomDialogOpen && setIsRoomDialogOpen(false);
  };

  const handlePlayerDeath = (playerId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const roomId = roomIdRef.current ? roomIdRef.current.value : "";
      socket.send(
        JSON.stringify({
          type: "PLAYER_DEATH",
          roomId, // safe access
          playerId,
        })
      );
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: "100vh", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      {!isRoomDialogOpen && (
        <button
          onClick={() => setIsRoomDialogOpen(true)}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "10px",
            background: "transparent",
            border: "2px solid white",
            borderRadius: "5px",
            cursor: "pointer",
            zIndex: 1100,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 512"
            fill="white"
            width="40"
            height="40"
          >
            <path
              d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 
            0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"
            />
          </svg>
        </button>
      )}
      {isRespawning && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            fontSize: "24px",
            borderRadius: "10px",
            textAlign: "center",
            zIndex: 1200,
          }}
        >
          <p>You Died. Respawning in {respawnCountdown}s</p>
        </div>
      )}
      {isRoundOver && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.85)",
            color: "#fff",
            zIndex: 1300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h1>
            {ranking.length && ranking[0].id === "You" ? "You win" : "You lose"}
          </h1>
          <h2>Ranking</h2>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {ranking.map((item, index) => (
              <li key={index} style={{ margin: "5px 0", fontSize: "18px" }}>
                {index + 1}. {item.id}: {item.score}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            zIndex: 1500,
          }}
        >
          {notification}
        </div>
      )}
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

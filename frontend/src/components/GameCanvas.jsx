import React, { useEffect, useRef, useState } from "react";
import Environment from "./Environment";
import Player from "./Player";
import Bullet from "./Bullet";

const GameCanvas = ({ socket }) => {
  const canvasRef = useRef(null);
  const roomIdRef = useRef(null);
  const player = useRef(new Player(100, 500)); // Main player instance
  const opponentPlayer = useRef(null); // Opponent player instance
  const environment = new Environment();
  const animationFrameId = useRef(null);
  const fixedWidth = 1280; // Example width
  const fixedHeight = 720;

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
      player.current.update(environment);
      player.current.render(ctx);

      // Render the opponent player
      if (opponentPlayer.current) {
        opponentPlayer.current.render(ctx);
        opponentPlayer.current.gun.updateBullets(
          environment,
          fixedWidth,
          fixedHeight
        );
      }

      // Check collisions for bullets fired by the main player
      player.current.gun.bullets = player.current.gun.bullets.filter(
        (bullet) => {
          if (
            opponentPlayer.current &&
            bullet.checkCollisionWithPlayer(opponentPlayer.current)
          ) {
            // Bullet hit opponent player
            opponentPlayer.current.health -= 20;
            if (opponentPlayer.current.health < 0) {
              opponentPlayer.current.health = 0;
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
              if (player.current.health < 0) {
                player.current.health = 0;
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
  }, [socket]);

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

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} />
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "15px",
          borderRadius: "8px",
          color: "white",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
          maxWidth: "200px",
        }}
      >
        <button
          onClick={createRoom}
          style={{
            display: "block",
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            border: "none",
            borderRadius: "5px",
            backgroundColor: "#4CAF50",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Create Room
        </button>
        <textarea
          ref={roomIdRef}
          placeholder="Enter room ID"
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            resize: "none",
          }}
        ></textarea>
        <button
          onClick={joinRoom}
          style={{
            display: "block",
            width: "100%",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            backgroundColor: "#008CBA",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default GameCanvas;

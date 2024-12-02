import React, { useEffect, useRef, useState } from "react";
import Environment from "./Environment";
import Player from "./Player";

const GameCanvas = ({ socket }) => {
  const canvasRef = useRef(null);
  const roomIdRef = useRef(null);
  const player = useRef(new Player(100, 500)); // Main player instance
  const opponentPlayer = useRef(null); // Opponent player instance
  const environment = new Environment();
  const animationFrameId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render environment and main player
      environment.render(ctx);
      player.current.update(environment);
      player.current.render(ctx);

      // Render the opponent player
      if (opponentPlayer.current) {
        opponentPlayer.current.render(ctx);
      }

      // Send player position to the server
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "MOVE",
            roomId: roomIdRef.current.value,
            position: { x: player.current.x, y: player.current.y },
          })
        );
      }

      animationFrameId.current = requestAnimationFrame(update);
    };

    update();

    // Cleanup animation frame and resize listener
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [socket]);

  useEffect(() => {
    const handleSocketMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "UPDATE_POSITION") {
        const { clientId, position } = data;

        // Update opponent player position
        if (!opponentPlayer.current) {
          opponentPlayer.current = new Player(position.x, position.y); // Create opponent player if not exists
        } else {
          opponentPlayer.current.updatePosition(position.x, position.y); // Update opponent player's position
        }
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
    } else {
      alert("Please enter a room ID to join.");
    }
  };

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef}></canvas>
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

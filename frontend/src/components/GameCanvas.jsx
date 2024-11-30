import React, { useEffect, useRef } from "react";
import Player from "./Player";
import Environment from "./Environment";

const GameCanvas = ({ socket }) => {
  const canvasRef = useRef(null);
  const player = useRef(new Player(100, 500));
  const environment = new Environment();
  const animationFrameId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Set initial canvas size
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      environment.render(ctx);
      player.current.update(environment);
      player.current.render(ctx);

      // Send player position to the server (ensure WebSocket is open)
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "MOVE",
            position: player.current.getPosition(),
          })
        );
      }

      animationFrameId.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      // Cleanup animation frame and resize listener
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [socket]);

  return <canvas ref={canvasRef}></canvas>;
};

export default GameCanvas;

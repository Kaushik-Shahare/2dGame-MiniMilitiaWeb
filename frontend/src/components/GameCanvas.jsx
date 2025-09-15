import React, { useRef, useEffect, useState, useCallback } from "react";
import Player from "./Player";
import Bullet from "./Bullet";
import Environment from "./Environment";
import RoomDialog from "./RoomDialog";

const GameCanvas = ({ socket }) => {
  // Canvas and rendering
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameId = useRef(null);
  
  // Game state
  const fixedWidth = 1280;
  const fixedHeight = 720;
  const environment = new Environment();
  
  // Players and bullets (client-side rendering only)
  const mainPlayerRef = useRef(new Player(100, 500, true));
  const [otherPlayers, setOtherPlayers] = useState(new Map());
  const [bullets, setBullets] = useState(new Map());
  
  // Room and networking
  const roomIdRef = useRef(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Game UI state
  const [scores, setScores] = useState({});
  const [timer, setTimer] = useState(300);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Input handling
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    crouch: false
  });
  
  const mouseRef = useRef({ x: fixedWidth / 2, y: fixedHeight / 2 });
  const lastInputSent = useRef(0);
  const inputSendRate = 30; // 30Hz input sending
  
  // Performance monitoring
  const [fps, setFps] = useState(60);
  const [ping, setPing] = useState(0);
  const fpsCounter = useRef({ frames: 0, lastTime: Date.now() });
  const pingRef = useRef({ lastPingTime: 0, pendingPings: new Map() });

  // WebSocket message handling
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (error) {
        console.error("Error parsing server message:", error);
      }
    };

    const handleOpen = () => {
      setIsConnected(true);
      console.log("Connected to server");
    };

    const handleClose = () => {
      setIsConnected(false);
      console.log("Disconnected from server");
    };

    const handleError = (error) => {
      console.error("WebSocket error:", error);
      setNotification("Connection error");
    };

    socket.addEventListener("message", handleMessage);
    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
    };
  }, [socket]);

  // Handle server messages
  const handleServerMessage = (data) => {
    switch (data.type) {
      case "ROOM_CREATED":
        setNotification(`Room created: ${data.roomId}`);
        break;
        
      case "ROOM_JOINED":
        setNotification("Joined room successfully");
        break;
        
      case "ERROR":
        setNotification(`Error: ${data.message}`);
        break;
        
      case "INITIAL_GAME_STATE":
        // Initialize game state from server
        handleInitialGameState(data);
        break;
        
      case "GAME_STATE":
        // Update game state from server
        handleGameStateUpdate(data);
        break;
        
      case "PLAYER_JOINED":
        setNotification(`Player joined: ${data.player.id}`);
        break;
        
      case "PLAYER_LEFT":
        handlePlayerLeft(data);
        break;
        
      case "PLAYER_HIT":
        handlePlayerHit(data);
        break;
        
      case "PLAYER_DEATH":
        handlePlayerDeath(data);
        break;
        
      case "PLAYER_RESPAWNED":
        handlePlayerRespawned(data);
        break;
        
      case "BULLET_CREATED":
        handleBulletCreated(data);
        break;
        
      case "BULLET_DESTROYED":
        handleBulletDestroyed(data);
        break;
        
      case "ROUND_TIME":
        setTimer(data.roundTime);
        break;
        
      case "ROUND_END":
        handleRoundEnd(data);
        break;
        
      case "ROUND_START":
        setNotification("New round started!");
        break;
        
      case "PING":
        // Handle ping response
        handlePingResponse(data);
        break;
        
      default:
        console.log("Unknown server message:", data.type);
    }
  };

  // Handle initial game state
  const handleInitialGameState = (data) => {
    // Update players
    const newOtherPlayers = new Map();
    
    data.players.forEach(playerState => {
      if (playerState.id === mainPlayerRef.current.id) {
        console.log("Setting main player initial state:", playerState);
        mainPlayerRef.current.updateFromServer(playerState);
        // Ensure position is set immediately for initial state
        mainPlayerRef.current.x = playerState.x;
        mainPlayerRef.current.y = playerState.y;
      } else {
        const player = new Player(playerState.x, playerState.y, false);
        player.updateFromServer(playerState);
        newOtherPlayers.set(playerState.id, player);
      }
    });
    
    setOtherPlayers(newOtherPlayers);
    
    // Update bullets
    const newBullets = new Map();
    data.bullets.forEach(bulletState => {
      newBullets.set(bulletState.id, new Bullet(bulletState));
    });
    setBullets(newBullets);
    
    // Update scores and timer
    setScores(data.scores || {});
    setTimer(data.roundTime || 300);
    
    console.log("Initialized game state with", data.players.length, "players and", data.bullets.length, "bullets");
  };

  // Handle ping response for latency measurement
  const handlePingResponse = (data) => {
    if (data.timestamp && pingRef.current.pendingPings.has(data.timestamp)) {
      const roundTripTime = Date.now() - pingRef.current.pendingPings.get(data.timestamp);
      setPing(roundTripTime);
      pingRef.current.pendingPings.delete(data.timestamp);
    }
  };

  // Send ping to server
  const sendPing = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    const timestamp = Date.now();
    pingRef.current.pendingPings.set(timestamp, timestamp);
    
    socket.send(JSON.stringify({
      type: "PING",
      timestamp: timestamp
    }));
  };

  // Handle game state updates
  const handleGameStateUpdate = (data) => {
    // Update players
    if (data.players && data.players.length > 0) {
      setOtherPlayers(prev => {
        const updated = new Map(prev);
        
        data.players.forEach(playerState => {
          if (playerState.id === mainPlayerRef.current.id) {
            mainPlayerRef.current.updateFromServer(playerState);
          } else {
            if (updated.has(playerState.id)) {
              updated.get(playerState.id).updateFromServer(playerState);
            } else {
              const newPlayer = new Player(playerState.x, playerState.y, false);
              newPlayer.updateFromServer(playerState);
              updated.set(playerState.id, newPlayer);
            }
          }
        });
        
        return updated;
      });
    }

    // Update bullets
    if (data.bullets && data.bullets.length > 0) {
      setBullets(prev => {
        const updated = new Map(prev);
        
        data.bullets.forEach(bulletState => {
          if (updated.has(bulletState.id)) {
            updated.get(bulletState.id).updateFromServer(bulletState);
          } else {
            updated.set(bulletState.id, new Bullet(bulletState));
          }
        });
        
        return updated;
      });
    }
  };

  // Handle player events
  const handlePlayerLeft = (data) => {
    setOtherPlayers(prev => {
      const updated = new Map(prev);
      updated.delete(data.clientId);
      return updated;
    });
    setNotification(`Player ${data.clientId} left`);
  };

  const handlePlayerHit = (data) => {
    // Visual feedback for hit
    if (data.targetId === mainPlayerRef.current.id) {
      setNotification("You were hit!");
    }
    // Add screen shake or other effects here
  };

  const handlePlayerDeath = (data) => {
    setScores(data.scores || {});
    if (data.playerId === mainPlayerRef.current.id) {
      setNotification("You died! Respawning in 3 seconds...");
    } else {
      setNotification(`Player ${data.playerId} was eliminated`);
    }
  };

  const handlePlayerRespawned = (data) => {
    if (data.playerId === mainPlayerRef.current.id) {
      setNotification("You have respawned!");
    }
  };

  const handleBulletCreated = (data) => {
    setBullets(prev => {
      const updated = new Map(prev);
      updated.set(data.bullet.id, new Bullet(data.bullet));
      return updated;
    });
  };

  const handleBulletDestroyed = (data) => {
    setBullets(prev => {
      const updated = new Map(prev);
      const bullet = updated.get(data.bulletId);
      if (bullet) {
        bullet.active = false;
        bullet.fadeOut = true;
        // Let it fade out naturally rather than immediate removal
      }
      return updated;
    });
  };

  const handleRoundEnd = (data) => {
    setScores(data.scores || {});
    setNotification("Round ended! New round starting in 10 seconds...");
  };

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const player = mainPlayerRef.current;
      player.handleKeyDown(e);
      
      // Update local key state
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.right = true;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.left = true;
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
        keysRef.current.up = true;
      }
      if (e.key === "Control" || e.key === "ControlLeft" || e.key === "ControlRight") {
        keysRef.current.crouch = true;
      }
      
      // Handle reload
      if (e.key.toLowerCase() === "r") {
        sendPlayerInput({ type: "RELOAD" });
      }
    };

    const handleKeyUp = (e) => {
      const player = mainPlayerRef.current;
      player.handleKeyUp(e);
      
      // Update local key state
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "d" || e.key === "a" || e.key === "D" || e.key === "A") {
        keysRef.current.right = false;
        keysRef.current.left = false;
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
        keysRef.current.up = false;
      }
      if (e.key === "Control" || e.key === "ControlLeft" || e.key === "ControlRight") {
        keysRef.current.crouch = false;
      }
    };

    const handleMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = fixedWidth / rect.width;
      const scaleY = fixedHeight / rect.height;
      
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
      
      mainPlayerRef.current.updateGunAngle(mouseRef.current.x, mouseRef.current.y);
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) { // Left click
        sendPlayerInput({ type: "SHOOT" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Send player input to server
  const sendPlayerInput = (inputData) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
      type: "PLAYER_INPUT",
      ...inputData
    }));
  };

  // Regular input updates to server
  useEffect(() => {
    const sendInputUpdates = () => {
      const now = Date.now();
      if (now - lastInputSent.current < 1000 / inputSendRate) return;
      
      const inputState = mainPlayerRef.current.getInputState();
      if (inputState) {
        sendPlayerInput({
          type: "MOVE",
          keys: inputState.keys,
          gunAngle: inputState.gunAngle
        });
      }
      
      lastInputSent.current = now;
    };

    const interval = setInterval(sendInputUpdates, 1000 / inputSendRate);
    return () => clearInterval(interval);
  }, [socket]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const now = Date.now();
      
      // Calculate FPS
      fpsCounter.current.frames++;
      if (now - fpsCounter.current.lastTime >= 1000) {
        setFps(fpsCounter.current.frames);
        fpsCounter.current.frames = 0;
        fpsCounter.current.lastTime = now;
      }

      // Clear canvas
      ctx.clearRect(0, 0, fixedWidth, fixedHeight);

      // Calculate scale for responsive canvas
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / fixedWidth;
      const scaleY = rect.height / fixedHeight;

      // Render environment
      environment.render(ctx, scaleX, scaleY);

      // Update and render main player with prediction
      const deltaTime = 16.67; // Assume 60fps
      mainPlayerRef.current.predictiveUpdate(keysRef.current, deltaTime);
      mainPlayerRef.current.render(ctx);

      // Update and render other players with interpolation
      otherPlayers.forEach(player => {
        player.interpolateUpdate();
        player.render(ctx);
      });

      // Update and render bullets
      setBullets(prev => {
        const updated = new Map();
        
        prev.forEach((bullet, id) => {
          if (bullet.update(deltaTime)) {
            bullet.render(ctx);
            updated.set(id, bullet);
          }
        });
        
        return updated;
      });

      // Render UI
      renderUI(ctx);

      animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [otherPlayers, bullets]);

  // Ping monitoring
  useEffect(() => {
    if (!socket) return;

    const pingInterval = setInterval(() => {
      sendPing();
    }, 2000); // Send ping every 2 seconds

    return () => clearInterval(pingInterval);
  }, [socket]);

  // Render UI elements with rich HUD from old version
  const renderUI = (ctx) => {
    // Load health and jetpack icons if not already loaded
    if (!window.healthIcon) {
      window.healthIcon = new Image();
      window.healthIcon.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="red">
          <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.04L12,21.35Z"/>
        </svg>
      `);
    }
    if (!window.jetpackIcon) {
      window.jetpackIcon = new Image();
      window.jetpackIcon.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="blue">
          <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
        </svg>
      `);
    }
    if (!window.gunSkin) {
      window.gunSkin = new Image();
      window.gunSkin.src = "/Ak-47.png";
    }
    if (!window.reloadSVG) {
      window.reloadSVG = new Image();
      window.reloadSVG.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" fill="none"/>
          <text x="12" y="16" text-anchor="middle" fill="white" font-size="16">∞</text>
        </svg>
      `);
    }

    const mainPlayer = mainPlayerRef.current;
    
    // Helper function to draw rounded rectangles
    const drawRoundedRect = (x, y, width, height, radius, fillColor) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    // Health bar and jetpack fuel (top right)
    const healthBarX = fixedWidth - 230;
    const healthBarY = 30;
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    
    // Health bar
    ctx.fillStyle = "#A020F0";
    ctx.fillRect(healthBarX, healthBarY, (mainPlayer.health / 100) * healthBarWidth, healthBarHeight);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // Jetpack fuel bar
    const jetpackFuelX = fixedWidth - 230;
    const jetpackFuelY = 60;
    const jetpackFuelWidth = 200;
    const jetpackFuelHeight = 20;
    ctx.fillStyle = "blue";
    ctx.fillRect(jetpackFuelX, jetpackFuelY, (mainPlayer.jetpackFuel / 100) * jetpackFuelWidth, jetpackFuelHeight);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(jetpackFuelX, jetpackFuelY, jetpackFuelWidth, jetpackFuelHeight);

    // Draw icons for health and fuel
    const iconWidth = 20;
    const iconHeight = 20;
    if (window.healthIcon?.complete) {
      ctx.drawImage(window.healthIcon, healthBarX - iconWidth - 10, healthBarY, iconWidth, iconHeight);
    }
    if (window.jetpackIcon?.complete) {
      ctx.drawImage(window.jetpackIcon, jetpackFuelX - iconWidth - 10, jetpackFuelY, iconWidth, iconHeight);
    }

    // Border around health/fuel bars
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      healthBarX - iconWidth - 15,
      healthBarY - 10,
      healthBarWidth + iconWidth + 20,
      healthBarHeight + jetpackFuelHeight + 30
    );

    // Score boxes (top center area)
    const boxWidth = 100;
    const boxHeight = 40;
    
    // Get own score and first opponent score for display
    const scoreEntries = Object.entries(scores);
    const ownScore = scores[mainPlayer.id] || 0;
    const opponentScore = scoreEntries.find(([id]) => id !== mainPlayer.id)?.[1] || 0;
    
    // Local player score (blue box, left side)
    const localBoxX = fixedWidth / 2 - 160;
    const localBoxY = 10;
    drawRoundedRect(localBoxX, localBoxY, boxWidth, boxHeight, 10, "blue");
    
    // Opponent score (red box, right side)
    const oppBoxX = fixedWidth / 2 + 80;
    const oppBoxY = 10;
    drawRoundedRect(oppBoxX, oppBoxY, boxWidth, boxHeight, 10, "red");
    
    // Score text
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ownScore, localBoxX + boxWidth / 2, localBoxY + boxHeight / 2);
    ctx.fillText(opponentScore, oppBoxX + boxWidth / 2, oppBoxY + boxHeight / 2);

    // Timer (top center)
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const timerBoxX = fixedWidth / 2 - 60;
    const timerBoxY = 10;
    const timerBoxWidth = 120;
    const timerBoxHeight = 50;
    drawRoundedRect(timerBoxX, timerBoxY, timerBoxWidth, timerBoxHeight, 10, "black");
    ctx.fillStyle = timer <= 60 ? "red" : "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
      timerBoxX + timerBoxWidth / 2,
      timerBoxY + timerBoxHeight / 2
    );

    // Gun stats (top left)
    const gunStatsX = 100;
    const gunStatsY = 20;
    const gunStatsWidth = 200;
    const gunStatsHeight = 40;
    
    // Border around gun stats
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(gunStatsX - 10, gunStatsY - 10, gunStatsWidth + 20, gunStatsHeight + 20);
    
    // Draw gun image
    if (window.gunSkin?.complete) {
      ctx.drawImage(window.gunSkin, gunStatsX + 20, gunStatsY, gunStatsWidth - 40, gunStatsHeight);
    }
    
    // Draw ammo count
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(`${mainPlayer.ammo || 25} / ${mainPlayer.maxAmmo || 25}`, gunStatsX + 160, gunStatsY + 35);
    
    // Draw reload indicator if reloading
    if (mainPlayer.isReloading && window.reloadSVG?.complete) {
      const iconSize = 30;
      ctx.drawImage(
        window.reloadSVG,
        gunStatsX + (gunStatsWidth - iconSize) / 2,
        gunStatsY + (gunStatsHeight - iconSize) / 2,
        iconSize,
        iconSize
      );
    }

    // Performance metrics (top right corner)
    ctx.textAlign = "right";
    ctx.fillStyle = "yellow";
    ctx.font = "14px Arial";
    ctx.fillText(`FPS: ${fps}`, fixedWidth - 20, 110);
    
    // Ping/Connection status
    ctx.fillStyle = isConnected ? "green" : "red";
    ctx.fillText(isConnected ? `${ping}ms` : "DISCONNECTED", fixedWidth - 20, 130);

    // All scores list (if there are multiple players)
    if (scoreEntries.length > 2) {
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      let yOffset = 150;
      
      ctx.fillText("Scores:", 20, yOffset);
      yOffset += 20;
      
      scoreEntries.forEach(([playerId, score]) => {
        const isOwn = playerId === mainPlayer.id;
        ctx.fillStyle = isOwn ? "yellow" : "white";
        ctx.fillText(`${playerId}: ${score}`, 30, yOffset);
        yOffset += 18;
      });
    }

    // Notification
    if (notification) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(fixedWidth / 2 - 200, fixedHeight - 80, 400, 40);
      
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(notification, fixedWidth / 2, fixedHeight - 55);
    }
  };

  // Room management functions
  const createRoom = () => {
    if (!socket) return;
    
    const clientId = `player_${Math.random().toString(36).substr(2, 9)}`;
    mainPlayerRef.current.id = clientId;
    
    socket.send(JSON.stringify({
      type: "CREATE_ROOM",
      clientId: clientId,
      name: "Player"
    }));
    
    setIsRoomDialogOpen(false);
  };

  const joinRoom = () => {
    const roomId = roomIdRef.current?.value;
    if (!socket || !roomId) return;
    
    const clientId = `player_${Math.random().toString(36).substr(2, 9)}`;
    mainPlayerRef.current.id = clientId;
    
    socket.send(JSON.stringify({
      type: "JOIN_ROOM",
      roomId: roomId,
      clientId: clientId,
      name: "Player"
    }));
    
    setIsRoomDialogOpen(false);
  };

  const toggleFullScreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullScreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Clear notifications after a few seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "black",
      }}
    >
      <canvas
        ref={canvasRef}
        width={fixedWidth}
        height={fixedHeight}
        style={{
          border: "2px solid white",
          maxWidth: "100%",
          maxHeight: "100%",
          cursor: "crosshair",
        }}
      />
      
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
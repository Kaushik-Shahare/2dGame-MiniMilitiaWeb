import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Player from "./Player";
import Bullet from "./Bullet";
import Environment from "./Environment";
import RoomDialog from "./RoomDialog";

const GameCanvas = ({ socket, isConnected }) => {
  // Canvas and rendering
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Track socket for debugging
  useEffect(() => {
    console.log("Socket changed:", socket ? "connected" : "null/undefined", socket?.readyState);
  }, [socket]);
  const animationFrameId = useRef(null);
  
  // Game state - fixed viewport size (camera view)
  const [canvasSize, setCanvasSize] = useState({ 
    width: 1280, // Fixed camera viewport width
    height: 720  // Fixed camera viewport height
  });
  
  // Camera state for world following
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const worldWidth = 720 * 3; // 2160 pixels - large horizontal world
  const worldHeight = 720;
  // Initialize environment once
  const environment = useMemo(() => new Environment(), []);
  
  // Players and bullets (client-side rendering only)
  const mainPlayerRef = useRef(new Player(worldWidth / 2, 550, true)); // Start in center of world
  const [otherPlayers, setOtherPlayers] = useState(new Map());
  const [bullets, setBullets] = useState(new Map());
  
  // Room and networking
  const roomIdRef = useRef(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(true);
  
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
  
  const mouseRef = useRef({ x: 640, y: 360 });
  
  // Joystick-style mouse constraint system
  // Constants
  const JOYSTICK_RADIUS = 75; // Fixed radius for mouse constraint (reduced by half)
  const constrainedMouseRef = useRef({ x: 640, y: 360, worldX: 640, worldY: 360 });
  
  // Pointer lock for cursor constraint
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const virtualCursorRef = useRef({ x: 640, y: 360 }); // Virtual cursor position when pointer locked
  
  // Request pointer lock function
  const requestPointerLock = useCallback(() => {
    if (canvasRef.current && document.pointerLockElement !== canvasRef.current) {
      console.log("Requesting pointer lock for game mode...");
      // Small delay to ensure canvas is ready
      setTimeout(() => {
        canvasRef.current.requestPointerLock();
      }, 100);
    }
  }, []);

  // Exit pointer lock function  
  const exitPointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      console.log("Exiting pointer lock...");
      document.exitPointerLock();
    }
  }, []);
  
  const lastInputSent = useRef(0);
  const inputSendRate = 30; // 30Hz input sending

  // Handle window resize - maintain fixed viewport, scale to fit screen
  useEffect(() => {
    const handleResize = () => {
      // Canvas always maintains fixed viewport size (1280x720)
      // CSS will scale it to fit the screen
      setCanvasSize({
        width: 1280,  // Fixed camera viewport width
        height: 720   // Fixed camera viewport height
      });
    };

    // Set initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
      console.log("Connected to server");
    };

    const handleClose = () => {
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
        console.log("Room created successfully, requesting pointer lock...");
        requestPointerLock();
        break;
        
      case "ROOM_JOINED":
        setNotification("Joined room successfully");
        console.log("Joined room successfully, requesting pointer lock...");
        requestPointerLock();
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
    console.log("Received ping response:", data);
    if (data.timestamp && pingRef.current.pendingPings.has(data.timestamp)) {
      const roundTripTime = Date.now() - pingRef.current.pendingPings.get(data.timestamp);
      console.log("Calculated ping:", roundTripTime + "ms");
      setPing(roundTripTime);
      pingRef.current.pendingPings.delete(data.timestamp);
    } else {
      console.log("Ping response timestamp not found in pending pings");
    }
  };

  // Send ping to server
  const sendPing = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log("Cannot send ping - socket not ready");
      return;
    }
    
    const timestamp = Date.now();
    pingRef.current.pendingPings.set(timestamp, timestamp);
    
    console.log("Sending ping with timestamp:", timestamp);
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
    console.log("Bullet created:", data.bullet);
    setBullets(prev => {
      const updated = new Map(prev);
      const bullet = new Bullet(data.bullet);
      updated.set(data.bullet.id, bullet);
      return updated;
    });
    
    // Trigger gun flash effect and sound for the shooter
    const shooterId = data.bullet.ownerId;
    if (shooterId === mainPlayerRef.current.id) {
      mainPlayerRef.current.lastShot = Date.now();
      // Play shooting sound
      playGunSound();
    } else {
      // Update other player's lastShot for gun flash
      setOtherPlayers(prev => {
        const updated = new Map(prev);
        const shooter = updated.get(shooterId);
        if (shooter) {
          shooter.lastShot = Date.now();
        }
        return updated;
      });
      
      // Play distant shooting sound for other players
      playGunSound(0.3); // Reduced volume for other players
    }
  };

  // Play gun shooting sound
  const playGunSound = (volume = 0.6) => {
    try {
      const audio = new Audio('/sounds/submachineGun.mp3');
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Could not play gun sound:', e.message));
    } catch (error) {
      console.log('Gun sound not available');
    }
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
      
      // Handle ESC key to exit pointer lock
      if (e.key === "Escape" && document.pointerLockElement) {
        console.log("ESC pressed, exiting pointer lock...");
        exitPointerLock();
        return;
      }
      
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
      
      let screenX, screenY;
      
      if (document.pointerLockElement === canvas) {
        // Pointer lock mode: use relative movement to update virtual cursor
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        
        // Update virtual cursor position with relative movement
        virtualCursorRef.current.x += e.movementX;
        virtualCursorRef.current.y += e.movementY;
        
        // Constrain virtual cursor to joystick radius
        const deltaX = virtualCursorRef.current.x - centerX;
        const deltaY = virtualCursorRef.current.y - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > JOYSTICK_RADIUS) {
          // Constrain to radius
          const normalizedX = deltaX / distance;
          const normalizedY = deltaY / distance;
          virtualCursorRef.current.x = centerX + normalizedX * JOYSTICK_RADIUS;
          virtualCursorRef.current.y = centerY + normalizedY * JOYSTICK_RADIUS;
        }
        
        screenX = virtualCursorRef.current.x;
        screenY = virtualCursorRef.current.y;
      } else {
        // Normal mode: use mouse position
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvasSize.width / rect.width;
        const scaleY = canvasSize.height / rect.height;
        
        // Convert screen coordinates to canvas coordinates
        screenX = (e.clientX - rect.left) * scaleX;
        screenY = (e.clientY - rect.top) * scaleY;
      }
      
      // Store raw mouse position
      mouseRef.current.x = screenX;
      mouseRef.current.y = screenY;
      
      // Calculate screen center
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;
      
      // Calculate offset from center
      const deltaX = screenX - centerX;
      const deltaY = screenY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Debug logging for constraint verification
      if (distance > JOYSTICK_RADIUS) {
        console.log(`Constraining: distance=${distance.toFixed(1)}, radius=${JOYSTICK_RADIUS}`);
      }
      
      // Constrain to joystick radius
      let constrainedX, constrainedY;
      if (distance > JOYSTICK_RADIUS) {
        // Normalize and scale to radius
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;
        constrainedX = centerX + normalizedX * JOYSTICK_RADIUS;
        constrainedY = centerY + normalizedY * JOYSTICK_RADIUS;
        
        // Verify constraint worked
        const constrainedDistance = Math.sqrt(
          (constrainedX - centerX) * (constrainedX - centerX) + 
          (constrainedY - centerY) * (constrainedY - centerY)
        );
        console.log(`Constrained distance: ${constrainedDistance.toFixed(1)}`);
      } else {
        // Within radius, use actual position
        constrainedX = screenX;
        constrainedY = screenY;
      }
      
      // Convert constrained position to world coordinates
      const worldX = constrainedX + camera.x;
      const worldY = constrainedY + camera.y;
      
      // Store constrained coordinates
      constrainedMouseRef.current.x = constrainedX;
      constrainedMouseRef.current.y = constrainedY;
      constrainedMouseRef.current.worldX = worldX;
      constrainedMouseRef.current.worldY = worldY;
      
      // Calculate gun angle from screen center to constrained position
      const angleFromCenter = Math.atan2(constrainedY - centerY, constrainedX - centerX);
      
      // Update gun angle using the calculated angle from center
      mainPlayerRef.current.updateGunAngleFromCenter(angleFromCenter);
    };

    const handleMouseDown = (e) => {
      console.log("Mouse down event, socket:", socket ? "available" : "null", "readyState:", socket?.readyState);
      
      if (e.button === 0) { // Left click
        console.log("Left click detected, sending SHOOT");
        sendPlayerInput({ type: "SHOOT" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    
    // Pointer lock event handlers
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      setIsPointerLocked(isLocked);
      
      if (isLocked) {
        // Initialize virtual cursor to center when pointer lock is acquired
        virtualCursorRef.current.x = canvasSize.width / 2;
        virtualCursorRef.current.y = canvasSize.height / 2;
        console.log("Pointer lock acquired, cursor constrained to joystick radius");
      } else {
        console.log("Pointer lock released");
      }
    };
    
    const handlePointerLockError = () => {
      console.log("Pointer lock failed");
      setIsPointerLocked(false);
    };
    
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("pointerlockerror", handlePointerLockError);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("pointerlockerror", handlePointerLockError);
    };
  }, []);

  // Render UI elements
  const renderUI = useCallback((ctx) => {
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
    const healthBarX = canvasSize.width - 230;
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
    const jetpackFuelX = canvasSize.width - 230;
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
    const localBoxX = canvasSize.width / 2 - 160;
    const localBoxY = 10;
    drawRoundedRect(localBoxX, localBoxY, boxWidth, boxHeight, 10, "blue");
    
    // Opponent score (red box, right side)
    const oppBoxX = canvasSize.width / 2 + 80;
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
    const timerBoxX = canvasSize.width / 2 - 50;
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
    ctx.fillText(`FPS: ${fps}`, canvasSize.width - 20, 110);
    
    // Ping/Connection status
    ctx.fillStyle = isConnected ? "green" : "red";
    ctx.fillText(isConnected ? `${ping}ms` : "DISCONNECTED", canvasSize.width - 20, 130);

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
      ctx.fillRect(canvasSize.width / 2 - 200, canvasSize.height - 80, 400, 40);
      
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(notification, canvasSize.width / 2, canvasSize.height - 55);
    }
  }, [canvasSize.width, canvasSize.height, notification, fps, ping, isConnected, scores, timer]);

  // Camera following logic
  useEffect(() => {
    const updateCamera = () => {
      const player = mainPlayerRef.current;
      if (!player) return;

      // Calculate ideal camera position (center player on screen)
      let idealCameraX = player.x - canvasSize.width / 2;
      let idealCameraY = player.y - canvasSize.height / 2;

      // Apply camera boundaries (stop following at world edges)
      const cameraX = Math.max(0, Math.min(idealCameraX, worldWidth - canvasSize.width));
      const cameraY = Math.max(0, Math.min(idealCameraY, worldHeight - canvasSize.height));

      setCamera({ x: cameraX, y: cameraY });
    };

    // Update camera position frequently for smooth following
    const cameraInterval = setInterval(updateCamera, 16); // ~60fps camera updates

    return () => clearInterval(cameraInterval);
  }, [canvasSize.width, canvasSize.height, worldWidth, worldHeight]);

  // Send player input to server
  const sendPlayerInput = (inputData) => {
    if (!socket) {
      console.log("Socket is null/undefined");
      return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, state:", socket.readyState, "CONNECTING:", WebSocket.CONNECTING, "OPEN:", WebSocket.OPEN, "CLOSED:", WebSocket.CLOSED);
      return;
    }
    
    const message = {
      type: "PLAYER_INPUT",
      ...inputData
    };
    
    console.log("Sending message:", message);
    socket.send(JSON.stringify(message));
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
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // Calculate scale for responsive canvas
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvasSize.width;
      const scaleY = rect.height / canvasSize.height;

      // Render environment with camera offset
      environment.render(ctx, scaleX, scaleY, canvasSize.width, canvasSize.height, camera.x, camera.y);

      // Apply camera translation for all game objects
      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.translate(-camera.x, -camera.y);

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
      const bulletsToRemove = [];
      
      bullets.forEach((bullet, id) => {
        if (bullet.update(deltaTime)) {
          bullet.render(ctx);
        } else {
          bulletsToRemove.push(id);
        }
      });

      // Restore context after camera translation for game objects
      ctx.restore();
      
      // Remove inactive bullets after the loop
      if (bulletsToRemove.length > 0) {
        setBullets(prev => {
          const updated = new Map(prev);
          bulletsToRemove.forEach(id => updated.delete(id));
          return updated;
        });
      }

      // Render UI (not affected by camera)
      renderUI(ctx);
      
      // Render crosshair at mouse position (screen-space, not affected by camera)
      renderCrosshair(ctx);

      animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [otherPlayers, bullets, canvasSize.width, canvasSize.height, environment, renderUI, camera.x, camera.y]);

  // Ping monitoring
  useEffect(() => {
    if (!socket) return;

    const pingInterval = setInterval(() => {
      sendPing();
    }, 2000); // Send ping every 2 seconds

    return () => clearInterval(pingInterval);
  }, [socket]);

  // Render joystick-style aiming system
  const renderCrosshair = (ctx) => {
    const mouseX = constrainedMouseRef.current.x;
    const mouseY = constrainedMouseRef.current.y;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    ctx.save();
    
    // Draw center dot (joystick center)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw crosshair at aiming position
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1.0;
    
    const crosshairSize = 12;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(mouseX - crosshairSize, mouseY);
    ctx.lineTo(mouseX - 4, mouseY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(mouseX + 4, mouseY);
    ctx.lineTo(mouseX + crosshairSize, mouseY);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY - crosshairSize);
    ctx.lineTo(mouseX, mouseY - 4);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY + 4);
    ctx.lineTo(mouseX, mouseY + crosshairSize);
    ctx.stroke();
    
    // Center targeting dot
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
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
      const wasFullScreen = isFullScreen;
      const nowFullScreen = !!document.fullscreenElement;
      setIsFullScreen(nowFullScreen);
      
      // Request pointer lock when entering fullscreen
      if (!wasFullScreen && nowFullScreen) {
        console.log("Entered fullscreen, requesting pointer lock...");
        requestPointerLock();
      }
      // Exit pointer lock when leaving fullscreen
      else if (wasFullScreen && !nowFullScreen) {
        console.log("Exited fullscreen, releasing pointer lock...");
        exitPointerLock();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullScreen, requestPointerLock, exitPointerLock]);

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
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          border: "2px solid white",
          maxWidth: "100%",
          maxHeight: "100%",
          cursor: "none", // Hide cursor since we draw our own crosshair
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
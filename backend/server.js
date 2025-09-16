require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const WebSocket = require("ws");
const GameRoom = require('./GameRoom');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the MiniMilitia multiplayer backend - Server Authoritative!");
});

app.get("/stats", (req, res) => {
  const stats = {
    activeRooms: gameRooms.size,
    totalPlayers: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.players.size, 0),
    totalBullets: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.bullets.size, 0),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    roomDetails: Array.from(gameRooms.values()).map(room => room.getStats())
  };
  res.json(stats);
});

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Store game rooms with server-side game logic
const gameRooms = new Map(); // roomId -> GameRoom instance

// Performance monitoring
setInterval(() => {
  if (gameRooms.size > 0) {
    console.log(`\n=== Server Statistics ===`);
    console.log(`Active rooms: ${gameRooms.size}`);
    
    let totalPlayers = 0;
    let totalBullets = 0;
    
    gameRooms.forEach((room, roomId) => {
      const stats = room.getStats();
      totalPlayers += stats.playerCount;
      totalBullets += stats.bulletCount;
      
      if (stats.playerCount > 0) {
        console.log(`Room ${roomId}: ${stats.playerCount} players, ${stats.bulletCount} bullets, avg tick: ${stats.avgTickTime}ms`);
      }
    });
    
    console.log(`Total: ${totalPlayers} players, ${totalBullets} bullets`);
    console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`=========================\n`);
  }
}, 30000); // Every 30 seconds

// WebSocket connection handling
wss.on("connection", (ws) => {
  let clientId = null;
  let roomId = null;
  let currentRoom = null;

  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "CREATE_ROOM":
          roomId = generateRoomId();
          clientId = data.clientId;
          
          // Create new game room with server-side logic
          currentRoom = new GameRoom(roomId);
          gameRooms.set(roomId, currentRoom);
          
          // Add player to the room
          currentRoom.addPlayer(clientId, ws, data.name || "Player");
          
          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          console.log(`Room created: ${roomId} by player ${clientId}`);
          break;

        case "JOIN_ROOM":
          roomId = data.roomId;
          clientId = data.clientId;
          
          if (gameRooms.has(roomId)) {
            currentRoom = gameRooms.get(roomId);
            
            // Check room capacity (max 8 players)
            if (currentRoom.players.size < 8) {
              currentRoom.addPlayer(clientId, ws, data.name || "Player");
              
              ws.send(JSON.stringify({ 
                type: "ROOM_JOINED", 
                roomId,
                message: `Joined room ${roomId}` 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: "ERROR", 
                message: "Room is full" 
              }));
            }
          } else {
            ws.send(JSON.stringify({ 
              type: "ERROR", 
              message: "Room does not exist" 
            }));
          }
          break;

        case "PLAYER_INPUT":
          console.log("Received PLAYER_INPUT:", data);
          // Handle all player input through the game room
          if (currentRoom && clientId) {
            currentRoom.handlePlayerInput(clientId, data);
          }
          break;

        // Legacy support for old message types (redirect to PLAYER_INPUT)
        case "MOVE":
          if (currentRoom && clientId) {
            currentRoom.handlePlayerInput(clientId, {
              type: "MOVE",
              keys: data.keys,
              gunAngle: data.gunAngle
            });
          }
          break;

        case "SHOOT":
          if (currentRoom && clientId) {
            currentRoom.handlePlayerInput(clientId, {
              type: "SHOOT"
            });
          }
          break;

        case "PLAYER_HIT":
          // Server now handles hit detection, ignore client messages
          console.log("Client sent PLAYER_HIT - ignored (server authoritative)");
          break;

        case "PLAYER_DEATH":
          // Server now handles death detection, ignore client messages  
          console.log("Client sent PLAYER_DEATH - ignored (server authoritative)");
          break;

        case "RTC_OFFER":
        case "RTC_ANSWER":
        case "RTC_ICE":
          // Still allow WebRTC signaling for voice/video
          if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            const targetClient = Array.from(room.clients).find(
              client => client._clientId === data.targetClientId
            );
            
            if (targetClient) {
              targetClient.send(JSON.stringify({
                type: data.type,
                payload: data.payload,
                senderClientId: clientId,
              }));
            }
          }
          break;

        case "PING":
          // Handle ping for latency measurement
          console.log("Received ping from client:", data.timestamp);
          ws.send(JSON.stringify({
            type: "PING",
            timestamp: data.timestamp
          }));
          console.log("Sent ping response with timestamp:", data.timestamp);
          break;

        default:
          console.error("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Invalid message received:", message, "Error:", error.message);
    }
  });

  ws.on("close", () => {
    if (currentRoom && clientId) {
      currentRoom.removePlayer(clientId, ws);
      
      // Clean up empty rooms
      if (currentRoom.players.size === 0) {
        currentRoom.destroy();
        gameRooms.delete(roomId);
        console.log(`Empty room ${roomId} cleaned up`);
      }
    }
    
    console.log(`Client ${clientId} disconnected from room: ${roomId}`);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err.message);
  });

  // Store clientId for WebRTC signaling
  ws._clientId = clientId;
});

// Helper to generate unique room IDs
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

console.log(`WebSocket server running on ws://localhost:${PORT}`);
console.log("Server-authoritative game architecture enabled!");

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Clean up all game rooms
  gameRooms.forEach((room) => {
    room.destroy();
  });
  gameRooms.clear();
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
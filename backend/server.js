require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the multiplayer Express backend!");
});

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Store rooms
const rooms = new Map(); // roomId -> { players: Set of clients, scores: {}, health: {}, dead: {} }

// WebSocket connection handling
wss.on("connection", (ws) => {
  let clientId = null;
  let roomId = null;

  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "CREATE_ROOM":
          // Generate a unique room ID
          roomId = generateRoomId();
          rooms.set(roomId, {
            players: new Set(),
            scores: {},
            health: {},
            dead: {},
          });
          rooms.get(roomId).players.add(ws);
          clientId = data.clientId;
          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          console.log(`Room created: ${roomId}`);
          break;

        case "JOIN_ROOM":
          roomId = data.roomId;
          if (rooms.has(roomId) && rooms.get(roomId).players.size < 2) {
            rooms.get(roomId).players.add(ws);
            rooms.get(roomId).scores[data.clientId] = 0;
            rooms.get(roomId).health[data.clientId] = 100; // Initialize health
            rooms.get(roomId).dead[data.clientId] = false; // Initialize dead flag
            clientId = data.clientId;
            ws.send(JSON.stringify({ type: "ROOM_JOINED", roomId }));
            broadcastToRoom(roomId, {
              type: "PLAYER_JOINED",
              clientId,
            });
            console.log(`Client ${clientId} joined room: ${roomId}`);
          } else {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Room is full or does not exist",
              })
            );
          }
          break;

        case "MOVE":
          if (roomId && rooms.has(roomId)) {
            broadcastToRoom(
              roomId,
              {
                type: "UPDATE_POSITION",
                clientId,
                position: data.position,
              },
              ws
            );
          }
          break;

        case "SHOOT":
          if (roomId && rooms.has(roomId)) {
            broadcastToRoom(
              roomId,
              {
                type: "SHOOT",
                clientId,
                position: data.position,
              },
              ws
            );
          }
          break;

        case "PLAYER_HIT":
          if (roomId && rooms.has(roomId)) {
            // data should have: clientId, health, attackerId
            rooms.get(roomId).health[data.clientId] = data.health;
            broadcastToRoom(roomId, {
              type: "PLAYER_HIT",
              clientId: data.clientId,
              health: data.health,
            });
            // When a player's health falls to 0, update score and schedule respawn
            if (data.health <= 0) {
              rooms.get(roomId).scores[data.attackerId] =
                (rooms.get(roomId).scores[data.attackerId] || 0) + 10;
              rooms.get(roomId).dead[data.clientId] = true;
              broadcastToRoom(roomId, {
                type: "PLAYER_DEATH",
                playerId: data.clientId,
                attackerId: data.attackerId,
              });
              setTimeout(() => {
                rooms.get(roomId).dead[data.clientId] = false;
                rooms.get(roomId).health[data.clientId] = 100;
                broadcastToRoom(roomId, {
                  type: "PLAYER_RESPAWN",
                  playerId: data.clientId,
                  health: 100,
                });
              }, 5000);
            }
          }
          break;

        case "PLAYER_DEATH":
          if (roomId && rooms.has(roomId)) {
            rooms.get(roomId).scores[data.playerId] += 10; // Add score to the player who killed
            rooms.get(roomId).dead[data.playerId] = true; // Set dead flag
            broadcastToRoom(roomId, data);
            setTimeout(() => {
              rooms.get(roomId).dead[data.playerId] = false; // Reset dead flag
              broadcastToRoom(roomId, {
                type: "PLAYER_RESPAWN",
                playerId: data.playerId,
              });
            }, 5000); // Respawn player after 5 seconds
          }
          break;

        default:
          console.error("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Invalid message received:", message);
    }
  });

  ws.on("close", () => {
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId).players.delete(ws);
      delete rooms.get(roomId).scores[clientId];
      delete rooms.get(roomId).health[clientId];
      delete rooms.get(roomId).dead[clientId];
      broadcastToRoom(roomId, { type: "PLAYER_LEFT", clientId });
      console.log(`Client ${clientId} disconnected from room: ${roomId}`);

      // Clean up empty room
      if (rooms.get(roomId).players.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted`);
      }
    }
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err.message);
  });
});

// Helper to generate unique room IDs
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

// Broadcast to all clients in a specific room
function broadcastToRoom(roomId, message, excludeClient = null) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).players.forEach((client) => {
      if (client !== excludeClient) {
        try {
          client.send(JSON.stringify(message));
        } catch (err) {
          console.error("Error sending message to client:", err.message);
        }
      }
    });
  }
}

console.log(`WebSocket server running on ws://localhost:${PORT}`);

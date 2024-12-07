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
const rooms = new Map(); // roomId -> Set of clients

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
          rooms.set(roomId, new Set());
          rooms.get(roomId).add(ws);
          clientId = data.clientId;
          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          console.log(`Room created: ${roomId}`);
          break;

        case "JOIN_ROOM":
          roomId = data.roomId;
          if (rooms.has(roomId) && rooms.get(roomId).size < 2) {
            rooms.get(roomId).add(ws);
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

        default:
          console.error("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Invalid message received:", message);
    }
  });

  ws.on("close", () => {
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId).delete(ws);
      broadcastToRoom(roomId, { type: "PLAYER_LEFT", clientId });
      console.log(`Client ${clientId} disconnected from room: ${roomId}`);

      // Clean up empty room
      if (rooms.get(roomId).size === 0) {
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
function broadcastToRoom(roomId, message) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).forEach((client) => {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        console.error("Error sending message to client:", err.message);
      }
    });
  }
}

// Broadcast to all clients in a specific room except one(sender)
function broadcastToRoom(roomId, message, clientId) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).forEach((client) => {
      if (client !== clientId) {
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

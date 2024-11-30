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
  res.send("Welcome to the Express backend!");
});

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

// Set up WebSocket server and attach it to the same HTTP server
const wss = new WebSocket.Server({ server });

// Store clients
const clients = new Map();

// WebSocket connection handling
wss.on("connection", (ws) => {
  const clientId = Date.now();
  clients.set(clientId, { ws, position: { x: 100, y: 500 } });

  console.log(`New client connected: ${clientId}`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "MOVE") {
        const client = clients.get(clientId);
        if (client) {
          client.position = data.position;
          broadcastPositions();
        }
      }
    } catch (error) {
      console.error("Invalid message received:", message);
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err.message);
  });

  ws.send(JSON.stringify({ type: "CONNECTED", clientId }));
});

// Broadcast player positions to all clients
function broadcastPositions() {
  const positions = Array.from(clients.values()).map(
    (client) => client.position
  );

  clients.forEach((client) => {
    try {
      client.ws.send(JSON.stringify({ type: "UPDATE", positions }));
    } catch (err) {
      console.error("Error sending update to client:", err.message);
    }
  });
}

console.log(`WebSocket server running on ws://localhost:${PORT}`);

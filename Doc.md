# **Mini Militia Multiplayer Game - System Design & Documentation**

## **1. Introduction**

### **1.1 Overview**

Mini Militia is a browser-based 2D multiplayer shooter game built using React and HTML5 Canvas for the frontend and Express with WebSockets for the backend. The game enables real-time multiplayer interactions, including movement synchronization, shooting mechanics, health tracking, and respawning.

### **1.2 Objective**

The primary objective of this document is to provide an in-depth understanding of the system architecture, design decisions, and implementation details of the Mini Militia multiplayer game.

## **2. System Architecture**

![alt text](/Images&Videos/image.png)

### **2.1 High-Level Architecture**

The game follows a client-server model, where multiple players interact with each other through WebSockets. The architecture consists of:

- **Frontend:** Handles rendering, user input, and communication with the server.
- **Backend:** Manages game state, processes client actions, and syncs updates via WebSockets.
- **Database (Optional):** Can be integrated for persistent game statistics.

```
+-----------------+       +------------------+       +----------------+
|  Player 1      |       | WebSocket Server |       |  Player 2      |
| (React + Canvas)|<---->| (Express + ws)   |<---->| (React + Canvas)|
+-----------------+       +------------------+       +----------------+
```

### **2.2 Technologies Used**

#### **Frontend**

- React.js
- HTML5 Canvas API
- JavaScript
- WebSockets (Client-side)

#### **Backend**

- Node.js with Express
- WebSocket (`ws` library)
- Game state management

#### **Assets**

- PNG sprite sheets (character animations)
- JPEG/PNG backgrounds & obstacles
- SVG icons for UI elements

## **3. Game Design Decisions**

### **3.1 Fixed Canvas Dimensions**

- **Decision:** Set a fixed canvas size (e.g., 1280x720) with a 16:9 aspect ratio.
- **Reason:** Prevents inconsistent player positions due to varying screen sizes.

### **3.2 Optimized Multiplayer Syncing**

- **Decision:** Only transmit essential game state changes instead of full scene updates.
- **Reason:** Reduces network latency and improves performance.

### **3.3 Jetpack Activation Handling**

- **Decision:** Implemented jetpack fuel limit and cooldown.
- **Reason:** Prevents spam usage and overlapping sound errors.

### **3.4 Health & Respawn Mechanism**

- **Decision:** Upon death, trigger a cooldown timer before respawning.
- **Reason:** Ensures game balance and proper score updates.

### **3.5 Aiming and Character Orientation**

- **Decision:** Rotate player and gun using `ctx.scale(-1,1)` based on mouse movement.
- **Reason:** Simplifies aiming mechanics and improves usability.

### **3.6 Sprite-Based Animations**

- **Decision:** Use a single sprite sheet for animation.
- **Reason:** Enhances rendering performance and reduces asset loading time.

## **4. System Implementation**

### **4.1 Frontend Implementation**

#### **Game Rendering**

- HTML5 Canvas is used for rendering the game world.
- `requestAnimationFrame` ensures smooth animations.
- Layers are used to separate characters, bullets, and the background.

#### **Player Input Handling**

- Event listeners track keyboard and mouse actions.
- Movement, shooting, and jetpack activation are mapped to keys.

#### **WebSocket Communication**

- Client sends movement, shooting, and health updates to the server.
- Receives real-time updates from the WebSocket server.

```javascript
socket.emit('playerMove', { id: playerId, x: newX, y: newY });
socket.on('updatePlayers', (data) => {
  updateGameState(data);
});
```

### **4.2 Backend Implementation**

#### **WebSocket Server**

- Manages game state and synchronizes player actions.
- Periodically sends updates to all connected clients.

```javascript
io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);
  
  socket.on('playerMove', (data) => {
    players[data.id] = { x: data.x, y: data.y };
    io.emit('updatePlayers', players);
  });
});
```

#### **Game Loop**

- Runs at 60FPS to manage physics and game logic.

```javascript
setInterval(() => {
  updateGamePhysics();
  io.emit('gameUpdate', gameState);
}, 1000 / 60);
```

## **5. Multiplayer Flow**

1. **Room Creation:** Players can create a room and share the room ID.
2. **Joining Room:** Players enter the room ID to join an active game.
3. **Game State Sync:** WebSocket server syncs movement, shooting, and health updates.
4. **Score & Respawn:** On death, players are temporarily disabled and then respawn.

## **6. Setup & Deployment**

### **6.1 Frontend Setup**

```sh
cd /Users/kaushik/Projects/WebDev/MiniMilitia
npm install
npm start
```

### **6.2 Backend Setup**

```sh
cd /Users/kaushik/Projects/WebDev/MiniMilitia/backend
npm install
node server.js
```

### **6.3 Deployment Considerations**

- Use **Docker** for containerized deployment.
- **Nginx** as a reverse proxy for WebSocket handling.
- Deploy on **Vercel** (Frontend) and **Heroku/Render** (Backend).

## **7. Game Controls**

| Action       | Key Mapping      |
| ------------ | ---------------- |
| Move Left    | A / Left Arrow   |
| Move Right   | D / Right Arrow  |
| Jump/Jetpack | W / Space        |
| Crouch       | Control          |
| Shoot        | Left Mouse Click |

## **8. Challenges & Future Improvements**

### **8.1 Challenges Faced**

- WebSocket message delays impacting real-time sync.
- Handling lag spikes and connection issues.
- Ensuring cross-browser compatibility.

### **8.2 Future Enhancements**

- **Matchmaking System:** Implement a lobby-based player matching.
- **Weapon Variety:** Add different guns with varying fire rates and damage.
- **Power-Ups:** Introduce health packs and armor boosts.
- **Leaderboard:** Track and display top players' scores.

## **9. Conclusion**

This document outlines the system architecture and design decisions behind Mini Militia Multiplayer. The implementation leverages WebSockets for real-time synchronization, React for the frontend, and Express for the backend. Future improvements will focus on enhanced gameplay mechanics and scalability.

---

**Happy Gaming!** 🎮


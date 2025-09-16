const ServerPlayer = require('./ServerPlayer');
const ServerBullet = require('./ServerBullet');
const ServerEnvironment = require('./ServerEnvironment');

/**
 * Server-side Game Room with authoritative game loop
 */
class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // clientId -> ServerPlayer
    this.bullets = new Map(); // bulletId -> ServerBullet
    this.environment = new ServerEnvironment();
    
    // Game state
    this.gameStarted = false;
    this.roundTime = 300; // 5 minutes
    this.scores = new Map(); // clientId -> score
    
    // Network clients
    this.clients = new Set();
    
    // Game loop
    this.gameLoopInterval = null;
    this.timerInterval = null;
    this.lastUpdate = Date.now();
    this.tickRate = 60; // 60 FPS server tick rate
    this.networkUpdateRate = 30; // 30 FPS network updates
    this.lastNetworkUpdate = 0;
    
    // Performance monitoring
    this.tickTimes = [];
    this.maxTickTime = 0;
    this.avgTickTime = 0;
  }

  // Add a player to the room
  addPlayer(clientId, client, playerName = 'Player') {
    const spawnPos = this.environment.getSafeSpawnPosition();
    const player = new ServerPlayer(spawnPos.x, spawnPos.y, clientId, playerName);
    
    this.players.set(clientId, player);
    this.scores.set(clientId, 0);
    this.clients.add(client);
    
    // Send initial game state to the new player
    this.sendGameState(client);
    
    // Start game loop if this is the first player
    if (this.players.size === 1) {
      this.startGameLoop();
    }
    
    console.log(`Player ${clientId} (${playerName}) added to room ${this.roomId}`);
    
    // Broadcast new player to all clients
    this.broadcast({
      type: 'PLAYER_JOINED',
      player: player.getState(),
      roomId: this.roomId
    });
  }

  // Remove a player from the room
  removePlayer(clientId, client) {
    if (this.players.has(clientId)) {
      this.players.delete(clientId);
      this.scores.delete(clientId);
      this.clients.delete(client);
      
      console.log(`Player ${clientId} removed from room ${this.roomId}`);
      
      // Broadcast player left
      this.broadcast({
        type: 'PLAYER_LEFT',
        clientId: clientId
      });
      
      // Stop game loop if no players left
      if (this.players.size === 0) {
        this.stopGameLoop();
      }
    }
  }

  // Handle player input
  handlePlayerInput(clientId, inputData) {
    const player = this.players.get(clientId);
    if (!player || player.isDead) return;

    console.log(`Player ${clientId} input:`, inputData.type);

    switch (inputData.type) {
      case 'MOVE':
        player.updateInput(inputData.keys, inputData.gunAngle);
        break;
        
      case 'SHOOT':
        console.log(`Player ${clientId} attempting to shoot`);
        const bulletData = player.shoot();
        console.log('Bullet data:', bulletData);
        if (bulletData) {
          const bullet = new ServerBullet(
            bulletData.x,
            bulletData.y,
            bulletData.angle,
            bulletData.ownerId
          );
          this.bullets.set(bullet.id, bullet);
          console.log(`Created bullet ${bullet.id}, total bullets:`, this.bullets.size);
          
          // Broadcast bullet creation
          this.broadcast({
            type: 'BULLET_CREATED',
            bullet: bullet.getState()
          });
        } else {
          console.log('Bullet creation failed - null bulletData');
        }
        break;
        
      case 'JUMP':
        player.jump();
        break;
        
      case 'RELOAD':
        player.reload();
        break;
    }
  }

  // Start the authoritative game loop
  startGameLoop() {
    if (this.gameLoopInterval) return;
    
    console.log(`Starting game loop for room ${this.roomId}`);
    this.gameStarted = true;
    this.lastUpdate = Date.now();
    
    // Main game loop at 60 FPS
    this.gameLoopInterval = setInterval(() => {
      this.gameLoop();
    }, 1000 / this.tickRate);
    
    // Timer countdown
    this.timerInterval = setInterval(() => {
      if (this.roundTime > 0) {
        this.roundTime--;
        this.broadcast({
          type: 'ROUND_TIME',
          roundTime: this.roundTime
        });
        
        if (this.roundTime === 0) {
          this.endRound();
        }
      }
    }, 1000);
  }

  // Stop the game loop
  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.gameStarted = false;
    console.log(`Game loop stopped for room ${this.roomId}`);
  }

  // Main game loop - runs at 60 FPS
  gameLoop() {
    const startTime = Date.now();
    const deltaTime = startTime - this.lastUpdate;
    this.lastUpdate = startTime;

    // Update all players
    for (const [clientId, player] of this.players) {
      player.update(this.environment, deltaTime);
    }

    // Update all bullets
    const bulletsToRemove = [];
    for (const [bulletId, bullet] of this.bullets) {
      if (!bullet.update(this.environment, deltaTime)) {
        bulletsToRemove.push(bulletId);
        continue;
      }

      // Check bullet-player collisions
      for (const [playerId, player] of this.players) {
        if (bullet.checkPlayerCollision(player)) {
          // Player hit
          const damaged = player.takeDamage(bullet.damage);
          
          if (damaged) {
            this.broadcast({
              type: 'PLAYER_HIT',
              targetId: playerId,
              shooterId: bullet.ownerId,
              damage: bullet.damage,
              health: player.health
            });
            
            // Check if player died
            if (player.isDead) {
              this.handlePlayerDeath(playerId, bullet.ownerId);
            }
          }
          
          // Remove bullet after hit
          bulletsToRemove.push(bulletId);
          break;
        }
      }
    }

    // Remove inactive bullets
    bulletsToRemove.forEach(bulletId => {
      this.bullets.delete(bulletId);
      this.broadcast({
        type: 'BULLET_DESTROYED',
        bulletId: bulletId
      });
    });

    // Send network updates at reduced rate (30 FPS)
    const now = Date.now();
    if (now - this.lastNetworkUpdate >= 1000 / this.networkUpdateRate) {
      this.sendNetworkUpdate();
      this.lastNetworkUpdate = now;
    }

    // Performance monitoring
    const tickTime = Date.now() - startTime;
    this.updatePerformanceStats(tickTime);
  }

  // Send network updates to all clients
  sendNetworkUpdate() {
    const gameState = {
      type: 'GAME_STATE',
      players: Array.from(this.players.values())
        .filter(player => player.shouldSendUpdate())
        .map(player => player.getState()),
      bullets: Array.from(this.bullets.values())
        .map(bullet => bullet.getState()),
      timestamp: Date.now()
    };

    if (gameState.players.length > 0 || gameState.bullets.length > 0) {
      this.broadcast(gameState);
    }
  }

  // Handle player death
  handlePlayerDeath(playerId, killerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Update scores
    if (killerId && killerId !== playerId) {
      const killerScore = this.scores.get(killerId) || 0;
      this.scores.set(killerId, killerScore + 1);
    }

    this.broadcast({
      type: 'PLAYER_DEATH',
      playerId: playerId,
      killerId: killerId,
      scores: Object.fromEntries(this.scores)
    });

    // Schedule respawn
    setTimeout(() => {
      if (this.players.has(playerId)) {
        const spawnPos = this.environment.getSafeSpawnPosition();
        player.x = spawnPos.x;
        player.y = spawnPos.y;
        player.respawn();
        
        this.broadcast({
          type: 'PLAYER_RESPAWNED',
          playerId: playerId,
          player: player.getState()
        });
      }
    }, 3000);
  }

  // End the current round
  endRound() {
    this.broadcast({
      type: 'ROUND_END',
      scores: Object.fromEntries(this.scores),
      ranking: this.getRanking()
    });
    
    // Reset for next round
    setTimeout(() => {
      this.roundTime = 300;
      this.startNewRound();
    }, 10000);
  }

  // Start a new round
  startNewRound() {
    // Respawn all players
    for (const [clientId, player] of this.players) {
      const spawnPos = this.environment.getSafeSpawnPosition();
      player.x = spawnPos.x;
      player.y = spawnPos.y;
      player.respawn();
    }
    
    // Clear all bullets
    this.bullets.clear();
    
    this.broadcast({
      type: 'ROUND_START',
      roundTime: this.roundTime
    });
  }

  // Get player ranking by score
  getRanking() {
    return Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([clientId, score], index) => ({
        rank: index + 1,
        clientId: clientId,
        score: score,
        name: this.players.get(clientId)?.name || 'Player'
      }));
  }

  // Send initial game state to a client
  sendGameState(client) {
    const gameState = {
      type: 'INITIAL_GAME_STATE',
      environment: this.environment.getState(),
      players: Array.from(this.players.values()).map(p => p.getState()),
      bullets: Array.from(this.bullets.values()).map(b => b.getState()),
      scores: Object.fromEntries(this.scores),
      roundTime: this.roundTime,
      roomId: this.roomId
    };

    this.sendToClient(client, gameState);
  }

  // Broadcast message to all clients in the room
  broadcast(message, excludeClient = null) {
    this.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error.message);
        }
      }
    });
  }

  // Send message to a specific client
  sendToClient(client, message) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending to client:', error.message);
      }
    }
  }

  // Update performance statistics
  updatePerformanceStats(tickTime) {
    this.tickTimes.push(tickTime);
    if (this.tickTimes.length > 60) {
      this.tickTimes.shift();
    }
    
    this.maxTickTime = Math.max(this.maxTickTime, tickTime);
    this.avgTickTime = this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length;
    
    // Log performance warnings
    if (tickTime > 16.67) {
      console.warn(`Room ${this.roomId}: Slow tick ${tickTime.toFixed(2)}ms (target: 16.67ms)`);
    }
  }

  // Get room statistics
  getStats() {
    return {
      roomId: this.roomId,
      playerCount: this.players.size,
      bulletCount: this.bullets.size,
      gameStarted: this.gameStarted,
      roundTime: this.roundTime,
      maxTickTime: this.maxTickTime,
      avgTickTime: this.avgTickTime.toFixed(2),
      tickRate: this.tickRate
    };
  }

  // Cleanup room resources
  destroy() {
    this.stopGameLoop();
    this.players.clear();
    this.bullets.clear();
    this.clients.clear();
    this.scores.clear();
    console.log(`Room ${this.roomId} destroyed`);
  }
}

module.exports = GameRoom;
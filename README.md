# Mini Militia Multiplayer Game Documentation

## Overview
Mini Militia is a browser-based 2D multiplayer game built with React and canvas. It leverages WebSockets for real-time communication between clients and an Express backend. The game features player movements, shooting mechanics, character animations using sprite sheets, and responsive design optimized for fixed aspect ratios.

## Technologies Used
- **Frontend:** React, HTML5 Canvas, JavaScript
- **Backend:** Express, WebSocket (ws)
- **Assets:** PNG sprite sheets for character animations, JPEG/PNG images for background and obstacles, SVG icons for UI elements
- **Communication:** WebSockets for real-time multiplayer interactions

## Design Decisions & Rationale

### 1. Fixed Canvas Dimensions
- **Decision:** A fixed canvas size (e.g., 1280x720) was set.
- **Reason:** Dynamic canvas dimensions caused players to have different positions on screens with varying aspect ratios. Using a fixed size (16:9 ratio) ensures consistency across devices.

### 2. Optimizing Multiplayer Sync
- **Decision:** The game only sends updated player positions and state changes (e.g., shooting, health updates) rather than re-rendering the entire scene.
- **Reason:** This approach reduces network load and increases performance by minimizing re-rendering work on the client side.

### 3. Handling Rapid Jetpack Activation
- **Issue:** Spam on jetpack activation was causing errors.
- **Decision:** Added checks to limit jetpack fuel depletion and prevent overlapping sound calls.
- **Reason:** This avoids errors when the jetpack key is pressed repeatedly, ensuring smoother gameplay.

### 4. Health Bar & Player Death
- **Decision:** On reaching 0 health, a death event is triggered followed by a cooldown, score update, and a respawn timer.
- **Reason:** It provides immediate visual feedback (health bar turning empty) and ensures that scoring and respawn logic remain synchronized across clients.

### 5. Aiming and Character Orientation
- **Decision:** When aiming to the left, both the character and gun are rotated using `ctx.scale(-1, 1)` based on mouse movement.
- **Reason:** This simplified the math involved in rotating the character while ensuring that the gun aligns with the target. Using a fixed pointer lock with a restricted radius improved aiming mechanics.

### 6. Improved Aim Mechanics
- **Decision:** Shifted from standard mouse pointer aiming to mouse movement tracking within a specific radius (pointer lock).
- **Reason:** This prevents unwanted actions or misclicks when the game is in full-screen mode and enhances precision when aiming.

### 7. Sprite-based Character Animation
- **Decision:** Use a single sprite sheet containing all character animations.
- **Reason:** This is a common pattern in 2D games for efficient rendering and smooth animations. It also reduces the overhead of managing multiple images.

## Setup & Usage

### Frontend
1. Clone the repository and navigate to `/Users/kaushik/Projects/WebDev/MiniMilitia`.
2. Run `npm install` to install the required packages.
3. Launch the development server using `npm start`.

### Backend
1. Navigate to `/Users/kaushik/Projects/WebDev/MiniMilitia/backend`.
2. Run `npm install` to install dependencies.
3. Start the server using `node server.js`.

## Game Controls

- **Movement:** Use Left/Right Arrow keys or A/D keys to move.
- **Jump/Jetpack:** Press Up Arrow, W, or Space to jump; hold to activate the jetpack when airborne.
- **Crouch:** Hold the Control (Ctrl) key to crouch.
- **Aim:** Move the mouse within a fixed radius (pointer lock in fullscreen mode) to adjust aim.
- **Shoot:** Click the mouse button to fire.
- **Reload:** Press R to reload the weapon when ammo is low.

## Multiplayer Flow
1. **Room Creation:** Players can create rooms using the UI dialog.
2. **Joining Room:** Once a room is created, players can join via room ID.
3. **Real-time Syncing:** Player positions, shooting events, and health status are continuously updated via WebSocket messages.
4. **Score Updates & Respawn:** Player deaths trigger score updates. A respawn mechanism handles the reappearance after a set cooldown.

## Final Thoughts
This documentation provides a detailed insight into the design and decision-making process behind Mini Militia. Each technical decision was made to ensure a smooth, consistent, and engaging multiplayer experience. Feel free to explore the source code and assets to learn more about the implementation.

Make sure to read the `Doc.md` file for more detailed information on the game's architecture, system implementation, and asset management.

Happy Gaming!

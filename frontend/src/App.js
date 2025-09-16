import React, { useEffect, useState } from "react";
import GameCanvas from "./components/GameCanvas";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // const ws = new WebSocket("ws://localhost:3001");
    const ws = new WebSocket("wss://minimilitia-backend-kaushik.onrender.com");
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
      setIsConnected(true);
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setSocket(null);
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  if (!isConnected) {
    return <div>Connecting to server...</div>;
  }

  return <GameCanvas socket={socket} isConnected={isConnected} />;
};

export default App;

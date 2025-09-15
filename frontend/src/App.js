import React, { useEffect, useState } from "react";
import GameCanvas from "./components/GameCanvas";

const App = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");
    // const ws = new WebSocket("wss://minimilitia-backend-kaushik.onrender.com");
    setSocket(ws);

    return () => ws.close();
  }, []);

  return <GameCanvas socket={socket} />;
};

export default App;

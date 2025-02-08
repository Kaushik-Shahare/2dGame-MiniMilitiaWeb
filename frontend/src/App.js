import React, { useEffect, useState } from "react";
import GameCanvas from "./components/GameCanvas";

const App = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");
    setSocket(ws);

    return () => ws.close();
  }, []);

  return <GameCanvas socket={socket} />;
};

export default App;

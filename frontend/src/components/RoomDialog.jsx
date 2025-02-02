import React from "react";

const RoomDialog = ({
  isOpen,
  onClose,
  roomIdRef,
  createRoom,
  joinRoom,
  toggleFullScreen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="room-dialog-overlay">
      <div className="room-dialog">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <div>
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "15px",
              borderRadius: "8px",
              color: "white",
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
              maxWidth: "200px",
            }}
          >
            <button
              onClick={createRoom}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#4CAF50",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Create Room
            </button>
            <textarea
              ref={roomIdRef}
              placeholder="Enter room ID"
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                resize: "none",
              }}
            ></textarea>
            <button
              onClick={joinRoom}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#008CBA",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Join Room
            </button>
            <button
              onClick={toggleFullScreen}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#f44336",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Toggle Fullscreen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDialog;

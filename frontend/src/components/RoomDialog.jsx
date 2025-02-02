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
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <h1 style={styles.title}>MiniMilitia Web- by Kaushik Shahare</h1>
        <div style={styles.form}>
          <input
            ref={roomIdRef}
            type="text"
            placeholder="Enter Room ID"
            style={styles.input}
          />
          <div style={styles.buttons}>
            <button onClick={createRoom} style={styles.button}>
              Create Room
            </button>
            <button onClick={joinRoom} style={styles.button}>
              Join Room
            </button>
          </div>
        </div>
        <div style={styles.footer}>
          <button onClick={toggleFullScreen} style={styles.fullScreenButton}>
            Toggle Fullscreen
          </button>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    background: "#1e1e1e",
    padding: "20px",
    borderRadius: "10px",
    width: "300px",
    textAlign: "center",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
    animation: "fadeIn 0.5s",
  },
  title: {
    color: "#fff",
    marginBottom: "20px",
  },
  form: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "none",
  },
  buttons: {
    display: "flex",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    margin: "0 5px",
    padding: "10px",
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
  },
  fullScreenButton: {
    flex: 1,
    margin: "0 5px",
    padding: "10px",
    background: "#2196F3",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  closeButton: {
    flex: 1,
    margin: "0 5px",
    padding: "10px",
    background: "#f44336",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default RoomDialog;

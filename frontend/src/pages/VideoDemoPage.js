import React from "react";

function VideoDemoPage() {
  return (
    <div
      style={{
        fontFamily: "Poppins, sans-serif",
        background: "linear-gradient(135deg, #1b1b1b, #3a3a3a)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "30px" }}>
        🎥 ArniScore Docker & App Demonstration
      </h1>

      <video
        controls
        style={{
          width: "100%",
          maxWidth: "900px",
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(255,255,255,0.2)",
        }}
      >
        <source src="/Video_Docker_Demo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <p
        style={{
          marginTop: "20px",
          opacity: 0.8,
          fontSize: "1rem",
        }}
      >
        Watch this short video demonstration to learn how to run the app in Docker
        and how to use the ArniScore main system.
      </p>
    </div>
  );
}

export default VideoDemoPage;

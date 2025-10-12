import React from "react";

function LandingPage() {
  const openLink = (url) => window.open(url, "_blank");

  return (
    <div
      style={{
        fontFamily: "Poppins, sans-serif",
        textAlign: "center",
        height: "100vh",
        width: "100vw",
        overflow: "hidden", // 🚫 disables both scrollbars
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #8b0000, #000000, #d4af37)",
        color: "white",
        margin: 0,
        padding: 0,
        position: "fixed", // ensures full coverage
        top: 0,
        left: 0,
      }}
    >
      {/* Glass Card */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.7)",
          border: "2px solid rgba(255, 215, 0, 0.4)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "40px 30px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          width: "90%",
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        {/* Title + Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <img
            src="/ArniScore_Logo.ico"
            alt="ArniScore Logo"
            style={{
              width: "55px",
              height: "55px",
              filter: "drop-shadow(0 0 10px rgba(255,215,0,0.6))",
            }}
          />
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#FFD700",
              textShadow: "0 0 12px rgba(255,215,0,0.7)",
            }}
          >
            ArniScore Portal
          </h1>
        </div>

        <p
          style={{
            fontSize: "1rem",
            marginBottom: "35px",
            color: "#f5f5f5",
            opacity: 0.9,
            lineHeight: 1.5,
          }}
        >
          Welcome! Choose a section below to explore the Arnis Strike Detection
          System.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            alignItems: "center",
          }}
        >
          <ArniButton onClick={() => (window.location.href = "/main")}>
            ⚔️ Start Main App
          </ArniButton>

          <ArniButton onClick={() => (window.location.href = "/video-demo")}>
  🎥 Video Demo
</ArniButton>

          <ArniButton onClick={() => (window.location.href = "/manual")}>
            📘 User Manual
        </ArniButton>

          <ArniButton onClick={() => openLink("https://github.com/cspatrick-hau/apsi-docker.git")}>
            💻 GitHub Repository
          </ArniButton>

          <ArniButton onClick={() => openLink("https://hub.docker.com/YOUR_DOCKER_PAGE")}>
            🐳 Docker App
          </ArniButton>
        </div>
      </div>

      {/* Background Animation */}
      <style>
        {`
          body {
            margin: 0;
            padding: 0;
            overflow: hidden !important; /* ensures no scrollbars globally */
          }

          @keyframes buttonGlow {
            0% { box-shadow: 0 0 10px rgba(255,215,0,0.4); }
            50% { box-shadow: 0 0 25px rgba(255,215,0,0.8); }
            100% { box-shadow: 0 0 10px rgba(255,215,0,0.4); }
          }
        `}
      </style>
    </div>
  );
}

function ArniButton({ onClick, children }) {
  const [hover, setHover] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: hover ? "#FFD700" : "#B22222",
        color: hover ? "#000" : "#fff",
        border: "2px solid #FFD700",
        borderRadius: "10px",
        padding: "14px 22px",
        fontSize: "1rem",
        fontWeight: "bold",
        cursor: "pointer",
        width: "80%",
        maxWidth: "300px",
        boxShadow: hover
          ? "0 0 20px rgba(255,215,0,0.7)"
          : "0 0 10px rgba(0,0,0,0.5)",
        transform: hover ? "scale(1.05)" : "scale(1)",
        transition: "all 0.3s ease",
        animation: hover ? "buttonGlow 1.5s infinite" : "none",
      }}
    >
      {children}
    </button>
  );
}

export default LandingPage;

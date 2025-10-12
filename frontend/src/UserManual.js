import React from "react";
import "./UserManual.css";

function UserManual() {
  return (
    <div className="manual-page">
      <div className="manual-content">
        <header className="manual-header">
          <h1>📘 ArniScore User Manual</h1>
          <p>Version 1.0 — Updated October 2025</p>
        </header>

        <section>
          <h2>1. System Overview</h2>
          <p>
            <strong>ArniScore</strong> is a real-time Arnis strike detection
            system combining <em>YOLOv8</em> for player and stick detection with
            a <em>CNN-LSTM</em> model for action recognition. It identifies
            specific body part strikes and provides instant feedback through a
            responsive web dashboard.
          </p>
        </section>

        <section>
          <h2>2. Requirements</h2>
          <ul>
            <li>Windows 10 / 11 or macOS with Docker Desktop installed</li>
            <li>At least 8 GB of RAM and a stable internet connection</li>
            <li>Python 3.10+ (optional, for local testing)</li>
            <li>Google Chrome or Microsoft Edge browser</li>
          </ul>
        </section>

        <section>
          <h2>3. Installation & Setup</h2>
          <ol>
            <li>Download or clone the ArniScore GitHub repository.</li>
            <li>Open Docker Desktop and ensure it is running.</li>
            <li>
              Open a terminal in the project directory and execute:
              <pre>docker-compose up --build</pre>
            </li>
            <li>
              Once the build completes, visit{" "}
              <code>http://localhost:3000</code> to open the application.
            </li>
          </ol>
        </section>

        <section>
          <h2>4. Application Features</h2>
          <ul>
            <li>
              <strong>Start Main App:</strong> Launches the detection dashboard.
            </li>
            <li>
              <strong>Live Camera Feeds:</strong> Displays real-time footage
              from connected cameras.
            </li>
            <li>
              <strong>Detection Logs:</strong> Shows detections per camera,
              including hit type and confidence levels.
            </li>
            <li>
              <strong>CNN-LSTM Realtime Detection:</strong> Opens a dedicated
              window showing model activity logs.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Troubleshooting</h2>
          <ul>
            <li>
              If backend shows <strong>unhealthy</strong>, restart the Docker
              containers.
            </li>
            <li>
              If port 3000 or 5000 is already in use, stop other containers:
              <pre>docker ps</pre> then <pre>docker stop [container_id]</pre>
            </li>
            <li>Ensure your browser has permission to access the camera.</li>
          </ul>
        </section>

        <section>
          <h2>6. Developer Information</h2>
          <p>
            Developed by the <strong>ArniScore Team</strong> for{" "}
            <em>Applied Systems Integration (APSI)</em>.
          </p>
          <p>
            GitHub Repository:{" "}
            <a
              href="https://github.com/YOUR_REPOSITORY"
              target="_blank"
              rel="noreferrer"
            >
              github.com/YOUR_REPOSITORY
            </a>
          </p>
          <p>
            Docker Hub:{" "}
            <a
              href="https://hub.docker.com/YOUR_DOCKER_PAGE"
              target="_blank"
              rel="noreferrer"
            >
              hub.docker.com/YOUR_DOCKER_PAGE
            </a>
          </p>
        </section>

        <footer className="manual-footer">
          <p>© 2025 ArniScore Project | All Rights Reserved</p>
        </footer>
      </div>
    </div>
  );
}

export default UserManual;

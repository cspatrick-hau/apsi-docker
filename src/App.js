import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

function App() {
  const captureCanvasRefs = [useRef(null), useRef(null), useRef(null)];
  const socketRef = useRef(null);

  const [cameras, setCameras] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(["", "", ""]);
  const [streams, setStreams] = useState([null, null, null]);
  const [detectionRunning, setDetectionRunning] = useState([false, false, false]);
  const [scores, setScores] = useState([
    { blue: 0, red: 0 },
    { blue: 0, red: 0 },
    { blue: 0, red: 0 },
  ]);
  const [logs, setLogs] = useState([[], [], []]);
  const [captureIntervals, setCaptureIntervals] = useState([null, null, null]);
  const [globalDetectionRunning, setGlobalDetectionRunning] = useState(false);

  // annotated frames from backend
  const [annotatedFrames, setAnnotatedFrames] = useState(["", "", ""]);

  // detection mode
  const [detectionMode, setDetectionMode] = useState("yolo_cnn");

  const CAPTURE_FPS = 5; // frames per second

  // socket setup
  useEffect(() => {
    socketRef.current = io("http://localhost:5000"); // adjust host if backend differs
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to backend:", socket.id);
    });

    socket.on("detection_result", (data) => {
      try {
        const cameraId = data.camera_id;
        const index = cameraId.endsWith("1") ? 0 : cameraId.endsWith("2") ? 1 : 2;

        // update annotated frame
        setAnnotatedFrames((prev) => {
          const updated = [...prev];
          updated[index] = data.frame;
          return updated;
        });

        // process detections
        const detections = data.detections || [];
        detections.forEach((det) => {
          const now = new Date().toLocaleTimeString();
          const valid = det.valid ? "Yes" : "No";
          const confidence = (det.confidence || 0).toFixed(1) + "%";
          const scoredBy = det.scored_by || "Unknown";
          const bodyPart = det.body_part || "Unknown";

          setLogs((prevLogs) => {
            const newLogs = [...prevLogs];
            newLogs[index] = [
              ...newLogs[index],
              { time: now, valid, confidence, scoredBy, bodyPart, method: det.method || "model" },
            ];
            return newLogs;
          });

          // update score
          if (det.valid) {
            setScores((prevScores) => {
              const updated = [...prevScores];
              if (scoredBy.toLowerCase() === "blue") {
                updated[index] = { ...updated[index], blue: updated[index].blue + 1 };
              } else if (scoredBy.toLowerCase() === "red") {
                updated[index] = { ...updated[index], red: updated[index].red + 1 };
              }
              return updated;
            });
          }
        });
      } catch (err) {
        console.error("Error in detection_result:", err);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // enumerate cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        setSelectedDevices(videoDevices.slice(0, 3).map((d) => d.deviceId));
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };
    getCameras();
  }, []);

  const captureFrameDataUrl = (stream, canvasEl) => {
    if (!stream || !canvasEl) return null;
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    return imageCapture.grabFrame().then((bitmap) => {
      canvasEl.width = bitmap.width;
      canvasEl.height = bitmap.height;
      const ctx = canvasEl.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      return canvasEl.toDataURL("image/jpeg", 0.7);
    });
  };

  const startStream = async (index) => {
    if (!selectedDevices[index]) {
      alert(`Please select a camera for Camera ${index + 1}`);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDevices[index] } },
        audio: false,
      });
      setStreams((prev) => {
        const updated = [...prev];
        updated[index] = stream;
        return updated;
      });
    } catch (err) {
      console.error("Error starting stream:", err);
    }
  };

  const stopStream = (index) => {
    if (captureIntervals[index]) {
      clearInterval(captureIntervals[index]);
      setCaptureIntervals((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
    }
    if (streams[index]) {
      streams[index].getTracks().forEach((t) => t.stop());
      setStreams((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
    }
    setAnnotatedFrames((prev) => {
      const updated = [...prev];
      updated[index] = "";
      return updated;
    });
  };

  const startDetection = (index) => {
    if (!streams[index]) {
      alert(`Start preview first for Camera ${index + 1}`);
      return;
    }
    if (detectionRunning[index]) {
      alert(`Detection already running on Camera ${index + 1}`);
      return;
    }

    setDetectionRunning((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    const intervalMs = 1000 / CAPTURE_FPS;
    const intervalId = setInterval(async () => {
      const canvasEl = captureCanvasRefs[index].current;
      const stream = streams[index];
      if (!stream) return;
      try {
        const dataUrl = await captureFrameDataUrl(stream, canvasEl);
        if (dataUrl && socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("process_frame", {
            camera_id: `camera_${index + 1}`,
            frame: dataUrl,
            mode: detectionMode,
          });
        }
      } catch (err) {
        console.error("Frame capture error:", err);
      }
    }, intervalMs);

    setCaptureIntervals((prev) => {
      const updated = [...prev];
      updated[index] = intervalId;
      return updated;
    });
  };

  const stopDetection = (index) => {
    if (!detectionRunning[index]) return;
    setDetectionRunning((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });
    if (captureIntervals[index]) {
      clearInterval(captureIntervals[index]);
      setCaptureIntervals((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
    }
  };

  const resetAll = () => {
    detectionRunning.forEach((running, i) => running && stopDetection(i));
    streams.forEach((_, i) => stopStream(i));
    setScores([{ blue: 0, red: 0 }, { blue: 0, red: 0 }, { blue: 0, red: 0 }]);
    setLogs([[], [], []]);
    setAnnotatedFrames(["", "", ""]);
    setGlobalDetectionRunning(false);
  };

  const toggleGlobalDetection = () => {
    if (globalDetectionRunning) {
      detectionRunning.forEach((running, i) => running && stopDetection(i));
      setGlobalDetectionRunning(false);
    } else {
      selectedDevices.forEach((_, i) => !streams[i] && startStream(i));
      setTimeout(() => {
        selectedDevices.forEach((_, i) => !detectionRunning[i] && startDetection(i));
      }, 1000);
      setGlobalDetectionRunning(true);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>ArniScore: Arnis Strike Detection System</h2>

      {/* Mode Selector */}
      <div style={{ marginBottom: 20 }}>
        <label><b>Detection Mode:</b></label>{" "}
        <select value={detectionMode} onChange={(e) => setDetectionMode(e.target.value)}>
          <option value="yolo">YOLO Only</option>
          <option value="yolo_cnn">YOLO + CNN-LSTM</option>
        </select>
      </div>

      {/* Camera selectors */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <label>Camera {i + 1}:</label>
            <select
              value={selectedDevices[i] || ""}
              onChange={(e) => {
                const newDevices = [...selectedDevices];
                newDevices[i] = e.target.value;
                setSelectedDevices(newDevices);
                stopDetection(i);
                stopStream(i);
              }}
              style={{ width: "100%", padding: 6, marginTop: 5 }}
            >
              <option value="">Select Camera</option>
              {cameras.map((cam, idx) => (
                <option key={idx} value={cam.deviceId}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Camera Feeds */}
<div
  style={{
    display: "flex",
    gap: 20,
    justifyContent: "space-between",
    alignItems: "flex-start",
  }}
>
  {[0, 1, 2].map((i) => (
    <div key={i} style={{ flex: 1, textAlign: "center" }}>
      {detectionRunning[i] && annotatedFrames[i] ? (
        // Show backend annotated image during detection
        <img
          src={annotatedFrames[i]}
          alt={`Camera ${i + 1}`}
          style={{
            width: "100%",
            height: 360, // ⬆ increased from 240
            border: "3px solid #888",
            borderRadius: 8,
            objectFit: "cover",
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          }}
        />
      ) : (
        // Show raw preview video otherwise
        <video
          ref={(el) => {
            if (el && streams[i]) {
              el.srcObject = streams[i];
            }
          }}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: 360, // ⬆ increased from 240
            backgroundColor: "#f5f5f5",
            border: "3px solid #888",
            borderRadius: 8,
            objectFit: "cover",
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          }}
        />
      )}

      <p style={{ marginTop: 10, fontWeight: "bold" }}>Camera Feed {i + 1}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => startStream(i)}>Preview</button>
        <button onClick={() => stopStream(i)}>Stop</button>
        <button onClick={() => startDetection(i)} disabled={detectionRunning[i]}>
          Start Detection
        </button>
        <button onClick={() => stopDetection(i)} disabled={!detectionRunning[i]}>
          Stop Detection
        </button>
      </div>

      <canvas ref={captureCanvasRefs[i]} style={{ display: "none" }} />
    </div>
  ))}
</div>


      {/* Scores */}
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20, fontSize: 18 }}>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <span style={{ color: "blue", marginRight: 10 }}>Blue: {scores[i].blue}</span>
            <span style={{ color: "red" }}>Red: {scores[i].red}</span>
          </div>
        ))}
      </div>

      {/* Global Controls */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={resetAll}>Reset All</button>
        <button onClick={toggleGlobalDetection}>
          {globalDetectionRunning ? "Stop All Detection" : "Start All Detection"}
        </button>
      </div>

      {/* Logs */}
      <div style={{ marginTop: 40 }}>
        <h3>Detection Logs</h3>
        <div style={{ display: "flex", gap: 20 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1 }}>
              <h4>Camera {i + 1}</h4>
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #ccc" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Time</th><th>Valid</th><th>Confidence</th><th>Scored By</th><th>Body Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs[i].slice().reverse().map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.time}</td>
                        <td>{log.valid}</td>
                        <td>{log.confidence}</td>
                        <td>{log.scoredBy}</td>
                        <td>{log.bodyPart}</td>
                      </tr>
                    ))}
                    {logs[i].length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center" }}>No logs yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import cv2
import numpy as np
import base64
from ultralytics import YOLO
import tensorflow as tf
from collections import deque
import torch
import os
import traceback

# 🐳 Disable TensorFlow GPU if no CUDA available
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# --- Safe globals for YOLO custom blocks ---
try:
    from ultralytics.nn.modules.block import C3k2
    torch.serialization.add_safe_globals([C3k2])
    print("[INFO] Added C3k2 to safe globals")
except Exception as e:
    print(f"[WARN] Could not add safe globals: {e}")

# --- Flask setup ---
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# --- Model loading ---
print("\n" + "=" * 60)
print("INITIALIZING MODELS")
print("=" * 60)
print(f"Python version: {os.sys.version.split()[0]}")
print(f"TensorFlow version: {tf.__version__}")
print(f"PyTorch version: {torch.__version__}")
try:
    import ultralytics
    print(f"Ultralytics version: {ultralytics.__version__}")
except:
    print(f"Ultralytics version: Unknown")

yolo_model = None
cnn_lstm_model = None

# Load YOLOv8
print("\n" + "-" * 60)
print("Loading YOLO Model...")
print("-" * 60)
try:
    model_path = "models/object_detection.pt"
    if not os.path.exists(model_path):
        print(f"✗ YOLO model not found at: {model_path}")
    else:
        print(f"Model path: {model_path}")
        yolo_model = YOLO(model_path)
        print("✓ YOLO model loaded successfully!")
        print(f"  Classes: {yolo_model.names}")
except Exception as e:
    print(f"✗ Error loading YOLO model: {e}")
    traceback.print_exc()

# --- Load CNN-LSTM ---
print("\n" + "-" * 60)
print("Loading CNN-LSTM Model...")
print("-" * 60)
cnn_lstm_model = None
try:
    model_path = "models/convlstm_v3_converted.h5"
    if not os.path.exists(model_path):
        print(f"✗ CNN-LSTM model not found at: {model_path}")
        print("  Note: Run conversion script first or use YOLO-only mode")
    else:
        print(f"Model path: {model_path}")
        
        # Custom DTypePolicy class for compatibility
        class DummyDTypePolicy:
            def __init__(self, name="float32"):
                self.name = name
                self.compute_dtype = name
                self.variable_dtype = name

            def __repr__(self):
                return f"DummyDTypePolicy({self.name})"

            def get_config(self):
                return {"name": self.name}

            @classmethod
            def from_config(cls, config):
                """Needed by Keras deserialization during model loading."""
                return cls(**config)

        try:
            from tensorflow.keras.mixed_precision import Policy
            custom_objects = {"DummyDTypePolicy": DummyDTypePolicy, "Policy": Policy}
        except:
            custom_objects = {"DummyDTypePolicy": DummyDTypePolicy}
        
        print("[INFO] Attempting to load with custom object scope...")
        with tf.keras.utils.custom_object_scope(custom_objects):
            cnn_lstm_model = tf.keras.models.load_model(model_path, compile=False, safe_mode=False)
        print("✓ CNN-LSTM model loaded successfully!")
        print(f"  Input shape: {cnn_lstm_model.input_shape}")
        print(f"  Output shape: {cnn_lstm_model.output_shape}")
except Exception as e:
    print(f"✗ Error loading CNN-LSTM model: {e}")
    print("  Continuing with YOLO-only mode...")
    traceback.print_exc()

print("\n" + "=" * 60)
print("MODEL INITIALIZATION COMPLETE")
print("=" * 60)
print(f"YOLO loaded: {yolo_model is not None}")
print(f"CNN-LSTM loaded: {cnn_lstm_model is not None}")
print("=" * 60 + "\n")

# --- Frame buffers ---
frame_sequences = {
    "camera_1": deque(maxlen=30),
    "camera_2": deque(maxlen=30),
    "camera_3": deque(maxlen=30),
}

cnn_lstm_counter = 0  # 🔄 used for throttling

VALID_PARTS = [
    "Head", "Body", "Legs", "Chest & Abdomen",
    "Side of the Body", "Upper Extremities", "Lower Extremities"
]

def calculate_iou(box1, box2):
    """Calculate Intersection over Union between two bounding boxes."""
    x1_min, y1_min, x1_max, y1_max = box1
    x2_min, y2_min, x2_max, y2_max = box2
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)
    if inter_x_max < inter_x_min or inter_y_max < inter_y_min:
        return 0.0
    inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
    box1_area = (x1_max - x1_min) * (y1_max - y1_min)
    box2_area = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = box1_area + box2_area - inter_area
    return inter_area / union_area if union_area > 0 else 0.0

def classify_hit(player_box, stick_box):
    """Classify which body part was hit based on stick position."""
    px_min, py_min, px_max, py_max = player_box
    sx_min, sy_min, sx_max, sy_max = stick_box
    player_height = max(py_max - py_min, 1)
    stick_center_y = (sy_min + sy_max) / 2
    relative_y = (stick_center_y - py_min) / player_height
    if relative_y < 0.2:
        return "Head"
    elif relative_y < 0.5:
        return "Chest & Abdomen"
    elif relative_y < 0.8:
        return "Body"
    else:
        return "Legs"

def detect_cnn_lstm_action(frames):
    """Detect action using CNN-LSTM model."""
    if cnn_lstm_model is None or len(frames) < 20:
        return "no_action", 0.0
    try:
        processed = [cv2.resize(f, (224, 224)) / 255.0 for f in list(frames)[-20:]]
        input_data = np.array([processed], dtype=np.float32)
        preds = cnn_lstm_model.predict(input_data, verbose=0)
        idx = int(np.argmax(preds[0]))
        conf = float(preds[0][idx])
        actions = ["no_action", "head_strike", "body_strike", "leg_strike", "invalid_strike"]
        return actions[idx], conf
    except Exception as e:
        print(f"CNN-LSTM detection error: {e}")
        return "no_action", 0.0

@socketio.on("process_frame")
def handle_frame(data):
    """Process incoming frame from frontend."""
    global cnn_lstm_counter
    try:
        camera_id = data.get("camera_id", "camera_1")
        frame_data = data.get("frame")
        mode = data.get("mode", "yolo_cnn")

        if not frame_data:
            emit("error", {"message": "No frame provided"})
            return

        img_data = base64.b64decode(frame_data.split(",")[1])
        frame = cv2.imdecode(np.frombuffer(img_data, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            emit("error", {"message": "Failed to decode frame"})
            return

        frame_sequences[camera_id].append(frame)
        detections = []
        annotated_frame = frame.copy()
        blue_players, red_players, blue_sticks, red_sticks = [], [], [], []

        # --- YOLO Detection ---
        if yolo_model is not None:
            results = yolo_model(frame, verbose=False, conf=0.35)[0]
            annotated_frame = results.plot()
            for box in results.boxes:
                cid = int(box.cls)
                conf = float(box.conf)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                bbox = [float(x1), float(y1), float(x2), float(y2)]
                cname = yolo_model.names[cid].lower()
                if "blue" in cname and "player" in cname:
                    blue_players.append((bbox, conf))
                elif "blue" in cname and "stick" in cname:
                    blue_sticks.append((bbox, conf))
                elif "red" in cname and "player" in cname:
                    red_players.append((bbox, conf))
                elif "red" in cname and "stick" in cname:
                    red_sticks.append((bbox, conf))

            # Check for hits - Red stick hits Blue player
            for rs, sc in red_sticks:
                for bp, _ in blue_players:
                    iou = calculate_iou(rs, bp)
                    if iou > 0.05:
                        part = classify_hit(bp, rs)
                        detections.append({
                            "scored_by": "Red",
                            "body_part": part,
                            "valid": part in VALID_PARTS,
                            "confidence": sc * 100,
                            "method": "YOLO"
                        })
            
            # Check for hits - Blue stick hits Red player
            for bs, sc in blue_sticks:
                for rp, _ in red_players:
                    iou = calculate_iou(bs, rp)
                    if iou > 0.05:
                        part = classify_hit(rp, bs)
                        detections.append({
                            "scored_by": "Blue",
                            "body_part": part,
                            "valid": part in VALID_PARTS,
                            "confidence": sc * 100,
                            "method": "YOLO"
                        })

        # --- CNN-LSTM Detection (throttled) ---
        cnn_lstm_counter += 1
        run_cnn_lstm = (cnn_lstm_counter % 5 == 0)  # Run every 5 frames

        if mode == "yolo_cnn" and cnn_lstm_model is not None and run_cnn_lstm:
            action, conf = detect_cnn_lstm_action(frame_sequences[camera_id])
            if action != "no_action" and conf > 0.3:
                if "head" in action:
                    bp = "Head"
                elif "body" in action:
                    bp = "Body"
                elif "leg" in action:
                    bp = "Legs"
                else:
                    bp = "Invalid"
                valid = "invalid" not in action
                if len(red_sticks) > len(blue_sticks):
                    scorer = "Red"
                elif len(blue_sticks) > len(red_sticks):
                    scorer = "Blue"
                else:
                    scorer = "Unknown"
                detections.append({
                    "scored_by": scorer,
                    "body_part": bp,
                    "valid": valid,
                    "confidence": conf * 100,
                    "method": "CNN-LSTM"
                })

        # Encode and send response
        _, buffer = cv2.imencode(".jpg", annotated_frame)
        encoded_frame = base64.b64encode(buffer).decode("utf-8")
        emit("detection_result", {
            "camera_id": camera_id,
            "frame": f"data:image/jpeg;base64,{encoded_frame}",
            "detections": detections,
        })
    except Exception as e:
        print(f"Error processing frame: {e}")
        traceback.print_exc()
        emit("error", {"message": str(e)})

@socketio.on("connect")
def handle_connect():
    """Handle client connection."""
    print(f"[INFO] Client connected: {request.sid}")
    emit("connection_status", {
        "status": "connected",
        "yolo_available": yolo_model is not None,
        "cnn_lstm_available": cnn_lstm_model is not None
    })

@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection."""
    print(f"[INFO] Client disconnected: {request.sid}")

@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "yolo_loaded": yolo_model is not None,
        "cnn_lstm_loaded": cnn_lstm_model is not None
    })

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("STARTING FLASK-SOCKETIO SERVER")
    print("=" * 60)
    print(f"YOLO: {'✓ Loaded' if yolo_model else '✗ Failed'}")
    print(f"CNN-LSTM: {'✓ Loaded' if cnn_lstm_model else '✗ Failed'}")
    print("=" * 60 + "\n")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
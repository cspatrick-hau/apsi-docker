FROM python:3.10-slim

WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Manila

# Install system libs for OpenCV & TF
RUN apt-get update && apt-get install -y \
    python3-opencv \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# --- Install dependencies safely ---
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir numpy==1.26.4 && \
    pip install --no-cache-dir tensorflow==2.15.0 keras==2.15.0 && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["python", "app.py"]

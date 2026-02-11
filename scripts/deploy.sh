#!/bin/bash
set -e

# Configuration
MODEL_DIR="../backend/models"
PIPER_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx"
PIPER_CONFIG_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx.json"
VAD_URL="https://raw.githubusercontent.com/snakers4/silero-vad/master/src/silero_vad/data/silero_vad.onnx"

echo ">>> Setting up Radha Backend..."

# 1. System Dependencies
if [ "$(uname)" == "Linux" ]; then
    echo ">>> Installing system dependencies..."
    sudo apt-get update && sudo apt-get install -y espeak-ng python3-pip python3-venv
elif [ "$(uname)" == "Darwin" ]; then
    echo ">>> macOS detected. Ensure espeak-ng is installed (brew install espeak-ng)."
fi

# 2. Python Environment
echo ">>> Setting up Python environment..."
cd "$(dirname "$0")/../backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

# 3. Download Models
mkdir -p models

# Piper Model
if [ ! -f "models/en_GB-southern_english_female-low.onnx" ]; then
    echo ">>> Downloading Piper Model..."
    curl -L "$PIPER_URL" -o "models/en_GB-southern_english_female-low.onnx"
fi
if [ ! -f "models/en_GB-southern_english_female-low.onnx.json" ]; then
    echo ">>> Downloading Piper Config..."
    curl -L "$PIPER_CONFIG_URL" -o "models/en_GB-southern_english_female-low.onnx.json"
fi

# VAD Model
if [ ! -f "models/silero_vad.onnx" ]; then
    echo ">>> Downloading Silero VAD Model..."
    curl -L "$VAD_URL" -o "models/silero_vad.onnx"
fi

echo ">>> Setup Complete."
echo ">>> Starting Server..."

# 4. Start Server
# Host 0.0.0.0 is crucial for AWS accessibility
exec uvicorn main:app --host 0.0.0.0 --port 8000

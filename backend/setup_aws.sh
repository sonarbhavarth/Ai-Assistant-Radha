#!/bin/bash

# Radha AWS Setup Script
# This script automates the installation of dependencies and models on a fresh Ubuntu/Debian EC2 instance.

set -e # Exit on error

echo "🚀 Starting Radha Backend Setup on AWS..."

# 1. Update System
echo "🔄 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install System Dependencies
echo "📦 Installing system dependencies (FFmpeg, Python, Espeak-ng)..."
sudo apt-get install -y python3-pip python3-venv ffmpeg espeak-ng wget curl unzip

# 3. Setup Project Directory
echo "📂 Setting up project environment..."
# Assuming the user has already cloned the repo and is running this from backend/
python3 -m venv venv
source venv/bin/activate

# 4. Install Python Requirements
echo "🐍 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Download Models
echo "🤖 Downloading AI Models..."
mkdir -p models

# Download Piper TTS Model (Southern English Female)
if [ ! -f "models/en_GB-southern_english_female-low.onnx" ]; then
    echo "📥 Downloading Piper TTS model..."
    wget -O models/en_GB-southern_english_female-low.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx
    wget -O models/en_GB-southern_english_female-low.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx.json
fi

# Download Silero VAD Model
if [ ! -f "models/silero_vad.onnx" ]; then
    echo "📥 Downloading Silero VAD model..."
    wget -O models/silero_vad.onnx https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx
fi

echo "✅ Setup Complete!"
echo "-------------------------------------------------------"
echo "To start the backend, run:"
echo "source venv/bin/activate"
echo "uvicorn main:app --host 0.0.0.0 --port 8000"
echo "-------------------------------------------------------"
echo "⚠️  IMPORTANT: Ensure Port 8000 is open in your AWS Security Group!"

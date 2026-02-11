# Developer Setup Guide

Follow these steps to set up the Radha Voice Assistant for local development.

## Prerequisites

- **Mac** (running macOS 12+ recommended).
- **Node.js** (v18+).
- **Python** (v3.9 - v3.11).
- **Git**.

---

## 1. Backend Setup

```bash
cd backend

# Create Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Start Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 2. Mobile Client Setup

### Dependencies
```bash
cd radha
npm install
```

### Native Environment (iOS Only)
If you are on an older version of macOS with Ruby 2.6, you must install a specific version of the `ffi` gem first:

```bash
sudo gem install ffi -v 1.15.5
sudo gem install cocoapods
```

Then, link the native modules:
```bash
npx expo prebuild
cd ios && pod install && cd ..
```

### Running the App
```bash
# Run on iOS Simulator
npx expo run:ios

# Run on Android Emulator
npx expo run:android
```

---

## 3. Configuration

### WebSocket URL
In `radha/src/VoiceClient.ts`, update the `WS_URL`:
- **Simulator**: `ws://localhost:8000/ws`
- **Real Device**: `ws://<YOUR_COMPUTER_IP>:8000/ws`

### Large Models
The project requires several ONNX models. These should be downloaded and placed correctly:
- **STT**: `faster-whisper` downloads automatically on first run.
- **TTS**: Place `en_GB-southern_english_female-low.onnx` in `backend/models/`.
- **Wake Word**: Place the Vosk model in `radha/assets/model-en/`.

---

## Troubleshooting

- **CocoaPods Error**: Ensure `pod --version` shows 1.11+. Re-run the `ffi` fix if needed.
- **Python Architecture**: If you are on M1/M2/M3 Mac, ensure your Python environment is native arm64 for best performance with ONNX.
- **Microphone**: Ensure microphone permissions are granted in both the app and the system settings.

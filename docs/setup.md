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
Instead of a hardcoded string, Radha uses a configuration file to switch between local and remote backends.

Edit [radha/src/config.ts](file:///Volumes/ssd/radha/radha/src/config.ts):
- **Local Dev**: Set `IS_REMOTE = false` (Uses `localhost`).
- **AWS Dev**: Set `IS_REMOTE = true` and provide your `AWS_IP`.

### Large Models
The project requires several ONNX models. These should be downloaded and placed correctly:
- **STT**: `faster-whisper` downloads automatically on first run.
- **TTS**: Place `en_GB-southern_english_female-low.onnx` in `backend/models/`.
- **Wake Word**: Place the Vosk model in `radha/assets/model-en/`.

---

## 4. AWS Remote Hosting

To host the backend on AWS while keeping the frontend local:

1. **Deploy Backend**: 
   - SSH into your EC2 instance.
   - Clone the repository.
   - Run the automated setup script:
     ```bash
     cd backend
     chmod +x setup_aws.sh
     ./setup_aws.sh
     ```
2. **Security Groups**: 
   - In the AWS Console, edit your Security Group.
   - Add an **Inbound Rule** for **Custom TCP**, Port **8000**, from **Anywhere (0.0.0.0/0)**.
3. **Connect Mobile**: 
   - Update `AWS_IP` in `radha/src/config.ts` with your EC2 Public IP.
   - Set `IS_REMOTE = true`.

---

## Troubleshooting

- **CocoaPods Error**: Ensure `pod --version` shows 1.11+. Re-run the `ffi` fix if needed.
- **Python Architecture**: If you are on M1/M2/M3 Mac, ensure your Python environment is native arm64 for best performance with ONNX.
- **Microphone**: Ensure microphone permissions are granted in both the app and the system settings.

# Radha Voice Assistant 🎤✨

Radha is a powerful, low-latency, personal voice assistant built with a **FastAPI** backend and a **React Native (Expo)** mobile client. It features hands-free activation, intelligent conversational capabilities, and high-quality speech synthesis.

## 🌟 Key Features

- **Offline Wake Word**: Hands-free "Radha" detection using Vosk (100% on-device).
- **Fast Conversations**: Low-latency Speech-to-Text (Whisper) and Large Language Model (local/mock) integration.
- **Natural Voice**: High-quality TTS using Piper (fallback to Edge TTS).
- **Seamless Communication**: Real-time duplex audio streaming via WebSockets.
- **Haptic Feedback**: Tactile cues for wake word detection and processing states.

## 📂 Project Structure

- `/backend`: Python FastAPI server handling audio processing, STT, LLM, and TTS.
- `/radha`: React Native / Expo mobile application.
- `/docs`: Detailed feature documentation and architecture guides.

## 🚀 Quick Start

Check the [Setup Guide](docs/setup.md) for detailed instructions.

### 1. Start Backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 2. Start Mobile Client
```bash
cd radha
npm install
npx expo run:ios # Requires CocoaPods
```

## 📖 Documentation

- [Features & Capabilities](docs/features.md)
- [System Architecture](docs/architecture.md)
- [Developer Setup](docs/setup.md)

---
*Created by [Antigravity](https://github.com/google-deepmind/antigravity) for Radha.*

# Features & Capabilities

Radha is designed to be a highly responsive and capable voice assistant. Below are the primary features integrated into the current version.

## 1. Hands-Free Wake Word (Vosk)
- **Engine**: On-device Vosk engine.
- **Sensitivity**: Optimized for "Radha" (Indian English model).
- **Latency**: Detection happens in <200ms on-device.
- **Privacy**: No audio is streamed to the server while waiting for the wake word.
- **Haptics**: Heavy vibration reinforces successful activation.

## 2. Real-Time Conversations (Whisper & LLM)
- **STT**: Faster-Whisper (Base.en) for high-accuracy speech-to-text.
- **Brain**: Advanced LLM orchestration (Python-based) for intelligent responses.
- **Streaming**: Duplex WebSocket connection for near-zero lag interaction.

## 3. High-Quality Speech Synthesis (Piper)
- **Voice**: `en_GB-southern_english_female-low` (Piper ONNX).
- **Fallback**: Edge TTS (Indian English Female) used if local synthesizer is unavailable.
- **Clarity**: Crystal clear audio playback optimized for mobile.

## 4. Smart Voice Activity Detection (Silero VAD)
- Backend-side VAD ensures the assistant only processes relevant speech chunks.
- Filters out background noise and silence automatically.

## 5. Modern Mobile UI
- **Pulsing Animations**: Visual cues during "Thinking" and "Listening" states.
- **Toggle Control**: Enable/Disable "Always Listening" mode with one switch.
- **Manual Override**: "Hold to Speak" button for precise command entry.

import asyncio
import logging
import json
import io
import websockets
import numpy as np
import soundfile as sf
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from voice_engine import VoiceEngine
from llm_engine import LLMEngine

# Initialize Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RadhaServer")

app = FastAPI()

# Initialize Engines
logger.info("Initializing Voice Engine...")
voice_engine = VoiceEngine(model_path="models/en_GB-southern_english_female-low.onnx")

logger.info("Initializing LLM Engine...")
llm_engine = LLMEngine()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected")
    
    try:
        while True:
            # Receive data
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_chunk = message["bytes"]
                logger.info(f"Received audio chunk: {len(audio_chunk)} bytes")
                
                # 1. Convert bytes to numpy for STT
                try:
                    with io.BytesIO(audio_chunk) as audio_io:
                        audio_data, sample_rate = sf.read(audio_io, dtype='float32')
                    audio_float32 = audio_data
                except Exception as e:
                    logger.error(f"Failed to decode audio chunk: {e}")
                    continue
                
                # 2. STT: Transcribe
                user_text = voice_engine.transcribe(audio_float32)
                
                if not user_text:
                    logger.info("No speech detected.")
                    continue
                
                logger.info(f"User Said: {user_text}")
                
                # 3. LLM: Generate Response
                response_text = llm_engine.generate_response(user_text)
                logger.info(f"Radha Responding: {response_text}")
                
                # 4. TTS: Synthesize
                audio_response = voice_engine.synthesize(response_text)
                
                if audio_response is not None:
                    wav_buffer = io.BytesIO()
                    sf.write(wav_buffer, audio_response, 16000, format='WAV', subtype='PCM_16')
                    response_bytes = wav_buffer.getvalue()
                    
                    await websocket.send_bytes(response_bytes)
                    logger.info(f"Sent WAV audio response: {len(response_bytes)} bytes")
                else:
                    logger.error("TTS generation failed")
                
            elif "text" in message:
                data = json.loads(message["text"])
                logger.info(f"Received text: {data}")

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Error: {e}")

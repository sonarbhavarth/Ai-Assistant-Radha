import os
import time
import json
import wave
import logging
import numpy as np
import onnxruntime as ort
import soundfile as sf
from typing import Generator, Optional, Tuple
from faster_whisper import WhisperModel

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VoiceEngine")

class VoiceEngine:
    def __init__(self, model_path: str = "models/en_GB-southern_english_female-low.onnx", vad_model_path: str = "models/silero_vad.onnx"):
        """
        Initialize the VoiceEngine with Piper TTS model and Silero VAD.
        
        Args:
            model_path: Path to the Piper .onnx model file.
            vad_model_path: Path to the Silero VAD .onnx file.
        """
        self.model_path = model_path
        self.config_path = f"{model_path}.json"
        self.vad_model_path = vad_model_path
        
        self.tts_session: Optional[ort.InferenceSession] = None
        self.vad_session: Optional[ort.InferenceSession] = None
        self.config = {}
        self.phoneme_id_map = {}
        self.sample_rate = 22050 
        
        # VAD State
        self.vad_h = np.zeros((2, 1, 64), dtype=np.float32)
        self.vad_c = np.zeros((2, 1, 64), dtype=np.float32)
        self.vad_sr = 16000 # Silero expects 16k
        
        # STT State
        self.stt_model_size = "base.en" # or "tiny.en" for faster, "small.en" for better
        self.stt_model: Optional[WhisperModel] = None
        
        self.load_models()

    def load_models(self):
        """Load TTS and VAD models."""
        # TTS Load
        if os.path.exists(self.model_path) and os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    self.config = json.load(f)
                self.sample_rate = self.config.get("audio", {}).get("sample_rate", 22050)
                self.phoneme_id_map = self.config.get("phoneme_id_map", {})
                
                # Use CPU for stability, or CUDA if available
                providers = ['CPUExecutionProvider']
                if 'CUDAExecutionProvider' in ort.get_available_providers():
                    providers.insert(0, 'CUDAExecutionProvider')
                
                self.tts_session = ort.InferenceSession(self.model_path, providers=providers)
                logger.info(f"Loaded Piper model: {self.model_path}")
            except Exception as e:
                logger.error(f"Failed to load Piper model: {e}")
        else:
            logger.warning(f"Piper model not found at {self.model_path}")

        # VAD Load
        if os.path.exists(self.vad_model_path):
            try:
                self.vad_session = ort.InferenceSession(self.vad_model_path, providers=['CPUExecutionProvider'])
                logger.info(f"Loaded VAD model: {self.vad_model_path}")
            except Exception as e:
                logger.error(f"Failed to load VAD model: {e}")
        else:
            logger.warning(f"VAD model not found at {self.vad_model_path}")

        # STT Load
        try:
            # Run on CPU with INT8 by default for speed on Mac/CPU
            # compute_type="int8" is default for CPU
            self.stt_model = WhisperModel(self.stt_model_size, device="cpu", compute_type="int8")
            logger.info(f"Loaded Faster Whisper model: {self.stt_model_size}")
        except Exception as e:
            logger.error(f"Failed to load STT model: {e}")

    def text_to_phonemes(self, text: str) -> list[int]:
        """
        Convert text to phoneme IDs using espeak-ng and config map.
        Requires 'espeak-ng' installed on system.
        """
        # 1. Get IPA phonemes from espeak-ng
        # Note: This is a simplified interaction. Piper has complex rules for phonemes.
        # We assume a basic mapping here for the scaffold.
        import subprocess
        try:
            # -q: quiet, --ipa: IPA output
            # 1 = EN (US), 2 = EN (UK) - generic
            # The model is en_GB, so use en-gb
            cmd = ['espeak-ng', '-v', 'en-gb', '-q', '--ipa', text]
            phonemes_raw = subprocess.check_output(cmd).decode('utf-8').strip()
            
            # 2. Map to IDs
            # Piper's map usually includes keys like individual chars. 
            # We iterate and map. real piper uses more complex logic (cleaning etc).
            # This is a rudimentary implementation.
            ids = []
            # Add start symbol if present (usually '^')
            if '^' in self.phoneme_id_map:
                ids.append(self.phoneme_id_map['^'][0])
                
            for char in phonemes_raw:
                if char in self.phoneme_id_map:
                    ids.extend(self.phoneme_id_map[char])
                # else ignore or handle unknown
            
            # Add end symbol if present (usually '$')
            if '$' in self.phoneme_id_map:
                ids.append(self.phoneme_id_map['$'][0])
                
            return ids
        except Exception as e:
            logger.error(f"Phonemization error: {e}")
            return []

    def synthesize(self, text: str) -> Optional[np.ndarray]:
        """
        Synthesize text to audio. Returns numpy array of float32 audio.
        Tries Piper first, falls back to Edge TTS (Indian English female).
        """
        # Try Piper TTS first
        piper_audio = self._synthesize_piper(text)
        if piper_audio is not None:
            return piper_audio
        
        # Fallback to Edge TTS (free, no API key)
        return self._synthesize_edge_tts(text)

    def _synthesize_piper(self, text: str) -> Optional[np.ndarray]:
        """Attempt synthesis with Piper TTS."""
        if not self.tts_session:
            return None
            
        phoneme_ids = self.text_to_phonemes(text)
        if not phoneme_ids:
            logger.warning("Piper: No phoneme IDs generated (espeak-ng missing?)")
            return None
            
        phoneme_ids_np = np.array([phoneme_ids], dtype=np.int64)
        phoneme_ids_len = np.array([len(phoneme_ids)], dtype=np.int64)
        scales = np.array([0.667, 1.0, 0.8], dtype=np.float32)
        
        try:
            inputs = {
                'input': phoneme_ids_np,
                'input_lengths': phoneme_ids_len,
                'scales': scales
            }
            audio = self.tts_session.run(None, inputs)[0]
            return audio.squeeze() 
        except Exception as e:
            logger.error(f"Piper inference error: {e}")
            return None

    def _synthesize_edge_tts(self, text: str) -> Optional[np.ndarray]:
        """Fallback TTS using Microsoft Edge TTS (free, Indian English female)."""
        logger.info("Using Edge TTS (en-IN-NeerjaNeural)...")
        try:
            import asyncio
            import edge_tts
            import tempfile
            
            async def _generate():
                voice = "en-IN-NeerjaNeural"
                communicate = edge_tts.Communicate(text, voice)
                
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                    temp_path = temp_mp3.name
                
                await communicate.save(temp_path)
                return temp_path
            
            # Run the async function
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're inside an async context (FastAPI), use a thread
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        temp_path = pool.submit(
                            lambda: asyncio.run(_generate())
                        ).result(timeout=15)
                else:
                    temp_path = loop.run_until_complete(_generate())
            except RuntimeError:
                temp_path = asyncio.run(_generate())
            
            # Read the MP3 file back as audio data
            data, samplerate = sf.read(temp_path, dtype='float32')
            os.unlink(temp_path)
            
            # Resample to 16kHz if needed
            if samplerate != 16000:
                # Simple nearest-neighbor resample
                import scipy.signal as signal
                num_samples = int(len(data) * 16000 / samplerate)
                data = signal.resample(data, num_samples)
            
            logger.info(f"Edge TTS generated {len(data)} samples")
            return data.astype(np.float32)
            
        except Exception as ex:
            logger.error(f"Edge TTS failed: {ex}")
            return None

    def process_vad(self, audio_chunk: bytes) -> float:
        """
        Process VAD for a chunk of audio.
        Assumes audio_chunk is raw PCM 16-bit 16kHz mono.
        """
        if not self.vad_session:
            return 0.0
            
        # Convert bytes to float32 tensor
        # 16-bit PCM -> float -1..1
        audio_int16 = np.frombuffer(audio_chunk, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0
        
        # Check size. Silero expects specific sizes (e.g. 512, 1024, 1536)
        # We might need to buffer. For now, assume chunk is compatible or resize.
        # But for "Echo Loop", we process what we get.
        # If chunk is too small, we just return 0.
        
        if len(audio_float32) not in [512, 1024, 1536]:
            # Just a safeguard, real implementation needs a buffer
            return 0.0
            
        input_tensor = audio_float32[np.newaxis, :] # [1, N]
        
        # Run VAD
        # Inputs: input, sr, h, c
        sr_tensor = np.array([16000], dtype=np.int64)
        
        inputs = {
            'input': input_tensor,
            'sr': sr_tensor,
            'h': self.vad_h,
            'c': self.vad_c
        }
        
        output, h_new, c_new = self.vad_session.run(None, inputs)
        
        # Update state
        self.vad_h = h_new
        self.vad_c = c_new
        
        # Output is probability [1, 1]
        prob = output[0][0]
        return float(prob)

    def transcribe(self, audio_data: np.ndarray) -> str:
        """
        Transcribe audio data using Whisper.
        Args:
            audio_data: float32 numpy array, 16kHz mono recommended.
        """
        if not self.stt_model:
            return ""
            
        try:
            # Whisper expects float32
            # segments is a generator
            segments, info = self.stt_model.transcribe(audio_data, beam_size=5)
            
            text = " ".join([segment.text for segment in segments]).strip()
            return text
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""

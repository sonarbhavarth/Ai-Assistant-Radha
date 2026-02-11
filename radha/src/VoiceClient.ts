
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Use localhost for iOS Simulator, 10.0.2.2 for Android Emulator
// For physical device, use your machine's LAN IP
const WS_URL = 'ws://localhost:8000/ws';

export class VoiceClient {
    private socket: WebSocket | null = null;
    private recording: Audio.Recording | null = null;
    private isConnected: boolean = false;
    private onStatusChange: (status: string) => void;
    private sound: Audio.Sound | null = null;

    constructor(onStatusChange: (status: string) => void) {
        this.onStatusChange = onStatusChange;
    }

    connect() {
        this.socket = new WebSocket(WS_URL);
        this.socket.binaryType = 'blob'; // Important for receiving binary data

        this.socket.onopen = () => {
            console.log('Connected to backend');
            this.isConnected = true;
            this.onStatusChange('Connected');
        };

        this.socket.onmessage = async (event) => {
            try {
                if (event.data instanceof Blob) {
                    console.log('Received audio blob, size:', event.data.size);
                    this.onStatusChange('Playing response...');
                    await this.playAudioBlob(event.data);
                    this.onStatusChange('Connected');
                } else {
                    console.log('Received text:', event.data);
                }
            } catch (e) {
                console.error('Error handling message', e);
                this.onStatusChange('Error playing audio');
            }
        };

        this.socket.onclose = () => {
            console.log('Disconnected from backend');
            this.isConnected = false;
            this.onStatusChange('Disconnected');
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.onStatusChange('Error');
        };
    }

    async playAudioBlob(blob: Blob) {
        try {
            // Convert Blob to Base64 to save to file
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                // base64data is like "data:audio/wav;base64,....."
                const base64 = base64data.split(',')[1];

                const path = FileSystem.documentDirectory + 'response.wav';
                await FileSystem.writeAsStringAsync(path, base64, {
                    encoding: 'base64',
                });

                if (this.sound) {
                    await this.sound.unloadAsync();
                }

                const { sound } = await Audio.Sound.createAsync({ uri: path });
                this.sound = sound;
                await sound.playAsync();
            };
        } catch (e) {
            console.error('Failed to play audio blob', e);
        }
    }

    async startRecording() {
        if (!this.isConnected || this.recording) return;

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Configure for PCM recording (WAV)
            const iosPCM = {
                extension: '.wav',
                outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                audioQuality: Audio.IOSAudioQuality.MAX,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 256000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
            };

            const androidPCM = {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                extension: '.m4a',
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            };

            const { recording } = await Audio.Recording.createAsync({
                isMeteringEnabled: true,
                android: androidPCM,
                ios: iosPCM,
                web: Audio.RecordingOptionsPresets.HIGH_QUALITY.web
            });

            this.recording = recording;
            this.onStatusChange('Listening...');
            console.log('Recording started');

        } catch (err) {
            console.error('Failed to start recording', err);
            this.onStatusChange('Error Recording');
        }
    }

    async stopRecording() {
        if (!this.recording) return;

        try {
            this.onStatusChange('Processing...');
            await this.recording.stopAndUnloadAsync();
            const uri = this.recording.getURI();
            console.log('Recording stopped and stored at', uri);

            if (uri) {
                const response = await fetch(uri);
                const blob = await response.blob();

                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(blob);
                    console.log('Sent audio blob, size:', blob.size);
                } else {
                    console.error('Socket not open');
                    this.onStatusChange('Disconnected');
                }
            }

            this.recording = null;
        } catch (error) {
            console.error('Failed to stop recording', error);
            this.onStatusChange('Error Processing');
        }
    }
}

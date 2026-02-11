import * as Vosk from 'react-native-vosk';
import * as Haptics from 'expo-haptics';
import { EventEmitter } from 'events';

export const wakeWordEvents = new EventEmitter();
export const WAKE_WORD_DETECTED = 'WAKE_WORD_DETECTED';

class WakeWordService {
    private isListening: boolean = false;
    private isModelLoaded: boolean = false;
    private cooldownActive: boolean = false;
    private cooldownMs: number = 3000; // 3 second cooldown after detection
    private subscriptions: any[] = [];

    async initialize(): Promise<boolean> {
        try {
            // Load the model from assets
            // Model must be placed in:
            //   iOS: added to Xcode project as 'model-en'
            //   Android: android/app/src/main/assets/model-en
            await Vosk.loadModel('model-en');

            this.isModelLoaded = true;
            console.log('✅ Vosk model loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load Vosk model:', error);
            this.isModelLoaded = false;
            return false;
        }
    }

    async startListening(): Promise<void> {
        if (!this.isModelLoaded) {
            console.error('Vosk model not loaded. Call initialize() first.');
            return;
        }

        if (this.isListening) {
            console.log('Already listening for wake word');
            return;
        }

        try {
            this.isListening = true;
            console.log('🎤 Wake word detection started (listening for "Radha")');

            // Set up event listeners
            this.subscriptions.push(
                Vosk.onResult((result: string) => {
                    this.handleResult(result);
                })
            );

            this.subscriptions.push(
                Vosk.onPartialResult((partial: string) => {
                    this.handlePartialResult(partial);
                })
            );

            this.subscriptions.push(
                Vosk.onFinalResult((result: string) => {
                    this.handleResult(result);
                })
            );

            this.subscriptions.push(
                Vosk.onError((error: any) => {
                    console.error('Vosk error:', error);
                })
            );

            // Start recognition with strict grammar
            // Forces Vosk to only output 'radha' or classify as unknown
            await Vosk.start({
                grammar: ['radha', '[unk]'],
            });

        } catch (error) {
            console.error('Failed to start wake word listening:', error);
            this.isListening = false;
        }
    }

    stopListening(): void {
        if (!this.isListening) return;

        try {
            Vosk.stop();

            // Remove all subscriptions
            this.subscriptions.forEach(sub => {
                if (sub && sub.remove) sub.remove();
            });
            this.subscriptions = [];

            this.isListening = false;
            console.log('🔇 Wake word detection stopped');
        } catch (error) {
            console.error('Error stopping Vosk:', error);
        }
    }

    private handleResult(result: string) {
        try {
            const parsed = JSON.parse(result);
            const text = (parsed.text || '').toLowerCase().trim();

            if (text === 'radha' && !this.cooldownActive) {
                this.onWakeWordDetected();
            }
        } catch (e) {
            // Try raw text
            if (result.toLowerCase().includes('radha') && !this.cooldownActive) {
                this.onWakeWordDetected();
            }
        }
    }

    private handlePartialResult(partial: string) {
        try {
            const parsed = JSON.parse(partial);
            const text = (parsed.partial || '').toLowerCase().trim();

            if (text === 'radha' && !this.cooldownActive) {
                this.onWakeWordDetected();
            }
        } catch (e) {
            // Ignore parse errors on partial results
        }
    }

    private async onWakeWordDetected() {
        if (this.cooldownActive) return;

        console.log('🎯 WAKE WORD "Radha" DETECTED!');

        // Activate cooldown
        this.cooldownActive = true;
        setTimeout(() => {
            this.cooldownActive = false;
        }, this.cooldownMs);

        // 1. Immediate haptic feedback (<200ms)
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // 2. Stop Vosk while assistant handles request
        this.stopListening();

        // 3. Emit event to UI
        wakeWordEvents.emit(WAKE_WORD_DETECTED);
    }

    getIsListening(): boolean {
        return this.isListening;
    }

    getIsModelLoaded(): boolean {
        return this.isModelLoaded;
    }

    cleanup(): void {
        this.stopListening();
        try {
            Vosk.unload();
        } catch (e) {
            // Ignore cleanup errors
        }
        this.isModelLoaded = false;
    }
}

// Singleton instance
export const wakeWordService = new WakeWordService();

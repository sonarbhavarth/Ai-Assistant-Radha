import { StyleSheet, TouchableOpacity, View, Text, Animated, Switch } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { permissionManager } from '../../src/PermissionManager';
import { VoiceClient } from '../../src/VoiceClient';
import { wakeWordService, wakeWordEvents, WAKE_WORD_DETECTED } from '../../src/WakeWordService';

export default function HomeScreen() {
  const [status, setStatus] = useState('Disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWordReady, setWakeWordReady] = useState(false);
  const voiceClient = useRef<VoiceClient | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'Processing...') {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      // Reset animation
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [status]);

  useEffect(() => {
    async function setup() {
      const granted = await permissionManager.requestPermissions();
      if (!granted) {
        setStatus('Permission Denied');
        return;
      }

      voiceClient.current = new VoiceClient((newStatus) => {
        setStatus(newStatus);
      });

      try {
        voiceClient.current.connect();
      } catch (e) {
        console.error(e);
        setStatus('Connection Failed');
      }

      // Initialize Vosk wake word engine
      const loaded = await wakeWordService.initialize();
      setWakeWordReady(loaded);
      if (loaded) {
        console.log('✅ Vosk wake word engine ready');
      } else {
        console.log('⚠️ Vosk wake word engine failed to load');
      }
    }
    setup();

    // Listen for wake word detection events
    const onWakeWord = async () => {
      console.log('🎯 Wake word event received in UI!');
      setStatus('Wake word detected!');

      // Auto-start recording
      if (voiceClient.current) {
        setIsRecording(true);
        await voiceClient.current.startRecording();

        // Auto-stop after 5 seconds of recording
        setTimeout(async () => {
          if (voiceClient.current) {
            setIsRecording(false);
            await voiceClient.current.stopRecording();

            // Re-enable wake word after processing
            setTimeout(async () => {
              if (wakeWordService.getIsModelLoaded()) {
                await wakeWordService.startListening();
              }
            }, 2000);
          }
        }, 5000);
      }
    };

    wakeWordEvents.on(WAKE_WORD_DETECTED, onWakeWord);

    return () => {
      wakeWordEvents.off(WAKE_WORD_DETECTED, onWakeWord);
      wakeWordService.cleanup();
    };
  }, []);

  const handlePressIn = async () => {
    if (voiceClient.current) {
      setIsRecording(true);
      await voiceClient.current.startRecording();
    }
  };

  const handlePressOut = async () => {
    if (voiceClient.current) {
      setIsRecording(false);
      await voiceClient.current.stopRecording();
    }
  };

  const handleWakeWordToggle = async (value: boolean) => {
    setWakeWordEnabled(value);
    if (value) {
      await wakeWordService.startListening();
      setStatus('Always Listening...');
    } else {
      await wakeWordService.stopListening();
      setStatus('Connected');
    }
  };

  const isProcessing = status === 'Processing...';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Radha Voice Assistant</Text>
      <Text style={styles.status}>Status: {status}</Text>

      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>
          {wakeWordReady ? 'Wake Word ("Radha")' : 'Loading Vosk...'}
        </Text>
        <Switch
          value={wakeWordEnabled}
          onValueChange={handleWakeWordToggle}
          trackColor={{ false: '#767577', true: '#9B59B6' }}
          thumbColor={wakeWordEnabled ? '#fff' : '#f4f3f4'}
          disabled={!wakeWordReady}
        />
      </View>

      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.glow} />
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ scale: isProcessing ? pulseAnim : 1 }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.button,
            isRecording && styles.buttonActive,
            isProcessing && styles.buttonProcessing,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Hold to Speak'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  buttonProcessing: {
    backgroundColor: '#9B59B6',
  },
  glowContainer: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 120,
    backgroundColor: '#9B59B6',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
});


import { Audio } from 'expo-av';
import { Alert, Linking } from 'react-native';

/**
 * PermissionManager handles audio recording permissions using expo-av.
 */
class PermissionManager {
    /**
     * Check if audio recording permission is granted.
     */
    async checkPermissions(): Promise<boolean> {
        const { status } = await Audio.getPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Request audio recording permission.
     */
    async requestPermissions(): Promise<boolean> {
        const { status, canAskAgain } = await Audio.requestPermissionsAsync();

        if (status === 'granted') {
            return true;
        }

        if (status === 'denied' && !canAskAgain) {
            this.showSettingsAlert();
        }

        return false;
    }

    private showSettingsAlert() {
        Alert.alert(
            'Microphone Permission Required',
            'Radha needs access to your microphone to hear you. Please enable it in settings.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
        );
    }
}

export const permissionManager = new PermissionManager();

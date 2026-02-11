import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

/**
 * PermissionManager handles all permission logic for Radha.
 * It abstracts the platform-specific permissions and provides a simple interface.
 */
class PermissionManager {
    /**
     * List of required permissions based on Platform.
     */
    private get requiredPermissions(): Permission[] {
        if (Platform.OS === 'android') {
            // Android Permissions
            const permissions = [
                PERMISSIONS.ANDROID.RECORD_AUDIO,
                PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
                // Note: BLUETOOTH_CONNECT is API 31+. For older devices, this might need conditional logic.
                // We assume modern Android for Phase 1.
            ];
            return permissions;
        } else if (Platform.OS === 'ios') {
            // iOS Permissions
            return [
                PERMISSIONS.IOS.MICROPHONE,
                PERMISSIONS.IOS.SPEECH_RECOGNITION,
                // Bluetooth permissions on iOS are often handled by CoreBluetooth manager, 
                // but can be checked here if needed.
                PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
            ];
        }
        return [];
    }

    /**
     * Check all required permissions.
     * Returns true if all are granted.
     */
    async checkPermissions(): Promise<boolean> {
        logger.log('Checking permissions...');
        const permissions = this.requiredPermissions;
        let allGranted = true;

        for (const permission of permissions) {
            const result = await check(permission);
            if (result !== RESULTS.GRANTED) {
                allGranted = false;
                break;
            }
        }
        return allGranted;
    }

    /**
     * Request all required permissions sequentially.
     * Stops and returns false if any critical permission is denied.
     */
    async requestPermissions(): Promise<boolean> {
        const permissions = this.requiredPermissions;
        logger.log('Requesting permissions...', permissions);

        for (const permission of permissions) {
            const result = await request(permission);

            if (result === RESULTS.GRANTED) {
                continue;
            } else if (result === RESULTS.DENIED) {
                // Permission denied but requestable
                logger.warn(`Permission ${permission} denied.`);
                return false;
            } else if (result === RESULTS.BLOCKED) {
                // Permission blocked (User needs to enable in settings)
                this.showSettingsAlert(permission);
                return false;
            } else if (result === RESULTS.UNAVAILABLE) {
                logger.warn(`Permission ${permission} unavailable on this device.`);
                // Proceeding anyway as it might be an old device or emulator
                continue;
            }
        }
        return true;
    }

    private showSettingsAlert(permission: string) {
        Alert.alert(
            'Permission Required',
            `Radha needs access to ${permission} to function correctly. Please enable it in settings.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
        );
    }
}

// Simple Logger to replace console.log if needed
const logger = {
    log: (...args: any[]) => console.log('[PermissionManager]', ...args),
    warn: (...args: any[]) => console.warn('[PermissionManager]', ...args),
    error: (...args: any[]) => console.error('[PermissionManager]', ...args),
};

export const permissionManager = new PermissionManager();

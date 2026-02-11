/**
 * Radha Configuration
 * Switch between local and remote backend easily.
 */

const LOCAL_IP = 'localhost'; // Use '10.0.2.2' for Android Emulator if needed
const AWS_IP = 'YOUR_AWS_PUBLIC_IP'; // Replace with your EC2 Public IP

const IS_REMOTE = false; // Toggle this to true when using AWS

export const WS_URL = IS_REMOTE
    ? `ws://${AWS_IP}:8000/ws`
    : `ws://${LOCAL_IP}:8000/ws`;

console.log('🔗 Connecting to Backend at:', WS_URL);

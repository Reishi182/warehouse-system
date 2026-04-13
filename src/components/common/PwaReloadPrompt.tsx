import { useRegisterSW } from 'virtual:pwa-register/react';

// Check for SW updates every 60 seconds
const SW_UPDATE_INTERVAL = 60 * 1000;

export function PwaReloadPrompt() {
    useRegisterSW({
        onRegistered(registration) {
            console.log('SW Registered:', registration);
            // Periodically check for new service worker updates
            if (registration) {
                setInterval(() => {
                    registration.update();
                    console.log('Checking for SW update...');
                }, SW_UPDATE_INTERVAL);
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    // With autoUpdate, no UI is needed — updates apply automatically
    return null;
}

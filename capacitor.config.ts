import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.mangolin.app',
  appName: 'Mangolin',
  webDir: 'out',
  server: {
    // Point to your production server — the app loads from here
    url: 'https://mangolin.net',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFBF5',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFBF5'
    },
    Keyboard: {
      resizeOnFullScreen: true
    }
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Mangolin'
  },
  android: {
    backgroundColor: '#FFFBF5'
  }
};

export default config;

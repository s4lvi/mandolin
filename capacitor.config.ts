import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.mangolin.app',
  appName: 'Mangolin',
  webDir: 'out',
  server: {
    // Development: point to local server (simulator can reach localhost)
    // Production: change to your deployed URL (e.g. https://mangolin.net)
    url: 'http://localhost:3003',
    cleartext: true // Allow HTTP for local dev
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

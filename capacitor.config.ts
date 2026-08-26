import type { CapacitorConfig } from '@capacitor/cli';

// The URL the native shell loads. Defaults to production; override for local
// dev by exporting CAPACITOR_SERVER_URL (e.g. http://localhost:3003) before
// running `npx cap sync` / `npx cap run`.
const serverUrl =
  process.env.CAPACITOR_SERVER_URL || 'https://mangolin-311f4754e9db.herokuapp.com';

const config: CapacitorConfig = {
  appId: 'net.mangolin.app',
  appName: 'Mangolin',
  webDir: 'out',
  server: {
    url: serverUrl,
    // Only allow plain HTTP when explicitly pointed at an http:// dev server
    cleartext: serverUrl.startsWith('http://')
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

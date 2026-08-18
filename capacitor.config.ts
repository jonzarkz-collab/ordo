import type { CapacitorConfig } from '@capacitor/cli';

// App Store name is "Ordo: Longevity Menu Ranking"; appName here is the home
// screen label, which iOS truncates past ~12 characters anyway.
const config: CapacitorConfig = {
  appId: 'com.zafarjon.ordo',
  appName: 'Ordo',
  webDir: 'dist',
};

export default config;

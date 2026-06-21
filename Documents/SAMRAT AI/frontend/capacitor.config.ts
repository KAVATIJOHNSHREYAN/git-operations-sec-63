import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samratai.echomind',
  appName: 'SAMRAT AI',
  webDir: 'out',
  plugins: {
    SpeechRecognition: {}
  }
};

export default config;

import { Capacitor } from '@capacitor/core';

/** iOSアプリ（Capacitor）として動いているか。Web/PWAでは false */
export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

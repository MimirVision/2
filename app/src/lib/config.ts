import { Platform } from 'react-native';

/** Set these in app/.env (see .env.example) or as EAS environment variables. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export const REVENUECAT_API_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  }) ?? '';

/** Must match the entitlement identifier in RevenueCat and ENTITLEMENT_ID on the server. */
export const ENTITLEMENT_ID = 'pro';

export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://example.com/privacy';
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com';

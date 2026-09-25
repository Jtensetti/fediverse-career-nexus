import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Nolto', slug: 'nolto',
  ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { extra: { ...config.extra, eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } } : {}),
  android: { ...config.android, ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}) },
});

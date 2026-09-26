export const backend = {
  url: process.env.EXPO_PUBLIC_BACKEND_URL ?? '',
  publishableKey: process.env.EXPO_PUBLIC_BACKEND_KEY ?? '',
};
export const site = process.env.EXPO_PUBLIC_SITE_URL ?? '';
export const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '';
export const configured = backend.url.startsWith('https://') && !!backend.publishableKey && site.startsWith('https://');

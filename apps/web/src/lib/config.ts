export const appConfig = {
  functionsBaseUrl: process.env.CHECKINS_FUNCTION_URL ?? process.env.FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL,
  appCheckKey: process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY,
};

export const getFunctionsUrl = (path: string) => {
  if (!appConfig.functionsBaseUrl) {
    throw new Error('Configura CHECKINS_FUNCTION_URL o NEXT_PUBLIC_FUNCTIONS_BASE_URL.');
  }
  return `${appConfig.functionsBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

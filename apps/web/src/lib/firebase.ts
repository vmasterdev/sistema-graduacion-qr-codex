import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from 'firebase/app-check';
import { appConfig } from '@/lib/config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let appCheck: AppCheck | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const getFirebaseApp = (): FirebaseApp => {
  if (app) {
    return app;
  }

  if (getApps().length) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }

  return app;
};

export const initAppCheck = () => {
  if (appCheck || typeof window === 'undefined') {
    return appCheck;
  }

  if (!appConfig.appCheckKey) {
    console.warn('App Check no configurado. Define NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY.');
    return undefined;
  }

  const firebaseApp = getFirebaseApp();
  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(appConfig.appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
};

export const getAppCheckToken = async () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const instance = initAppCheck();
  if (!instance) {
    return undefined;
  }
  const result = await getToken(instance, false);
  return result.token;
};

export const getDb = (): Firestore => {
  if (db) {
    return db;
  }

  const firebaseApp = getFirebaseApp();

  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  return db;
};

export const getFirebaseAuth = async (): Promise<Auth> => {
  if (auth) {
    return auth;
  }

  const firebaseApp = getFirebaseApp();
  auth = getAuth(firebaseApp);
  await setPersistence(auth, browserLocalPersistence);
  return auth;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (storage) {
    return storage;
  }

  const firebaseApp = getFirebaseApp();
  storage = getStorage(firebaseApp);
  return storage;
};

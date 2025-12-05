import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  USE_FIREBASE_EMULATOR,
  FIREBASE_AUTH_EMULATOR_HOST,
  FIREBASE_AUTH_EMULATOR_PORT,
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
} from '@env';

// Firebase設定
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Firebaseアプリ初期化
const app = initializeApp(firebaseConfig);

// Auth初期化
export const auth = getAuth(app);

// Firestore初期化
export const db = getFirestore(app);

// エミュレータ接続
export const initFirebase = () => {
  const useEmulator = USE_FIREBASE_EMULATOR === 'true';
  
  if (useEmulator && __DEV__) {
    console.log('🔧 Firebase Emulatorに接続します');
    
    try {
      // Auth Emulator接続
      connectAuthEmulator(
        auth,
        `http://${FIREBASE_AUTH_EMULATOR_HOST}:${FIREBASE_AUTH_EMULATOR_PORT}`,
        { disableWarnings: true }
      );
      
      // Firestore Emulator接続
      connectFirestoreEmulator(
        db,
        FIRESTORE_EMULATOR_HOST,
        parseInt(FIRESTORE_EMULATOR_PORT, 10)
      );
      
      console.log('✅ Firebase Emulator接続完了');
      console.log(`   Auth: http://${FIREBASE_AUTH_EMULATOR_HOST}:${FIREBASE_AUTH_EMULATOR_PORT}`);
      console.log(`   Firestore: ${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
    } catch (error) {
      console.warn('⚠️ Firebase Emulator接続警告（既に接続済みの可能性）:', error);
    }
  }
};
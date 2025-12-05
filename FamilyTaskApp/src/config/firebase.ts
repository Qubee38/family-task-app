import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

console.log('🔹 firebase.ts loaded');

// expo-constants から環境変数取得
const expoConfig = Constants.expoConfig?.extra || {};

console.log('🔹 Expo config:', expoConfig);
console.log('🔹 useFirebaseEmulator:', expoConfig.useFirebaseEmulator);

// Firebase設定
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let isEmulatorConnected = false;

export const initFirebase = () => {
  console.log('🔹 initFirebase() called');
  
  if (isEmulatorConnected) {
    console.log('🔹 Already connected, skipping');
    return;
  }

  const useEmulator = expoConfig.useFirebaseEmulator === true;
  console.log('🔹 useEmulator:', useEmulator);
  
  if (useEmulator) {
    const authHost = expoConfig.firebaseAuthEmulatorHost || 'localhost';
    const authPort = expoConfig.firebaseAuthEmulatorPort || 9099;
    const firestoreHost = expoConfig.firestoreEmulatorHost || 'localhost';
    const firestorePort = expoConfig.firestoreEmulatorPort || 8080;
    
    console.log('🔹 Connecting to emulator...');
    console.log(`🔹 Auth: http://${authHost}:${authPort}`);
    console.log(`🔹 Firestore: ${firestoreHost}:${firestorePort}`);
    
    try {
      connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
      console.log('✅ Auth emulator connected');
      
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
      console.log('✅ Firestore emulator connected');
      
      isEmulatorConnected = true;
      
      logger.info('✅ Firebase Emulator接続成功');
      logger.debug(`  Auth: http://${authHost}:${authPort}`);
      logger.debug(`  Firestore: ${firestoreHost}:${firestorePort}`);
    } catch (error: any) {
      console.error('❌ Emulator connection error:', error);
      if (error.message?.includes('already')) {
        console.log('🔹 Already connected (error caught)');
        isEmulatorConnected = true;
      } else {
        logger.error('❌ Firebase Emulator接続エラー:', error);
      }
    }
  } else {
    console.log('🔹 Using production Firebase');
    logger.info('本番Firebase使用');
  }
};

console.log('🔹 Calling initFirebase() immediately...');
initFirebase();
console.log('🔹 initFirebase() completed');
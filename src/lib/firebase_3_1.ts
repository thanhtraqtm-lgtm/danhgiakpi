import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAWFbMZcUphCH7jhcsePnQG4WZ6Lk7uSdk",
  authDomain: "even-aria-rtn3v.firebaseapp.com",
  projectId: "even-aria-rtn3v",
  storageBucket: "even-aria-rtn3v.firebasestorage.app",
  messagingSenderId: "376619303274",
  appId: "1:376619303274:web:f01448439e8ea7252b2513"
};

const app = initializeApp(firebaseConfig);

// The customized firestore database ID
const databaseId = "ai-studio-kpievaluationhub-4708e87a-c7dd-4b02-88f4-e1356ebe9b0a";

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, databaseId);

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, Database, ref, onValue, set, push, update, remove, serverTimestamp } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp | null = null;
let database: Database | null = null;
let auth: Auth | null = null;

if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  database = getDatabase(app);
  auth = getAuth(app);
  
  try {
    getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics not available:', error);
  }
}

export { app, database, auth, ref, onValue, set, push, update, remove, serverTimestamp };
export type { Database };

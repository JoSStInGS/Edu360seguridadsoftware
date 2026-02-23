import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Firebase configuration retrieved from environment variables.
 * These variables should be defined in a `.env.local` file in Next.js
 * and exposed with the `NEXT_PUBLIC_` prefix.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Public API key for Firebase
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Authentication domain
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Project ID
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Storage bucket
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Sender ID for push messages
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // App ID
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Google Analytics ID (optional)
};

/**
 * Initializes the Firebase application with the provided configuration.
 * @type {import("firebase/app").FirebaseApp}
 */
const app = initializeApp(firebaseConfig);

/**
 * Firebase Authentication instance.
 * Used to manage users, sessions, and authentication providers.
 * @type {import("firebase/auth").Auth}
 */
export const auth = getAuth(app);

/**
 * Firestore database instance used for storing application data.
 */
export const db = getFirestore(app);

/**
 * Firebase Storage instance for handling file uploads and downloads.
 * Used for storing user-generated content like images or documents.
 * @type {import("firebase/storage").FirebaseStorage}
 */
// Use explicit bucket url in the form gs://... if provided
const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const bucketUrl = rawBucket
  ? rawBucket.startsWith("gs://")
    ? rawBucket
    : `gs://${rawBucket}`
  : undefined;

export const storage = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);

/**
 * Sets the persistence type for the authentication session in the browser.
 * `browserLocalPersistence` keeps the user logged in even after closing the browser.
 */
void setPersistence(auth, browserLocalPersistence);

/**
 * Google OAuth provider for authentication (Gmail accounts).
 */
export const googleProvider = new GoogleAuthProvider();

/**
 * Exports the initialized Firebase app for use in other parts of the project.
 */
export default app;

import admin from "firebase-admin";

function getServiceAccount(): admin.ServiceAccount | undefined {
  const inline =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (inline) {
    return JSON.parse(inline) as admin.ServiceAccount;
  }

  return undefined; // fallback a ADC
}

function getBucketName() {
  // Prefer server-only env, fallback to NEXT_PUBLIC, then hardcoded default
  const rawBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "default-bucket-name";

  // Normalize: accept either "bucket" or "gs://bucket"
  const normalized = rawBucket.startsWith("gs://")
    ? rawBucket.slice(5)
    : rawBucket;

  return normalized.trim();
}

export function ensureAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const svc = getServiceAccount();
  const bucketName = getBucketName();

  admin.initializeApp({
    credential: svc
      ? admin.credential.cert(svc)
      : admin.credential.applicationDefault(),
    projectId,
    storageBucket: bucketName,
  });

  return admin.app();
}

export function getAdminBucket() {
  const app = ensureAdminApp();
  // Use explicit bucket to avoid relying on app default if initialized elsewhere
  const bucketName = getBucketName();
  return admin.storage(app).bucket(bucketName);
}

export function getAdminDb() {
  const app = ensureAdminApp();
  return admin.firestore(app);
}

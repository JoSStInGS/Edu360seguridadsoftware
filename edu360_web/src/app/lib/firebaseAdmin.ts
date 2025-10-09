import admin from "firebase-admin";

function getServiceAccount() {
  const inline =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inline) {
    return JSON.parse(inline);
  }
  return undefined; // fall back to ADC if available
}

export function ensureAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const svc = getServiceAccount();

  admin.initializeApp({
    credential: svc
      ? admin.credential.cert(svc as any)
      : admin.credential.applicationDefault(),
    projectId,
     
  });

  return admin.app();
}

export function getAdminBucket() {
  const app = ensureAdminApp();
  return admin.storage(app).bucket();
}

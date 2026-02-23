import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * Normalizes role data to always return an array.
 */
export function normalizeRoles(data: Record<string, unknown> | null | undefined): string[] {
  if (!data) return [];
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return data.roles.filter((r: unknown) => typeof r === 'string');
  }
  if (typeof data.role === 'string' && data.role) {
    return [data.role];
  }
  return [];
}

/**
 * Login con email y contrasena.
 * Valida que el usuario tenga rol de profesor o padre.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const roles = await getUserRoles(cred.user.uid);

  if (!roles.includes('professor') && !roles.includes('parent')) {
    await signOut(auth);
    throw new Error('Solo profesores y encargados legales pueden acceder a esta aplicación.');
  }

  return cred.user;
}

/**
 * Registra un nuevo usuario con email y contrasena.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

/**
 * Crea o actualiza el perfil del usuario en Firestore.
 */
export async function createUserProfile(
  uid: string,
  data: {
    email: string;
    displayName: string;
    roles: string[];
    centerId: string;
    centerName: string;
  }
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...data,
    provider: 'email',
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Obtiene el rol del usuario desde Firestore.
 */
export async function getUserRole(
  userId: string
): Promise<string | null> {
  const ref = doc(db, 'users', userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as { role?: string };
  return data.role ?? null;
}

/**
 * Obtiene los roles del usuario como array.
 */
export async function getUserRoles(
  userId: string
): Promise<string[]> {
  const ref = doc(db, 'users', userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return [];
  return normalizeRoles(snapshot.data());
}

/**
 * Obtiene los datos del usuario desde Firestore.
 */
export async function getUserData(
  userId: string
): Promise<Record<string, unknown> | null> {
  const ref = doc(db, 'users', userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

/**
 * Cierra la sesion actual.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Devuelve el dominio MEP esperado segun los roles.
 */
export function getMepDomain(roles: string[]): string {
  if (roles.includes('parent')) return '@est.mep.go.cr';
  return '@mep.go.cr';
}

/**
 * Devuelve true si el correo coincide con el dominio MEP para los roles dados.
 */
export function isMepEmail(email: string, roles: string[]): boolean {
  const domain = getMepDomain(roles);
  return email.toLowerCase().endsWith(domain);
}

/**
 * Guarda el correo MEP del usuario en Firestore.
 */
export async function saveMepEmail(uid: string, mepEmail: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { mepEmail: mepEmail.toLowerCase() });
}

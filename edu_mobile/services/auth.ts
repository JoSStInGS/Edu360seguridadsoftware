import {
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * Login con email y contraseña.
 * Valida que el usuario tenga rol de profesor.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const role = await getUserRole(cred.user.uid);

  if (role !== 'professor') {
    await signOut(auth);
    throw new Error('Solo los profesores pueden acceder a esta aplicación.');
  }

  return cred.user;
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
 * Cierra la sesión actual.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

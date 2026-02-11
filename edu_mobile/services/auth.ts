import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * Login con email y contrasena.
 * Valida que el usuario tenga rol de profesor o padre.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const role = await getUserRole(cred.user.uid);

  if (role !== 'professor' && role !== 'parent') {
    await signOut(auth);
    throw new Error('Solo profesores y padres de familia pueden acceder a esta aplicación.');
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
    role: string;
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

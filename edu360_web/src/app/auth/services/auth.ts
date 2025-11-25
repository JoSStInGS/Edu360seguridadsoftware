import {
    auth,
    microsoftProvider,
    googleProvider,
    db,
} from "@/app/lib/firebase";
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    OAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Initiates Microsoft login using a popup.
 * If the popup is blocked by the browser, falls back to redirect login.
 * @returns {Promise<void>}
 */
export async function signInWithMicrosoft(): Promise<User | null> {
    try {
        // Attempt login with popup
        const result = await signInWithPopup(auth, microsoftProvider);

        // Extract credentials and access token (for Microsoft Graph API if needed)
        const cred = OAuthProvider.credentialFromResult(result);
        const accessToken = cred?.accessToken;
        console.log("Successful login with:", result.user.email, accessToken);
        await ensureInitialUserDoc(result.user);
        return result.user;
    } catch (err: unknown) {
        // If popup is blocked, fallback to redirect
        if (typeof err === "object" && err && (err as { code?: string }).code === "auth/popup-blocked") {
            await signInWithRedirect(auth, microsoftProvider);
            return null;
        }
        // Re-throw other errors
        throw err;
    }
}

/**
 * Initiates Google login using a popup or redirect as fallback.
 */
export async function signInWithGoogle(): Promise<User | null> {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureInitialUserDoc(result.user);
        return result.user;
    } catch (err: unknown) {
        if (typeof err === "object" && err && (err as { code?: string }).code === "auth/popup-blocked") {
            await signInWithRedirect(auth, googleProvider);
            return null;
        }
        throw err;
    }
}

/**
 * Logs in using email and password credentials.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureInitialUserDoc(cred.user);
    return cred.user;
}

/**
 * Registers a new user with email and password.
 */
export async function registerWithEmail(email: string, password: string): Promise<User> {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{9,}$/;
    if (!passwordRegex.test(password)) {
        throw new Error(
            "La contraseña debe ser mayor a 8 caracteres y contener al menos un número, una letra mayúscula y una letra minúscula."
        );
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserIfFirstTime(cred.user);
    return cred.user;
}

/**
 * Handles the login result if the user was redirected.
 * Call this function on page load to complete redirect login flow.
 * @returns {Promise<void>}
 */
export async function handleRedirectLoginIfNeeded(): Promise<void> {
    const result = await getRedirectResult(auth);
    if (result?.user) {
        console.log("Redirect login successful:", result.user.email);
    }
}

/**
 * Signs out the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
    await signOut(auth);
}

/**
 * Saves the user's data in Firestore if this is their first login.
 * The document ID corresponds to the user's UID.
 * @param {User} user - Authenticated Firebase user
 */
export async function ensureInitialUserDoc(user: User): Promise<void> {
    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
        await setDoc(ref, {
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            provider: user.providerData?.[0]?.providerId ?? null,
            createdAt: new Date().toISOString(),
        });
    }
}

export async function getUserRole(userId: string): Promise<string | null> {
    const ref = doc(db, "users", userId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as { role?: string };
    return data.role ?? null;
}



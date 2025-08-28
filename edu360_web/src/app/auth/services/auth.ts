import {
    auth,
    microsoftProvider,
    db,
} from "@/app/lib/firebase";
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    OAuthProvider,
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
        await saveUserIfFirstTime(result.user);
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
export async function saveUserIfFirstTime(user: User): Promise<void> {
    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
        await setDoc(ref, { email: user.email });
    }
}

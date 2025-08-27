import {
    auth,
    microsoftProvider,
} from "@/app/lib/firebase";
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    OAuthProvider,
} from "firebase/auth";

/**
 * Initiates Microsoft login using a popup.
 * If the popup is blocked by the browser, falls back to redirect login.
 * @returns {Promise<void>}
 */
export async function signInWithMicrosoft(): Promise<void> {
    try {
        // Attempt login with popup
        const result = await signInWithPopup(auth, microsoftProvider);

        // Extract credentials and access token (for Microsoft Graph API if needed)
        const cred = OAuthProvider.credentialFromResult(result);
        const accessToken = cred?.accessToken;
        console.log("Successful login with:", result.user.email, accessToken);

    } catch (err: any) {
        // If popup is blocked, fallback to redirect
        if (err?.code === "auth/popup-blocked") {
            await signInWithRedirect(auth, microsoftProvider);
            return;
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
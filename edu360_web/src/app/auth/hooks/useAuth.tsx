import { useEffect, useState } from "react";
import { auth } from "@/app/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

/**
 * Custom React hook to track Firebase authentication state.
 * @returns {{ user: User | null, loading: boolean }}
 * - `user`: currently logged-in Firebase user, or `null` if not logged in.
 * - `loading`: `true` while authentication state is being determined, `false` afterwards.
 */
export function useAuth() {
    // State for the current user, initialized with the current Firebase user (if any)
    const [user, setUser] = useState<User | null>(auth.currentUser);

    // State for loading indicator
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to authentication state changes
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);       // update user state
            setLoading(false); // set loading to false once state is known
        });

        // Cleanup subscription on unmount
        return () => unsub();
    }, []);

    return { user, loading };
}

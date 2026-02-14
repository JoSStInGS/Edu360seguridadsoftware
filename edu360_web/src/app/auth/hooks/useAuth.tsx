import { useEffect, useState } from "react";
import { auth } from "@/app/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile } from "@/app/auth/services/auth";
import type { UserRole } from "@/app/lib/roles";
import { useActiveRoleStore } from "@/app/stores/useActiveRoleStore";

export function useAuth() {
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [centerId, setCenterId] = useState<string | null>(null);
    const [profesorId, setProfesorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    const profile = await getUserProfile(u.uid);
                    if (profile) {
                        setRoles(profile.roles);
                        setCenterId(profile.centerId);
                        setProfesorId(profile.profesorId);
                        useActiveRoleStore.getState().initializeRoles(profile.roles);
                    } else {
                        setRoles([]);
                        setCenterId(null);
                        setProfesorId(null);
                        useActiveRoleStore.getState().initializeRoles([]);
                    }
                } catch {
                    setRoles([]);
                    setCenterId(null);
                    setProfesorId(null);
                    useActiveRoleStore.getState().initializeRoles([]);
                }
            } else {
                setRoles([]);
                setCenterId(null);
                setProfesorId(null);
                useActiveRoleStore.getState().initializeRoles([]);
            }
            setLoading(false);
        });

        return () => unsub();
    }, []);

    return { user, roles, centerId, profesorId, loading };
}

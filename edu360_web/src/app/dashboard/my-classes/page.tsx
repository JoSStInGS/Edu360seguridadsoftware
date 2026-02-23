"use client";

import { useAuth } from "@/app/auth/hooks/useAuth";
import { useActiveRoleStore } from "@/app/stores/useActiveRoleStore";
import MyClassesView from "./components/MyClassesView";

export default function MyClassesPage() {
    const { loading } = useAuth();
    const { activeRole } = useActiveRoleStore();

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
            </div>
        );
    }

    if (activeRole === "professor") {
        return <MyClassesView />;
    }

    return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                No tienes permisos para acceder a esta sección.
            </p>
        </div>
    );
}

"use client";

import { useAuth } from "@/app/auth/hooks/useAuth";
import { useActiveRoleStore } from "@/app/stores/useActiveRoleStore";
import ProfessorAttendanceView from "./components/ProfessorAttendanceView";
import AdminAttendanceView from "./components/AdminAttendanceView";

export default function AttendancePage() {
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
        return <ProfessorAttendanceView />;
    }

    if (activeRole === "admin") {
        return <AdminAttendanceView />;
    }

    return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                No tienes permisos para acceder a esta seccion.
            </p>
        </div>
    );
}

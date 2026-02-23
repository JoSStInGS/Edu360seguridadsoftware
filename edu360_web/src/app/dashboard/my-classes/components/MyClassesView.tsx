"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import type { GroupedClass, StudentItem } from "@/types/myClasses";
import type { AbsenceJustification } from "@/types/justification";
import ClassCard from "./ClassCard";
import StudentsPanel from "./StudentsPanel";
import JustificationsPanel from "./JustificationsPanel";

export default function MyClassesView() {
    const { user } = useAuth();
    const { selectedPeriod } = usePeriodStore();

    const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Resolved profesor identity (from API)
    const [profesorId, setProfesorId] = useState<string>("");

    // Students panel state
    const [selectedClass, setSelectedClass] = useState<GroupedClass | null>(null);
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Justifications state
    const [pendingMap, setPendingMap] = useState<Map<string, AbsenceJustification[]>>(new Map());
    const [justPanel, setJustPanel] = useState<GroupedClass | null>(null);
    const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
    const [loadingJust, setLoadingJust] = useState(false);
    const [isJustPanelOpen, setIsJustPanelOpen] = useState(false);

    const getToken = useCallback(async () => {
        if (!user) return null;
        return user.getIdToken();
    }, [user]);

    // Fetch classes for the selected period
    useEffect(() => {
        const fetchClasses = async () => {
            if (!selectedPeriod) {
                setGroupedClasses([]);
                setLoading(false);
                return;
            }

            const token = await getToken();
            if (!token) return;

            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/my-classes?period=${selectedPeriod}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    throw new Error(`Error ${res.status}`);
                }

                const data = await res.json();
                setGroupedClasses(data.classes || []);
                if (data.profesorId) setProfesorId(data.profesorId);
            } catch (err) {
                console.error("Error fetching my classes:", err);
                setError("No se pudieron cargar las clases. Inténtalo de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [user, selectedPeriod, getToken]);

    // Fetch pending justifications for this professor's groups
    const fetchJustifications = useCallback(async () => {
        if (!selectedPeriod) return;
        const token = await getToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/justifications?period=${selectedPeriod}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list: AbsenceJustification[] = data.justifications || [];

            // Build Map<grupoId, AbsenceJustification[]>
            const map = new Map<string, AbsenceJustification[]>();
            for (const j of list) {
                const existing = map.get(j.grupoId) ?? [];
                existing.push(j);
                map.set(j.grupoId, existing);
            }
            setPendingMap(map);
        } catch (err) {
            console.error("Error fetching justifications:", err);
        }
    }, [getToken, selectedPeriod]);

    useEffect(() => {
        fetchJustifications();
    }, [fetchJustifications]);

    const handleViewJustifications = useCallback(async (gc: GroupedClass) => {
        setJustPanel(gc);
        setIsJustPanelOpen(true);
        setLoadingJust(true);
        setJustifications(pendingMap.get(gc.grupoId) ?? []);
        setLoadingJust(false);
    }, [pendingMap]);

    const handleJustPanelClose = useCallback(() => {
        setIsJustPanelOpen(false);
        setJustPanel(null);
        setJustifications([]);
    }, []);

    const handleDecisionMade = useCallback(() => {
        fetchJustifications();
    }, [fetchJustifications]);

    const handleViewStudents = useCallback(async (gc: GroupedClass) => {
        setSelectedClass(gc);
        setStudents([]);
        setIsPanelOpen(true);
        setLoadingStudents(true);

        try {
            const token = await getToken();
            if (!token || !selectedPeriod) return;

            const res = await fetch(
                `/api/attendance/students?period=${selectedPeriod}&grupoId=${gc.grupoId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) throw new Error(`Error ${res.status}`);

            const data = await res.json();
            setStudents(data.students || []);
        } catch (err) {
            console.error("Error fetching students:", err);
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, [getToken, selectedPeriod]);

    const handleClosePanel = useCallback(() => {
        setIsPanelOpen(false);
        setSelectedClass(null);
        setStudents([]);
    }, []);

    return (
        <div className="mx-auto w-full max-w-7xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold">Mis Clases</h2>
                <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Materias y grupos a tu cargo en el periodo seleccionado
                </p>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <span className="material-symbols-outlined mb-4 text-5xl text-[var(--destructive-light)] dark:text-[var(--destructive-dark)]">
                        error
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">Error al cargar</h3>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {error}
                    </p>
                </div>
            ) : !selectedPeriod ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        calendar_month
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">Sin periodo seleccionado</h3>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Selecciona un periodo lectivo en la barra superior para ver tus clases.
                    </p>
                </div>
            ) : groupedClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        menu_book
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">Sin clases asignadas</h3>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        No tienes clases asignadas en el periodo seleccionado.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            <span className="font-semibold">{groupedClasses.length}</span>{" "}
                            {groupedClasses.length === 1 ? "clase" : "clases"} asignadas
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {groupedClasses.map((gc) => (
                            <ClassCard
                                key={gc.key}
                                groupedClass={gc}
                                onViewStudents={() => handleViewStudents(gc)}
                                pendingJustifications={pendingMap.get(gc.grupoId)?.length ?? 0}
                                onViewJustifications={() => handleViewJustifications(gc)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Students slide-over panel */}
            <StudentsPanel
                isOpen={isPanelOpen}
                groupedClass={selectedClass}
                students={students}
                loading={loadingStudents}
                onClose={handleClosePanel}
                profesorId={profesorId}
                profesorNombre={user?.displayName || ""}
                periodId={selectedPeriod || ""}
            />

            {/* Justifications slide-over panel */}
            <JustificationsPanel
                isOpen={isJustPanelOpen}
                groupedClass={justPanel}
                justifications={justifications}
                loading={loadingJust}
                profesorId={profesorId}
                profesorNombre={user?.displayName || ""}
                periodId={selectedPeriod || ""}
                onClose={handleJustPanelClose}
                onDecisionMade={handleDecisionMade}
            />
        </div>
    );
}

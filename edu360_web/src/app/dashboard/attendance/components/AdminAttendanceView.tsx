"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

interface AttendanceRecord {
    id: string;
    date: string;
    grupoId: string;
    grupoNombre: string;
    profesorId: string;
    scheduleId: string;
    records: { studentId: string; studentName: string; present: boolean }[];
    createdAt: string;
}

interface FilterOption {
    id: string;
    name: string;
}

export default function AdminAttendanceView() {
    const { user } = useAuth();
    const { selectedPeriod } = usePeriodStore();

    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [profesores, setProfesores] = useState<FilterOption[]>([]);
    const [grupos, setGrupos] = useState<FilterOption[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState(getTodayDateString());
    const [filterProfesor, setFilterProfesor] = useState("");
    const [filterGrupo, setFilterGrupo] = useState("");

    // Expanded row
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const getToken = useCallback(async () => {
        if (!user) return null;
        return user.getIdToken();
    }, [user]);

    // Fetch filter options
    useEffect(() => {
        const fetchFilters = async () => {
            if (!user || !selectedPeriod) return;
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const centerId = userDocSnap.data()?.centerId;
                if (!centerId) return;

                const periodRef = doc(db, "centers", centerId, "periods", selectedPeriod);

                // Fetch profesores
                const profSnap = await getDocs(collection(periodRef, "profesores"));
                const profs = profSnap.docs.map((d) => ({
                    id: d.id,
                    name: d.data().nombre || d.data().name || "Sin nombre",
                }));
                profs.sort((a, b) => a.name.localeCompare(b.name));
                setProfesores(profs);

                // Fetch grupos
                const gruposSnap = await getDocs(collection(periodRef, "grupos"));
                const grps = gruposSnap.docs.map((d) => ({
                    id: d.id,
                    name: d.data().nombre || d.data().name || d.id,
                }));
                grps.sort((a, b) => a.name.localeCompare(b.name));
                setGrupos(grps);
            } catch (err) {
                console.error("Error fetching filters:", err);
            }
        };
        fetchFilters();
    }, [user, selectedPeriod]);

    // Fetch attendance records
    const fetchRecords = useCallback(async () => {
        if (!selectedPeriod) return;
        const token = await getToken();
        if (!token) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({ period: selectedPeriod });
            if (filterDate) params.set("date", filterDate);
            if (filterProfesor) params.set("profesorId", filterProfesor);
            if (filterGrupo) params.set("grupoId", filterGrupo);

            const res = await fetch(`/api/attendance?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setRecords(data.records || []);
        } catch (err) {
            console.error("Error fetching records:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod, filterDate, filterProfesor, filterGrupo, getToken]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const getProfesorName = (id: string) =>
        profesores.find((p) => p.id === id)?.name || id;

    return (
        <div className="mx-auto w-full max-w-7xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold">Asistencia</h2>
                <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Consulta los registros de asistencia
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Date */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        />
                    </div>

                    {/* Profesor */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Profesor
                        </label>
                        <select
                            value={filterProfesor}
                            onChange={(e) => setFilterProfesor(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        >
                            <option value="">Todos los profesores</option>
                            {profesores.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Grupo */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Grupo
                        </label>
                        <select
                            value={filterGrupo}
                            onChange={(e) => setFilterGrupo(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        >
                            <option value="">Todos los grupos</option>
                            {grupos.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                </div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        search_off
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">Sin registros</h3>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        No se encontraron registros de asistencia con los filtros seleccionados.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[rgba(15,23,42,0.04)] text-xs uppercase text-[var(--muted-light)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[var(--muted-dark)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Fecha</th>
                                    <th className="px-6 py-3 font-medium">Profesor</th>
                                    <th className="px-6 py-3 font-medium">Grupo</th>
                                    <th className="px-6 py-3 font-medium text-center">Presentes</th>
                                    <th className="px-6 py-3 font-medium text-center">Ausentes</th>
                                    <th className="px-6 py-3 font-medium text-center">Detalle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => {
                                    const present = record.records?.filter((r) => r.present).length ?? 0;
                                    const absent = (record.records?.length ?? 0) - present;
                                    const isExpanded = expandedId === record.id;

                                    return (
                                        <tr key={record.id} className="border-b border-[var(--border-light)] last:border-0 dark:border-[var(--border-dark)]">
                                            <td className="px-6 py-4">
                                                {formatDateDisplay(record.date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getProfesorName(record.profesorId)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {record.grupoNombre || record.grupoId}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    {present}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                    {absent}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                                                    className="rounded p-1.5 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {isExpanded ? "expand_less" : "expand_more"}
                                                    </span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Expanded detail */}
                    {expandedId && (() => {
                        const record = records.find((r) => r.id === expandedId);
                        if (!record?.records?.length) return null;

                        return (
                            <div className="border-t border-[var(--border-light)] bg-[rgba(15,23,42,0.02)] p-6 dark:border-[var(--border-dark)] dark:bg-[rgba(255,255,255,0.02)]">
                                <h4 className="mb-3 text-sm font-semibold">
                                    Detalle: {record.grupoNombre} - {formatDateDisplay(record.date)}
                                </h4>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                    {record.records.map((r) => (
                                        <div
                                            key={r.studentId}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                                r.present
                                                    ? "bg-green-50 dark:bg-green-900/10"
                                                    : "bg-red-50 dark:bg-red-900/10"
                                            }`}
                                        >
                                            <span
                                                className={`material-symbols-outlined text-base ${
                                                    r.present
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                }`}
                                            >
                                                {r.present ? "check_circle" : "cancel"}
                                            </span>
                                            <span>{r.studentName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Footer */}
                    <div className="border-t border-[var(--border-light)] bg-[rgba(15,23,42,0.02)] px-6 py-3 dark:border-[var(--border-dark)] dark:bg-[rgba(255,255,255,0.02)]">
                        <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Mostrando <span className="font-semibold">{records.length}</span> registros
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function getTodayDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr: string): string {
    try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString("es", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

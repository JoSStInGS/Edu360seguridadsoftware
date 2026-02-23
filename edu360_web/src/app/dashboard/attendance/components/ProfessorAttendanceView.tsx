"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import type { ScheduleEntry, Student, StudentAttendance } from "@/types/attendance";

function formatTime(time: string): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${suffix}`;
}

function isClassStarted(horaInicio: string): boolean {
    const now = new Date();
    const [hours, minutes] = horaInicio.split(":").map(Number);
    const classStart = new Date();
    classStart.setHours(hours, minutes, 0, 0);
    return now >= classStart;
}

function isCurrentClass(horaInicio: string, horaFin: string): boolean {
    const now = new Date();
    const [sh, sm] = horaInicio.split(":").map(Number);
    const [eh, em] = horaFin.split(":").map(Number);
    const start = new Date();
    start.setHours(sh, sm, 0, 0);
    const end = new Date();
    end.setHours(eh, em, 0, 0);
    return now >= start && now <= end;
}

function getTodayDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function ProfessorAttendanceView() {
    const { user } = useAuth();
    const { selectedPeriod } = usePeriodStore();

    const [classes, setClasses] = useState<ScheduleEntry[]>([]);
    const [profesorId, setProfesorId] = useState<string | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    type AttendanceStatus = 'en_proceso' | 'presente' | 'ausente';
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showTimeRestrictionModal, setShowTimeRestrictionModal] = useState(false);

    const getToken = useCallback(async () => {
        if (!user) return null;
        return user.getIdToken();
    }, [user]);

    // Fetch today's classes
    useEffect(() => {
        const fetchClasses = async () => {
            if (!selectedPeriod) return;
            const token = await getToken();
            if (!token) return;

            setLoadingClasses(true);
            try {
                const res = await fetch(
                    `/api/attendance/teacher-schedule?period=${selectedPeriod}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error("Failed to fetch schedule");
                const data = await res.json();
                setClasses(data.classes || []);
                setProfesorId(data.profesorId);

                // Auto-select current class
                const current = (data.classes || []).find(
                    (c: ScheduleEntry) => isCurrentClass(c.horaInicio, c.horaFin)
                );
                if (current) setSelectedEntry(current);
            } catch (err) {
                console.error("Error fetching classes:", err);
            } finally {
                setLoadingClasses(false);
            }
        };
        fetchClasses();
    }, [selectedPeriod, getToken]);

    // Fetch students when class is selected
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedEntry || !selectedPeriod) return;
            const token = await getToken();
            if (!token) return;

            setLoadingStudents(true);
            setSaved(false);
            try {
                // Fetch students
                const studentsRes = await fetch(
                    `/api/attendance/students?period=${selectedPeriod}&grupoId=${selectedEntry.grupoId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!studentsRes.ok) throw new Error("Failed to fetch students");
                const studentsData = await studentsRes.json();
                setStudents(studentsData.students || []);

                // Check existing attendance
                const attendanceRes = await fetch(
                    `/api/attendance?period=${selectedPeriod}&grupoId=${selectedEntry.grupoId}&date=${getTodayDate()}&scheduleId=${selectedEntry.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const attendanceData = await attendanceRes.json();

                if (attendanceData.record) {
                    const map: Record<string, AttendanceStatus> = {};
                    for (const r of attendanceData.record.records || []) {
                        // Backward compat: normalize old `present: boolean` to `status`
                        if (r.status) {
                            map[r.studentId] = r.status;
                        } else {
                            map[r.studentId] = r.present ? 'presente' : 'ausente';
                        }
                    }
                    setAttendanceMap(map);
                    setSaved(true);
                } else {
                    // Default: all en_proceso
                    const map: Record<string, AttendanceStatus> = {};
                    for (const s of studentsData.students || []) {
                        map[s.id] = 'en_proceso';
                    }
                    setAttendanceMap(map);
                }
            } catch (err) {
                console.error("Error fetching students:", err);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedEntry, selectedPeriod, getToken]);

    const toggleAttendance = (studentId: string) => {
        setSaved(false);
        setAttendanceMap((prev) => {
            const current = prev[studentId] || 'en_proceso';
            let next: AttendanceStatus;
            if (current === 'en_proceso') next = 'presente';
            else if (current === 'presente') next = 'ausente';
            else next = 'presente';
            return { ...prev, [studentId]: next };
        });
    };

    const markAllPresent = () => {
        setSaved(false);
        const map: Record<string, AttendanceStatus> = {};
        for (const s of students) map[s.id] = 'presente';
        setAttendanceMap(map);
    };

    const markAllAbsent = () => {
        setSaved(false);
        const map: Record<string, AttendanceStatus> = {};
        for (const s of students) map[s.id] = 'ausente';
        setAttendanceMap(map);
    };

    const handleSave = async () => {
        if (!selectedEntry || !profesorId || !selectedPeriod) return;
        const token = await getToken();
        if (!token) return;

        setSaving(true);
        try {
            const records: StudentAttendance[] = students.map((s) => ({
                studentId: s.id,
                studentName: s.fullName || s.cedula,
                status: attendanceMap[s.id] ?? 'en_proceso',
            }));

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    periodId: selectedPeriod,
                    scheduleId: selectedEntry.id,
                    grupoId: selectedEntry.grupoId,
                    grupoNombre: selectedEntry.grupoNombre,
                    profesorId,
                    date: getTodayDate(),
                    dia: selectedEntry.dia,
                    records,
                    horaInicio: selectedEntry.horaInicio,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Error al guardar");
                return;
            }

            setSaved(true);
        } catch (err) {
            console.error("Error saving:", err);
            alert("Error al guardar la asistencia");
        } finally {
            setSaving(false);
        }
    };

    const enProcesoCount = Object.values(attendanceMap).filter((v) => v === 'en_proceso').length;
    const presentCount = Object.values(attendanceMap).filter((v) => v === 'presente').length;
    const absentCount = Object.values(attendanceMap).filter((v) => v === 'ausente').length;
    const classNotStarted = selectedEntry ? !isClassStarted(selectedEntry.horaInicio) : false;

    const handleInteraction = (action: () => void) => {
        if (classNotStarted) {
            setShowTimeRestrictionModal(true);
            return;
        }
        action();
    };

    const todayFormatted = new Date().toLocaleDateString("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="mx-auto w-full max-w-4xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold">Asistencia</h2>
                <p className="mt-1 text-sm capitalize text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    {todayFormatted}
                </p>
            </div>

            {/* Class selector */}
            {loadingClasses ? (
                <div className="flex h-24 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--primary)] border-t-transparent" />
                </div>
            ) : classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                    <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        event_busy
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">No hay clases hoy</h3>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        No tienes clases programadas para el dia de hoy.
                    </p>
                </div>
            ) : (
                <>
                    {/* Class picker */}
                    <div className="relative mb-4">
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            className="flex w-full items-center justify-between rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-4 transition hover:border-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        >
                            {selectedEntry ? (
                                <div className="flex items-center gap-3">
                                    <span className="rounded-lg bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                                        {formatTime(selectedEntry.horaInicio)}
                                    </span>
                                    <div className="text-left">
                                        <p className="font-medium">{selectedEntry.asignaturaNombre}</p>
                                        <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                            {selectedEntry.grupoNombre}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    Selecciona una clase
                                </span>
                            )}
                            <span className="material-symbols-outlined text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {showPicker ? "expand_less" : "expand_more"}
                            </span>
                        </button>

                        {showPicker && (
                            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-lg dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                                {classes.map((entry) => {
                                    const isActive = selectedEntry?.id === entry.id;
                                    const isCurrent = isCurrentClass(entry.horaInicio, entry.horaFin);
                                    return (
                                        <button
                                            key={entry.id}
                                            onClick={() => {
                                                setSelectedEntry(entry);
                                                setShowPicker(false);
                                            }}
                                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                                                isActive
                                                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                                    : "hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]"
                                            }`}
                                        >
                                            <div>
                                                <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                                    {formatTime(entry.horaInicio)} - {formatTime(entry.horaFin)}
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {entry.asignaturaNombre} - {entry.grupoNombre}
                                                </p>
                                            </div>
                                            {isCurrent && (
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    Ahora
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Time restriction banner */}
                    {classNotStarted && selectedEntry && (
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
                                schedule
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    Clase aun no ha iniciado
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Podras registrar asistencia a partir de las {formatTime(selectedEntry.horaInicio)}.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stats bar */}
                    {students.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                <span className="material-symbols-outlined text-sm">remove_circle</span>
                                {enProcesoCount} en proceso
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {presentCount} presentes
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                {absentCount} ausentes
                            </span>
                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => handleInteraction(markAllPresent)}
                                    className="text-xs font-medium text-[var(--primary)] hover:underline"
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => handleInteraction(markAllAbsent)}
                                    className="text-xs font-medium text-red-500 hover:underline"
                                >
                                    Ninguno
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Student list */}
                    {loadingStudents ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--primary)] border-t-transparent" />
                        </div>
                    ) : !selectedEntry ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                            <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                checklist
                            </span>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                Selecciona una clase para pasar lista
                            </p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                            <span className="material-symbols-outlined mb-4 text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                group_off
                            </span>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                No hay estudiantes registrados en este grupo
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {students.map((student, idx) => {
                                    const status = attendanceMap[student.id] ?? 'en_proceso';
                                    const borderClass = status === 'presente'
                                        ? "border-green-200 bg-green-50/50 hover:bg-green-50 dark:border-green-800/50 dark:bg-green-900/10 dark:hover:bg-green-900/20"
                                        : status === 'ausente'
                                        ? "border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-800/50 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                                        : "border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20";
                                    const avatarClass = status === 'presente'
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : status === 'ausente'
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                                    const toggleClass = status === 'presente'
                                        ? "bg-green-500 text-white"
                                        : status === 'ausente'
                                        ? "bg-red-500 text-white"
                                        : "bg-amber-500 text-white";
                                    const toggleIcon = status === 'presente' ? "check" : status === 'ausente' ? "close" : "remove";
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => handleInteraction(() => toggleAttendance(student.id))}
                                            className={`flex w-full items-center justify-between rounded-xl border p-4 transition ${borderClass} ${classNotStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${avatarClass}`}
                                                >
                                                    {idx + 1}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                                        {student.fullName || "Sin nombre"}
                                                    </p>
                                                    <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                                        {student.cedula}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`flex h-8 w-8 items-center justify-center rounded-full ${toggleClass}`}
                                            >
                                                <span className="material-symbols-outlined text-lg">
                                                    {toggleIcon}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Save button */}
                            <div className="sticky bottom-0 mt-6 pb-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || saved || classNotStarted}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition ${
                                        saved
                                            ? "bg-green-500"
                                            : classNotStarted
                                            ? "cursor-not-allowed bg-gray-400"
                                            : "bg-[var(--primary)] hover:brightness-105"
                                    } disabled:opacity-70`}
                                >
                                    {saving ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Guardando...
                                        </>
                                    ) : saved ? (
                                        <>
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                            Guardado
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            Guardar asistencia
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Time restriction modal */}
            {showTimeRestrictionModal && selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowTimeRestrictionModal(false)} />
                    <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400">
                                schedule
                            </span>
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            No se puede registrar asistencia
                        </h3>
                        <p className="mb-6 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            La clase de <span className="font-semibold">{selectedEntry.asignaturaNombre}</span> aun no ha iniciado. Podras registrar asistencia a partir de las{" "}
                            <span className="font-semibold">{formatTime(selectedEntry.horaInicio)}</span>.
                        </p>
                        <button
                            onClick={() => setShowTimeRestrictionModal(false)}
                            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

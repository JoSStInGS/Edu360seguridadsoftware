"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import SendComunicadoModal from "./SendComunicadoModal";

interface SelectedCell {
    entry: {
        id: string;
        asignaturaNombre: string;
        grupoId: string;
        grupoNombre: string;
        profesorId: string;
        profesorNombre: string;
        horaInicio: string;
        horaFin: string;
        dia: string;
    };
    dayIndex: number;
    periodo: number;
}

interface Student {
    id: string;
    cedula: string;
    fullName: string;
}

interface ScheduleStudentPanelProps {
    selectedCell: SelectedCell;
    periodId: string;
    profesorId: string;
    onClose: () => void;
}

function formatTime(time: string): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${suffix}`;
}

export default function ScheduleStudentPanel({
    selectedCell,
    periodId,
    profesorId,
    onClose,
}: ScheduleStudentPanelProps) {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

    // Comunicado modal state
    const [comunicadoStudent, setComunicadoStudent] = useState<Student | null>(null);
    const [showComunicadoModal, setShowComunicadoModal] = useState(false);

    const entry = selectedCell.entry;

    const fetchStudents = useCallback(async () => {
        if (!user || !periodId || !entry.grupoId) return;

        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(
                `/api/attendance/students?period=${periodId}&grupoId=${entry.grupoId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error("Failed to fetch students");
            const data = await res.json();
            setStudents(data.students || []);
        } catch (err) {
            console.error("Error fetching students:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user, periodId, entry.grupoId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    return (
        <>
            <div className="xl:w-72 shrink-0 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col max-h-[calc(100vh-220px)]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">group</span>
                            Estudiantes
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px] text-gray-500">close</span>
                        </button>
                    </div>

                    {/* Class info */}
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.asignaturaNombre}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[12px]">groups</span>
                            {entry.grupoNombre}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {entry.dia} {formatTime(entry.horaInicio)} - {formatTime(entry.horaFin)}
                        </div>
                    </div>
                </div>

                {/* Student list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400 mb-2">group_off</span>
                            <p className="text-xs text-gray-500">No hay estudiantes en este grupo</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {students.map((student, idx) => (
                                <div
                                    key={student.id}
                                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                    onMouseEnter={() => setHoveredStudentId(student.id)}
                                    onMouseLeave={() => setHoveredStudentId(null)}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                {student.fullName}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {student.cedula}
                                            </p>
                                        </div>
                                    </div>
                                    {hoveredStudentId === student.id && (
                                        <button
                                            onClick={() => {
                                                setComunicadoStudent(student);
                                                setShowComunicadoModal(true);
                                            }}
                                            className="shrink-0 rounded-full p-1 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                            title="Comunicado al encargado"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">contact_mail</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {students.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            {students.length} estudiante{students.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                )}
            </div>

            {/* Comunicado Modal */}
            {comunicadoStudent && (
                <SendComunicadoModal
                    isOpen={showComunicadoModal}
                    student={comunicadoStudent}
                    grupoId={entry.grupoId}
                    grupoNombre={entry.grupoNombre}
                    profesorId={profesorId}
                    profesorNombre={entry.profesorNombre}
                    periodId={periodId}
                    onClose={() => {
                        setShowComunicadoModal(false);
                        setComunicadoStudent(null);
                    }}
                    onSent={() => {
                        setShowComunicadoModal(false);
                        setComunicadoStudent(null);
                    }}
                />
            )}
        </>
    );
}

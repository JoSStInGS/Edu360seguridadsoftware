"use client";

import { useState } from "react";
import type { GroupedClass, StudentItem } from "@/types/myClasses";
import SendComunicadoModal from "@/app/dashboard/schedules/components/SendComunicadoModal";

interface Props {
    isOpen: boolean;
    groupedClass: GroupedClass | null;
    students: StudentItem[];
    loading: boolean;
    onClose: () => void;
    profesorId: string;
    profesorNombre: string;
    periodId: string;
}

export default function StudentsPanel({
    isOpen,
    groupedClass,
    students,
    loading,
    onClose,
    profesorId,
    profesorNombre,
    periodId,
}: Props) {
    const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);
    const [comunicadoStudent, setComunicadoStudent] = useState<StudentItem | null>(null);
    const [showComunicadoModal, setShowComunicadoModal] = useState(false);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over panel */}
            <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border-light)] bg-[var(--card-light)] shadow-2xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-6 pb-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            {groupedClass?.asignaturaNombre}
                            {groupedClass?.grupoNombre ? ` · ${groupedClass.grupoNombre}` : ""}
                        </h2>
                        <p className="mt-0.5 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            {loading ? "Cargando..." : `${students.length} estudiantes`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar panel"
                        className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                    >
                        <span className="material-symbols-outlined text-xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            close
                        </span>
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-[var(--border-light)] dark:border-[var(--border-dark)]" />

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="material-symbols-outlined mb-3 text-4xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                group_off
                            </span>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                No hay estudiantes en este grupo.
                            </p>
                        </div>
                    ) : (
                        <ol className="flex flex-col gap-2">
                            {students.map((student, index) => (
                                <li
                                    key={student.id}
                                    className="flex items-center gap-3 rounded-lg border border-[var(--border-light)] bg-[rgba(15,23,42,0.02)] px-4 py-3 transition-colors hover:bg-[rgba(15,23,42,0.04)] dark:border-[var(--border-dark)] dark:bg-[rgba(255,255,255,0.02)] dark:hover:bg-[rgba(255,255,255,0.04)]"
                                    onMouseEnter={() => setHoveredStudentId(student.id)}
                                    onMouseLeave={() => setHoveredStudentId(null)}
                                >
                                    <span className="w-6 shrink-0 text-center text-xs font-semibold text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                            {student.fullName}
                                        </p>
                                        {student.cedula && (
                                            <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                                {student.cedula}
                                            </p>
                                        )}
                                    </div>
                                    {/* Comunicado button — visible on hover */}
                                    {hoveredStudentId === student.id && (
                                        <button
                                            onClick={() => {
                                                setComunicadoStudent(student);
                                                setShowComunicadoModal(true);
                                            }}
                                            className="shrink-0 rounded-full p-1.5 text-[var(--primary)] transition-colors hover:bg-[rgba(21,53,147,0.1)] dark:hover:bg-[rgba(21,53,147,0.2)]"
                                            title="Enviar comunicado al encargado"
                                            aria-label="Enviar comunicado al encargado"
                                        >
                                            <span className="material-symbols-outlined text-lg">contact_mail</span>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {/* Comunicado modal — z-60 to appear above the panel (z-50) */}
            {comunicadoStudent && groupedClass && (
                <div className="relative z-[60]">
                    <SendComunicadoModal
                        isOpen={showComunicadoModal}
                        student={{ cedula: comunicadoStudent.cedula, fullName: comunicadoStudent.fullName }}
                        grupoId={groupedClass.grupoId}
                        grupoNombre={groupedClass.grupoNombre}
                        profesorId={profesorId}
                        profesorNombre={profesorNombre}
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
                </div>
            )}
        </>
    );
}

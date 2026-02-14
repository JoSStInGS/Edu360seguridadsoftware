"use client";

import { useState } from "react";
import { TeacherRow } from "../page";
import { useAuth } from "@/app/auth/hooks/useAuth";

interface TeacherAbsenceModalProps {
    isOpen: boolean;
    teacher: TeacherRow | null;
    teachers: TeacherRow[];
    periodId: string;
    onClose: () => void;
    onSaved: () => void;
}

export default function TeacherAbsenceModal({
    isOpen,
    teacher,
    teachers,
    periodId,
    onClose,
    onSaved,
}: TeacherAbsenceModalProps) {
    const { user } = useAuth();
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [reason, setReason] = useState("");
    const [substituteId, setSubstituteId] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    // Other teachers as substitute options
    const substituteOptions = teachers.filter((t) => t.id !== teacher?.id);

    const handleSave = async () => {
        if (!teacher || !user) return;

        // Validations
        if (!reason.trim()) {
            setError("El motivo de la ausencia es requerido");
            return;
        }
        if (startDate > endDate) {
            setError("La fecha de inicio no puede ser posterior a la fecha de fin");
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            const token = await user.getIdToken();
            const substitute = substituteOptions.find((t) => t.id === substituteId);

            const res = await fetch("/api/teacher-absences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    periodId,
                    profesorId: teacher.id,
                    profesorNombre: teacher.fullName,
                    startDate,
                    endDate,
                    reason: reason.trim(),
                    substituteProfesorId: substitute?.id || undefined,
                    substituteProfesorNombre: substitute?.fullName || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al guardar la ausencia");
                return;
            }

            onSaved();
            handleClose();
        } catch {
            setError("Error de conexion. Intenta de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setStartDate(today);
        setEndDate(today);
        setReason("");
        setSubstituteId("");
        setError("");
        onClose();
    };

    if (!isOpen || !teacher) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Marcar ausencia
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Teacher Info (read-only) */}
                <div className="mb-6 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
                            {getInitials(teacher.fullName)}
                        </div>
                        <div>
                            <p className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                {teacher.fullName}
                            </p>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {teacher.subjects.slice(0, 2).join(", ") || "Sin asignaturas"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Date Range */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Fecha inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                if (e.target.value > endDate) setEndDate(e.target.value);
                            }}
                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Fecha fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        />
                    </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Motivo de la ausencia <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej: Cita médica, capacitación, enfermedad..."
                        rows={3}
                        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] resize-none"
                    />
                </div>

                {/* Substitute */}
                <div className="mb-6">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Profesor sustituto <span className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">(opcional)</span>
                    </label>
                    <select
                        value={substituteId}
                        onChange={(e) => setSubstituteId(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                    >
                        <option value="">Sin sustituto</option>
                        {substituteOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.fullName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] transition hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !reason.trim()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">person_off</span>
                                Marcar ausente
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

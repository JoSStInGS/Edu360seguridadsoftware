"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";

interface StudentInfo {
    cedula: string;
    fullName: string;
}

interface SendComunicadoModalProps {
    isOpen: boolean;
    student: StudentInfo;
    grupoId: string;
    grupoNombre: string;
    profesorId: string;
    profesorNombre: string;
    periodId: string;
    onClose: () => void;
    onSent: () => void;
}

export default function SendComunicadoModal({
    isOpen,
    student,
    grupoId,
    grupoNombre,
    profesorId,
    profesorNombre,
    periodId,
    onClose,
    onSent,
}: SendComunicadoModalProps) {
    const { user } = useAuth();
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");

    const handleSend = async () => {
        if (!user) return;

        if (!subject.trim()) {
            setError("El asunto es requerido");
            return;
        }
        if (!message.trim()) {
            setError("El mensaje es requerido");
            return;
        }

        setIsSending(true);
        setError("");

        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/comunicados", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    periodId,
                    profesorId,
                    profesorNombre,
                    studentCedula: student.cedula,
                    studentName: student.fullName,
                    grupoId,
                    grupoNombre,
                    subject: subject.trim(),
                    message: message.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Error al enviar el comunicado");
                return;
            }

            onSent();
            handleClose();
        } catch {
            setError("Error de conexion. Intenta de nuevo.");
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setSubject("");
        setMessage("");
        setError("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Comunicado al encargado
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Student context + destination info */}
                <div className="mb-6 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] p-4">
                    <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] mb-2">
                        Este comunicado sera enviado al encargado legal de:
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                            <span className="material-symbols-outlined text-xl">school</span>
                        </div>
                        <div>
                            <p className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                {student.fullName}
                            </p>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {student.cedula} - {grupoNombre}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Asunto <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ej: Rendimiento academico, Comportamiento..."
                        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                    />
                </div>

                {/* Message */}
                <div className="mb-6">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Mensaje <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe tu mensaje para el encargado legal..."
                        rows={4}
                        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] resize-none"
                    />
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
                        onClick={handleSend}
                        disabled={isSending || !subject.trim() || !message.trim()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSending ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">send</span>
                                Enviar al encargado
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

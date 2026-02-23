"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import type { GroupedClass } from "@/types/myClasses";
import type { AbsenceJustification, JustificationDecision } from "@/types/justification";

interface Props {
    isOpen: boolean;
    groupedClass: GroupedClass | null;
    justifications: AbsenceJustification[];
    loading: boolean;
    profesorId: string;
    profesorNombre: string;
    periodId: string;
    onClose: () => void;
    onDecisionMade: () => void;
}

// ─── Status config ────────────────────────────────────────────────────────────

function statusConfig(status: AbsenceJustification["status"]) {
    switch (status) {
        case "pending":
            return {
                label: "Pendiente",
                icon: "pending",
                cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            };
        case "approved":
            return {
                label: "Aprobada",
                icon: "check_circle",
                cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            };
        case "rejected":
            return {
                label: "Rechazada",
                icon: "cancel",
                cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            };
        case "partial":
            return {
                label: "Parcial",
                icon: "warning",
                cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            };
        case "expired":
            return {
                label: "Vencida",
                icon: "block",
                cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
            };
    }
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Individual justification card ────────────────────────────────────────────

interface JustCardProps {
    j: AbsenceJustification;
    profesorId: string;
    periodId: string;
    onDecisionMade: () => void;
}

function JustCard({ j, profesorId, periodId, onDecisionMade }: JustCardProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [localDecisions, setLocalDecisions] = useState<JustificationDecision[]>(j.decisions);

    const today = new Date().toISOString().split("T")[0];
    const isExpired = j.status === "pending" && j.deadlineDate < today;
    const sc = statusConfig(isExpired ? "expired" : j.status);

    // Decisions this professor needs to handle
    const myDecisions = localDecisions.filter((d) => d.profesorId === profesorId);

    const handleDecision = async (
        scheduleId: string,
        decision: "approved" | "rejected"
    ) => {
        if (!user) return;
        setSubmitting(scheduleId + decision);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/justifications/${j.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    periodId,
                    scheduleId,
                    decision,
                    comment: comments[scheduleId]?.trim() || undefined,
                }),
            });

            if (!res.ok) throw new Error("Error en la respuesta");

            // Update local state optimistically
            setLocalDecisions((prev) =>
                prev.map((d) =>
                    d.scheduleId === scheduleId && d.profesorId === profesorId
                        ? {
                              ...d,
                              status: decision,
                              profesorComment: comments[scheduleId]?.trim() || undefined,
                              reviewedAt: new Date().toISOString(),
                          }
                        : d
                )
            );
            onDecisionMade();
        } catch (err) {
            console.error("Error submitting decision:", err);
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-4 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            {/* Header row */}
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        {j.studentName}
                    </p>
                    <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {j.type === "preventiva" ? "📅 Preventiva" : "📋 Posterior"} ·{" "}
                        {formatDate(j.targetDate)}
                    </p>
                </div>
                <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${sc?.cls}`}
                >
                    <span className="material-symbols-outlined text-xs">{sc?.icon}</span>
                    {sc?.label}
                </span>
            </div>

            {/* Reason */}
            <p className="mb-3 text-sm text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                <span className="font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Motivo:{" "}
                </span>
                {j.reason}
            </p>

            {/* Attachment */}
            {j.attachmentUrl && (
                <a
                    href={j.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    Ver comprobante
                </a>
            )}

            {/* Deadline */}
            {j.type === "posterior" && (
                <p className={`mb-3 text-xs ${isExpired ? "text-red-500" : "text-[var(--muted-light)] dark:text-[var(--muted-dark)]"}`}>
                    {isExpired ? "⚠ Plazo vencido" : `Plazo límite: ${formatDate(j.deadlineDate)}`}
                </p>
            )}

            {/* Divider */}
            {myDecisions.length > 0 && (
                <div className="border-t border-[var(--border-light)] pt-3 dark:border-[var(--border-dark)]" />
            )}

            {/* Decisions for this professor */}
            {myDecisions.map((d) => (
                <div key={d.scheduleId} className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            {d.asignaturaNombre}
                        </span>
                        {d.status !== "pending" && (
                            <span
                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig(d.status)?.cls}`}
                            >
                                <span className="material-symbols-outlined text-xs">
                                    {statusConfig(d.status)?.icon}
                                </span>
                                {statusConfig(d.status)?.label}
                            </span>
                        )}
                    </div>

                    {d.status === "pending" && !isExpired ? (
                        <div className="space-y-2">
                            <textarea
                                placeholder="Comentario (opcional)"
                                value={comments[d.scheduleId] ?? ""}
                                onChange={(e) =>
                                    setComments((prev) => ({
                                        ...prev,
                                        [d.scheduleId]: e.target.value,
                                    }))
                                }
                                rows={2}
                                className="w-full resize-none rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] px-3 py-2 text-sm text-[var(--foreground-light)] outline-none focus:border-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--background-dark)] dark:text-[var(--foreground-dark)]"
                            />
                            <div className="flex gap-2">
                                <button
                                    disabled={!!submitting}
                                    onClick={() => handleDecision(d.scheduleId, "approved")}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                                >
                                    {submitting === d.scheduleId + "approved" ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Aprobar
                                        </>
                                    )}
                                </button>
                                <button
                                    disabled={!!submitting}
                                    onClick={() => handleDecision(d.scheduleId, "rejected")}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                    {submitting === d.scheduleId + "rejected" ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-sm">cancel</span>
                                            Rechazar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : d.status !== "pending" && d.profesorComment ? (
                        <p className="text-xs italic text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            &ldquo;{d.profesorComment}&rdquo;
                        </p>
                    ) : null}

                    {d.reviewedAt && (
                        <p className="mt-1 text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Revisado el {formatDate(d.reviewedAt.split("T")[0])}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

export default function JustificationsPanel({
    isOpen,
    groupedClass,
    justifications,
    loading,
    profesorId,
    periodId,
    onClose,
    onDecisionMade,
}: Omit<Props, 'profesorNombre'> & { profesorNombre?: string }) {
    if (!isOpen) return null;

    const today = new Date().toISOString().split("T")[0];
    const pending = justifications.filter(
        (j) => j.status === "pending" && j.deadlineDate >= today
    );
    const history = justifications.filter(
        (j) => j.status !== "pending" || j.deadlineDate < today
    );

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over panel — wider than StudentsPanel */}
            <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-[var(--border-light)] bg-[var(--card-light)] shadow-2xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-6 pb-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            Justificaciones
                            {groupedClass
                                ? ` · ${groupedClass.asignaturaNombre}${groupedClass.grupoNombre ? ` ${groupedClass.grupoNombre}` : ""}`
                                : ""}
                        </h2>
                        <p className="mt-0.5 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            {loading
                                ? "Cargando..."
                                : pending.length > 0
                                ? `${pending.length} pendiente${pending.length !== 1 ? "s" : ""} de revisión`
                                : "Sin pendientes"}
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
                    ) : justifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="material-symbols-outlined mb-3 text-4xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                pending_actions
                            </span>
                            <p className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                Sin justificaciones pendientes
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Pending section */}
                            {pending.length > 0 && (
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        Pendientes ({pending.length})
                                    </p>
                                    <div className="space-y-3">
                                        {pending.map((j) => (
                                            <JustCard
                                                key={j.id}
                                                j={j}
                                                profesorId={profesorId}
                                                periodId={periodId}
                                                onDecisionMade={onDecisionMade}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* History section */}
                            {history.length > 0 && (
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        Historial
                                    </p>
                                    <div className="space-y-3">
                                        {history.map((j) => (
                                            <JustCard
                                                key={j.id}
                                                j={j}
                                                profesorId={profesorId}
                                                periodId={periodId}
                                                onDecisionMade={onDecisionMade}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

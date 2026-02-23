"use client";

import type { GroupedClass, ClassSession } from "@/types/myClasses";

interface Props {
    groupedClass: GroupedClass;
    onViewStudents: () => void;
    pendingJustifications?: number;
    onViewJustifications?: () => void;
}

/**
 * Groups sessions that share the same time slot (horaInicio + horaFin)
 * and returns a human-readable label like "Lunes y Miércoles · 08:00 – 09:00"
 */
function buildScheduleLines(sessions: ClassSession[]): string[] {
    // Group by "horaInicio|horaFin"
    const slotMap = new Map<string, string[]>();

    for (const s of sessions) {
        const slotKey = `${s.horaInicio}|${s.horaFin}`;
        if (!slotMap.has(slotKey)) {
            slotMap.set(slotKey, []);
        }
        slotMap.get(slotKey)!.push(s.dia);
    }

    const lines: string[] = [];

    for (const [slotKey, dias] of slotMap.entries()) {
        const [horaInicio, horaFin] = slotKey.split("|");
        const daysLabel = formatDaysList(dias);
        lines.push(`${daysLabel} · ${horaInicio} – ${horaFin}`);
    }

    return lines;
}

function formatDaysList(dias: string[]): string {
    if (dias.length === 0) return "";
    if (dias.length === 1) return dias[0];
    const last = dias[dias.length - 1];
    const rest = dias.slice(0, -1);
    return `${rest.join(", ")} y ${last}`;
}

export default function ClassCard({ groupedClass, onViewStudents, pendingJustifications = 0, onViewJustifications }: Props) {
    const scheduleLines = buildScheduleLines(groupedClass.sessions);

    return (
        <div className="flex flex-col rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-5 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined shrink-0 text-[var(--primary)]">
                        menu_book
                    </span>
                    <h3 className="truncate text-base font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        {groupedClass.asignaturaNombre}
                    </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {pendingJustifications > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <span className="material-symbols-outlined text-sm">pending_actions</span>
                            {pendingJustifications}
                        </span>
                    )}
                    {groupedClass.grupoNombre && (
                        <span className="rounded-full bg-[rgba(21,53,147,0.1)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
                            {groupedClass.grupoNombre}
                        </span>
                    )}
                </div>
            </div>

            {/* Schedule lines */}
            <div className="mb-4 flex flex-col gap-1.5">
                {scheduleLines.length > 0 ? (
                    scheduleLines.map((line, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            <span className="material-symbols-outlined text-base shrink-0">schedule</span>
                            <span>{line}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Sin horario asignado
                    </p>
                )}
            </div>

            {/* Divider */}
            <div className="mb-4 border-t border-[var(--border-light)] dark:border-[var(--border-dark)]" />

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    {groupedClass.aulaNombre && (
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base shrink-0">door_open</span>
                            <span className="truncate max-w-[100px]">{groupedClass.aulaNombre}</span>
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base shrink-0">group</span>
                        <span>{groupedClass.studentCount} estudiantes</span>
                    </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    {onViewJustifications && (
                        <button
                            onClick={onViewJustifications}
                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                pendingJustifications > 0
                                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    : "text-[var(--muted-light)] hover:bg-[rgba(0,0,0,0.05)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">pending_actions</span>
                            Justificaciones{pendingJustifications > 0 ? ` (${pendingJustifications})` : ""}
                        </button>
                    )}
                    <button
                        onClick={onViewStudents}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[rgba(21,53,147,0.1)] dark:hover:bg-[rgba(21,53,147,0.2)]"
                    >
                        Ver estudiantes
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

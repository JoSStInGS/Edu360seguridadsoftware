export interface JustificationScheduleDetail {
    scheduleId: string;
    asignaturaNombre: string;
    horaInicio: string;
    horaFin: string;
    profesorId: string;
    profesorNombre: string;
}

export interface JustificationDecision {
    scheduleId: string;
    profesorId: string;
    profesorNombre: string;
    asignaturaNombre: string;
    status: 'pending' | 'approved' | 'rejected';
    profesorComment?: string;
    reviewedAt?: string;
}

export interface AbsenceJustification {
    id: string;
    // Estudiante
    studentCedula: string;
    studentName: string;
    grupoId: string;
    grupoNombre: string;
    // Padre
    parentUid: string;
    parentName: string;
    // Tipo y fecha
    type: 'preventiva' | 'posterior';
    targetDate: string; // "YYYY-MM-DD"
    // Alcance
    scope: 'all_day' | 'specific';
    scheduleIds: string[];
    scheduleDetails: JustificationScheduleDetail[];
    // Comprobante
    reason: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'pdf';
    // Estado
    status: 'pending' | 'approved' | 'rejected' | 'partial' | 'expired';
    pendingProfessorIds: string[];
    decisions: JustificationDecision[];
    // Fechas
    deadlineDate: string;
    createdAt: string;
    updatedAt: string;
}

/** Calcula 3 días hábiles después de targetDate (sin sábados ni domingos) */
export function calculateDeadline(targetDate: string): string {
    const d = new Date(targetDate + 'T12:00:00');
    let added = 0;
    while (added < 3) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) added++;
    }
    return d.toISOString().split('T')[0];
}

/** Recalcula el status global a partir de las decisions individuales */
export function recalculateStatus(
    decisions: JustificationDecision[]
): AbsenceJustification['status'] {
    if (decisions.length === 0) return 'pending';
    const allApproved = decisions.every((d) => d.status === 'approved');
    if (allApproved) return 'approved';
    const hasRejected = decisions.some((d) => d.status === 'rejected');
    const hasPending = decisions.some((d) => d.status === 'pending');
    if (hasRejected && !hasPending) return 'rejected';
    return 'partial'; // mix de approved/rejected/pending
}

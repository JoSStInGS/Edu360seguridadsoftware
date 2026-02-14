export interface TeacherAbsence {
    id: string;
    profesorId: string;
    profesorNombre: string;
    startDate: string;          // "YYYY-MM-DD"
    endDate: string;            // "YYYY-MM-DD"
    reason: string;
    substituteProfesorId?: string;
    substituteProfesorNombre?: string;
    status: 'active' | 'cancelled';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

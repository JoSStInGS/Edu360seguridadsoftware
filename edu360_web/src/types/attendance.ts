export interface StudentAttendance {
    studentId: string;
    studentName: string;
    status: 'en_proceso' | 'presente' | 'ausente';
}

export interface AttendanceRecord {
    id?: string;
    scheduleId: string;
    grupoId: string;
    grupoNombre: string;
    profesorId: string;
    date: string;
    records: StudentAttendance[];
    createdAt: string;
    updatedAt: string;
}

export interface ScheduleEntry {
    id: string;
    dia: string;
    horaInicio: string;
    horaFin: string;
    asignaturaNombre: string;
    asignaturaId: string;
    grupoId: string;
    grupoNombre: string;
    profesorId: string;
    profesorNombre: string;
}

export interface Student {
    id: string;
    cedula: string;
    fullName: string;
    grupoId?: string;
    grupoNombre?: string;
}

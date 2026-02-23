export interface ClassSession {
    scheduleId: string;
    dia: string;        // "Lunes"
    diaIndex: number;   // 0-4
    horaInicio: string; // "08:00"
    horaFin: string;    // "09:00"
}

export interface GroupedClass {
    key: string;              // `${asignaturaId}__${grupoId}`
    asignaturaId: string;
    asignaturaNombre: string;
    grupoId: string;
    grupoNombre: string;
    aulaId: string;
    aulaNombre: string;
    studentCount: number;
    sessions: ClassSession[]; // ordenadas por diaIndex, luego horaInicio
}

export interface StudentItem {
    id: string;
    cedula: string;
    fullName: string;
    grupoId: string | null;
    grupoNombre: string | null;
}

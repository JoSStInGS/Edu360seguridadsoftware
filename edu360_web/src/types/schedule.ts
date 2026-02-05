// ============================================
// TIPOS PARA IMPORTACIÓN DE HORARIOS (aSc Timetables XML)
// ============================================

// --- Catálogos base ---

export interface ScheduleTeacher {
    id: string;
    nombre: string;
    nombreCorto: string;
    email?: string;
    source: "import" | "manual";
}

export interface ScheduleSubject {
    id: string;
    nombre: string;
    nombreCorto: string;
    source: "import" | "manual";
}

export interface ScheduleGroup {
    id: string;
    nombre: string;
    nombreCorto: string;
    aulaAsignada?: string;
    source: "import" | "manual";
}

export interface ScheduleClassroom {
    id: string;
    nombre: string;
    nombreCorto: string;
    capacidad?: string;
    source: "import" | "manual";
}

export interface ScheduleTimeSlot {
    id: string;
    periodo: number;
    nombre: string;
    horaInicio: string;
    horaFin: string;
}

export interface ScheduleDayDef {
    id: string;
    nombre: string;
    nombreCorto: string;
    mascara: string;
}

// --- Estructuras intermedias de parseo XML ---

export interface ParsedLesson {
    id: string;
    subjectId: string;
    classIds: string[];
    teacherIds: string[];
    classroomIds: string[];
    groupIds: string[];
}

export interface ParsedCard {
    id: string;
    lessonId: string;
    classroomIds: string;
    days: string;
    period: string;
}

// --- Entrada de horario (documento principal en Firestore) ---

export interface ScheduleEntry {
    id: string;
    // Día
    dia: string;
    diaIndex: number;
    // Tiempo
    periodo: number;
    horaInicio: string;
    horaFin: string;
    // Profesor (desnormalizado)
    profesorId: string;
    profesorNombre: string;
    // Grupo (desnormalizado)
    grupoId: string;
    grupoNombre: string;
    // Asignatura (desnormalizado)
    asignaturaId: string;
    asignaturaNombre: string;
    // Aula (desnormalizado)
    aulaId: string;
    aulaNombre: string;
    // Metadata
    source: "import" | "manual";
    createdAt?: Date;
}

// --- Payload completo para el backend ---

export interface ScheduleImportPayload {
    periodoLectivo: string;
    data: {
        profesores: ScheduleTeacher[];
        asignaturas: ScheduleSubject[];
        grupos: ScheduleGroup[];
        aulas: ScheduleClassroom[];
        periodosHorario: ScheduleTimeSlot[];
        horarios: ScheduleEntry[];
    };
}

// --- Estadísticas de previsualización ---

export interface ScheduleStats {
    profesores: number;
    grupos: number;
    asignaturas: number;
    aulas: number;
    periodosHorario: number;
    totalHorarios: number;
}

// --- Preview data para UI ---

export interface SchedulePreviewData {
    stats: ScheduleStats;
    profesores: ScheduleTeacher[];
    grupos: ScheduleGroup[];
    asignaturas: ScheduleSubject[];
    aulas: ScheduleClassroom[];
    periodosHorario: ScheduleTimeSlot[];
    horarios: ScheduleEntry[];
}

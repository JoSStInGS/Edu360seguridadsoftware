export interface ScheduleEntry {
  id: string;
  dia: string;
  diaIndex: number;
  periodo: number;
  horaInicio: string;
  horaFin: string;
  profesorId: string;
  profesorNombre: string;
  grupoId: string;
  grupoNombre: string;
  divisionId?: string;
  divisionNombre?: string;
  isEntireClass?: boolean;
  asignaturaId: string;
  asignaturaNombre: string;
  aulaId: string;
  aulaNombre: string;
}

export interface Student {
  id: string;
  cedula: string;
  name: string | null;
  lastName1: string | null;
  lastName2: string | null;
  fullName: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
}

export interface AttendanceRecord {
  id?: string;
  scheduleId: string;
  grupoId: string;
  grupoNombre: string;
  profesorId: string;
  date: string; // YYYY-MM-DD
  records: StudentAttendance[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAttendance {
  studentId: string;
  studentName: string;
  present: boolean;
}

export interface Group {
  id: string;
  nombre: string;
}

export interface ParentChild {
  id?: string;
  studentCedula: string;
  studentName: string;
  grupoId: string | null;
  grupoNombre: string | null;
}

export interface ChildAttendanceStatus {
  scheduleEntry: ScheduleEntry;
  status: 'pending' | 'present' | 'absent';
  date: string;
}

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ScheduleEntry,
  Student,
  AttendanceRecord,
} from '@/types';

/**
 * Obtiene el periodo activo más reciente del centro.
 */
export async function getActivePeriod(
  centerId: string
): Promise<string | null> {
  const periodsRef = collection(db, 'centers', centerId, 'periods');
  const snapshot = await getDocs(periodsRef);

  if (snapshot.empty) return null;

  // Retornar el más reciente (o el primero disponible)
  interface PeriodDoc {
    id: string;
    createdAt?: { seconds?: number };
    [key: string]: unknown;
  }

  const periods: PeriodDoc[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  // Ordenar por createdAt descendente si existe
  periods.sort((a, b) => {
    return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
  });

  return periods[0]?.id ?? null;
}

/**
 * Busca el profesorId que corresponde al usuario logueado.
 * Intenta hacer match por email.
 */
export async function findTeacherIdByEmail(
  centerId: string,
  periodoId: string,
  email: string
): Promise<string | null> {
  // Buscar en profesores (del schedule import)
  const profesoresRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'profesores'
  );
  const snapshot = await getDocs(profesoresRef);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
      return docSnap.id;
    }
  }

  // Buscar en teachers (del CSV import)
  const teachersRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'teachers'
  );
  const teachersSnap = await getDocs(teachersRef);

  for (const docSnap of teachersSnap.docs) {
    const data = docSnap.data();
    if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
      return docSnap.id;
    }
  }

  return null;
}

/**
 * Obtiene el horario completo de un profesor.
 */
export async function getTeacherSchedule(
  centerId: string,
  periodoId: string,
  profesorId: string
): Promise<ScheduleEntry[]> {
  const horariosRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'horarios'
  );

  const q = query(
    horariosRef,
    where('profesorId', '==', profesorId),
    orderBy('diaIndex'),
    orderBy('periodo')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ScheduleEntry[];
}

/**
 * Obtiene los estudiantes de un grupo.
 */
export async function getStudentsByGroup(
  centerId: string,
  periodoId: string,
  grupoId: string
): Promise<Student[]> {
  const studentsRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'students'
  );

  const q = query(
    studentsRef,
    where('grupoId', '==', grupoId),
    orderBy('cedula')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Student[];
}

/**
 * Guarda un registro de asistencia.
 */
export async function saveAttendance(
  centerId: string,
  periodoId: string,
  attendance: AttendanceRecord
): Promise<void> {
  const attendanceRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'attendance'
  );

  const docId = `${attendance.grupoId}_${attendance.date}_${attendance.scheduleId}`;
  const ref = doc(attendanceRef, docId);

  await setDoc(ref, {
    ...attendance,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Obtiene un registro de asistencia existente.
 */
export async function getAttendance(
  centerId: string,
  periodoId: string,
  grupoId: string,
  date: string,
  scheduleId: string
): Promise<AttendanceRecord | null> {
  const docId = `${grupoId}_${date}_${scheduleId}`;
  const ref = doc(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'attendance',
    docId
  );

  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() } as AttendanceRecord;
}

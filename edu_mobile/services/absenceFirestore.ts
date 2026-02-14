import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeacherAbsence } from '@/types';

/**
 * Gets all active absences for a specific date.
 * Query: status == 'active' AND endDate >= date, then filter startDate <= date client-side.
 */
export async function getActiveAbsencesForDate(
  centerId: string,
  periodId: string,
  date: string
): Promise<TeacherAbsence[]> {
  const absencesRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'teacher_absences'
  );

  const q = query(
    absencesRef,
    where('status', '==', 'active'),
    where('endDate', '>=', date),
    orderBy('endDate', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as TeacherAbsence))
    .filter((a) => a.startDate <= date);
}

/**
 * Gets active absences for a specific professor on a given date.
 */
export async function getActiveAbsenceForProfessor(
  centerId: string,
  periodId: string,
  profesorId: string,
  date: string
): Promise<TeacherAbsence | null> {
  const absences = await getActiveAbsencesForDate(centerId, periodId, date);
  return absences.find((a) => a.profesorId === profesorId) || null;
}

/**
 * Builds a map from profesorId -> TeacherAbsence for quick lookups.
 */
export function buildAbsenceMap(
  absences: TeacherAbsence[]
): Map<string, TeacherAbsence> {
  const map = new Map<string, TeacherAbsence>();
  for (const absence of absences) {
    map.set(absence.profesorId, absence);
  }
  return map;
}

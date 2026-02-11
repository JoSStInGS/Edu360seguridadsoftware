import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ParentChild,
  ChildAttendanceStatus,
  ScheduleEntry,
  AttendanceRecord,
} from '@/types';

/**
 * Obtiene los hijos vinculados a un padre.
 */
export async function getParentChildren(
  centerId: string,
  periodId: string,
  parentUid: string
): Promise<ParentChild[]> {
  const ref = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'parent_students'
  );

  const q = query(ref, where('parentUid', '==', parentUid));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    studentCedula: d.data().studentCedula,
    studentName: d.data().studentName,
    grupoId: d.data().grupoId || null,
    grupoNombre: d.data().grupoNombre || null,
  }));
}

/**
 * Escucha en tiempo real los hijos vinculados a un padre.
 */
export function subscribeToParentChildren(
  centerId: string,
  periodId: string,
  parentUid: string,
  callback: (children: ParentChild[]) => void
): Unsubscribe {
  const ref = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'parent_students'
  );

  const q = query(ref, where('parentUid', '==', parentUid));

  return onSnapshot(q, (snapshot) => {
    const children = snapshot.docs.map((d) => ({
      id: d.id,
      studentCedula: d.data().studentCedula,
      studentName: d.data().studentName,
      grupoId: d.data().grupoId || null,
      grupoNombre: d.data().grupoNombre || null,
    }));
    callback(children);
  });
}

/**
 * Obtiene el horario del grupo de un hijo.
 */
export async function getChildSchedule(
  centerId: string,
  periodId: string,
  grupoId: string
): Promise<ScheduleEntry[]> {
  const horariosRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'horarios'
  );

  const q = query(
    horariosRef,
    where('grupoId', '==', grupoId),
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
 * Obtiene el estado de asistencia de un hijo para una fecha.
 * Combina el horario del grupo con los registros de asistencia.
 */
export async function getChildAttendanceForDate(
  centerId: string,
  periodId: string,
  studentCedula: string,
  grupoId: string,
  date: string
): Promise<ChildAttendanceStatus[]> {
  // 1. Get the schedule for this group on this day
  const dayIndex = getDayIndexFromDate(date);
  const horariosRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'horarios'
  );

  const scheduleQuery = query(
    horariosRef,
    where('grupoId', '==', grupoId),
    where('diaIndex', '==', dayIndex)
  );

  const scheduleSnap = await getDocs(scheduleQuery);
  const scheduleEntries = scheduleSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ScheduleEntry[];

  // Sort by period
  scheduleEntries.sort((a, b) => a.periodo - b.periodo);

  // 2. For each schedule entry, check attendance
  const results: ChildAttendanceStatus[] = [];

  for (const entry of scheduleEntries) {
    const docId = `${grupoId}_${date}_${entry.id}`;
    const attendanceRef = doc(
      db,
      'centers',
      centerId,
      'periods',
      periodId,
      'attendance',
      docId
    );

    const attendanceSnap = await getDoc(attendanceRef);

    if (!attendanceSnap.exists()) {
      results.push({ scheduleEntry: entry, status: 'pending', date });
      continue;
    }

    const attendanceData = attendanceSnap.data() as AttendanceRecord;
    const studentRecord = attendanceData.records?.find(
      (r) => r.studentId === studentCedula
    );

    if (!studentRecord) {
      results.push({ scheduleEntry: entry, status: 'pending', date });
    } else {
      results.push({
        scheduleEntry: entry,
        status: studentRecord.present ? 'present' : 'absent',
        date,
      });
    }
  }

  return results;
}

/**
 * Escucha en tiempo real la asistencia de un hijo para una fecha.
 */
export function subscribeToChildAttendance(
  centerId: string,
  periodId: string,
  studentCedula: string,
  grupoId: string,
  date: string,
  scheduleEntries: ScheduleEntry[],
  callback: (statuses: ChildAttendanceStatus[]) => void
): Unsubscribe {
  // Listen to the attendance collection for this group and date
  const attendanceRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'attendance'
  );

  // We listen to all attendance docs that start with this group and date
  // Since Firestore doesn't support startsWith, we'll query broadly and filter
  const q = query(attendanceRef, where('grupoId', '==', grupoId), where('date', '==', date));

  return onSnapshot(q, (snapshot) => {
    const attendanceMap = new Map<string, AttendanceRecord>();
    snapshot.docs.forEach((d) => {
      const data = d.data() as AttendanceRecord;
      attendanceMap.set(data.scheduleId, data);
    });

    const results: ChildAttendanceStatus[] = scheduleEntries.map((entry) => {
      const attendance = attendanceMap.get(entry.id);

      if (!attendance) {
        return { scheduleEntry: entry, status: 'pending' as const, date };
      }

      const studentRecord = attendance.records?.find(
        (r) => r.studentId === studentCedula
      );

      if (!studentRecord) {
        return { scheduleEntry: entry, status: 'pending' as const, date };
      }

      return {
        scheduleEntry: entry,
        status: studentRecord.present ? 'present' as const : 'absent' as const,
        date,
      };
    });

    callback(results);
  });
}

/**
 * Crea vinculos padre-estudiante en Firestore (usado durante registro).
 */
export async function createParentLinks(
  centerId: string,
  periodId: string,
  parentUid: string,
  parentEmail: string,
  studentCedulas: string[]
): Promise<void> {
  const parentStudentsRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'parent_students'
  );

  // Check existing links
  const existingSnap = await getDocs(
    query(parentStudentsRef, where('parentUid', '==', parentUid))
  );
  const existingCedulas = new Set(
    existingSnap.docs.map((d) => d.data().studentCedula)
  );

  const studentsRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'students'
  );

  for (const cedula of studentCedulas) {
    if (existingCedulas.has(cedula)) continue;

    const studentDoc = await getDoc(doc(studentsRef, cedula));
    if (!studentDoc.exists()) continue;

    const studentData = studentDoc.data();
    const studentName =
      studentData?.fullName ||
      [studentData?.name, studentData?.lastName1, studentData?.lastName2]
        .filter(Boolean)
        .join(' ') ||
      'Sin nombre';

    await addDoc(parentStudentsRef, {
      parentUid,
      parentEmail,
      studentCedula: cedula,
      studentName,
      grupoId: studentData?.grupoId || null,
      grupoNombre: studentData?.grupoNombre || null,
      linkedAt: new Date(),
      linkedVia: 'registration_code',
    });
  }
}

/**
 * Helper: obtiene el indice del dia (0=Lunes, 4=Viernes) a partir de una fecha.
 */
function getDayIndexFromDate(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday...
  // Convert: Monday=0, Tuesday=1, ..., Friday=4, Saturday=5, Sunday=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

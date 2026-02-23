import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { getChildSchedule } from '@/services/parentFirestore';
import type { AbsenceJustification, JustificationScheduleDetail, ScheduleEntry } from '@/types';
import type { ImagePickerAsset } from 'expo-image-picker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula la fecha límite para justificar (3 días hábiles, sin sábados ni domingos).
 * Ej: jueves → lunes, viernes → miércoles
 */
export function calculateDeadline(targetDate: string): string {
  const d = new Date(targetDate + 'T12:00:00');
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0=Dom, 6=Sáb
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Convierte una fecha YYYY-MM-DD al índice del día de la semana (0=lunes…6=domingo).
 */
function getDayIndexFromDate(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  const jsDay = date.getDay(); // 0=Dom
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ─── Consultas ────────────────────────────────────────────────────────────────

/**
 * Obtiene el horario de un grupo filtrado por una fecha específica.
 * Reutiliza getChildSchedule y filtra por diaIndex de la fecha dada.
 */
export async function getScheduleForDate(
  centerId: string,
  periodoId: string,
  grupoId: string,
  dateStr: string
): Promise<ScheduleEntry[]> {
  const all = await getChildSchedule(centerId, periodoId, grupoId);
  const dayIndex = getDayIndexFromDate(dateStr);
  return all
    .filter((s) => s.diaIndex === dayIndex)
    .sort((a, b) => a.periodo - b.periodo);
}

/**
 * Suscripción en tiempo real a justificaciones de los hijos de un padre.
 * Query: where('studentCedula', 'in', childCedulas) — sin orderBy para evitar índice compuesto.
 * Se ordena en memoria por createdAt desc.
 */
export function subscribeToParentJustifications(
  centerId: string,
  periodoId: string,
  childCedulas: string[],
  callback: (justifications: AbsenceJustification[]) => void
): Unsubscribe {
  if (childCedulas.length === 0) {
    callback([]);
    return () => {};
  }

  const ref = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'absence_justifications'
  );

  // Firestore 'in' supports up to 30 items
  const cedulas = childCedulas.slice(0, 30);

  const q = query(ref, where('studentCedula', 'in', cedulas));

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as AbsenceJustification))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
}

// ─── Crear justificación ──────────────────────────────────────────────────────

export interface CreateJustificationData {
  studentCedula: string;
  studentName: string;
  grupoId: string;
  grupoNombre: string;
  parentUid: string;
  parentName: string;
  type: 'preventiva' | 'posterior';
  targetDate: string;
  scope: 'all_day' | 'specific';
  scheduleIds: string[];
  scheduleDetails: JustificationScheduleDetail[];
  reason: string;
}

/**
 * Crea una justificación de ausencia en Firestore.
 * Si se provee un asset (imagen/PDF), lo sube a Firebase Storage primero.
 */
export async function createJustification(
  centerId: string,
  periodoId: string,
  data: CreateJustificationData,
  attachmentAsset?: ImagePickerAsset | null
): Promise<string> {
  const colRef = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodoId,
    'absence_justifications'
  );

  const now = new Date().toISOString();

  // Calcular deadline y pendingProfessorIds
  const deadlineDate = data.type === 'posterior'
    ? calculateDeadline(data.targetDate)
    : data.targetDate; // preventiva: el profe puede revisar desde ya

  const pendingProfessorIds = [
    ...new Set(data.scheduleDetails.map((sd) => sd.profesorId)),
  ];

  const decisions = data.scheduleDetails.map((sd) => ({
    scheduleId: sd.scheduleId,
    profesorId: sd.profesorId,
    profesorNombre: sd.profesorNombre,
    asignaturaNombre: sd.asignaturaNombre,
    status: 'pending' as const,
  }));

  const docData: Omit<AbsenceJustification, 'id' | 'attachmentUrl' | 'attachmentType'> = {
    ...data,
    status: 'pending',
    pendingProfessorIds,
    decisions,
    deadlineDate,
    createdAt: now,
    updatedAt: now,
  };

  // Crear documento primero para obtener el ID
  const docRef = await addDoc(colRef, docData);

  // Si hay adjunto, subirlo y actualizar el documento
  if (attachmentAsset?.uri) {
    try {
      const ext = attachmentAsset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const attachmentType: 'image' | 'pdf' = ext === 'pdf' ? 'pdf' : 'image';

      const storageRef = ref(
        storage,
        `justifications/${centerId}/${periodoId}/${docRef.id}/comprobante.${ext}`
      );

      // Fetch the file as blob
      const response = await fetch(attachmentAsset.uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const attachmentUrl = await getDownloadURL(storageRef);

      await updateDoc(docRef, { attachmentUrl, attachmentType });
    } catch (err) {
      console.error('Error uploading attachment:', err);
      // No lanzar error — la justificación se crea sin adjunto
    }
  }

  return docRef.id;
}

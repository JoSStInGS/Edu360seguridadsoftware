import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Comunicado } from '@/types';

/**
 * Crea un nuevo comunicado.
 */
export async function createComunicado(
  centerId: string,
  periodId: string,
  data: Omit<Comunicado, 'id'>
): Promise<string> {
  const ref = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'comunicados'
  );

  const docRef = await addDoc(ref, data);
  return docRef.id;
}

/**
 * Obtiene los comunicados enviados por un profesor.
 */
export async function getProfessorComunicados(
  centerId: string,
  periodId: string,
  profesorId: string
): Promise<Comunicado[]> {
  const ref = collection(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'comunicados'
  );

  const q = query(
    ref,
    where('profesorId', '==', profesorId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Comunicado[];
}

/**
 * Escucha en tiempo real los comunicados para los hijos de un encargado.
 */
export function subscribeToComunicadosForChildren(
  centerId: string,
  periodId: string,
  childCedulas: string[],
  callback: (comunicados: Comunicado[]) => void
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
    periodId,
    'comunicados'
  );

  // Sin orderBy para evitar índice compuesto — se ordena en memoria
  const q = query(
    ref,
    where('studentCedula', 'in', childCedulas),
  );

  return onSnapshot(q, (snapshot) => {
    const comunicados = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() })) as Comunicado[];
    // Ordenar por createdAt desc en memoria
    comunicados.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(comunicados);
  });
}

/**
 * Marca un comunicado como leido por un encargado.
 */
export async function markAsRead(
  centerId: string,
  periodId: string,
  comunicadoId: string,
  parentUid: string
): Promise<void> {
  const ref = doc(
    db,
    'centers',
    centerId,
    'periods',
    periodId,
    'comunicados',
    comunicadoId
  );

  await updateDoc(ref, {
    readBy: arrayUnion(parentUid),
  });
}

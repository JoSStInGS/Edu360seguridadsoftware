import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getActivePeriod,
  findTeacherIdByEmail,
  getTeacherSchedule,
} from '@/services/firestore';
import type { ScheduleEntry } from '@/types';

interface TeacherContextType {
  centerId: string | null;
  periodoId: string | null;
  profesorId: string | null;
  schedule: ScheduleEntry[];
  loading: boolean;
  error: string | null;
  refreshSchedule: () => Promise<void>;
}

const TeacherContext = createContext<TeacherContextType>({
  centerId: null,
  periodoId: null,
  profesorId: null,
  schedule: [],
  loading: true,
  error: null,
  refreshSchedule: async () => {},
});

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [centerId, setCenterId] = useState<string | null>(null);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user || !userData?.centerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cId = userData.centerId;
      setCenterId(cId);

      // Obtener periodo activo
      const pId = await getActivePeriod(cId);
      if (!pId) {
        setError('No se encontró un periodo activo.');
        setLoading(false);
        return;
      }
      setPeriodoId(pId);

      // Buscar el profesorId que corresponde a este usuario
      const email = userData.email || user.email;
      if (email) {
        const tId = await findTeacherIdByEmail(cId, pId, email);
        setProfesorId(tId);

        if (tId) {
          const sched = await getTeacherSchedule(cId, pId, tId);
          setSchedule(sched);
        } else {
          setError(
            'No se encontró tu perfil de profesor en el horario. Contacta al administrador.'
          );
        }
      }
    } catch (err) {
      console.error('Error loading teacher data:', err);
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, userData]);

  return (
    <TeacherContext.Provider
      value={{
        centerId,
        periodoId,
        profesorId,
        schedule,
        loading,
        error,
        refreshSchedule: loadData,
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacher() {
  return useContext(TeacherContext);
}

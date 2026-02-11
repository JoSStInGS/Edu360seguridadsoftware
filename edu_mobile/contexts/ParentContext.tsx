import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActivePeriod } from '@/services/firestore';
import { subscribeToParentChildren } from '@/services/parentFirestore';
import type { ParentChild } from '@/types';

interface ParentContextType {
  centerId: string | null;
  periodoId: string | null;
  children: ParentChild[];
  loading: boolean;
  error: string | null;
  refreshChildren: () => Promise<void>;
}

const ParentContext = createContext<ParentContextType>({
  centerId: null,
  periodoId: null,
  children: [],
  loading: true,
  error: null,
  refreshChildren: async () => {},
});

export function ParentProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [centerId, setCenterId] = useState<string | null>(null);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [childrenList, setChildrenList] = useState<ParentChild[]>([]);
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

      const pId = await getActivePeriod(cId);
      if (!pId) {
        setError('No se encontro un periodo activo.');
        setLoading(false);
        return;
      }
      setPeriodoId(pId);
    } catch (err) {
      console.error('Error loading parent data:', err);
      setError('Error al cargar los datos.');
      setLoading(false);
    }
  };

  // Load center and period
  useEffect(() => {
    loadData();
  }, [user, userData]);

  // Subscribe to children in real time
  useEffect(() => {
    if (!centerId || !periodoId || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToParentChildren(
      centerId,
      periodoId,
      user.uid,
      (children) => {
        setChildrenList(children);
        setLoading(false);

        if (children.length === 0) {
          setError('No se encontraron hijos vinculados. Contacta al administrador.');
        } else {
          setError(null);
        }
      }
    );

    return () => unsubscribe();
  }, [centerId, periodoId, user]);

  return (
    <ParentContext.Provider
      value={{
        centerId,
        periodoId,
        children: childrenList,
        loading,
        error,
        refreshChildren: loadData,
      }}
    >
      {reactChildren}
    </ParentContext.Provider>
  );
}

export function useParent() {
  return useContext(ParentContext);
}

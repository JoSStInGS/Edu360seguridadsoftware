import { create } from 'zustand';

interface PeriodState {
    periods: string[];
    selectedPeriod: string | null;
    isLoading: boolean;
    setPeriods: (periods: string[]) => void;
    setSelectedPeriod: (period: string | null) => void;
    setLoading: (loading: boolean) => void;
}

export const usePeriodStore = create<PeriodState>((set) => ({
    periods: [],
    selectedPeriod: null,
    isLoading: false,
    setPeriods: (periods) => set({ periods }),
    setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
    setLoading: (isLoading) => set({ isLoading }),
}));

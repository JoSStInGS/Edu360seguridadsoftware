import { create } from 'zustand';
import type { UserRole } from '@/app/lib/roles';

const WEB_ROLES: UserRole[] = ['admin', 'professor'];

interface ActiveRoleState {
    activeRole: UserRole | null;
    allRoles: UserRole[];
    setActiveRole: (role: UserRole) => void;
    initializeRoles: (roles: UserRole[]) => void;
}

export const useActiveRoleStore = create<ActiveRoleState>((set) => ({
    activeRole: null,
    allRoles: [],
    setActiveRole: (activeRole) => set({ activeRole }),
    initializeRoles: (roles) => {
        const webRoles = roles.filter((r) => WEB_ROLES.includes(r));
        set({
            allRoles: webRoles,
            activeRole: webRoles.length > 0 ? webRoles[0] : null,
        });
    },
}));

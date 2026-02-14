"use client";

import { useActiveRoleStore } from "@/app/stores/useActiveRoleStore";
import type { UserRole } from "@/app/lib/roles";

const ROLE_CONFIG: Record<string, { label: string; icon: string }> = {
    admin: { label: "Admin", icon: "admin_panel_settings" },
    professor: { label: "Profesor", icon: "school" },
};

export default function RoleSwitcher() {
    const { activeRole, allRoles, setActiveRole } = useActiveRoleStore();

    if (allRoles.length <= 1) return null;

    return (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {allRoles.map((role) => {
                const config = ROLE_CONFIG[role];
                if (!config) return null;
                const isActive = activeRole === role;
                return (
                    <button
                        key={role}
                        onClick={() => setActiveRole(role as UserRole)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            isActive
                                ? "bg-white dark:bg-[#2d2d2d] text-[var(--primary)] shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
                        {config.label}
                    </button>
                );
            })}
        </div>
    );
}

import { useState } from "react";
import { UserRow } from "./UsersTable";

interface EditUserModalProps {
    isOpen: boolean;
    user: UserRow | null;
    onClose: () => void;
    onSave: (targetUid: string, role: string) => Promise<void>;
}

const roles = [
    { value: "admin", label: "Administrador" },
    { value: "professor", label: "Profesor" },
    { value: "parent", label: "Padre de familia" },
];

export default function EditUserModal({ isOpen, user, onClose, onSave }: EditUserModalProps) {
    const [selectedRole, setSelectedRole] = useState(user?.role || "");
    const [isSaving, setIsSaving] = useState(false);

    // Sync selectedRole when user changes
    if (user && selectedRole !== user.role && !isSaving) {
        setSelectedRole(user.role);
    }

    const handleSave = async () => {
        if (!user || !selectedRole) return;
        setIsSaving(true);
        try {
            await onSave(user.uid, selectedRole);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Editar Usuario
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* User Info (read-only) */}
                <div className="mb-6 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
                            {getInitials(user.displayName || user.email || "?")}
                        </div>
                        <div>
                            <p className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                {user.displayName || "Sin nombre"}
                            </p>
                            <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {user.email || "Sin email"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Role Selector */}
                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Rol del usuario
                    </label>
                    <div className="flex flex-col gap-2">
                        {roles.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setSelectedRole(r.value)}
                                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                                    selectedRole === r.value
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                        : "border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:border-[var(--primary)]"
                                }`}
                            >
                                <span className={`h-4 w-4 rounded-full border-2 ${
                                    selectedRole === r.value
                                        ? "border-[var(--primary)] bg-[var(--primary)]"
                                        : "border-[var(--muted-light)] dark:border-[var(--muted-dark)]"
                                }`}>
                                    {selectedRole === r.value && (
                                        <span className="flex h-full w-full items-center justify-center">
                                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                        </span>
                                    )}
                                </span>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] transition hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || selectedRole === user.role}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar cambios"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

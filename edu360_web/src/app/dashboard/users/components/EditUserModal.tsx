import { useState, useEffect } from "react";
import { Button, Modal, Spinner } from "@/app/components/ui";
import { UserRow } from "./UsersTable";

interface EditUserModalProps {
    isOpen: boolean;
    user: UserRow | null;
    onClose: () => void;
    onSave: (targetUid: string, roles: string[]) => Promise<void>;
}

const roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "professor", label: "Profesor" },
    { value: "parent", label: "Encargado legal" },
];

export default function EditUserModal({ isOpen, user, onClose, onSave }: EditUserModalProps) {
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setSelectedRoles([...user.roles]);
        }
    }, [user]);

    const toggleRole = (role: string) => {
        setSelectedRoles((prev) =>
            prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
        );
    };

    const handleSave = async () => {
        if (!user || selectedRoles.length === 0) return;
        setIsSaving(true);
        try {
            await onSave(user.uid, selectedRoles);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const rolesChanged =
        user &&
        (selectedRoles.length !== user.roles.length ||
            selectedRoles.some((r) => !user.roles.includes(r)));

    if (!user) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuario">
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

                {/* Role Selector - Checkboxes */}
                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Roles del usuario
                    </label>
                    <div className="flex flex-col gap-2">
                        {roleOptions.map((r) => {
                            const isSelected = selectedRoles.includes(r.value);
                            return (
                                <button
                                    key={r.value}
                                    onClick={() => toggleRole(r.value)}
                                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                                        isSelected
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                            : "border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:border-[var(--primary)]"
                                    }`}
                                >
                                    <span className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
                                        isSelected
                                            ? "border-[var(--primary)] bg-[var(--primary)]"
                                            : "border-[var(--muted-light)] dark:border-[var(--muted-dark)]"
                                    }`}>
                                        {isSelected && (
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        )}
                                    </span>
                                    {r.label}
                                </button>
                            );
                        })}
                    </div>
                    {selectedRoles.length === 0 && (
                        <p className="mt-2 text-xs text-red-500">Debe seleccionar al menos un rol</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        fullWidth={false}
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        fullWidth={false}
                        onClick={handleSave}
                        disabled={isSaving || !rolesChanged || selectedRoles.length === 0}
                        className="flex-1 py-2.5 text-sm"
                    >
                        {isSaving ? (
                            <>
                                <Spinner />
                                Guardando...
                            </>
                        ) : (
                            "Guardar cambios"
                        )}
                    </Button>
                </div>
        </Modal>
    );
}

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

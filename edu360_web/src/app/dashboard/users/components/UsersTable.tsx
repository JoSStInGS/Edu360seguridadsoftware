import { useState } from "react";
import { Badge, IconButton } from "@/app/components/ui";

export interface UserRow {
    uid: string;
    email: string | null;
    displayName: string | null;
    roles: string[];
    status: string;
    centerId: string;
    centerName: string | null;
    profesorId: string | null;
    createdAt: string | null;
}

interface UsersTableProps {
    users: UserRow[];
    onEdit: (user: UserRow) => void;
    onDeactivate: (user: UserRow) => void;
}

export default function UsersTable({ users, onEdit, onDeactivate }: UsersTableProps) {
    const [confirmUid, setConfirmUid] = useState<string | null>(null);

    const handleDeactivateClick = (user: UserRow) => {
        if (confirmUid === user.uid) {
            onDeactivate(user);
            setConfirmUid(null);
        } else {
            setConfirmUid(user.uid);
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    <thead className="bg-[rgba(15,23,42,0.04)] text-xs uppercase text-[var(--muted-light)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[var(--muted-dark)]">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-medium">
                                #
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium">
                                Email
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-center">
                                Rol
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-center">
                                Fecha registro
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-center">
                                Estado
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-center">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr
                                key={user.uid}
                                className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 hover:bg-[rgba(15,23,42,0.02)] dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.02)]"
                            >
                                {/* # */}
                                <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {index + 1}
                                </td>

                                {/* Nombre */}
                                <td className="whitespace-nowrap px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-sm">
                                            {getInitials(user.displayName || user.email || "?")}
                                        </div>
                                        <span>{user.displayName || "Sin nombre"}</span>
                                    </div>
                                </td>

                                {/* Email */}
                                <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {user.email || "—"}
                                </td>

                                {/* Rol */}
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {user.roles.map((role) => (
                                            <Badge key={role} tone={getRoleTone(role)}>
                                                {getRoleLabel(role)}
                                            </Badge>
                                        ))}
                                    </div>
                                </td>

                                {/* Fecha registro */}
                                <td className="px-6 py-4 text-center text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {user.createdAt ? formatDate(user.createdAt) : "—"}
                                </td>

                                {/* Estado */}
                                <td className="px-6 py-4 text-center">
                                    <Badge tone={user.status === "active" ? "success" : "neutral"}>
                                        {user.status === "active" ? "Activo" : "Inactivo"}
                                    </Badge>
                                </td>

                                {/* Acciones */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-1">
                                        <IconButton
                                            icon="edit"
                                            label="Editar usuario"
                                            onClick={() => onEdit(user)}
                                        />
                                        {user.status === "active" && (
                                            <IconButton
                                                icon={confirmUid === user.uid ? "warning" : "person_off"}
                                                label={confirmUid === user.uid ? "Confirmar desactivar" : "Desactivar usuario"}
                                                onClick={() => handleDeactivateClick(user)}
                                                className={
                                                    confirmUid === user.uid
                                                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                        : ""
                                                }
                                                onBlur={() => setConfirmUid(null)}
                                            />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-light)] dark:border-[var(--border-dark)] bg-[rgba(15,23,42,0.02)] dark:bg-[rgba(255,255,255,0.02)] px-6 py-3">
                <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Mostrando <span className="font-semibold">{users.length}</span> usuarios
                </p>
            </div>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function getRoleLabel(role: string): string {
    switch (role) {
        case "admin": return "Administrador";
        case "professor": return "Profesor";
        case "parent": return "Encargado legal";
        default: return role;
    }
}

function getRoleTone(role: string): "neutral" | "success" | "info" {
    switch (role) {
        case "admin":
            return "info";
        case "parent":
            return "success";
        default:
            return "neutral";
    }
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-CR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

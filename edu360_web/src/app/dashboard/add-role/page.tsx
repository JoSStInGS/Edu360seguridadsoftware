"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";

const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    professor: "Profesor",
    parent: "Encargado legal",
};

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    professor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    parent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function AddRolePage() {
    const { user, roles } = useAuth();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentRoles, setCurrentRoles] = useState<string[]>(roles);

    // Keep currentRoles in sync if roles change
    if (roles.length > 0 && currentRoles.length === 0) {
        setCurrentRoles(roles);
    }

    const getToken = useCallback(async () => {
        if (!user) return null;
        return user.getIdToken();
    }, [user]);

    const handleSubmit = async () => {
        if (!code.trim()) {
            setError("Ingresa un codigo de activacion");
            return;
        }

        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const token = await getToken();
            if (!token) {
                setError("No autenticado");
                return;
            }

            const res = await fetch("/api/users/add-role", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al agregar rol");
                return;
            }

            setSuccess(`Rol de ${ROLE_LABELS[data.newRole] || data.newRole} agregado exitosamente.`);
            setCurrentRoles(data.roles || [...currentRoles, data.newRole]);
            setCode("");
        } catch (err) {
            // CORRECCIÓN 1: No loggear detalles del error en consola
            setError("Error al procesar la solicitud");
        } finally {
            // CORRECCIÓN 2: Limpiar el código siempre, exitoso o no
            setCode("");
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-lg">
            <div className="mb-6">
                <h2 className="text-3xl font-bold">Agregar Rol</h2>
                <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Usa un codigo de activacion para agregar un rol adicional a tu cuenta.
                </p>
            </div>

            {/* Current roles */}
            <div className="mb-6 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <h3 className="mb-3 text-sm font-semibold text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Tus roles actuales
                </h3>
                <div className="flex flex-wrap gap-2">
                    {currentRoles.map((role) => (
                        <span
                            key={role}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${ROLE_COLORS[role] || "bg-gray-100 text-gray-800"}`}
                        >
                            {ROLE_LABELS[role] || role}
                        </span>
                    ))}
                </div>
            </div>

            {/* Form */}
            <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Error */}
                {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        <span className="material-symbols-outlined text-base">error</span>
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {success}
                    </div>
                )}

                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Codigo de activacion
                    </label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value);
                            setError(null);
                        }}
                        placeholder="Ingresa el codigo de 6 digitos"
                        maxLength={6}
                        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-4 py-3 text-center text-lg font-bold tracking-widest focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                        disabled={loading}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !code.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Verificando...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-base">verified</span>
                            Verificar y agregar rol
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

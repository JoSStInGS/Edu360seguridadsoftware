"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import CustomSelect from "@/app/components/CustomSelect";
import UsersTable, { UserRow } from "./components/UsersTable";
import UserMetricsCards from "./components/UserMetricsCards";
import GenerateCodeModal from "./components/GenerateCodeModal";
import EditUserModal from "./components/EditUserModal";

interface Metrics {
    total: number;
    admins: number;
    professors: number;
    parents: number;
}

interface Profesor {
    id: string;
    nombre: string;
}

interface StudentOption {
    cedula: string;
    fullName: string;
    grupoNombre: string | null;
}

export default function UsersPage() {
    const { user } = useAuth();
    const { periods, selectedPeriod, isLoading: periodsLoading } = usePeriodStore();

    const [users, setUsers] = useState<UserRow[]>([]);
    const [metrics, setMetrics] = useState<Metrics>({ total: 0, admins: 0, professors: 0, parents: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("Todos");

    // Professors for code generation
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    // Students for parent code generation
    const [students, setStudents] = useState<StudentOption[]>([]);

    // Modals
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);

    // Get Bearer token
    const getToken = useCallback(async () => {
        if (!user) return null;
        return user.getIdToken();
    }, [user]);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        const token = await getToken();
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch("/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Error fetching users");

            const data = await res.json();
            setUsers(data.users);
            setMetrics(data.metrics);
        } catch (err) {
            console.error("Error loading users:", err);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    // Fetch professors for the active period
    const fetchProfesores = useCallback(async () => {
        if (!user || !selectedPeriod) return;

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const centerId = userDoc.data()?.centerId;
            if (!centerId) return;

            const periodRef = doc(db, "centers", centerId, "periods", selectedPeriod);
            const profSnap = await getDocs(collection(periodRef, "profesores"));

            const profs: Profesor[] = profSnap.docs.map((d) => ({
                id: d.id,
                nombre: d.data().nombre || d.data().name || "Sin nombre",
            }));

            profs.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setProfesores(profs);
        } catch (err) {
            console.error("Error loading profesores:", err);
        }
    }, [user, selectedPeriod]);

    // Fetch students for the active period (for parent code generation)
    const fetchStudents = useCallback(async () => {
        if (!user || !selectedPeriod) return;

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const centerId = userDoc.data()?.centerId;
            if (!centerId) return;

            const periodRef = doc(db, "centers", centerId, "periods", selectedPeriod);
            const studentsSnap = await getDocs(collection(periodRef, "students"));

            const studentsList: StudentOption[] = studentsSnap.docs.map((d) => {
                const data = d.data();
                const fullName = data.fullName ||
                    [data.name, data.lastName1, data.lastName2].filter(Boolean).join(" ") ||
                    "Sin nombre";
                return {
                    cedula: d.id,
                    fullName,
                    grupoNombre: data.grupoNombre || null,
                };
            });

            studentsList.sort((a, b) => a.fullName.localeCompare(b.fullName));
            setStudents(studentsList);
        } catch (err) {
            console.error("Error loading students:", err);
        }
    }, [user, selectedPeriod]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchProfesores();
    }, [fetchProfesores]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Linked professor IDs (professors already associated with a user account)
    const linkedProfesorIds = new Set(
        users.filter((u) => u.profesorId).map((u) => u.profesorId!)
    );

    // Filter users
    const roleFilterMap: Record<string, string> = {
        Administrador: "admin",
        Profesor: "professor",
        "Encargado legal": "parent",
    };

    const filteredUsers = users.filter((u) => {
        const matchesSearch =
            (u.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole =
            selectedRole === "Todos" || u.roles.includes(roleFilterMap[selectedRole]);
        return matchesSearch && matchesRole;
    });

    // Handlers
    const handleGenerateCode = async (role: string, profesorId?: string, studentCedulas?: string[]) => {
        const token = await getToken();
        if (!token) return null;

        try {
            const res = await fetch("/api/users/generate-code", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role, profesorId, periodId: selectedPeriod, studentCedulas }),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Error generating code:", err);
                return null;
            }

            return res.json();
        } catch (err) {
            console.error("Error generating code:", err);
            return null;
        }
    };

    const handleEditUser = (u: UserRow) => {
        setEditingUser(u);
        setShowEditModal(true);
    };

    const handleSaveEdit = async (targetUid: string, roles: string[]) => {
        const token = await getToken();
        if (!token) return;

        const res = await fetch("/api/users", {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetUid, roles }),
        });

        if (res.ok) {
            await fetchUsers();
        }
    };

    const handleDeactivateUser = async (u: UserRow) => {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(`/api/users?uid=${u.uid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            await fetchUsers();
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl">
            {/* Header */}
            <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold">Usuarios</h2>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Gestiona los usuarios registrados y genera codigos de acceso.
                    </p>
                </div>
                <button
                    onClick={() => setShowGenerateModal(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                    <span className="material-symbols-outlined text-base">key</span>
                    Generar codigo
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 xl:mb-8 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Role filter */}
                    <div>
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Rol
                        </label>
                        <CustomSelect
                            availableKeys={["Todos", "Administrador", "Profesor", "Encargado legal"]}
                            value={selectedRole}
                            onChange={(key) => setSelectedRole(key)}
                            className="mt-1"
                            triggerClassName="w-full h-10 rounded-lg !border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 !text-sm text-[var(--foreground-light)] focus:!border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:!border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]"
                            dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                            optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                        />
                    </div>

                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Busqueda
                        </label>
                        <div className="relative mt-1">
                            <input
                                type="search"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] pl-10 pr-4 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                search
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="mb-6 xl:mb-8">
                <UserMetricsCards metrics={metrics} />
            </div>

            {/* Table or states */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <EmptyState
                    hasFilters={searchTerm !== "" || selectedRole !== "Todos"}
                    onClearFilters={() => {
                        setSearchTerm("");
                        setSelectedRole("Todos");
                    }}
                    onGenerateCode={() => setShowGenerateModal(true)}
                />
            ) : (
                <UsersTable
                    users={filteredUsers}
                    onEdit={handleEditUser}
                    onDeactivate={handleDeactivateUser}
                />
            )}

            {/* Modals */}
            <GenerateCodeModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                profesores={profesores}
                linkedProfesorIds={linkedProfesorIds}
                students={students}
                onGenerate={handleGenerateCode}
            />

            <EditUserModal
                isOpen={showEditModal}
                user={editingUser}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                }}
                onSave={handleSaveEdit}
            />
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({
    hasFilters,
    onClearFilters,
    onGenerateCode,
}: {
    hasFilters: boolean;
    onClearFilters: () => void;
    onGenerateCode: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <span className="material-symbols-outlined text-3xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    {hasFilters ? "search_off" : "manage_accounts"}
                </span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                {hasFilters ? "No se encontraron resultados" : "No hay usuarios"}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                {hasFilters
                    ? "Intenta cambiar los filtros de busqueda o el rol seleccionado."
                    : "Genera un codigo de registro para que los usuarios puedan crear sus cuentas."}
            </p>
            {hasFilters ? (
                <button
                    onClick={onClearFilters}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-[var(--border-dark)] dark:hover:bg-gray-800"
                >
                    <span className="material-symbols-outlined text-base">filter_alt_off</span>
                    Limpiar filtros
                </button>
            ) : (
                <button
                    onClick={onGenerateCode}
                    className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                >
                    <span className="material-symbols-outlined text-base">key</span>
                    Generar codigo
                </button>
            )}
        </div>
    );
}

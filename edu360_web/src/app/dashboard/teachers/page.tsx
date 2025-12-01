"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TeachersTable from "./components/TeachersTable";
import CustomSelect from "@/app/components/CustomSelect";
import { Teacher } from "@/types/teacher";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("Todos");
    const [selectedStatus, setSelectedStatus] = useState("Todos");
    const { user } = useAuth();
    const { periods, isLoading: periodsLoading } = usePeriodStore();
    const [periodoLectivo, setPeriodoLectivo] = useState<string>("");

    // Set default period
    useEffect(() => {
        const currentYear = new Date().getFullYear().toString();
        if (!periodsLoading && !periodoLectivo) {
            if (periods.includes(currentYear)) {
                setPeriodoLectivo(currentYear);
            } else if (periods.length > 0) {
                setPeriodoLectivo(periods[0]);
            }
        }
    }, [periods, periodsLoading, periodoLectivo]);

    useEffect(() => {
        const fetchTeachers = async () => {
            if (!user || !periodoLectivo) return;
            setLoading(true);
            try {
                // Get user's center
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const centerId = userDoc.data()?.centerId;

                if (!centerId) {
                    console.error("No center ID found for user");
                    setLoading(false);
                    return;
                }

                const teachersRef = collection(db, "centers", centerId, "periods", periodoLectivo, "teachers");
                const snapshot = await getDocs(teachersRef);

                const teachersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Teacher[];

                setTeachers(teachersData);
            } catch (error) {
                console.error("Error fetching teachers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, [user, periodoLectivo]);

    const filteredTeachers = teachers.filter((teacher) => {
        const fullName = `${teacher.firstName} ${teacher.lastName1 || ''} ${teacher.lastName2 || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "Todos" || teacher.type === selectedType;
        const matchesStatus = selectedStatus === "Todos" || teacher.status === selectedStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    const handleView = (teacher: Teacher) => {
        console.log("View teacher", teacher);
    };

    const handleEdit = (teacher: Teacher) => {
        console.log("Edit teacher", teacher);
    };

    return (
        <div className="mx-auto w-full max-w-7xl">
            <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold">Profesores</h2>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Periodo lectivo: <span className="font-semibold">{periodoLectivo || "Cargando..."}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <Link
                        href="/dashboard/teachers/import"
                        className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-4 py-2 text-sm font-semibold text-[var(--foreground-light)] transition hover:bg-[rgba(15,23,42,0.04)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                        <span className="material-symbols-outlined text-base">upload</span>
                        Importar profesores
                    </Link>
                    <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105">
                        <span className="material-symbols-outlined text-base">add</span>
                        Crear nuevo profesor
                    </button>
                </div>
            </div>

            <div className="mb-6 xl:mb-8 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <div>
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Tipo de Profesor
                        </label>
                        <CustomSelect
                            availableKeys={["Todos", "General", "Especialidad"]}
                            value={selectedType}
                            onChange={(key) => setSelectedType(key)}
                            className="mt-1"
                            triggerClassName="w-full h-10 rounded-lg !border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 !text-sm text-[var(--foreground-light)] focus:!border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:!border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]"
                            dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                            optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Estado
                        </label>
                        <CustomSelect
                            availableKeys={["Todos", "Activo", "Inactivo", "Pendiente", "Incapacitado", "Ausente"]}
                            value={selectedStatus}
                            onChange={(key) => setSelectedStatus(key)}
                            className="mt-1"
                            triggerClassName="w-full h-10 rounded-lg !border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 !text-sm text-[var(--foreground-light)] focus:!border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:!border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]"
                            dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                            optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="text-sm font-medium text-transparent select-none">
                            Búsqueda
                        </label>
                        <div className="relative mt-1">
                            <input
                                type="search"
                                placeholder="Buscar por nombre..."
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

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
                </div>
            ) : (
                <TeachersTable
                    teachers={filteredTeachers}
                    onView={handleView}
                    onEdit={handleEdit}
                />
            )}
        </div>
    );
}

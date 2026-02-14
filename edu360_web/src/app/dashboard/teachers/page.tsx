"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TeachersTable from "./components/TeachersTable";
import TeacherAbsenceModal from "./components/TeacherAbsenceModal";
import CustomSelect from "@/app/components/CustomSelect";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { TeacherAbsence } from "@/types/teacherAbsence";

// ============================================
// TIPOS
// ============================================

export interface TeacherRow {
    id: string;
    fullName: string;
    subjects: string[];
    coursesCount: number;
    status: string;
    activeAbsence?: TeacherAbsence | null;
}

interface ProfesorDoc {
    id: string;
    nombre: string;
    nombreCorto?: string;
    status?: string;
}

interface AsignaturaDoc {
    id: string;
    nombre: string;
}

interface HorarioDoc {
    profesorId: string;
    profesorNombre: string;
    asignaturaId: string;
    asignaturaNombre: string;
    grupoId: string;
    grupoNombre: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<TeacherRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("Todos");
    const { user } = useAuth();
    const { periods, isLoading: periodsLoading } = usePeriodStore();
    const [periodoLectivo, setPeriodoLectivo] = useState<string>("");
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
    const [centerId, setCenterId] = useState<string>("");

    // Establecer periodo por defecto
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

    // Fetch active absences for today
    const fetchAbsences = useCallback(async (cId: string, periodId: string): Promise<Map<string, TeacherAbsence>> => {
        const absenceMap = new Map<string, TeacherAbsence>();
        if (!user) return absenceMap;

        try {
            const token = await user.getIdToken();
            const today = new Date().toISOString().split("T")[0];
            const res = await fetch(
                `/api/teacher-absences?period=${periodId}&date=${today}&status=active`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                for (const absence of data.absences || []) {
                    absenceMap.set(absence.profesorId, absence as TeacherAbsence);
                }
            }
        } catch (err) {
            console.error("Error fetching absences:", err);
        }

        return absenceMap;
    }, [user]);

    // Cargar profesores
    const fetchTeachers = useCallback(async () => {
        if (!user || !periodoLectivo) return;
        setLoading(true);

        try {
            // 1. Obtener centerId del usuario
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const cId = userDoc.data()?.centerId;
            if (!cId) {
                console.error("Usuario sin centro asociado");
                setLoading(false);
                return;
            }
            setCenterId(cId);

            // 2. Referencia al periodo
            const periodRef = doc(db, "centers", cId, "periods", periodoLectivo);

            // 3. Obtener colecciones + ausencias en paralelo
            const [profesoresSnap, asignaturasSnap, horariosSnap, absenceMap] = await Promise.all([
                getDocs(collection(periodRef, "profesores")),
                getDocs(collection(periodRef, "asignaturas")),
                getDocs(collection(periodRef, "horarios")),
                fetchAbsences(cId, periodoLectivo),
            ]);

            // 4. Mapear documentos
            const profesores: ProfesorDoc[] = profesoresSnap.docs.map(d => ({
                id: d.id,
                nombre: d.data().nombre || d.data().name || "Sin nombre",
                nombreCorto: d.data().nombreCorto || d.data().short || "",
                status: d.data().status || "active",
            }));

            const asignaturas: AsignaturaDoc[] = asignaturasSnap.docs.map(d => ({
                id: d.id,
                nombre: d.data().nombre || d.data().name || "",
            }));

            const horarios: HorarioDoc[] = horariosSnap.docs.map(d => ({
                profesorId: d.data().profesorId || "",
                profesorNombre: d.data().profesorNombre || "",
                asignaturaId: d.data().asignaturaId || "",
                asignaturaNombre: d.data().asignaturaNombre || "",
                grupoId: d.data().grupoId || "",
                grupoNombre: d.data().grupoNombre || "",
            }));

            // 5. Crear índice de asignaturas
            const asignaturaMap = new Map(asignaturas.map(a => [a.id, a.nombre]));

            // 6. Construir filas de la tabla
            const rows: TeacherRow[] = profesores.map(profesor => {
                // Filtrar horarios de este profesor
                const misHorarios = horarios.filter(h => h.profesorId === profesor.id);

                // Obtener asignaturas únicas (usando el nombre desnormalizado si está disponible)
                const asignaturasUnicas = new Set<string>();
                misHorarios.forEach(h => {
                    // Preferir nombre desnormalizado, si no buscar en el mapa
                    const nombreAsignatura = h.asignaturaNombre || asignaturaMap.get(h.asignaturaId);
                    if (nombreAsignatura) {
                        asignaturasUnicas.add(nombreAsignatura);
                    }
                });

                // Obtener grupos únicos (cursos asignados)
                const gruposUnicos = new Set(misHorarios.map(h => h.grupoId).filter(Boolean));

                const absence = absenceMap.get(profesor.id);

                return {
                    id: profesor.id,
                    fullName: profesor.nombre,
                    subjects: Array.from(asignaturasUnicas),
                    coursesCount: gruposUnicos.size,
                    status: absence ? "Ausente" : (profesor.status === "active" ? "Activo" : "Inactivo"),
                    activeAbsence: absence || null,
                };
            });

            // 7. Ordenar por nombre
            rows.sort((a, b) => a.fullName.localeCompare(b.fullName));

            setTeachers(rows);

        } catch (err) {
            console.error("Error cargando profesores:", err);
        } finally {
            setLoading(false);
        }
    }, [user, periodoLectivo, fetchAbsences]);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    // Filtrar profesores
    const filteredTeachers = teachers.filter((teacher) => {
        const matchesSearch = teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "Todos" || teacher.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    // Handlers
    const handleView = (teacher: TeacherRow) => {
        console.log("Ver profesor:", teacher);
        // TODO: Implementar vista de detalle
    };

    const handleEdit = (teacher: TeacherRow) => {
        console.log("Editar profesor:", teacher);
        // TODO: Implementar edición
    };

    const handleMarkAbsent = (teacher: TeacherRow) => {
        setSelectedTeacher(teacher);
        setAbsenceModalOpen(true);
    };

    const handleAbsenceSaved = () => {
        fetchTeachers();
    };

    return (
        <div className="mx-auto w-full max-w-7xl">
            {/* Header */}
            <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold">Profesores</h2>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        Periodo lectivo: <span className="font-semibold">{periodoLectivo || "Cargando..."}</span>
                        {!loading && teachers.length > 0 && (
                            <span className="ml-2">
                                ({teachers.length} profesores)
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <Link
                        href="/dashboard/schedules/import"
                        className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-4 py-2 text-sm font-semibold text-[var(--foreground-light)] transition hover:bg-[rgba(15,23,42,0.04)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                        <span className="material-symbols-outlined text-base">upload</span>
                        Importar horarios
                    </Link>
                    <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105">
                        <span className="material-symbols-outlined text-base">add</span>
                        Crear nuevo profesor
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-6 xl:mb-8 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {/* Selector de periodo */}
                    <div>
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                            Periodo Lectivo
                        </label>
                        <CustomSelect
                            availableKeys={periods}
                            value={periodoLectivo}
                            onChange={(key) => setPeriodoLectivo(key)}
                            className="mt-1"
                            triggerClassName="w-full h-10 rounded-lg !border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 !text-sm text-[var(--foreground-light)] focus:!border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:!border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]"
                            dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                            optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                        />
                    </div>

                    {/* Selector de estado */}
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

                    {/* Búsqueda */}
                    <div className="xl:col-span-2">
                        <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
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

            {/* Tabla o estados */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
                </div>
            ) : filteredTeachers.length === 0 ? (
                <EmptyState
                    hasFilters={searchTerm !== "" || selectedStatus !== "Todos"}
                    onClearFilters={() => {
                        setSearchTerm("");
                        setSelectedStatus("Todos");
                    }}
                />
            ) : (
                <TeachersTable
                    teachers={filteredTeachers}
                    onView={handleView}
                    onEdit={handleEdit}
                    onMarkAbsent={handleMarkAbsent}
                />
            )}

            {/* Absence Modal */}
            <TeacherAbsenceModal
                isOpen={absenceModalOpen}
                teacher={selectedTeacher}
                teachers={teachers}
                periodId={periodoLectivo}
                onClose={() => {
                    setAbsenceModalOpen(false);
                    setSelectedTeacher(null);
                }}
                onSaved={handleAbsenceSaved}
            />
        </div>
    );
}

// ============================================
// COMPONENTE ESTADO VACÍO
// ============================================

function EmptyState({
    hasFilters,
    onClearFilters
}: {
    hasFilters: boolean;
    onClearFilters: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <span className="material-symbols-outlined text-3xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    {hasFilters ? "search_off" : "group"}
                </span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                {hasFilters ? "No se encontraron resultados" : "No hay profesores"}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                {hasFilters
                    ? "Intenta cambiar los filtros de búsqueda o el estado seleccionado."
                    : "Importa horarios desde un archivo XML de aSc Timetables para cargar los profesores automáticamente."
                }
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
                <Link
                    href="/dashboard/schedules/import"
                    className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                >
                    <span className="material-symbols-outlined text-base">upload</span>
                    Importar horarios
                </Link>
            )}
        </div>
    );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { useAuth } from "@/app/auth/hooks/useAuth";

interface Teacher {
    id: string;
    nombre: string;
}

interface Group {
    id: string;
    nombre: string;
    hasDivisions?: boolean;
}

interface Division {
    id: string;
    nombre: string;
    grupoId: string;
    entireClass: boolean;
    divisionTag: number;
}

interface TimeSlot {
    id: string;
    periodo: number;
    nombre: string;
    horaInicio: string;
    horaFin: string;
}

interface ScheduleEntry {
    id: string;
    dia: string;
    diaIndex: number; // 0=Lunes
    periodo: number;
    horaInicio: string;
    horaFin: string;
    profesorNombre: string;
    grupoNombre: string;
    divisionId?: string;
    divisionNombre?: string;
    isEntireClass?: boolean;
    asignaturaNombre: string;
    aulaNombre: string;
}

type ViewMode = "teachers" | "groups";

// Paleta de colores para asignaturas
const SUBJECT_COLORS = [
    { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-800 dark:text-blue-200", subtext: "text-blue-600 dark:text-blue-300", dot: "bg-blue-500" },
    { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-800 dark:text-emerald-200", subtext: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500" },
    { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800", text: "text-purple-800 dark:text-purple-200", subtext: "text-purple-600 dark:text-purple-300", dot: "bg-purple-500" },
    { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-800 dark:text-orange-200", subtext: "text-orange-600 dark:text-orange-300", dot: "bg-orange-500" },
    { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-200 dark:border-pink-800", text: "text-pink-800 dark:text-pink-200", subtext: "text-pink-600 dark:text-pink-300", dot: "bg-pink-500" },
    { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-800 dark:text-cyan-200", subtext: "text-cyan-600 dark:text-cyan-300", dot: "bg-cyan-500" },
    { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-200", subtext: "text-amber-600 dark:text-amber-300", dot: "bg-amber-500" },
    { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-200 dark:border-rose-800", text: "text-rose-800 dark:text-rose-200", subtext: "text-rose-600 dark:text-rose-300", dot: "bg-rose-500" },
    { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-800 dark:text-indigo-200", subtext: "text-indigo-600 dark:text-indigo-300", dot: "bg-indigo-500" },
    { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-200 dark:border-teal-800", text: "text-teal-800 dark:text-teal-200", subtext: "text-teal-600 dark:text-teal-300", dot: "bg-teal-500" },
    { bg: "bg-lime-100 dark:bg-lime-900/30", border: "border-lime-200 dark:border-lime-800", text: "text-lime-800 dark:text-lime-200", subtext: "text-lime-600 dark:text-lime-300", dot: "bg-lime-500" },
    { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-800 dark:text-fuchsia-200", subtext: "text-fuchsia-600 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
];

export default function SchedulesPage() {
    const { selectedPeriod, isLoading: isPeriodLoading } = usePeriodStore();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
    const [hasSchedules, setHasSchedules] = useState<boolean | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [selectedDivisionId, setSelectedDivisionId] = useState<string>("all"); // "all" para ver todas
    const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("teachers");

    // Fetch initial status (has schedules? list of teachers and groups)
    useEffect(() => {
        async function checkSchedules() {
            if (!selectedPeriod || !user) return;

            setIsLoading(true);
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/schedules?period=${selectedPeriod}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.hasSchedules) {
                    setHasSchedules(true);
                    setTeachers(data.teachers || []);
                    setGroups(data.groups || []);
                    setDivisions(data.divisions || []);
                    setTimeSlots(data.timeSlots || []);
                    if (data.teachers && data.teachers.length > 0) {
                        setSelectedTeacherId(data.teachers[0].id);
                    }
                    if (data.groups && data.groups.length > 0) {
                        setSelectedGroupId(data.groups[0].id);
                    }
                } else {
                    setHasSchedules(false);
                }
            } catch (err) {
                console.error("Error fetching schedules:", err);
            } finally {
                setIsLoading(false);
            }
        }

        if (!isPeriodLoading && selectedPeriod) {
            checkSchedules();
        }
    }, [selectedPeriod, user, isPeriodLoading]);

    // Fetch schedule based on view mode (teacher or group)
    useEffect(() => {
        async function fetchSchedule() {
            if (!selectedPeriod || !user) return;

            const selectedId = viewMode === "teachers" ? selectedTeacherId : selectedGroupId;
            if (!selectedId) return;

            setIsLoadingSchedule(true);
            try {
                const token = await user.getIdToken();
                const param = viewMode === "teachers"
                    ? `teacherId=${selectedTeacherId}`
                    : `groupId=${selectedGroupId}&divisionId=${selectedDivisionId}`;
                const res = await fetch(`/api/schedules?period=${selectedPeriod}&${param}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setScheduleData(data.schedules || []);
            } catch (err) {
                console.error("Error fetching schedule:", err);
            } finally {
                setIsLoadingSchedule(false);
            }
        }

        fetchSchedule();
    }, [selectedTeacherId, selectedGroupId, selectedDivisionId, selectedPeriod, user, viewMode]);

    // Reset division selection when group changes
    useEffect(() => {
        setSelectedDivisionId("all");
    }, [selectedGroupId]);

    // Get divisions for the selected group
    const selectedGroupDivisions = useMemo(() => {
        return divisions.filter(d => d.grupoId === selectedGroupId && !d.entireClass);
    }, [divisions, selectedGroupId]);

    // Check if selected group has divisions
    const selectedGroupHasDivisions = useMemo(() => {
        const group = groups.find(g => g.id === selectedGroupId);
        return group?.hasDivisions || selectedGroupDivisions.length > 0;
    }, [groups, selectedGroupId, selectedGroupDivisions]);

    // Generate color map for subjects
    const subjectColorMap = useMemo(() => {
        const uniqueSubjects = [...new Set(scheduleData.map(s => s.asignaturaNombre))].sort();
        const colorMap = new Map<string, typeof SUBJECT_COLORS[0]>();

        uniqueSubjects.forEach((subject, index) => {
            colorMap.set(subject, SUBJECT_COLORS[index % SUBJECT_COLORS.length]);
        });

        return colorMap;
    }, [scheduleData]);

    const getSubjectColor = (subjectName: string) => {
        return subjectColorMap.get(subjectName) || SUBJECT_COLORS[0];
    };


    if (isPeriodLoading || isLoading || hasSchedules === null) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-3xl text-[var(--primary)]">sync</span>
                    <p className="text-[var(--muted-light)]">Cargando horarios...</p>
                </div>
            </div>
        );
    }

    // --- EMPTY STATE ---
    if (!hasSchedules) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-6 rounded-full bg-blue-50 p-6 dark:bg-blue-900/20">
                    <span className="material-symbols-outlined text-6xl text-[var(--primary)]">calendar_month</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                    No hay horarios importados
                </h2>
                <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
                    Para comenzar a organizar las clases, necesitas importar los horarios desde aSc Timetables.
                </p>
                <Link
                    href="/dashboard/schedules/import"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white shadow-sm transition-transform hover:scale-105 hover:shadow-md"
                >
                    <span className="material-symbols-outlined">upload_file</span>
                    Empezar a importar horarios
                </Link>
            </div>
        );
    }

    // --- POPULATED STATE (Teacher/Group Scheduler) ---
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Horario Semanal</h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">Visualización del calendario académico</p>
                </div>

                <div className="flex gap-2">
                    <Link
                        href="/dashboard/schedules/import"
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Importar nuevos horarios"
                    >
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        <span className="hidden lg:inline">Importar</span>
                    </Link>

                    <button className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined text-[20px]">print</span>
                        Exportar
                    </button>
                </div>
            </div>

            {/* View Mode Tabs + Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#1e1e1e] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Tabs for view mode */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <button
                        onClick={() => setViewMode("teachers")}
                        disabled={isLoadingSchedule}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            viewMode === "teachers"
                                ? "bg-white dark:bg-[#2d2d2d] text-[var(--primary)] shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        Por Profesor
                    </button>
                    <button
                        onClick={() => setViewMode("groups")}
                        disabled={isLoadingSchedule}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            viewMode === "groups"
                                ? "bg-white dark:bg-[#2d2d2d] text-[var(--primary)] shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">groups</span>
                        Por Grupo
                    </button>
                </div>

                {/* Selector (Teacher or Group) */}
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap" htmlFor="entity-select">
                        {viewMode === "teachers" ? "Profesor:" : "Grupo:"}
                    </label>
                    <div className="relative min-w-[240px]">
                        {viewMode === "teachers" ? (
                            <select
                                id="entity-select"
                                disabled={isLoadingSchedule}
                                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d2d] py-2 pl-3 pr-10 text-base focus:border-[#153593] focus:outline-none focus:ring-[#153593] sm:text-sm dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                            >
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>
                        ) : (
                            <select
                                id="entity-select"
                                disabled={isLoadingSchedule}
                                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d2d] py-2 pl-3 pr-10 text-base focus:border-[#153593] focus:outline-none focus:ring-[#153593] sm:text-sm dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.nombre} {g.hasDivisions && "(con divisiones)"}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <span className="material-symbols-outlined text-[20px]">expand_more</span>
                        </div>
                    </div>

                    {/* Division selector (only for groups with divisions) */}
                    {viewMode === "groups" && selectedGroupHasDivisions && (
                        <>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap" htmlFor="division-select">
                                División:
                            </label>
                            <div className="relative min-w-[180px]">
                                <select
                                    id="division-select"
                                    disabled={isLoadingSchedule}
                                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d2d] py-2 pl-3 pr-10 text-base focus:border-[#153593] focus:outline-none focus:ring-[#153593] sm:text-sm dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={selectedDivisionId}
                                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                                >
                                    <option value="all">Todas las divisiones</option>
                                    {selectedGroupDivisions.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Schedule Table + Legend Layout */}
            <div className="flex flex-col xl:flex-row gap-4">
                {/* Schedule Table */}
                <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-sm relative">
                    {/* Loading Overlay */}
                    {isLoadingSchedule && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined animate-spin text-3xl text-[var(--primary)]">sync</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    Cargando horario...
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-24 border-r border-gray-100 dark:border-gray-700">
                                        Hora
                                    </th>
                                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map(day => (
                                        <th key={day} scope="col" className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#1e1e1e]">
                                {timeSlots.map((slot) => (
                                    <tr key={slot.id}>
                                        <td className="sticky left-0 bg-white dark:bg-[#1e1e1e] whitespace-nowrap px-3 py-3 text-xs font-medium text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">
                                            {slot.horaInicio} - {slot.horaFin}
                                        </td>
                                        {[0, 1, 2, 3, 4].map(dayIndex => {
                                            // En vista de grupo con "todas las divisiones", puede haber múltiples entradas
                                            const entries = scheduleData.filter(s => s.diaIndex === dayIndex && s.periodo === slot.periodo);
                                            const hasEntries = entries.length > 0;

                                            return (
                                                <td key={dayIndex} className="px-1 py-1 h-full">
                                                    {hasEntries ? (
                                                        <div className={`flex flex-col gap-1 ${entries.length > 1 ? 'h-full' : ''}`}>
                                                            {entries.map((entry, idx) => {
                                                                const colors = getSubjectColor(entry.asignaturaNombre);
                                                                return (
                                                                    <div key={idx} className={`rounded-lg ${colors.bg} p-2 hover:shadow-md transition-shadow border ${colors.border} ${entries.length > 1 ? 'flex-1' : 'h-full'}`}>
                                                                        <p className={`text-[11px] font-bold ${colors.text} line-clamp-1`}>{entry.asignaturaNombre}</p>
                                                                        <div className={`mt-1 flex flex-col gap-0.5 text-[10px] ${colors.subtext}`}>
                                                                            {viewMode === "teachers" ? (
                                                                                <span className="flex items-center gap-1 line-clamp-1">
                                                                                    <span className="material-symbols-outlined text-[11px]">groups</span>
                                                                                    {entry.grupoNombre}
                                                                                    {!entry.isEntireClass && entry.divisionNombre && (
                                                                                        <span className="text-[9px] opacity-75">({entry.divisionNombre})</span>
                                                                                    )}
                                                                                </span>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="flex items-center gap-1 line-clamp-1">
                                                                                        <span className="material-symbols-outlined text-[11px]">person</span>
                                                                                        {entry.profesorNombre}
                                                                                    </span>
                                                                                    {!entry.isEntireClass && entry.divisionNombre && (
                                                                                        <span className="flex items-center gap-1 line-clamp-1 opacity-75">
                                                                                            <span className="material-symbols-outlined text-[11px]">group_work</span>
                                                                                            {entry.divisionNombre}
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            <span className="flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[11px]">room</span>
                                                                                {entry.aulaNombre || 'S/A'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full min-h-[50px] rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-center">
                                                            <span className="text-[10px] text-gray-400">Libre</span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {timeSlots.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            No hay periodos horarios configurados para este periodo lectivo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leyenda de Asignaturas - Sidebar */}
                {scheduleData.length > 0 && (
                    <div className="xl:w-56 shrink-0 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm h-fit">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">palette</span>
                            Asignaturas
                        </h3>
                        <div className="flex flex-col gap-2">
                            {[...subjectColorMap.entries()].map(([subject, colors]) => (
                                <div key={subject} className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full shrink-0 ${colors.dot}`}></div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1" title={subject}>{subject}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="h-3 w-3 rounded-full shrink-0 border border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"></div>
                                <span className="text-sm text-gray-500 dark:text-gray-500">Hora Libre</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

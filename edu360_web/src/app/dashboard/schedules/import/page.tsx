"use client";

import { useState, useEffect, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
    ScheduleTeacher,
    ScheduleSubject,
    ScheduleGroup,
    ScheduleDivision,
    ScheduleClassroom,
    ScheduleTimeSlot,
    ScheduleEntry,
    ScheduleStats,
    SchedulePreviewData,
    ParsedLesson,
} from "@/types/schedule";

// ============================================
// CONSTANTES
// ============================================

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const PREVIEW_TABS = [
    { id: "horarios", label: "Horarios", icon: "calendar_month" },
    { id: "profesores", label: "Profesores", icon: "group" },
    { id: "grupos", label: "Grupos", icon: "school" },
    { id: "asignaturas", label: "Asignaturas", icon: "menu_book" },
    { id: "aulas", label: "Aulas", icon: "meeting_room" },
] as const;

type PreviewTab = typeof PREVIEW_TABS[number]["id"];

// ============================================
// HELPERS
// ============================================

function parseDayMask(mask: string): { index: number; name: string } {
    const index = mask.indexOf("1");
    return {
        index: index >= 0 ? index : -1,
        name: DAY_NAMES[index] ?? "Desconocido"
    };
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${sizes[i]}`;
}

function getAttr(el: Element, name: string): string {
    return el.getAttribute(name) || "";
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ImportSchedulePage() {
    const { periods } = usePeriodStore();
    const { user } = useAuth();

    // Estados del formulario
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Estados de procesamiento
    const [isValidating, setIsValidating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

    // Datos parseados
    const [previewData, setPreviewData] = useState<SchedulePreviewData | null>(null);
    const [activeTab, setActiveTab] = useState<PreviewTab>("horarios");
    const [hasExistingSchedule, setHasExistingSchedule] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkExisting() {
            setHasExistingSchedule(null);
            if (!selectedPeriod || !user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/schedules?period=${selectedPeriod}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setHasExistingSchedule(data.hasSchedules);
            } catch (e) {
                console.error(e);
            }
        }
        checkExisting();
    }, [selectedPeriod, user]);

    // ============================================
    // PARSER XML
    // ============================================

    const parseXML = async (xmlFile: File) => {
        setIsValidating(true);
        setPreviewData(null);
        setImportStatus("idle");

        try {
            // Leer el archivo como ArrayBuffer para poder detectar/usar la codificación correcta
            const arrayBuffer = await xmlFile.arrayBuffer();

            // Primero intentamos leer una porción para detectar el encoding del XML
            const previewDecoder = new TextDecoder("utf-8");
            const preview = previewDecoder.decode(arrayBuffer.slice(0, 200));

            // Buscar el encoding en la declaración XML: <?xml version="1.0" encoding="XXX"?>
            let encoding = "utf-8";
            const encodingMatch = preview.match(/encoding=["']([^"']+)["']/i);
            if (encodingMatch) {
                encoding = encodingMatch[1].toLowerCase();
                // Mapear nombres comunes de encoding
                if (encoding === "windows-1252" || encoding === "cp1252") {
                    encoding = "windows-1252";
                } else if (encoding === "iso-8859-1" || encoding === "latin1" || encoding === "latin-1") {
                    encoding = "iso-8859-1";
                }
            }

            // Decodificar con la codificación detectada
            const decoder = new TextDecoder(encoding);
            const text = decoder.decode(arrayBuffer);

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            // Verificar errores de parseo
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Error al analizar el archivo XML");
            }

            // ----------------------------
            // 1. EXTRAER CATÁLOGOS
            // ----------------------------

            // Profesores
            const profesoresMap = new Map<string, ScheduleTeacher>();
            Array.from(xmlDoc.getElementsByTagName("teacher")).forEach(el => {
                const id = getAttr(el, "id");
                const nombre = getAttr(el, "name") ||
                    `${getAttr(el, "firstname")} ${getAttr(el, "lastname")}`.trim();
                profesoresMap.set(id, {
                    id,
                    nombre,
                    nombreCorto: getAttr(el, "short"),
                    email: getAttr(el, "email") || undefined,
                    source: "import"
                });
            });

            // Asignaturas
            const asignaturasMap = new Map<string, ScheduleSubject>();
            Array.from(xmlDoc.getElementsByTagName("subject")).forEach(el => {
                const id = getAttr(el, "id");
                asignaturasMap.set(id, {
                    id,
                    nombre: getAttr(el, "name"),
                    nombreCorto: getAttr(el, "short"),
                    source: "import"
                });
            });

            // Grupos (classes en el XML)
            const gruposMap = new Map<string, ScheduleGroup>();
            Array.from(xmlDoc.getElementsByTagName("class")).forEach(el => {
                const id = getAttr(el, "id");
                gruposMap.set(id, {
                    id,
                    nombre: getAttr(el, "name"),
                    nombreCorto: getAttr(el, "short"),
                    aulaAsignada: getAttr(el, "classroomids") || undefined,
                    source: "import",
                    hasDivisions: false,
                    divisions: []
                });
            });

            // Divisiones (groups en el XML) - subgrupos de cada clase
            const divisionesMap = new Map<string, ScheduleDivision>();
            Array.from(xmlDoc.getElementsByTagName("group")).forEach(el => {
                const id = getAttr(el, "id");
                const classId = getAttr(el, "classid");
                const entireClass = getAttr(el, "entireclass") === "1";
                const divisionTag = parseInt(getAttr(el, "divisiontag") || "0", 10);

                const division: ScheduleDivision = {
                    id,
                    nombre: getAttr(el, "name"),
                    grupoId: classId,
                    entireClass,
                    divisionTag
                };

                divisionesMap.set(id, division);

                // Agregar la división al grupo correspondiente
                const grupo = gruposMap.get(classId);
                if (grupo) {
                    if (!entireClass) {
                        grupo.hasDivisions = true;
                    }
                    grupo.divisions = grupo.divisions || [];
                    grupo.divisions.push(division);
                }
            });

            // Aulas
            const aulasMap = new Map<string, ScheduleClassroom>();
            Array.from(xmlDoc.getElementsByTagName("classroom")).forEach(el => {
                const id = getAttr(el, "id");
                aulasMap.set(id, {
                    id,
                    nombre: getAttr(el, "name"),
                    nombreCorto: getAttr(el, "short"),
                    capacidad: getAttr(el, "capacity") || undefined,
                    source: "import"
                });
            });

            // Periodos horarios (franjas del día)
            const periodosMap = new Map<string, ScheduleTimeSlot>();
            Array.from(xmlDoc.getElementsByTagName("period")).forEach(el => {
                const periodoNum = getAttr(el, "period");
                periodosMap.set(periodoNum, {
                    id: periodoNum,
                    periodo: parseInt(periodoNum, 10),
                    nombre: getAttr(el, "name"),
                    horaInicio: getAttr(el, "starttime"),
                    horaFin: getAttr(el, "endtime")
                });
            });

            // ----------------------------
            // 2. EXTRAER LESSONS (relaciones académicas)
            // ----------------------------

            const lessonsMap = new Map<string, ParsedLesson>();
            Array.from(xmlDoc.getElementsByTagName("lesson")).forEach(el => {
                const id = getAttr(el, "id");
                lessonsMap.set(id, {
                    id,
                    subjectId: getAttr(el, "subjectid"),
                    classIds: getAttr(el, "classids").split(",").filter(Boolean),
                    teacherIds: getAttr(el, "teacherids").split(",").filter(Boolean),
                    classroomIds: getAttr(el, "classroomids").split(",").filter(Boolean),
                    groupIds: getAttr(el, "groupids").split(",").filter(Boolean)
                });
            });

            // ----------------------------
            // 3. PROCESAR CARDS (horario real)
            // ----------------------------

            const horarios: ScheduleEntry[] = [];
            let cardIndex = 0;

            Array.from(xmlDoc.getElementsByTagName("card")).forEach(cardEl => {
                const lessonId = getAttr(cardEl, "lessonid");
                const lesson = lessonsMap.get(lessonId);
                if (!lesson) return;

                // Obtener día
                const dayMask = getAttr(cardEl, "days");
                const day = parseDayMask(dayMask);
                if (day.index < 0) return;

                // Obtener periodo
                const periodoId = getAttr(cardEl, "period");
                const periodo = periodosMap.get(periodoId);
                if (!periodo) return;

                // Obtener aula (puede venir del card o de la lesson)
                const aulaId = getAttr(cardEl, "classroomids") || lesson.classroomIds[0] || "";
                const aula = aulasMap.get(aulaId);

                // Generar entradas para cada combinación profesor-grupo-división
                for (const teacherId of lesson.teacherIds) {
                    // Iterar por los groupIds de la lesson (que son las divisiones)
                    for (const groupId of lesson.groupIds) {
                        const division = divisionesMap.get(groupId);
                        if (!division) continue;

                        const grupo = gruposMap.get(division.grupoId);
                        const profesor = profesoresMap.get(teacherId);
                        const asignatura = asignaturasMap.get(lesson.subjectId);

                        if (!profesor || !asignatura || !grupo) continue;

                        horarios.push({
                            id: `entry_${cardIndex++}`,
                            dia: day.name,
                            diaIndex: day.index,
                            periodo: periodo.periodo,
                            horaInicio: periodo.horaInicio,
                            horaFin: periodo.horaFin,
                            profesorId: profesor.id,
                            profesorNombre: profesor.nombre,
                            grupoId: grupo.id,
                            grupoNombre: grupo.nombre,
                            divisionId: division.id,
                            divisionNombre: division.nombre,
                            isEntireClass: division.entireClass,
                            asignaturaId: asignatura.id,
                            asignaturaNombre: asignatura.nombre,
                            aulaId: aula?.id || "",
                            aulaNombre: aula?.nombre || "",
                            source: "import"
                        });
                    }

                    // Fallback: si no hay groupIds, usar classIds directamente (compatibilidad con XML sin divisiones)
                    if (lesson.groupIds.length === 0) {
                        for (const classId of lesson.classIds) {
                            const grupo = gruposMap.get(classId);
                            const profesor = profesoresMap.get(teacherId);
                            const asignatura = asignaturasMap.get(lesson.subjectId);

                            if (!profesor || !asignatura || !grupo) continue;

                            horarios.push({
                                id: `entry_${cardIndex++}`,
                                dia: day.name,
                                diaIndex: day.index,
                                periodo: periodo.periodo,
                                horaInicio: periodo.horaInicio,
                                horaFin: periodo.horaFin,
                                profesorId: profesor.id,
                                profesorNombre: profesor.nombre,
                                grupoId: grupo.id,
                                grupoNombre: grupo.nombre,
                                isEntireClass: true,
                                asignaturaId: asignatura.id,
                                asignaturaNombre: asignatura.nombre,
                                aulaId: aula?.id || "",
                                aulaNombre: aula?.nombre || "",
                                source: "import"
                            });
                        }
                    }
                }
            });

            // ----------------------------
            // 4. ORDENAR HORARIOS
            // ----------------------------

            horarios.sort((a, b) => {
                if (a.diaIndex !== b.diaIndex) return a.diaIndex - b.diaIndex;
                return a.periodo - b.periodo;
            });

            // ----------------------------
            // 5. PREPARAR PREVIEW DATA
            // ----------------------------

            const profesores = Array.from(profesoresMap.values());
            const asignaturas = Array.from(asignaturasMap.values());
            const grupos = Array.from(gruposMap.values());
            const divisiones = Array.from(divisionesMap.values());
            const aulas = Array.from(aulasMap.values());
            const periodosHorario = Array.from(periodosMap.values()).sort((a, b) => a.periodo - b.periodo);

            const stats: ScheduleStats = {
                profesores: profesores.length,
                grupos: grupos.length,
                asignaturas: asignaturas.length,
                aulas: aulas.length,
                periodosHorario: periodosHorario.length,
                totalHorarios: horarios.length
            };

            setPreviewData({
                stats,
                profesores,
                grupos,
                divisiones,
                asignaturas,
                aulas,
                periodosHorario,
                horarios
            });

        } catch (error) {
            console.error("Error parsing XML:", error);
            alert("Error procesando el archivo XML. Verifica que sea un formato válido de aSc Timetables.");
            setFile(null);
            setPreviewData(null);
        } finally {
            setIsValidating(false);
        }
    };

    // ============================================
    // HANDLERS DE ARCHIVOS
    // ============================================

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (uploadedFile: File) => {
        if (uploadedFile.type === "text/xml" || uploadedFile.name.endsWith(".xml")) {
            setFile(uploadedFile);
            parseXML(uploadedFile);
        } else {
            alert("Por favor sube un archivo XML válido.");
        }
    };

    // ============================================
    // IMPORTAR A FIRESTORE
    // ============================================

    const handleImport = async () => {
        if (!previewData || !selectedPeriod || !user) {
            alert("Por favor, selecciona un periodo y valida el archivo XML antes de importar.");
            return;
        }

        if (!previewData.horarios.length) {
            alert("No se encontraron horarios válidos para importar.");
            return;
        }

        setIsImporting(true);

        try {
            const idToken = await user.getIdToken();

            const response = await fetch("/api/schedules/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    periodoLectivo: selectedPeriod,
                    data: {
                        profesores: previewData.profesores,
                        asignaturas: previewData.asignaturas,
                        grupos: previewData.grupos,
                        divisiones: previewData.divisiones,
                        aulas: previewData.aulas,
                        periodosHorario: previewData.periodosHorario,
                        horarios: previewData.horarios
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || "Falló la importación del horario");
            }

            setImportStatus("success");
            setFile(null);
            setPreviewData(null);

        } catch (error) {
            console.error("Import error:", error);
            setImportStatus("error");
            alert(error instanceof Error ? error.message : "Hubo un error al guardar los horarios.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewData(null);
        setDragActive(false);
        setImportStatus("idle");
        setActiveTab("horarios");
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 flex flex-col items-center w-full">
            <div className="w-full max-w-[1200px] space-y-6 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            Importación de Horarios
                        </h2>
                        <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)] mt-1">
                            Carga archivos XML de aSc Timetables para importar horarios al periodo lectivo.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="size-2 rounded-full bg-green-500 mr-2"></span>
                            Sistema Operativo
                        </span>
                    </div>
                </div>

                {/* Success State */}
                {importStatus === "success" ? (
                    <SuccessCard period={selectedPeriod} />
                ) : (
                    <>
                        {/* Contextual Message */}
                        {selectedPeriod && hasExistingSchedule === true && (
                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-300">
                                <div className="flex items-center gap-2 font-bold">
                                    <span className="material-symbols-outlined">warning</span>
                                    Atención: Sobreescritura de datos
                                </div>
                                <p className="mt-1 ml-8">
                                    Ya existen horarios cargados para este periodo ({selectedPeriod}). Si continuas con la importación,
                                    <strong> los datos actuales serán reemplazados permanentemente.</strong>
                                </p>
                            </div>
                        )}

                        {selectedPeriod && hasExistingSchedule === false && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300">
                                <div className="flex items-center gap-2 font-bold">
                                    <span className="material-symbols-outlined">info</span>
                                    Primeros pasos
                                </div>
                                <p className="mt-1 ml-8">
                                    No se encontraron horarios para el periodo {selectedPeriod}. Sube tu archivo XML para comenzar a configurar el calendario académico.
                                </p>
                            </div>
                        )}
                        {/* Configuración */}
                        <ConfigurationCard
                            periods={periods}
                            selectedPeriod={selectedPeriod}
                            onPeriodChange={setSelectedPeriod}
                            file={file}
                            dragActive={dragActive}
                            onDrag={handleDrag}
                            onDrop={handleDrop}
                            onChange={handleChange}
                        />

                        {/* Validando */}
                        {isValidating && <LoadingCard />}

                        {/* Preview */}
                        {previewData && (
                            <PreviewSection
                                data={previewData}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Bottom Action Bar */}
            {importStatus !== "success" && (
                <ActionBar
                    hasPreview={!!previewData}
                    hasSelectedPeriod={!!selectedPeriod}
                    isImporting={isImporting}
                    onCancel={handleReset}
                    onImport={handleImport}
                />
            )}
        </div>
    );
}

// ============================================
// SUBCOMPONENTES
// ============================================

function ConfigurationCard({
    periods,
    selectedPeriod,
    onPeriodChange,
    file,
    dragActive,
    onDrag,
    onDrop,
    onChange
}: {
    periods: string[];
    selectedPeriod: string;
    onPeriodChange: (period: string) => void;
    file: File | null;
    dragActive: boolean;
    onDrag: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] bg-gray-50/50 dark:bg-gray-800/50 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center size-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-sm">1</span>
                    <h3 className="text-base font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Configuración de la Importación
                    </h3>
                </div>
                {/* Period Selector */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)] whitespace-nowrap">
                        Periodo Lectivo:
                    </label>
                    <div className="w-full md:w-64">
                        <Select
                            value={selectedPeriod}
                            onValueChange={onPeriodChange}
                            disabled={periods.length === 0}
                        >
                            <SelectTrigger className="w-full text-sm">
                                <SelectValue placeholder="Seleccione periodo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((period) => (
                                    <SelectItem key={period} value={period}>{period}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Dropzone */}
            <div className="p-8">
                <div
                    className={`relative group border-2 border-dashed transition-all rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer ${dragActive
                            ? "border-[var(--primary)] bg-[var(--primary)]/5"
                            : "border-[var(--border-light)] dark:border-[var(--border-dark)] bg-[var(--background-light)]/50 dark:bg-[var(--background-dark)]/50 hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/50"
                        }`}
                    onDragEnter={onDrag}
                    onDragLeave={onDrag}
                    onDragOver={onDrag}
                    onDrop={onDrop}
                >
                    <input
                        accept=".xml"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        type="file"
                        onChange={onChange}
                    />
                    <div className="size-16 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-4xl text-[var(--primary)]">upload_file</span>
                    </div>
                    <h4 className="text-lg font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] mb-1">
                        {file ? file.name : "Arrastra aquí tu archivo XML"}
                    </h4>
                    <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)] max-w-sm mx-auto mb-6">
                        {file ? formatFileSize(file.size) : "Soporta archivos exportados desde aSc Timetables (.xml). Máximo 10MB."}
                    </p>
                    <button className="px-4 py-2 bg-[var(--card-light)] dark:bg-[var(--card-dark)] border border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] font-medium rounded-lg text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors pointer-events-none">
                        {file ? "Cambiar archivo" : "Seleccionar archivo manualmente"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoadingCard() {
    return (
        <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] shadow-sm p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-[var(--primary)] text-lg">sync</span>
                    Analizando estructura del archivo XML...
                </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-[var(--primary)] h-2.5 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
            <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                Extrayendo profesores, grupos, asignaturas y horarios...
            </p>
        </div>
    );
}

function SuccessCard({ period }: { period: string }) {
    return (
        <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] rounded-xl border border-green-200 dark:border-green-800 p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="size-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] mb-2">
                Importación Exitosa
            </h3>
            <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)] max-w-md mb-6">
                Los horarios han sido cargados correctamente para el periodo <strong>{period}</strong>.
            </p>
            <Link
                href="/dashboard/schedules"
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 inline-flex items-center gap-2"
            >
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                Ver Horarios
            </Link>
        </div>
    );
}

function PreviewSection({
    data,
    activeTab,
    onTabChange
}: {
    data: SchedulePreviewData;
    activeTab: PreviewTab;
    onTabChange: (tab: PreviewTab) => void;
}) {
    return (
        <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center size-8 rounded-full bg-[var(--primary)] text-white font-bold text-sm shadow-md shadow-[var(--primary)]/20">2</span>
                    <h3 className="text-base font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Previsualización de Datos
                    </h3>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="p-6 bg-[var(--background-light)]/30 dark:bg-[var(--background-dark)]/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <StatCard label="Profesores" value={data.stats.profesores} icon="group" color="blue" />
                    <StatCard label="Grupos" value={data.stats.grupos} icon="school" color="purple" />
                    <StatCard label="Asignaturas" value={data.stats.asignaturas} icon="menu_book" color="orange" />
                    <StatCard label="Aulas" value={data.stats.aulas} icon="meeting_room" color="cyan" />
                    <StatCard label="Periodos/Día" value={data.stats.periodosHorario} icon="schedule" color="pink" />
                    <StatCard label="Total Horarios" value={data.stats.totalHorarios} icon="calendar_month" color="green" />
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {PREVIEW_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? "bg-[var(--primary)] text-white shadow-md"
                                    : "bg-white dark:bg-gray-800 text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] border border-[var(--border-light)] dark:border-[var(--border-dark)] hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"
                                }`}>
                                {tab.id === "horarios" && data.stats.totalHorarios}
                                {tab.id === "profesores" && data.stats.profesores}
                                {tab.id === "grupos" && data.stats.grupos}
                                {tab.id === "asignaturas" && data.stats.asignaturas}
                                {tab.id === "aulas" && data.stats.aulas}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border border-[var(--border-light)] dark:border-[var(--border-dark)] rounded-xl overflow-hidden">
                    {activeTab === "horarios" && <HorariosTable data={data.horarios} />}
                    {activeTab === "profesores" && <ProfesoresTable data={data.profesores} />}
                    {activeTab === "grupos" && <GruposTable data={data.grupos} />}
                    {activeTab === "asignaturas" && <AsignaturasTable data={data.asignaturas} />}
                    {activeTab === "aulas" && <AulasTable data={data.aulas} />}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
        pink: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
    };

    return (
        <div className="bg-[var(--card-light)] dark:bg-[var(--card-dark)] p-4 rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
            </div>
            <p className="text-2xl font-black text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">{value}</p>
            <p className="text-xs font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase tracking-wider">{label}</p>
        </div>
    );
}

// ============================================
// TABLAS DE PREVIEW
// ============================================

function HorariosTable({ data }: { data: ScheduleEntry[] }) {
    const preview = data.slice(0, 100);

    return (
        <>
            <TableHeader
                title="Horarios Detectados"
                subtitle={`Mostrando ${preview.length} de ${data.length} registros`}
            />
            <div className="overflow-x-auto custom-scrollbar max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">Día</th>
                            <th className="px-4 py-3 font-medium">Hora</th>
                            <th className="px-4 py-3 font-medium">Profesor</th>
                            <th className="px-4 py-3 font-medium">Asignatura</th>
                            <th className="px-4 py-3 font-medium">Grupo</th>
                            <th className="px-4 py-3 font-medium">Aula</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                        {preview.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getDayColor(entry.diaIndex)}`}>
                                        {entry.dia}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">
                                    {entry.horaInicio} - {entry.horaFin}
                                </td>
                                <td className="px-4 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                    {entry.profesorNombre}
                                </td>
                                <td className="px-4 py-3">{entry.asignaturaNombre}</td>
                                <td className="px-4 py-3">
                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                                        {entry.grupoNombre}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {entry.aulaNombre || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function ProfesoresTable({ data }: { data: ScheduleTeacher[] }) {
    return (
        <>
            <TableHeader
                title="Profesores Detectados"
                subtitle={`${data.length} profesores encontrados en el archivo`}
            />
            <div className="overflow-x-auto custom-scrollbar max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Nombre Completo</th>
                            <th className="px-4 py-3 font-medium">Abreviatura</th>
                            <th className="px-4 py-3 font-medium">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                        {data.map((profesor, idx) => (
                            <tr key={profesor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                    {profesor.nombre}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold">
                                        {profesor.nombreCorto}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {profesor.id.slice(0, 12)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function GruposTable({ data }: { data: ScheduleGroup[] }) {
    return (
        <>
            <TableHeader
                title="Grupos/Clases Detectados"
                subtitle={`${data.length} grupos encontrados en el archivo`}
            />
            <div className="overflow-x-auto custom-scrollbar max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Nombre del Grupo</th>
                            <th className="px-4 py-3 font-medium">Abreviatura</th>
                            <th className="px-4 py-3 font-medium">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                        {data.map((grupo, idx) => (
                            <tr key={grupo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                    {grupo.nombre}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">
                                        {grupo.nombreCorto}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {grupo.id.slice(0, 12)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function AsignaturasTable({ data }: { data: ScheduleSubject[] }) {
    return (
        <>
            <TableHeader
                title="Asignaturas Detectadas"
                subtitle={`${data.length} asignaturas encontradas en el archivo`}
            />
            <div className="overflow-x-auto custom-scrollbar max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Nombre de la Asignatura</th>
                            <th className="px-4 py-3 font-medium">Abreviatura</th>
                            <th className="px-4 py-3 font-medium">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                        {data.map((asignatura, idx) => (
                            <tr key={asignatura.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                    {asignatura.nombre}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-bold">
                                        {asignatura.nombreCorto}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {asignatura.id.slice(0, 12)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function AulasTable({ data }: { data: ScheduleClassroom[] }) {
    return (
        <>
            <TableHeader
                title="Aulas Detectadas"
                subtitle={`${data.length} aulas encontradas en el archivo`}
            />
            <div className="overflow-x-auto custom-scrollbar max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)] uppercase bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Nombre del Aula</th>
                            <th className="px-4 py-3 font-medium">Abreviatura</th>
                            <th className="px-4 py-3 font-medium">Capacidad</th>
                            <th className="px-4 py-3 font-medium">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                        {data.map((aula, idx) => (
                            <tr key={aula.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                    {aula.nombre}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-bold">
                                        {aula.nombreCorto}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {aula.capacidad || "-"}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    {aula.id.slice(0, 12)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function TableHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="px-4 py-3 border-b border-[var(--border-light)] dark:border-[var(--border-dark)] bg-white dark:bg-gray-900 flex items-center justify-between">
            <div>
                <h4 className="text-sm font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">{title}</h4>
                <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{subtitle}</p>
            </div>
        </div>
    );
}

function getDayColor(dayIndex: number): string {
    const colors = [
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",      // Lunes
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",   // Martes
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", // Miércoles
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", // Jueves
        "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",       // Viernes
    ];
    return colors[dayIndex] || "bg-gray-100 text-gray-700";
}

function ActionBar({
    hasPreview,
    hasSelectedPeriod,
    isImporting,
    onCancel,
    onImport
}: {
    hasPreview: boolean;
    hasSelectedPeriod: boolean;
    isImporting: boolean;
    onCancel: () => void;
    onImport: () => void;
}) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-t border-[var(--border-light)] dark:border-[var(--border-dark)] p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="max-w-[1200px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)] hidden sm:flex">
                    <span className="material-symbols-outlined text-lg">info</span>
                    <span>Esta acción sobrescribirá los horarios existentes del periodo seleccionado.</span>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    {hasPreview && !hasSelectedPeriod && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full animate-pulse">
                            Seleccione un periodo lectivo
                        </span>
                    )}
                    <button
                        className="px-6 py-2.5 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={onCancel}
                        disabled={isImporting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onImport}
                        disabled={!hasPreview || !hasSelectedPeriod || isImporting}
                        className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-white font-bold text-sm shadow-md shadow-[var(--primary)]/20 hover:bg-[var(--primary)]/90 hover:shadow-lg hover:shadow-[var(--primary)]/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-lg">
                            {isImporting ? "sync" : "publish"}
                        </span>
                        {isImporting ? "Importando..." : "Importar Horario"}
                    </button>
                </div>
            </div>
        </div>
    );
}

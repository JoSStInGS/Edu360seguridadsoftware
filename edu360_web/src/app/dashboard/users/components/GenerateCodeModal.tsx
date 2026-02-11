import { useState, useEffect, useCallback, useRef } from "react";
import { SearchableSelect } from "@/app/components/SearchableSelect";

interface Profesor {
    id: string;
    nombre: string;
}

interface StudentOption {
    cedula: string;
    fullName: string;
    grupoNombre: string | null;
}

interface GenerateCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    profesores: Profesor[];
    linkedProfesorIds: Set<string>;
    students: StudentOption[];
    onGenerate: (role: string, profesorId?: string, studentCedulas?: string[]) => Promise<{ code: string; expiresAt: string } | null>;
}

type RoleOption = "admin" | "professor" | "parent";

const roleOptions: { value: RoleOption; label: string; icon: string }[] = [
    { value: "admin", label: "Administrador", icon: "admin_panel_settings" },
    { value: "professor", label: "Profesor", icon: "school" },
    { value: "parent", label: "Padre de familia", icon: "family_restroom" },
];

export default function GenerateCodeModal({
    isOpen,
    onClose,
    profesores,
    linkedProfesorIds,
    students,
    onGenerate,
}: GenerateCodeModalProps) {
    const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
    const [selectedProfesorName, setSelectedProfesorName] = useState("");
    const [selectedProfesorId, setSelectedProfesorId] = useState("");
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);

    // Student multi-select state
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

    // Filter out already-linked professors
    const availableProfesores = profesores.filter(
        (p) => !linkedProfesorIds.has(p.id)
    );

    // Filter students based on search (exclude already selected)
    const selectedCedulas = new Set(selectedStudents.map((s) => s.cedula));
    const filteredStudents = students.filter((s) => {
        if (selectedCedulas.has(s.cedula)) return false;
        if (!studentSearch) return true;
        const q = studentSearch.toLowerCase();
        return (
            s.cedula.toLowerCase().includes(q) ||
            s.fullName.toLowerCase().includes(q) ||
            (s.grupoNombre && s.grupoNombre.toLowerCase().includes(q))
        );
    });

    // Close student dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
                setIsStudentDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = Math.max(0, Math.floor((expiry - now) / 1000));
            setTimeLeft(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const resetState = useCallback(() => {
        setSelectedRole(null);
        setSelectedProfesorName("");
        setSelectedProfesorId("");
        setGeneratedCode(null);
        setExpiresAt(null);
        setCopied(false);
        setTimeLeft(0);
        setStudentSearch("");
        setSelectedStudents([]);
        setIsStudentDropdownOpen(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleGenerate = async () => {
        if (!selectedRole) return;
        if (selectedRole === "professor" && !selectedProfesorId) return;
        if (selectedRole === "parent" && selectedStudents.length === 0) return;

        setIsGenerating(true);
        try {
            const result = await onGenerate(
                selectedRole,
                selectedRole === "professor" ? selectedProfesorId : undefined,
                selectedRole === "parent" ? selectedStudents.map((s) => s.cedula) : undefined
            );
            if (result) {
                setGeneratedCode(result.code);
                setExpiresAt(result.expiresAt);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedCode) return;
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = generatedCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    const addStudent = (student: StudentOption) => {
        setSelectedStudents((prev) => [...prev, student]);
        setStudentSearch("");
    };

    const removeStudent = (cedula: string) => {
        setSelectedStudents((prev) => prev.filter((s) => s.cedula !== cedula));
    };

    if (!isOpen) return null;

    const isGenerateDisabled =
        !selectedRole ||
        (selectedRole === "professor" && !selectedProfesorId) ||
        (selectedRole === "parent" && selectedStudents.length === 0) ||
        isGenerating;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                        Generar Codigo de Registro
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {!generatedCode ? (
                    <>
                        {/* Role Selection */}
                        <div className="mb-6">
                            <label className="mb-3 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                Selecciona el rol
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {roleOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setSelectedRole(opt.value);
                                            if (opt.value !== "professor") {
                                                setSelectedProfesorName("");
                                                setSelectedProfesorId("");
                                            }
                                            if (opt.value !== "parent") {
                                                setSelectedStudents([]);
                                                setStudentSearch("");
                                            }
                                        }}
                                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                                            selectedRole === opt.value
                                                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                                                : "border-[var(--border-light)] dark:border-[var(--border-dark)] hover:border-[var(--primary)]"
                                        }`}
                                    >
                                        <span
                                            className={`material-symbols-outlined text-2xl ${
                                                selectedRole === opt.value
                                                    ? "text-[var(--primary)]"
                                                    : "text-[var(--muted-light)] dark:text-[var(--muted-dark)]"
                                            }`}
                                        >
                                            {opt.icon}
                                        </span>
                                        <span
                                            className={`text-xs font-semibold ${
                                                selectedRole === opt.value
                                                    ? "text-[var(--primary)]"
                                                    : "text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]"
                                            }`}
                                        >
                                            {opt.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Professor Selector */}
                        {selectedRole === "professor" && (
                            <div className="mb-6">
                                <SearchableSelect
                                    label=""
                                    placeholder="Buscar profesor..."
                                    items={availableProfesores.map((p) => p.nombre)}
                                    value={selectedProfesorName}
                                    onChange={(value) => {
                                        const prof = availableProfesores.find((p) => p.nombre === value);
                                        if (prof) {
                                            setSelectedProfesorId(prof.id);
                                            setSelectedProfesorName(prof.nombre);
                                        } else {
                                            setSelectedProfesorId("");
                                            setSelectedProfesorName("");
                                        }
                                    }}
                                />
                                {availableProfesores.length === 0 && (
                                    <p className="mt-2 text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        Todos los profesores ya tienen un usuario vinculado.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Student Multi-Select for Parent */}
                        {selectedRole === "parent" && (
                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                    Selecciona los hijos (estudiantes)
                                </label>

                                {/* Selected students chips */}
                                {selectedStudents.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {selectedStudents.map((s) => (
                                            <span
                                                key={s.cedula}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person</span>
                                                {s.fullName}
                                                <button
                                                    onClick={() => removeStudent(s.cedula)}
                                                    className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>close</span>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Search input */}
                                <div className="relative" ref={studentDropdownRef}>
                                    <div className="relative">
                                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]" style={{ fontSize: "18px" }}>
                                            search
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Buscar por cedula o nombre..."
                                            value={studentSearch}
                                            onChange={(e) => {
                                                setStudentSearch(e.target.value);
                                                setIsStudentDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsStudentDropdownOpen(true)}
                                            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] py-2.5 pl-9 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                                        />
                                    </div>

                                    {/* Dropdown */}
                                    {isStudentDropdownOpen && (
                                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] shadow-lg dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] max-h-48 overflow-y-auto">
                                            {filteredStudents.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                                    {students.length === 0
                                                        ? "No hay estudiantes en este periodo."
                                                        : "No se encontraron estudiantes."}
                                                </div>
                                            ) : (
                                                filteredStudents.slice(0, 50).map((s) => (
                                                    <button
                                                        key={s.cedula}
                                                        onClick={() => {
                                                            addStudent(s);
                                                            setIsStudentDropdownOpen(false);
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                                    >
                                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                                                            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontSize: "16px" }}>person</span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                                                {s.fullName}
                                                            </p>
                                                            <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                                                {s.cedula}{s.grupoNombre ? ` · ${s.grupoNombre}` : ""}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {students.length > 0 && selectedStudents.length === 0 && (
                                    <p className="mt-2 text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        Busca y selecciona los estudiantes que son hijos de este padre.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">key</span>
                                    Generar codigo
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Generated Code Display */}
                        <div className="mb-6 text-center">
                            <p className="mb-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                Codigo generado para <span className="font-semibold">{getRoleLabel(selectedRole!)}</span>
                            </p>

                            {/* OTP-style digits */}
                            <div className="mb-4 flex justify-center gap-2">
                                {generatedCode.split("").map((digit, i) => (
                                    <div
                                        key={i}
                                        className="flex h-14 w-12 items-center justify-center rounded-lg border-2 border-[var(--primary)] bg-[var(--primary)]/5 text-2xl font-bold text-[var(--primary)]"
                                    >
                                        {digit}
                                    </div>
                                ))}
                            </div>

                            {/* Show linked students for parent code */}
                            {selectedRole === "parent" && selectedStudents.length > 0 && (
                                <div className="mb-4 rounded-lg bg-[rgba(15,23,42,0.03)] dark:bg-[rgba(255,255,255,0.03)] p-3 text-left">
                                    <p className="mb-2 text-xs font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                        Estudiantes vinculados:
                                    </p>
                                    {selectedStudents.map((s) => (
                                        <p key={s.cedula} className="text-sm text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                            • {s.fullName} ({s.cedula})
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* Countdown */}
                            <div className={`mb-4 flex items-center justify-center gap-2 text-sm ${
                                timeLeft <= 60 ? "text-red-500" : "text-[var(--muted-light)] dark:text-[var(--muted-dark)]"
                            }`}>
                                <span className="material-symbols-outlined text-base">timer</span>
                                {timeLeft > 0 ? (
                                    <span>Expira en <span className="font-semibold">{formatTime(timeLeft)}</span></span>
                                ) : (
                                    <span className="font-semibold text-red-500">Codigo expirado</span>
                                )}
                            </div>

                            {/* Copy Button */}
                            <button
                                onClick={handleCopy}
                                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                                    copied
                                        ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/20 dark:text-green-400"
                                        : "border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">
                                    {copied ? "check" : "content_copy"}
                                </span>
                                {copied ? "Copiado" : "Copiar codigo"}
                            </button>
                        </div>

                        {/* Generate Another */}
                        <button
                            onClick={resetState}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            Generar otro codigo
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function getRoleLabel(role: string): string {
    switch (role) {
        case "admin": return "Administrador";
        case "professor": return "Profesor";
        case "parent": return "Padre de familia";
        default: return role;
    }
}

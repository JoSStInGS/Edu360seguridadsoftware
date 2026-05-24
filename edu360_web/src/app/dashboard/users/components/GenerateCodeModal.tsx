import { useState, useEffect, useCallback } from "react";
import { Button, ChoiceCardGroup, Modal, MultiSelect, SearchableSelect } from "@/app/components/ui";

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
    { value: "parent", label: "Encargado legal", icon: "family_restroom" },
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

    const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);

    const availableProfesores = profesores.filter(
        (p) => !linkedProfesorIds.has(p.id)
    );
    const studentOptions = students.map((student) => ({
        value: student.cedula,
        label: student.fullName,
        description: `${student.cedula}${student.grupoNombre ? ` · ${student.grupoNombre}` : ""}`,
        icon: "person",
    }));

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
        setSelectedStudents([]);
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

    const isGenerateDisabled =
        !selectedRole ||
        (selectedRole === "professor" && !selectedProfesorId) ||
        (selectedRole === "parent" && selectedStudents.length === 0) ||
        isGenerating;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Generar Codigo de Registro">
                {!generatedCode ? (
                    <>
                        <div className="mb-6">
                            <ChoiceCardGroup
                                label="Selecciona el rol"
                                options={roleOptions}
                                value={selectedRole}
                                onChange={(value) => {
                                    setSelectedRole(value);
                                    if (value !== "professor") {
                                        setSelectedProfesorName("");
                                        setSelectedProfesorId("");
                                    }
                                    if (value !== "parent") {
                                        setSelectedStudents([]);
                                    }
                                }}
                            />
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
                                <MultiSelect
                                    label="Selecciona los hijos (estudiantes)"
                                    placeholder="Buscar por cedula o nombre..."
                                    options={studentOptions}
                                    selectedValues={selectedStudents.map((student) => student.cedula)}
                                    onChange={(values) => {
                                        setSelectedStudents(
                                            values
                                                .map((value) => students.find((student) => student.cedula === value))
                                                .filter((student): student is StudentOption => Boolean(student))
                                        );
                                    }}
                                    emptyMessage="No hay estudiantes en este periodo."
                                    noResultsMessage="No se encontraron estudiantes."
                                    helperText="Busca y selecciona los estudiantes que son hijos de este encargado."
                                />
                            </div>
                        )}

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            loading={isGenerating}
                            loadingText="Generando..."
                            leftIcon={<span className="material-symbols-outlined text-base">key</span>}
                            className="py-2.5 text-sm"
                        >
                            Generar codigo
                        </Button>
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
                            <Button
                                onClick={handleCopy}
                                variant="secondary"
                                leftIcon={
                                    <span className="material-symbols-outlined text-base">
                                        {copied ? "check" : "content_copy"}
                                    </span>
                                }
                                className={`py-2.5 text-sm ${
                                    copied
                                        ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/20 dark:text-green-400"
                                        : ""
                                }`}
                            >
                                {copied ? "Copiado" : "Copiar codigo"}
                            </Button>
                        </div>

                        {/* Generate Another */}
                        <Button
                            onClick={resetState}
                            leftIcon={<span className="material-symbols-outlined text-base">add</span>}
                            className="py-2.5 text-sm"
                        >
                            Generar otro codigo
                        </Button>
                    </>
                )}
        </Modal>
    );
}

function getRoleLabel(role: string): string {
    switch (role) {
        case "admin": return "Administrador";
        case "professor": return "Profesor";
        case "parent": return "Encargado legal";
        default: return role;
    }
}

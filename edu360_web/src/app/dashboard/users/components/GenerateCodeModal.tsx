import { useState, useEffect, useCallback } from "react";
import { SearchableSelect } from "@/app/components/SearchableSelect";

interface Profesor {
    id: string;
    nombre: string;
}

interface GenerateCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    profesores: Profesor[];
    linkedProfesorIds: Set<string>;
    onGenerate: (role: string, profesorId?: string) => Promise<{ code: string; expiresAt: string } | null>;
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

    // Filter out already-linked professors
    const availableProfesores = profesores.filter(
        (p) => !linkedProfesorIds.has(p.id)
    );

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
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleGenerate = async () => {
        if (!selectedRole) return;
        if (selectedRole === "professor" && !selectedProfesorId) return;

        setIsGenerating(true);
        try {
            const result = await onGenerate(
                selectedRole,
                selectedRole === "professor" ? selectedProfesorId : undefined
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
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

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={
                                !selectedRole ||
                                (selectedRole === "professor" && !selectedProfesorId) ||
                                isGenerating
                            }
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

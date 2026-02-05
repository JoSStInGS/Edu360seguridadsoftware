import { TeacherRow } from "../page";

interface TeachersTableProps {
    teachers: TeacherRow[];
    onView: (teacher: TeacherRow) => void;
    onEdit: (teacher: TeacherRow) => void;
}

export default function TeachersTable({
    teachers,
    onView,
    onEdit,
}: TeachersTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    <thead className="bg-[rgba(15,23,42,0.04)] text-xs uppercase text-[var(--muted-light)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[var(--muted-dark)]">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                Nombre Completo
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium">
                                Área / Asignaturas
                            </th>
                            <th scope="col" className="px-6 py-3 font-medium text-center">
                                Cursos Asignados
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
                        {teachers.map((teacher) => (
                            <tr
                                key={teacher.id}
                                className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 hover:bg-[rgba(15,23,42,0.02)] dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.02)]"
                            >
                                {/* Nombre */}
                                <td className="whitespace-nowrap px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-sm">
                                            {getInitials(teacher.fullName)}
                                        </div>
                                        <span>{teacher.fullName}</span>
                                    </div>
                                </td>

                                {/* Asignaturas */}
                                <td className="px-6 py-4">
                                    {teacher.subjects && teacher.subjects.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {teacher.subjects.slice(0, 3).map((subject, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30"
                                                >
                                                    {subject}
                                                </span>
                                            ))}
                                            {teacher.subjects.length > 3 && (
                                                <span
                                                    className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20 cursor-help"
                                                    title={teacher.subjects.slice(3).join(", ")}
                                                >
                                                    +{teacher.subjects.length - 3} más
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                            Sin asignaturas
                                        </span>
                                    )}
                                </td>

                                {/* Cursos asignados */}
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-400/10 dark:text-purple-400">
                                        <span className="material-symbols-outlined text-sm">school</span>
                                        {teacher.coursesCount}
                                    </span>
                                </td>

                                {/* Estado */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(teacher.status)}`}>
                                        {teacher.status}
                                    </span>
                                </td>

                                {/* Acciones */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onView(teacher)}
                                            className="rounded p-1.5 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                            title="Ver horario"
                                        >
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                        <button
                                            onClick={() => onEdit(teacher)}
                                            className="rounded p-1.5 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer con conteo */}
            <div className="border-t border-[var(--border-light)] dark:border-[var(--border-dark)] bg-[rgba(15,23,42,0.02)] dark:bg-[rgba(255,255,255,0.02)] px-6 py-3">
                <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    Mostrando <span className="font-semibold">{teachers.length}</span> profesores
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

function getStatusClasses(status: string): string {
    switch (status) {
        case "Activo":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "Inactivo":
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
        case "Pendiente":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
        case "Incapacitado":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
        case "Ausente":
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
}

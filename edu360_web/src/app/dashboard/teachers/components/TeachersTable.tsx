import { Teacher } from "@/types/teacher";

interface TeachersTableProps {
    teachers: Teacher[];
    onView: (teacher: Teacher) => void;
    onEdit: (teacher: Teacher) => void;
}

export default function TeachersTable({
    teachers,
    onView,
    onEdit,
}: TeachersTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            <table className="w-full text-left text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                <thead className="bg-[rgba(15,23,42,0.04)] text-xs uppercase text-[var(--muted-light)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[var(--muted-dark)]">
                    <tr>
                        <th scope="col" className="px-6 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                            Nombre Completo
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">Correo Institucional</th>
                        <th scope="col" className="px-6 py-3 font-medium">Tipo de Profesor</th>
                        <th scope="col" className="px-6 py-3 font-medium">Área / Materia</th>
                        <th scope="col" className="px-6 py-3 font-medium">Cursos Asignados</th>
                        <th scope="col" className="px-6 py-3 font-medium">Estado</th>
                        <th scope="col" className="px-6 py-3 font-medium">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {teachers.map((teacher) => (
                        <tr
                            key={teacher.id}
                            className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)]"
                        >
                            <td className="whitespace-nowrap px-6 py-4 font-medium">
                                {teacher.firstName} {teacher.lastName1} {teacher.lastName2}
                            </td>
                            <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {teacher.email || "-"}
                            </td>
                            <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {teacher.type}
                            </td>
                            <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {teacher.area}
                            </td>
                            <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {teacher.assignedCourses ?? 0} cursos
                            </td>
                            <td className="px-6 py-4">
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.status === "Activo"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                        : teacher.status === "Inactivo"
                                            ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                            : teacher.status === "Pendiente"
                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                        }`}
                                >
                                    {teacher.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onView(teacher)}
                                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                                        title="Ver"
                                    >
                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                    </button>
                                    <button
                                        onClick={() => onEdit(teacher)}
                                        className="rounded p-1 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
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
    );
}

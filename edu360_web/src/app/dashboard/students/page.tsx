import Link from "next/link";
import { loadStudents } from "@/app/lib/student-storage";

export const dynamic = "force-dynamic";

function formatBirthDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

type StudentsPageProps = {
  searchParams?: {
    center?: string;
    periodo?: string;
  };
};

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const centerName = searchParams?.center?.trim() || "Centro Educativo Principal";
  const periodoLectivo = searchParams?.periodo?.trim() || "2025";
  const { students } = await loadStudents(centerName, periodoLectivo);

  const hasStudents = students.length > 0;
  const activeCount = students.filter(
    (student) => (student.status ?? "Activo") === "Activo",
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 xl:mb-8 flex flex-col gap-2">
        <h2 className="text-3xl font-bold">Estudiantes</h2>
        <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          Centro educativo: <span className="font-semibold">{centerName}</span> · Periodo lectivo: <span className="font-semibold">{periodoLectivo}</span> · Total estudiantes: <span className="font-semibold">{students.length}</span> (Activos: <span className="font-semibold">{activeCount}</span>)
        </p>
      </div>

      <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/students/import"
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-4 py-2 text-sm font-semibold text-[var(--foreground-light)] transition hover:bg-[rgba(15,23,42,0.04)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.06)]"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Importar estudiantes
          </Link>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105">
            <span className="material-symbols-outlined text-base">add</span>
            Crear nuevo estudiante
          </button>
        </div>
      </div>

      <div className="mb-6 xl:mb-8 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {["Año lectivo", "Nivel", "Grupo", "Especialidad", "Estado"].map((label) => (
            <div key={label}>
              <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                {label}
              </label>
              <select className="mt-1 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <option>Todos</option>
              </select>
            </div>
          ))}
        </div>

        <div className="relative mt-6">
          <input
            type="search"
            placeholder="Buscar por nombre o ID"
            className="h-10 w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
          />
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            search
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
        {hasStudents ? (
          <>
            <table className="w-full text-left text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              <thead className="bg-[rgba(15,23,42,0.04)] text-xs uppercase text-[var(--muted-light)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[var(--muted-dark)]">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                    Nombre completo
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Fecha de nacimiento</th>
                  <th scope="col" className="px-6 py-3 font-medium">Nivel</th>
                  <th scope="col" className="px-6 py-3 font-medium">Grupo</th>
                  <th scope="col" className="px-6 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const status = student.status ?? "Activo";
                  return (
                    <tr
                      key={student.id}
                      className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)]"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium">{student.name}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.id}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{formatBirthDate(student.birthDate)}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.level ?? "-"}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.group ?? "-"}</td>
                      <td className="px-6 py-4">
                        {status === "Activo" ? (
                          <span className="rounded-full bg-[rgba(7,136,61,0.15)] px-2 py-1 text-xs font-semibold text-[var(--accent-light)] dark:bg-[rgba(56,161,105,0.25)] dark:text-[var(--accent-dark)]">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-[rgba(107,114,128,0.2)] px-2 py-1 text-xs font-semibold text-[var(--muted-light)] dark:bg-[rgba(107,114,128,0.35)] dark:text-[var(--muted-dark)]">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                          {[
                            { icon: "visibility", label: "Ver" },
                            { icon: "edit", label: "Editar" },
                            { icon: status === "Activo" ? "archive" : "unarchive", label: status === "Activo" ? "Archivar" : "Restaurar" },
                          ].map((action) => (
                            <button
                              key={action.icon}
                              className="rounded-full p-1 transition hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                              aria-label={action.label}
                            >
                              <span className="material-symbols-outlined text-lg">{action.icon}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              <span>
                Mostrando
                <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]"> 1 </span>
                a
                <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]"> {Math.min(students.length, 10)}</span>
                de
                <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]"> {students.length}</span>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { icon: "chevron_left", label: "Anterior" },
                  { label: "1", isActive: true },
                  { label: "2" },
                  { label: "3" },
                  { label: "...", disabled: true },
                  { label: "10" },
                  { icon: "chevron_right", label: "Siguiente" },
                ].map((item) => (
                  <button
                    key={item.label ?? item.icon}
                    className={`rounded-lg px-3 py-1 text-sm font-medium transition ${
                      item.isActive
                        ? "bg-[var(--primary)] text-white"
                        : item.disabled
                          ? "cursor-default text-[var(--muted-light)] dark:text-[var(--muted-dark)]"
                          : "text-[var(--muted-light)] hover:bg-[rgba(15,23,42,0.08)] hover:text-[var(--foreground-light)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                    disabled={item.disabled}
                  >
                    {item.icon ? <span className="material-symbols-outlined text-lg">{item.icon}</span> : item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            <span className="material-symbols-outlined text-4xl text-[var(--primary)]">groups</span>
            <p className="text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              No hay estudiantes registrados para este centro educativo y periodo.
            </p>
            <p>Importe un archivo o cree un estudiante para comenzar.</p>
            <Link
              href="/dashboard/students/import"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Importar estudiantes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";

export default function ImportStudentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8 flex flex-col gap-2">
        <Link href="/dashboard/students" className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver a estudiantes
        </Link>
        <h2 className="text-3xl font-bold">Asistente de Importación de Estudiantes</h2>
        <p className="text-lg text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          Siga los pasos para importar sus estudiantes desde un archivo Excel o CSV.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
        <div className="p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
            <span className="material-symbols-outlined text-5xl text-[var(--primary)]">upload_file</span>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">Proceso de Importación</h3>
              <div className="mt-2 space-y-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                <p>
                  <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">1. Subir archivo:</span> Seleccione el archivo .xlsx, .xls o .csv.
                </p>
                <p>
                  <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">2. Mapear campos:</span> Asigne las columnas de su archivo a los campos de EDU360.
                </p>
                <p>
                  <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">3. Validar datos:</span> Revise y corrija cualquier error en los datos.
                </p>
                <p>
                  <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">4. Confirmar:</span> Finalice el proceso para importar los estudiantes.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">Año lectivo</label>
              <select className="mt-2 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <option>2024-2025</option>
                <option>2023-2024</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">Institución</label>
              <select className="mt-2 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                <option>Centro Educativo Principal</option>
                <option>Centro Educativo Secundario</option>
              </select>
            </div>
          </div>

          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-base font-semibold text-white transition hover:brightness-105">
            <span className="material-symbols-outlined">upload</span>
            Subir archivo
          </button>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)] sm:flex-row sm:justify-center sm:gap-6">
            <Link href="#" className="font-medium text-[var(--primary)] hover:underline">
              Descargar plantilla CSV
            </Link>
            <span className="hidden text-[var(--muted-light)] dark:text-[var(--muted-dark)] sm:inline">|</span>
            <Link href="#" className="font-medium text-[var(--primary)] hover:underline">
              Ver guía de exportación de PIAD
            </Link>
          </div>
        </div>
        <div className="border-t border-[var(--border-light)] bg-[rgba(246,246,248,0.6)] px-6 py-4 text-xs text-[var(--muted-light)] dark:border-[var(--border-dark)] dark:bg-[rgba(17,21,33,0.6)] dark:text-[var(--muted-dark)]">
          Solo se almacenan datos estrictamente necesarios para la operación escolar en EDU360. Fuente: exportación PIAD.
        </div>
      </div>
    </div>
  );
}

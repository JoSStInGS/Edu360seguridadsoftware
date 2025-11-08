export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h2 className="mb-6 text-3xl font-bold">Panel de Control</h2>
      </div>

      <div className="col-span-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {["Estudiantes activos", "Asistencia de hoy", "Importaciones recientes", "Alertas abiertas"].map((title, index) => {
          const stats = [
            { value: "1,234", change: "+5%", changeColor: "text-[var(--accent-light)]", darkChange: "dark:text-[var(--accent-dark)]" },
            { value: "87%", change: "-2%", changeColor: "text-[var(--destructive-light)]", darkChange: "dark:text-[var(--destructive-dark)]" },
            { value: "5", change: "+10%", changeColor: "text-[var(--accent-light)]", darkChange: "dark:text-[var(--accent-dark)]" },
            { value: "2", change: "-1%", changeColor: "text-[var(--destructive-light)]", darkChange: "dark:text-[var(--destructive-dark)]" },
          ];

          const stat = stats[index];

          return (
            <div
              key={title}
              className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
            >
              <p className="mb-1 text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{title}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className={`mt-1 text-sm font-medium ${stat.changeColor} ${stat.darkChange}`}>{stat.change}</p>
            </div>
          );
        })}
      </div>

      <div className="col-span-12">
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <h3 className="mb-4 text-lg font-semibold">Acciones rápidas</h3>
          <div className="flex flex-wrap gap-4">
            <button className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105">
              <span className="material-symbols-outlined text-base">upload</span>
              <span>Importar desde PIAD</span>
            </button>
            {[
              { label: "Crear grupo/sección", icon: "add_circle" },
              { label: "Tomar asistencia", icon: "checklist" },
              { label: "Descargar plantilla CSV", icon: "download" },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-2 rounded-lg bg-[rgba(21,53,147,0.12)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[rgba(21,53,147,0.2)] dark:bg-[rgba(21,53,147,0.2)] dark:hover:bg-[rgba(21,53,147,0.3)]"
              >
                <span className="material-symbols-outlined text-base">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7">
        <div className="h-full rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Estado de importaciones PIAD</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              <span>Última corrida: 2024-03-15</span>
              <button className="font-semibold text-[var(--primary)] hover:underline">Ver historial</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-light)] text-[var(--muted-light)] dark:border-[var(--border-dark)] dark:text-[var(--muted-dark)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    date: "2024-03-15 10:00",
                    status: "Completado",
                    statusClasses: "bg-[rgba(7,136,61,0.12)] text-[var(--accent-light)] dark:bg-[rgba(56,161,105,0.2)] dark:text-[var(--accent-dark)]",
                    message: "Importación exitosa",
                  },
                  {
                    date: "2024-03-14 14:30",
                    status: "En progreso",
                    statusClasses: "bg-[rgba(21,53,147,0.12)] text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]",
                    message: "Importando datos...",
                  },
                  {
                    date: "2024-03-13 09:15",
                    status: "Error",
                    statusClasses: "bg-[rgba(231,60,8,0.12)] text-[var(--destructive-light)] dark:bg-[rgba(229,62,62,0.2)] dark:text-[var(--destructive-dark)]",
                    message: "Error en la importación",
                  },
                ].map((row) => (
                  <tr key={row.date} className="border-b border-[var(--border-light)] last:border-0 dark:border-[var(--border-dark)]">
                    <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{row.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.statusClasses}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="h-full rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <h3 className="mb-4 text-lg font-semibold">Conflictos y datos por revisar</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p>Datos de estudiantes</p>
              <span className="font-bold text-[var(--destructive-light)] dark:text-[var(--destructive-dark)]">5</span>
            </div>
            <div className="flex items-center justify-between">
              <p>Datos de grupos/secciones</p>
              <span className="font-bold text-[var(--destructive-light)] dark:text-[var(--destructive-dark)]">2</span>
            </div>
          </div>
          <button className="mt-6 w-full rounded-lg bg-[rgba(21,53,147,0.12)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[rgba(21,53,147,0.2)] dark:bg-[rgba(21,53,147,0.2)] dark:hover:bg-[rgba(21,53,147,0.3)]">
            Revisar
          </button>
        </div>
      </div>

      <div className="col-span-12 xl:col-span-8">
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Asistencia de hoy</h3>
            <div className="flex gap-2">
              <button className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white">Todos</button>
              {['Grupo A', 'Grupo B'].map((group) => (
                <button
                  key={group}
                  className="rounded-lg bg-[rgba(21,53,147,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[rgba(21,53,147,0.2)] dark:bg-[rgba(21,53,147,0.2)] dark:hover:bg-[rgba(21,53,147,0.3)]"
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          <div className="grid h-48 grid-cols-5 items-end gap-6 px-4">
            {[
              { label: "Grupo A", height: "50%" },
              { label: "Grupo B", height: "10%" },
              { label: "Grupo C", height: "70%" },
              { label: "Grupo D", height: "70%" },
              { label: "Grupo E", height: "50%" },
            ].map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-lg bg-[rgba(21,53,147,0.2)] dark:bg-[rgba(21,53,147,0.3)]"
                  style={{ height: bar.height }}
                />
                <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{bar.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-12 xl:col-span-4">
        <div className="h-full rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <h3 className="mb-4 text-lg font-semibold">Especialidades (niveles sup.)</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p>Pendientes de revisión</p>
              <span className="font-bold text-[var(--primary)]">10</span>
            </div>
            <div className="flex items-center justify-between">
              <p>Revisados</p>
              <span className="font-bold text-[var(--muted-light)] dark:text-[var(--muted-dark)]">25</span>
            </div>
          </div>
          <button className="mt-6 w-full rounded-lg bg-[rgba(21,53,147,0.12)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[rgba(21,53,147,0.2)] dark:bg-[rgba(21,53,147,0.2)] dark:hover:bg-[rgba(21,53,147,0.3)]">
            Ver detalles
          </button>
        </div>
      </div>

      <div className="col-span-12 mt-4 text-center text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
        <p>
          Los datos mostrados están minimizados para una mejor visualización. Para ver detalles completos, consulte los reportes específicos.
        </p>
        <p className="mt-1">Versión de la plataforma: 1.2.3</p>
      </div>
    </div>
  );
}

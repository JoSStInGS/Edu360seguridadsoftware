'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/hooks/useAuth";

type Student = {
  id: string;
  ced: string;
  name: string;
  lastName1: string;
  lastName2: string;
  birthdate?: string;
  level?: string;
  secction?: string;
  status?: string;
  specialty?: string;
};

function calculateAge(birthdate?: string) {
  if (!birthdate) return "-";

  let birth: Date;

  // Check for DD/MM/YYYY format (e.g., 28/09/2012)
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = birthdate.match(ddmmyyyy);

  if (match) {
    // Note: Month is 0-indexed in Date constructor
    birth = new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
  } else {
    // Fallback to standard parsing
    birth = new Date(birthdate);
  }

  if (Number.isNaN(birth.getTime())) return "-";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function StudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/students", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }

        const data = await response.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    if (!authLoading) {
      if (user) {
        fetchStudents();
      } else {
        setLoadingData(false);
      }
    }
  }, [user, authLoading]);

  if (authLoading || loadingData) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
      </div>
    );
  }

  const hasStudents = students.length > 0;
  const activeCount = students.filter(
    (student) => (student.status ?? "Activo") === "Activo",
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Estudiantes</h2>
          <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            Periodo lectivo: <span className="font-semibold">2025</span> · Total estudiantes: <span className="font-semibold">{students.length}</span> (Activos: <span className="font-semibold">{activeCount}</span>)
          </p>
        </div>
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
                    Cedula
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                    Nombre completo
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">Edad</th>
                  <th scope="col" className="px-6 py-3 font-medium">Seccion</th>
                  <th scope="col" className="px-6 py-3 font-medium">Especialidad</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  return (
                    <tr
                      key={student.id}
                      className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)]"
                    >
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.ced}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">{`${student.name} ${student.lastName1} ${student.lastName2}`}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{calculateAge(student.birthdate)}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.secction ?? "-"}</td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">{student.specialty ?? "-"}</td>
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
                    className={`rounded-lg px-3 py-1 text-sm font-medium transition ${item.isActive
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
              No hay estudiantes cargados en el sistema.
            </p>
            <p>Por favor, contacte al administrador o importe una lista de estudiantes.</p>
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

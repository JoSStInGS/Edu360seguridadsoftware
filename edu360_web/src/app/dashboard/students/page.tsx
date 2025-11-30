'use client'

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/hooks/useAuth";
import CustomSelect from "@/app/components/CustomSelect";
import { usePeriodStore } from "@/app/stores/usePeriodStore";

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
  const { selectedPeriod } = usePeriodStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const cursors = useRef<Record<number, string | null>>({ 1: null });
  const [hasMore, setHasMore] = useState(true);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
    cursors.current = { 1: null };
    setHasMore(true);
  }, [debouncedSearch]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;

      setLoadingData(true);
      try {
        const token = await user.getIdToken();

        // Construct URL with pagination and search params
        const url = new URL("/api/students", window.location.origin);
        url.searchParams.set("limit", "10");
        if (selectedPeriod) {
          url.searchParams.set("period", selectedPeriod);
        }

        if (debouncedSearch) {
          url.searchParams.set("search", debouncedSearch);
        }

        const currentCursor = cursors.current[page];
        if (currentCursor) {
          url.searchParams.set("lastVisibleId", currentCursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }

        const data = await response.json();
        setStudents(data.students || []);

        // Update cursor for the next page
        // Update cursor for the next page
        if (data.lastVisibleId) {
          cursors.current = { ...cursors.current, [page + 1]: data.lastVisibleId };
          setHasMore(true);
        } else {
          setHasMore(false);
        }

        // If we got fewer than 10 items, there are no more pages
        if (data.students.length < 10) {
          setHasMore(false);
        }

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
  }, [user, authLoading, page, debouncedSearch, selectedPeriod]); // Re-fetch when page or search changes

  if (authLoading || loadingData && students.length === 0) { // Show loading only on initial load or if no data
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
      </div>
    );
  }

  const hasStudents = students.length > 0;

  const handlePrevPage = () => {
    setPage(p => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 xl:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Estudiantes</h2>
          <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            Periodo lectivo: <span className="font-semibold">{selectedPeriod || "Cargando..."}</span>
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
          {["Nivel", "Grupo", "Especialidad"].map((label) => (
            <div key={label}>
              <label className="text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                {label}
              </label>
              <CustomSelect
                availableKeys={["Todos"]}
                value="Todos"
                onChange={() => { }}
                className="mt-1"
                triggerClassName="w-full h-10 rounded-lg !border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 !text-sm text-[var(--foreground-light)] focus:!border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:!border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]"
                dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
              />
            </div>
          ))}

          <div className="xl:col-span-2">
            <label className="text-sm font-medium text-transparent select-none">
              Búsqueda
            </label>
            <div className="relative mt-1">
              <input
                type="search"
                placeholder="Buscar por nombre o ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] pl-10 pr-4 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
              />
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                search
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
        {loadingData && students.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
          </div>
        )}
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
                Página <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">{page}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium transition ${page === 1
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                  Anterior
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium transition ${!hasMore
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                >
                  Siguiente
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            <span className="material-symbols-outlined text-4xl text-[var(--primary)]">groups</span>
            <p className="text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              {debouncedSearch ? "No se encontraron estudiantes con ese criterio." : "No hay estudiantes cargados en el sistema."}
            </p>
            {!debouncedSearch && (
              <>
                <p>Por favor, contacte al administrador o importe una lista de estudiantes.</p>
                <Link
                  href="/dashboard/students/import"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Importar estudiantes
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

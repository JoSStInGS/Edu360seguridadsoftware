'use client'

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePeriodStore } from "@/app/stores/usePeriodStore";

type Student = {
  id: string;
  cedula: string;
  name: string | null;
  lastName1: string | null;
  lastName2: string | null;
  fullName: string | null;
  birthdate: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  specialty: string | null;
};

function calculateAge(birthdate?: string | null) {
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
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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
      if (!user || !selectedPeriod) return;

      setLoadingData(true);
      try {
        const token = await user.getIdToken();

        // Construct URL with pagination and search params
        const url = new URL("/api/students", window.location.origin);
        url.searchParams.set("limit", "10");
        url.searchParams.set("period", selectedPeriod);

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
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error:", response.status, errorData);
          throw new Error(errorData.error || "Failed to fetch students");
        }

        const data = await response.json();
        setStudents(data.students || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 0);

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

    if (!authLoading && selectedPeriod) {
      if (user) {
        fetchStudents();
      } else {
        setLoadingData(false);
      }
    }
  }, [user, authLoading, page, debouncedSearch, selectedPeriod]);

  if (authLoading || loadingData && students.length === 0) {
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

  const handleGoToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
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
              <Select value="Todos" onValueChange={() => {}}>
                <SelectTrigger className="mt-1 w-full h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="xl:col-span-2">
            <label className="text-sm font-medium text-transparent select-none">
              Busqueda
            </label>
            <div className="relative mt-1">
              <input
                type="search"
                placeholder="Buscar por nombre o cedula"
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
                  <th scope="col" className="px-6 py-3 font-medium">Grupo</th>
                  <th scope="col" className="px-6 py-3 font-medium">Especialidad</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const displayName = student.fullName ||
                    [student.name, student.lastName1, student.lastName2].filter(Boolean).join(" ") ||
                    "-";

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-[var(--border-light)] bg-transparent text-[var(--foreground-light)] last:border-0 dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)]"
                    >
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {student.cedula || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">
                        {displayName}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {calculateAge(student.birthdate)}
                      </td>
                      <td className="px-6 py-4">
                        {student.grupoNombre ? (
                          <span className="inline-flex items-center rounded-full bg-[rgba(21,53,147,0.1)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]">
                            {student.grupoNombre}
                          </span>
                        ) : (
                          <span className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {student.specialty || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border-light)] px-6 py-4 text-sm dark:border-[var(--border-dark)] sm:flex-row">
              <span className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                Mostrando <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">{students.length}</span> de{" "}
                <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">{totalCount}</span> estudiantes
                {totalPages > 0 && (
                  <span className="ml-2">
                    (Pagina {page} de {totalPages})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {/* First page button */}
                <button
                  onClick={() => handleGoToPage(1)}
                  disabled={page === 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${page === 1
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] text-[var(--muted-light)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:text-[var(--muted-dark)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                  title="Primera pagina"
                >
                  <span className="material-symbols-outlined text-lg">first_page</span>
                </button>

                {/* Previous button */}
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${page === 1
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] text-[var(--muted-light)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:text-[var(--muted-dark)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                  title="Pagina anterior"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => handleGoToPage(pageNum as number)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${page === pageNum
                          ? "bg-[var(--primary)] text-white"
                          : "hover:bg-[rgba(15,23,42,0.08)] text-[var(--muted-light)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:text-[var(--muted-dark)] dark:hover:text-[var(--foreground-dark)]"
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || page >= totalPages}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${!hasMore || page >= totalPages
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] text-[var(--muted-light)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:text-[var(--muted-dark)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                  title="Pagina siguiente"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>

                {/* Last page button */}
                <button
                  onClick={() => handleGoToPage(totalPages)}
                  disabled={page >= totalPages}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${page >= totalPages
                    ? "cursor-default opacity-50"
                    : "hover:bg-[rgba(15,23,42,0.08)] text-[var(--muted-light)] hover:text-[var(--foreground-light)] dark:hover:bg-[rgba(255,255,255,0.08)] dark:text-[var(--muted-dark)] dark:hover:text-[var(--foreground-dark)]"
                    }`}
                  title="Ultima pagina"
                >
                  <span className="material-symbols-outlined text-lg">last_page</span>
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

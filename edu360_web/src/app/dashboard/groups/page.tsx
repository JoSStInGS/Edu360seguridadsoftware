"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Group = {
  id: string;
  nombre: string;
  nombreCorto?: string;
  hasDivisions?: boolean;
};

type Student = {
  cedula: string;
  name: string | null;
  lastName1: string | null;
  lastName2: string | null;
  fullName: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  specialty: string | null;
  birthdate: string | null;
};

export default function GroupsPage() {
  const { user } = useAuth();
  const { selectedPeriod } = usePeriodStore();
  const [centerId, setCenterId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [hasNoGroups, setHasNoGroups] = useState(false);

  // Fetch user's centerId
  useEffect(() => {
    const fetchCenterId = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCenterId(userDoc.data().centerId || null);
        }
      } catch (error) {
        console.error("Error fetching centerId:", error);
      }
    };
    fetchCenterId();
  }, [user]);

  // Fetch groups when centerId and period are available
  useEffect(() => {
    const fetchGroups = async () => {
      if (!centerId || !selectedPeriod) {
        setIsLoadingGroups(false);
        return;
      }

      setIsLoadingGroups(true);
      try {
        const gruposRef = collection(db, `centers/${centerId}/periods/${selectedPeriod}/grupos`);
        const gruposSnapshot = await getDocs(query(gruposRef, orderBy("nombre")));

        if (gruposSnapshot.empty) {
          setHasNoGroups(true);
          setGroups([]);
        } else {
          setHasNoGroups(false);
          const groupsData = gruposSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre || doc.id,
            nombreCorto: doc.data().nombreCorto,
            hasDivisions: doc.data().hasDivisions || false,
          }));
          setGroups(groupsData);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [centerId, selectedPeriod]);

  // Fetch students when group selection changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!centerId || !selectedPeriod) {
        return;
      }

      setIsLoadingStudents(true);
      try {
        const studentsRef = collection(db, `centers/${centerId}/periods/${selectedPeriod}/students`);
        let studentsQuery;

        if (selectedGroup === "all") {
          studentsQuery = query(studentsRef);
        } else if (selectedGroup === "unassigned") {
          studentsQuery = query(studentsRef, where("grupoId", "==", null));
        } else {
          studentsQuery = query(studentsRef, where("grupoId", "==", selectedGroup));
        }

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            cedula: data.cedula || doc.id,
            name: data.name || null,
            lastName1: data.lastName1 || null,
            lastName2: data.lastName2 || null,
            fullName: data.fullName || null,
            grupoId: data.grupoId || null,
            grupoNombre: data.grupoNombre || null,
            specialty: data.specialty || null,
            birthdate: data.birthdate || null,
          };
        });

        // Sort students by fullName
        studentsData.sort((a, b) => {
          const nameA = (a.fullName || "").toLowerCase();
          const nameB = (b.fullName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [centerId, selectedPeriod, selectedGroup]);

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) {
      return students;
    }

    const term = searchTerm.toLowerCase();
    return students.filter(student => {
      const fullName = (student.fullName || "").toLowerCase();
      const cedula = (student.cedula || "").toLowerCase();
      const grupo = (student.grupoNombre || "").toLowerCase();
      return fullName.includes(term) || cedula.includes(term) || grupo.includes(term);
    });
  }, [students, searchTerm]);

  // Count students by group status
  const studentCounts = useMemo(() => {
    const total = students.length;
    const unassigned = students.filter(s => !s.grupoId).length;
    return { total, unassigned };
  }, [students]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] 2xl:text-3xl">
          Grupos y Secciones
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          Visualiza los estudiantes organizados por grupo o sección.
        </p>
      </div>

      {isLoadingGroups ? (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-4xl text-[var(--primary)]">progress_activity</span>
            <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Cargando grupos...</p>
          </div>
        </div>
      ) : hasNoGroups ? (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-12 text-center dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">groups_off</span>
            <h3 className="text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              No hay grupos registrados
            </h3>
            <p className="max-w-md text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              Para ver estudiantes organizados por grupo, primero debe importar los horarios desde el menú de Horarios.
              Los grupos se crean automaticamente al importar los horarios.
            </p>
            <a
              href="/dashboard/schedules/import"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:brightness-110"
            >
              <span className="material-symbols-outlined">upload_file</span>
              Importar horarios
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-4 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Grupo:
                </label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    <SelectItem value="unassigned">Sin grupo asignado</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                search
              </span>
              <input
                type="search"
                placeholder="Buscar por nombre o cedula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-4 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
              <p className="text-2xl font-bold text-[var(--primary)]">{groups.length}</p>
              <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Grupos</p>
            </div>
            <div className="rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-4 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
              <p className="text-2xl font-bold text-[var(--primary)]">{filteredStudents.length}</p>
              <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Estudiantes mostrados</p>
            </div>
            <div className="rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-4 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
              <p className="text-2xl font-bold text-[var(--primary)]">{studentCounts.total}</p>
              <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Total en filtro</p>
            </div>
            <div className="rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-4 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
              <p className="text-2xl font-bold" style={{ color: studentCounts.unassigned > 0 ? "#e73c08" : "#16A34A" }}>
                {studentCounts.unassigned}
              </p>
              <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Sin grupo</p>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-[var(--primary)]">progress_activity</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">person_off</span>
                <p className="mt-4 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                  {searchTerm
                    ? "No se encontraron estudiantes con ese criterio de busqueda."
                    : "No hay estudiantes en este grupo."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                  <thead className="bg-[var(--background-light)] dark:bg-[var(--background-dark)]">
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                      <th scope="col" className="px-6 py-3 font-semibold">#</th>
                      <th scope="col" className="px-6 py-3 font-semibold">Cedula</th>
                      <th scope="col" className="px-6 py-3 font-semibold">Nombre completo</th>
                      <th scope="col" className="px-6 py-3 font-semibold">Grupo</th>
                      <th scope="col" className="px-6 py-3 font-semibold">Especialidad</th>
                      <th scope="col" className="px-6 py-3 font-semibold">Fecha de nacimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.cedula} className="hover:bg-[rgba(21,53,147,0.04)] dark:hover:bg-[rgba(21,53,147,0.08)]">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                          {student.cedula}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                          {student.fullName || `${student.name || ""} ${student.lastName1 || ""} ${student.lastName2 || ""}`.trim() || "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {student.grupoNombre ? (
                            <span className="inline-flex items-center rounded-full bg-[rgba(21,53,147,0.1)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]">
                              {student.grupoNombre}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                          {student.specialty || "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                          {student.birthdate || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import CustomSelect from "@/app/components/CustomSelect";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { usePeriodStore } from "@/app/stores/usePeriodStore";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ParsedTable = {
  headerRow: string[];
  dataRows: string[][];
};

type FieldMapping = {
  label: string;
  required?: boolean;
};

const FIELD_MAPPINGS: FieldMapping[] = [
  {
    label: "Cédula",
    required: true,
  },
  {
    label: "Nombre",
    required: true,
  },
  {
    label: "Primer apellido",
    required: true,
  },
  { label: "Segundo apellido" },
  { label: "Sección" },
  { label: "Especialidad" },
  { label: "Fecha de nacimiento" },
];

const COLUMN_PLACEHOLDER = "Selecciona una columna";

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function detectDelimiter(line: string) {
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const tabCount = (line.match(/\t/g) ?? []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    return ";";
  }

  if (tabCount > commaCount) {
    return "\t";
  }

  return ",";
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

async function parseCsvFile(file: File): Promise<ParsedTable | null> {
  const fileContent = await file.text();
  const lines = fileContent.split(/\r?\n/);

  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }

  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }

  if (lines.length === 0) {
    return null;
  }

  const delimiter = detectDelimiter(lines[0]);
  const parsedRows = lines
    .map((line) => parseDelimitedLine(line, delimiter))
    .map((row) => row.map((cell) => cell.trim()));

  if (parsedRows.length === 0) {
    return null;
  }

  const [headerRow, ...dataRows] = parsedRows;

  if (!headerRow || headerRow.every((cell) => cell.length === 0)) {
    return null;
  }

  const filteredDataRows = dataRows.filter((row) =>
    row.some((cell) => cell.length > 0)
  );

  return { headerRow, dataRows: filteredDataRows };
}

export default function ImportStudentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [fieldSelections, setFieldSelections] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const { user } = useAuth();
  const { periods, isLoading: periodsLoading } = usePeriodStore();
  const [periodoLectivo, setPeriodoLectivo] = useState<string>("");
  const [centerName, setCenterName] = useState<string>("Cargando...");
  const [phase, setPhase] = useState<"mapping" | "processing" | "success">("mapping");

  // Calculate available options
  const currentYear = new Date().getFullYear().toString();
  const createOption = `Crear nuevo año lectivo ${currentYear}`;

  const periodOptions = periodsLoading
    ? ["Cargando..."]
    : periods.includes(currentYear)
      ? periods
      : [createOption, ...periods];

  if (!periodsLoading && periodOptions.length === 0) {
    periodOptions.push("Sin periodos");
  }

  useEffect(() => {
    if (!periodsLoading && !periodoLectivo) {
      if (periods.includes(currentYear)) {
        setPeriodoLectivo(currentYear);
      } else if (periodOptions.includes(createOption)) {
        // Default to creating new year if current doesn't exist
        setPeriodoLectivo(currentYear);
      } else if (periods.length > 0) {
        setPeriodoLectivo(periods[0]);
      }
    }
  }, [periods, periodsLoading, periodoLectivo, currentYear, createOption, periodOptions]);

  useEffect(() => {
    const fetchCenterName = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Assuming the center name is stored in the user profile or we need to fetch it from the center doc
          // The user mentioned "centerName" in the profile in the prompt description (image)
          // Let's check if it's there, otherwise fetch from centers collection
          if (userData.centerName) {
            setCenterName(userData.centerName);
          } else if (userData.centerId) {
            const centerDoc = await getDoc(doc(db, "centers", userData.centerId));
            if (centerDoc.exists()) {
              setCenterName(centerDoc.data().name || "Centro Desconocido");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching center name:", error);
        setCenterName("Error al cargar centro");
      }
    };
    fetchCenterName();
  }, [user]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    setSelectedFile(file ?? null);
    setFieldSelections({});
    setDataRows([]);
    setImportFeedback(null);
    setImportError(null);

    if (!file) {
      setColumnHeaders([]);
      return;
    }

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension !== "csv") {
        console.warn("Formato de archivo no soportado. Utilice archivos CSV.");
        setColumnHeaders([]);
        setDataRows([]);
        setImportError("Formato de archivo no soportado. Utiliza un archivo CSV.");
        return;
      }

      const parsedTable = await parseCsvFile(file);

      if (!parsedTable) {
        setColumnHeaders([]);
        setDataRows([]);
        setImportError(
          "No se pudieron leer las columnas del archivo importado. Verifica el contenido.",
        );
        return;
      }

      setColumnHeaders(parsedTable.headerRow);
      setDataRows(parsedTable.dataRows);
    } catch (error) {
      console.error(
        "No se pudieron leer las columnas del archivo importado",
        error
      );
      setColumnHeaders([]);
      setDataRows([]);
      setImportError(
        "Ocurrió un error al leer el archivo seleccionado. Intenta nuevamente.",
      );
    }
  };

  const handleResetSelection = () => {
    setSelectedFile(null);
    setColumnHeaders([]);
    setDataRows([]);
    setFieldSelections({});
    setImportFeedback(null);
    setImportError(null);
    setPhase("mapping");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFieldSelectionChange = (fieldLabel: string, value: string) => {
    setImportFeedback(null);
    setImportError(null);
    setFieldSelections((previousSelections) => {
      if (value === COLUMN_PLACEHOLDER) {
        const updatedSelections = { ...previousSelections };
        delete updatedSelections[fieldLabel];
        return updatedSelections;
      }

      return {
        ...previousSelections,
        [fieldLabel]: value,
      };
    });
  };

  const getPreviewForField = (field: FieldMapping) => {
    const selectedColumn = fieldSelections[field.label];

    if (!selectedColumn) {
      return "Selecciona una columna para ver la vista previa";
    }

    const columnIndex = columnHeaders.indexOf(selectedColumn);

    if (columnIndex === -1) {
      return "Selecciona una columna para ver la vista previa";
    }

    const previewValues = dataRows
      .map((row) => row[columnIndex] ?? "")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (previewValues.length === 0) {
      return "Sin datos disponibles en la columna seleccionada";
    }

    return previewValues[0];
  };

  const handleImportData = async () => {
    if (!selectedFile) {
      return;
    }

    const missingRequiredFields = FIELD_MAPPINGS.filter(
      (field) => field.required && !fieldSelections[field.label],
    );

    if (missingRequiredFields.length > 0) {
      setImportFeedback(null);
      setImportError(
        `Asigna columnas para los campos obligatorios: ${missingRequiredFields
          .map((field) => field.label)
          .join(", ")}.`,
      );
      return;
    }

    setImportFeedback(null);
    setImportError(null);
    setIsImporting(true);
    setPhase("processing");

    const columnMappings = FIELD_MAPPINGS.map((field) => ({
      field: field.label,
      column: fieldSelections[field.label] ?? null,
      required: Boolean(field.required),
    }));

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("mappings", JSON.stringify(columnMappings));
    formData.append("centerName", centerName);
    formData.append("periodoLectivo", periodoLectivo);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Fallo al subir el archivo");
      }
      setImportFeedback("Datos enviados...");
      setPhase("success");
    } catch (error) {
      console.error("Error durante importación:", error);
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la importación. Inténtalo de nuevo.";
      setImportError(message);
      setPhase("mapping");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl 2xl:max-w-6xl">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex text-[var(--primary)]">
          <span className="material-symbols-outlined mr-1">arrow_back</span>
          <Link
            href="/dashboard/students"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            Volver a estudiantes
          </Link>
        </div>
        <h2 className="text-2xl font-bold 2xl:text-3xl">
          Asistente de Importación de Estudiantes
        </h2>
        <p className="text-lg text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          Siga los pasos para importar sus estudiantes desde un archivo CSV.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {!selectedFile && phase === "mapping" && (
        <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <span className="material-symbols-outlined text-5xl text-[var(--primary)]">
                upload_file
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Proceso de Importación
                </h3>
                <div className="mt-2 space-y-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                  <p>
                    <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      1. Subir archivo:
                    </span>{" "}
                    Seleccione el archivo .csv.
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      2. Mapear campos:
                    </span>{" "}
                    Asigne las columnas de su archivo a los campos de EDU360.
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      3. Validar datos:
                    </span>{" "}
                    Revise y corrija cualquier error en los datos.
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      4. Confirmar:
                    </span>{" "}
                    Finalice el proceso para importar los estudiantes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Año lectivo
                </label>
                <CustomSelect
                  availableKeys={periodOptions}
                  value={periodoLectivo || "Seleccione un periodo"}
                  onChange={(value) => {
                    if (value === createOption) {
                      setPeriodoLectivo(currentYear);
                    } else {
                      setPeriodoLectivo(value);
                    }
                  }}
                  triggerClassName="mt-2 w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                  dropdownClassName="bg-[var(--card-light)] dark:bg-[var(--card-dark)] border-[var(--border-light)] dark:border-[var(--border-dark)]"
                  optionClassName="text-[var(--foreground-light)] dark:text-[var(--foreground-dark)] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Institución
                </label>
                <div className="mt-2 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] px-3 py-2 text-sm text-[var(--muted-light)] dark:border-[var(--border-dark)] dark:bg-[var(--background-dark)] dark:text-[var(--muted-dark)]">
                  {centerName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUploadClick}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-base font-semibold text-white transition hover:brightness-105"
            >
              <span className="material-symbols-outlined">upload</span>
              Subir archivo
            </button>

            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)] sm:flex-row sm:justify-center sm:gap-6">
              <Link
                href="#"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Descargar plantilla CSV
              </Link>
              <span className="hidden text-[var(--muted-light)] dark:text-[var(--muted-dark)] sm:inline">
                |
              </span>
              <Link
                href="#"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Ver guía de exportación de PIAD
              </Link>
            </div>
          </div>
          <div className="border-t border-[var(--border-light)] bg-[rgba(246,246,248,0.6)] px-6 py-4 text-xs text-[var(--muted-light)] dark:border-[var(--border-dark)] dark:bg-[rgba(17,21,33,0.6)] dark:text-[var(--muted-dark)]">
            Solo se almacenan datos estrictamente necesarios para la operación
            escolar en EDU360. Fuente: exportación PIAD.
          </div>
        </div>
      )}

      {selectedFile && phase === "mapping" && (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="space-y-6 border-b border-[var(--border-light)] px-6 py-6 dark:border-[var(--border-dark)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Mapeo de columnas
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                  Asigna las columnas del archivo a los campos requeridos en
                  EDU360 antes de validar la información.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[rgba(21,53,147,0.08)] px-4 py-3 text-sm text-[var(--primary)] dark:bg-[rgba(21,53,147,0.15)]">
                <span className="material-symbols-outlined text-base">
                  description
                </span>
                <div className="flex flex-col text-left">
                  <span className="font-semibold">{selectedFile.name}</span>
                  <span className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
              <thead className="bg-[var(--background-light)] text-[var(--muted-light)] dark:bg-[var(--background-dark)] dark:text-[var(--muted-dark)]">
                <tr className="text-left text-xs uppercase tracking-wide">
                  <th scope="col" className="w-1/3 px-6 py-3 font-semibold">
                    Campos en EDU360
                  </th>
                  <th scope="col" className="w-1/3 px-6 py-3 font-semibold">
                    Encabezados del archivo
                  </th>
                  <th scope="col" className="w-1/3 px-6 py-3 font-semibold">
                    Vista previa de datos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
                {FIELD_MAPPINGS.map((field) => (
                  <tr key={field.label}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-[var(--destructive-light)]">
                          *
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-sm">
                        <CustomSelect
                          availableKeys={[COLUMN_PLACEHOLDER, ...columnHeaders]}
                          value={
                            fieldSelections[field.label] ?? COLUMN_PLACEHOLDER
                          }
                          onChange={(value) =>
                            handleFieldSelectionChange(field.label, value)
                          }
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                      {getPreviewForField(field)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border-light)] bg-[var(--background-light)] px-6 py-4 text-sm dark:border-[var(--border-dark)] dark:bg-[rgba(17,21,33,0.7)] md:flex-row md:items-center md:justify-between">
            {(importError || importFeedback) && (
              <p
                className={`font-medium ${importError
                  ? "text-[var(--destructive-light)]"
                  : "text-[var(--primary)]"
                  }`}
              >
                {importError ?? importFeedback}
              </p>
            )}
            <div className="flex flex-col gap-3 md:ml-auto md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleResetSelection}
                disabled={isImporting}
                className="rounded-lg border border-[var(--border-light)] px-4 py-2 font-semibold text-[var(--muted-light)] transition hover:bg-[rgba(21,53,147,0.08)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[var(--border-dark)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.15)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportData}
                disabled={isImporting}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-base">
                  {isImporting ? "hourglass_top" : "cloud_upload"}
                </span>
                {isImporting ? "Enviando datos..." : "Importar datos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div className="rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-8 text-center shadow-lg transition-all dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-2xl font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              Validando y limpiando datos...
            </h2>
            <div className="w-full max-w-md">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.12)]">
                <div className="h-full w-3/4 animate-pulse rounded-full bg-[var(--primary)]" style={{ animationDuration: "2s" }} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                Analizando {dataRows.length} filas...
              </p>
            </div>
            <p className="text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              Este proceso puede tardar unos segundos. Por favor, no cierres esta ventana.
            </p>
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-8 text-center shadow-lg transition-all dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined" style={{ fontSize: "72px", color: "#16A34A" }}>check_circle</span>
            <h2 className="text-3xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">¡Importación completada!</h2>
            <p className="max-w-md text-lg text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              El archivo ha sido procesado y los estudiantes han sido agregados a la plataforma.
            </p>
            <div className="mt-4 w-full max-w-lg">
              <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(22,163,74,0.2)" }}>
                <div className="h-full w-full rounded-full" style={{ backgroundColor: "#16A34A" }} />
              </div>
              <p className="mt-2 text-sm font-medium" style={{ color: "#16A34A" }}>100% completado</p>
            </div>
            <div className="mt-6 flex flex-col gap-4 divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)] sm:flex-row sm:divide-x sm:divide-y-0">
              <div className="px-6 py-2 text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">125</p>
                <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Nuevos estudiantes creados</p>
              </div>
              <div className="px-6 py-2 text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">25</p>
                <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Estudiantes actualizados</p>
              </div>
              <div className="px-6 py-2 text-center">
                <p className="text-2xl font-bold" style={{ color: "#e73c08" }}>0</p>
                <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">Registros con errores</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
              Resultado de la importación desde el archivo <strong>{selectedFile?.name}</strong>.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="/dashboard/students" className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-base font-semibold text-white shadow-sm hover:brightness-110">
                <span className="material-symbols-outlined">group</span>
                Ver estudiantes
              </a>
              <button
                type="button"
                onClick={handleResetSelection}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-light)] bg-transparent px-6 py-3 text-base font-semibold text-[var(--foreground-light)] hover:bg-[rgba(21,53,147,0.06)] dark:border-[var(--border-dark)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(21,53,147,0.12)]"
              >
                <span className="material-symbols-outlined">upload_file</span>
                Nueva importación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

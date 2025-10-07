"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import CustomSelect from "@/app/components/CustomSelect";

type FieldMapping = {
  label: string;
  required?: boolean;
  sample: string;
  options: string[];
};

const FIELD_MAPPINGS: FieldMapping[] = [
  {
    label: "Cédula",
    required: true,
    sample: "12345678A, 98765432B, 11223344C...",
    options: [
      "Selecciona una columna",
      "cedula",
      "documento_estudiante",
      "numero_identificacion",
    ],
  },
  {
    label: "Nombre",
    required: true,
    sample: "Ana, Carlos, Sofía, Mateo, Isabella",
    options: ["Selecciona una columna", "nombre", "nombres", "student_name"],
  },
  {
    label: "Primer apellido",
    required: true,
    sample: "García, Rodríguez, López, Martínez, Pérez",
    options: [
      "Selecciona una columna",
      "primer_apellido",
      "apellido_paterno",
      "last_name_1",
    ],
  },
  {
    label: "Segundo apellido",
    sample: "Fernández, Gómez, Ramírez, Castillo, Torres",
    options: [
      "Selecciona una columna",
      "segundo_apellido",
      "apellido_materno",
      "last_name_2",
    ],
  },
  {
    label: "Sección",
    sample: "Sección A, Sección B, Sección C...",
    options: ["Selecciona una columna", "seccion", "grupo", "clase"],
  },
  {
    label: "Especialidad",
    sample: "Ciencias, Humanidades, Artes, Tecnología...",
    options: [
      "Selecciona una columna",
      "especialidad",
      "programa",
      "area_formacion",
    ],
  },
  {
    label: "Fecha de nacimiento",
    sample: "1995-05-15, 1998-11-20, 2000-03-10...",
    options: [
      "Selecciona una columna",
      "fecha_nacimiento",
      "fecha_nac",
      "birth_date",
    ],
  },
];

const PLACEHOLDER_ROWS = [0, 1];

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}

export default function ImportStudentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    setSelectedFile(file ?? null);
  };

  const handleResetSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          Siga los pasos para importar sus estudiantes desde un archivo Excel o CSV.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {!selectedFile && (
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
                    Seleccione el archivo .xlsx, .xls o .csv.
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
                <select className="mt-2 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                  <option>2025</option>
                  <option>2024</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Institución
                </label>
                <select className="mt-2 block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                  <option>Centro Educativo Principal</option>
                  <option>Centro Educativo Secundario</option>
                </select>
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
            Solo se almacenan datos estrictamente necesarios para la operación escolar en EDU360. Fuente: exportación PIAD.
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
          <div className="space-y-6 border-b border-[var(--border-light)] px-6 py-6 dark:border-[var(--border-dark)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                  Mapeo de columnas
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                  Asigna las columnas del archivo a los campos requeridos en EDU360 antes de validar la información.
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
                {PLACEHOLDER_ROWS.map((index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-3/4 rounded bg-[rgba(80,98,149,0.12)]" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-10 w-full rounded-lg bg-[rgba(80,98,149,0.12)]" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-full rounded bg-[rgba(80,98,149,0.12)]" />
                    </td>
                  </tr>
                ))}
                {FIELD_MAPPINGS.map((field) => (
                  <tr key={field.label}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-[var(--destructive-light)]">*</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-sm">
                        <CustomSelect availableKeys={field.options} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                      {field.sample}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border-light)] bg-[var(--background-light)] px-6 py-4 text-sm dark:border-[var(--border-dark)] dark:bg-[rgba(17,21,33,0.7)] md:flex-row md:justify-end">
            <button
              type="button"
              onClick={handleResetSelection}
              className="rounded-lg border border-[var(--border-light)] px-4 py-2 font-semibold text-[var(--muted-light)] transition hover:bg-[rgba(21,53,147,0.08)] dark:border-[var(--border-dark)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.15)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Validar datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

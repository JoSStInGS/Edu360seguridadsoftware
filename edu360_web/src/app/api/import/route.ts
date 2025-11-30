import { NextResponse } from "next/server";
import type { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, serverTimestamp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

type MappingEntry = {
  field: string;
  column: string | null;
  required?: boolean;
};

type StudentRecord = {
  birthdate: string | null;
  ced: string | null;
  id: string;
  lastName1: string | null;
  lastName2: string | null;
  name: string | null;
  secction: string | null;
  specialty: string | null;
  centerId: string;
  centerName: string;
  periodoLectivo: string;
  createdAt: FieldValue;
  name_lower: string | null;
  lastName1_lower: string | null;
  lastName2_lower: string | null;
};

type AllowedFieldKey =
  | "birthdate"
  | "ced"
  | "lastName1"
  | "lastName2"
  | "name"
  | "secction"
  | "specialty";

const FIELD_KEY_MAP: Record<string, AllowedFieldKey> = {
  "Cédula": "ced",
  "Nombre": "name",
  "Primer apellido": "lastName1",
  "Segundo apellido": "lastName2",
  "Sección": "secction",
  "Especialidad": "specialty",
  "Fecha de nacimiento": "birthdate",
};

function sanitizeSegment(input: string) {
  return input
    .replace(/[\/\\]/g, "-")
    .replace(/[^\p{L}\p{N}_.\-\s]/gu, "")
    .trim()
    .slice(0, 100);
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

function parseCsvContent(content: string) {
  const lines = content.split(/\r?\n/);

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

  return { headerRow, dataRows };
}

function ensureValidMappings(raw: FormDataEntryValue | null): MappingEntry[] {
  if (typeof raw !== "string") {
    throw new Error("No se recibió información de mapeo de columnas");
  }

  let mappings: MappingEntry[];
  try {
    mappings = JSON.parse(raw) as MappingEntry[];
  } catch {
    throw new Error("El mapeo recibido no tiene un formato válido");
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new Error("El mapeo de columnas está vacío");
  }

  const missingRequired = mappings
    .filter((entry) => entry.required)
    .filter((entry) => !entry.column || entry.column.trim().length === 0);

  if (missingRequired.length > 0) {
    const missingFields = missingRequired.map((entry) => entry.field).join(", ");
    throw new Error(`Asigna columnas para los campos obligatorios: ${missingFields}.`);
  }

  const usedColumns = new Set<string>();
  const duplicateColumns = new Set<string>();

  for (const entry of mappings) {
    if (!entry.column) {
      continue;
    }
    const normalized = entry.column.trim();
    if (!normalized) {
      continue;
    }
    if (usedColumns.has(normalized)) {
      duplicateColumns.add(normalized);
    }
    usedColumns.add(normalized);
  }

  if (duplicateColumns.size > 0) {
    throw new Error(
      `Cada columna solo puede asignarse a un campo. Revisa: ${Array.from(duplicateColumns).join(", ")}.`,
    );
  }

  return mappings;
}

function rowHasContent(row: string[]) {
  return row.some((cell) => cell && cell.trim().length > 0);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const rawMappings = form.get("mappings");
    const centerName = (form.get("centerName") as string) || "Centro";
    const periodoLectivo = (form.get("periodoLectivo") as string) || "Periodo";


    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo no encontrado en la solicitud" },
        { status: 400 },
      );
    }

    let mappings: MappingEntry[];
    try {
      mappings = ensureValidMappings(rawMappings);
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : "El mapeo recibido es inválido";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const fileContent = await file.text();
    const parsed = parseCsvContent(fileContent);

    if (!parsed) {
      return NextResponse.json(
        { error: "El archivo CSV no contiene datos" },
        { status: 400 },
      );
    }

    const { headerRow, dataRows } = parsed;

    if (!headerRow || headerRow.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron encabezados en el CSV" },
        { status: 400 },
      );
    }

    const columnIndexByField = new Map<string, number>();

    for (const entry of mappings) {
      if (!entry.column) {
        continue;
      }

      const columnIndex = headerRow.indexOf(entry.column);
      if (columnIndex === -1) {
        return NextResponse.json(
          { error: `La columna "${entry.column}" no existe en el archivo` },
          { status: 400 },
        );
      }
      columnIndexByField.set(entry.field, columnIndex);
    }

    const db = getAdminFirestore();
    const centerId = sanitizeSegment(centerName) || "centro";
    const periodoId = sanitizeSegment(periodoLectivo) || "periodo";

    const centerRef = db.collection("centers").doc(centerId);
    const centerSnap = await centerRef.get();

    if (!centerSnap.exists) {
      await centerRef.set(
        {
          centerName,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }


    const periodRef = centerRef.collection("periods").doc(periodoId);
    const periodSnap = await periodRef.get();

    if (!periodSnap.exists) {
      await periodRef.set(
        {
          periodoLectivo,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const studentsCollection = periodRef.collection("students");

    const batchSize = 400;
    let batch = db.batch();
    let batchCount = 0;
    let processed = 0;
    let skipped = 0;

    const requiredFields = mappings.filter((entry) => entry.required).map((entry) => entry.field);

    for (const row of dataRows) {
      if (!rowHasContent(row)) {
        continue;
      }

      let skipRow = false;
      for (const requiredField of requiredFields) {
        const columnIndex = columnIndexByField.get(requiredField);
        const value = columnIndex != null ? (row[columnIndex] ?? "").trim() : "";
        if (!value) {
          skipRow = true;
          break;
        }
      }

      if (skipRow) {
        skipped += 1;
        continue;
      }

      const docRef = studentsCollection.doc();

      const studentData: StudentRecord = {
        birthdate: null,
        ced: null,
        id: docRef.id,
        lastName1: null,
        lastName2: null,
        name: null,
        secction: null,
        specialty: null,
        centerId,
        centerName,
        periodoLectivo,
        createdAt: serverTimestamp(),
        name_lower: null,
        lastName1_lower: null,
        lastName2_lower: null,
      };

      for (const entry of mappings) {
        const key = FIELD_KEY_MAP[entry.field];
        if (!key) {
          continue;
        }

        const columnIndex = columnIndexByField.get(entry.field);
        if (columnIndex == null) {
          continue;
        }

        const rawValue = row[columnIndex] ?? "";
        const normalized = rawValue.trim();
        studentData[key] = normalized.length > 0 ? normalized : null;
      }

      // Populate lowercase fields
      studentData.name_lower = studentData.name?.toLowerCase() ?? null;
      studentData.lastName1_lower = studentData.lastName1?.toLowerCase() ?? null;
      studentData.lastName2_lower = studentData.lastName2?.toLowerCase() ?? null;

      batch.set(docRef, studentData);
      batchCount += 1;
      processed += 1;

      if (batchCount === batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
    });
  } catch (err) {
    console.error("Error al procesar importación:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 },
    );
  }
}

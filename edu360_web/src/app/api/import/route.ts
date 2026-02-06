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
  cedula: string;
  birthdate: string | null;
  lastName1: string | null;
  lastName2: string | null;
  name: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  specialty: string | null;
  centerId: string;
  centerName: string;
  periodoLectivo: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  fullName: string | null;
  fullName_lower: string | null;
};

type InvalidStudent = {
  cedula: string;
  nombre: string;
  seccionOriginal: string;
  razon: string;
};


function sanitizeSegment(input: string) {
  return input
    .replace(/[\/\\]/g, "-")
    .replace(/[^\p{L}\p{N}_.\-\s]/gu, "")
    .trim()
    .slice(0, 100);
}

function sanitizeCedula(input: string) {
  // Remove any characters that are not valid for Firestore document IDs
  return input
    .replace(/[\/\\]/g, "-")
    .replace(/[^\p{L}\p{N}_.\-]/gu, "")
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

// Normalize group name for comparison (trim, remove extra spaces, lowercase)
function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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

    // ============================================
    // FETCH EXISTING GROUPS FROM DATABASE
    // ============================================
    const gruposSnapshot = await periodRef.collection("grupos").get();
    const existingGroups = new Map<string, { id: string; nombre: string }>();

    for (const doc of gruposSnapshot.docs) {
      const data = doc.data();
      const groupName = data.nombre || "";
      const normalizedName = normalizeGroupName(groupName);
      existingGroups.set(normalizedName, {
        id: doc.id,
        nombre: groupName,
      });
    }

    const studentsCollection = periodRef.collection("students");

    const batchSize = 400;
    let batch = db.batch();
    let batchCount = 0;
    let processed = 0;
    let skipped = 0;
    let updated = 0;
    const invalidStudents: InvalidStudent[] = [];

    const requiredFields = mappings.filter((entry) => entry.required).map((entry) => entry.field);

    for (const row of dataRows) {
      if (!rowHasContent(row)) {
        continue;
      }

      // Extract values from the row
      const getValue = (fieldName: string): string => {
        const columnIndex = columnIndexByField.get(fieldName);
        return columnIndex != null ? (row[columnIndex] ?? "").trim() : "";
      };

      // Check required fields
      let skipRow = false;
      for (const requiredField of requiredFields) {
        const value = getValue(requiredField);
        if (!value) {
          skipRow = true;
          break;
        }
      }

      if (skipRow) {
        skipped += 1;
        continue;
      }

      // Get cedula and use it as document ID
      const cedula = getValue("Cédula");
      if (!cedula) {
        skipped += 1;
        continue;
      }

      const sanitizedCedula = sanitizeCedula(cedula);
      if (!sanitizedCedula) {
        skipped += 1;
        continue;
      }

      // Get student data
      const name = getValue("Nombre") || null;
      const lastName1 = getValue("Primer apellido") || null;
      const lastName2 = getValue("Segundo apellido") || null;
      const seccionOriginal = getValue("Sección");
      const specialty = getValue("Especialidad") || null;
      const birthdate = getValue("Fecha de nacimiento") || null;

      // Build full name
      const nameParts = [name, lastName1, lastName2].filter(Boolean);
      const fullName = nameParts.length > 0 ? nameParts.join(" ") : null;
      const fullName_lower = fullName?.toLowerCase() ?? null;

      // Validate and match section to existing group
      let grupoId: string | null = null;
      let grupoNombre: string | null = null;

      if (seccionOriginal) {
        const normalizedSeccion = normalizeGroupName(seccionOriginal);
        const matchedGroup = existingGroups.get(normalizedSeccion);

        if (matchedGroup) {
          grupoId = matchedGroup.id;
          grupoNombre = matchedGroup.nombre;
        } else {
          // Student has a section that doesn't exist in the database
          invalidStudents.push({
            cedula,
            nombre: fullName || "Sin nombre",
            seccionOriginal,
            razon: "La sección no existe en el sistema",
          });
          // Still import the student but without group assignment
          grupoId = null;
          grupoNombre = seccionOriginal; // Keep the original name for reference
        }
      }

      // Check if student already exists
      const docRef = studentsCollection.doc(sanitizedCedula);
      const existingDoc = await docRef.get();

      const studentData: StudentRecord = {
        cedula,
        birthdate,
        lastName1,
        lastName2,
        name,
        grupoId,
        grupoNombre,
        specialty,
        centerId,
        centerName,
        periodoLectivo,
        createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
        fullName,
        fullName_lower,
      };

      batch.set(docRef, studentData, { merge: true });
      batchCount += 1;

      if (existingDoc.exists) {
        updated += 1;
      } else {
        processed += 1;
      }

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
      updated,
      skipped,
      invalidStudents,
      hasInvalidStudents: invalidStudents.length > 0,
    });
  } catch (err) {
    console.error("Error al procesar importación:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 },
    );
  }
}

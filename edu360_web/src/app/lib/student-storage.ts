import { promises as fs } from "fs";
import path from "path";
import { sanitizeSegment } from "./sanitize";
import { getAdminDb } from "./firebaseAdmin";
import {
  StoredStudent,
  buildStudentsFromCsv,
  createFallbackMappings,
  parseCsvContent,
} from "./student-parser";

export type { StoredStudent } from "./student-parser";

export type StoredStudentPayload = {
  centerName: string;
  periodoLectivo: string;
  generatedAt?: string;
  students: StoredStudent[];
};

export async function loadStudents(
  centerName: string,
  periodoLectivo: string,
): Promise<StoredStudentPayload> {
  // 1) Try Firestore first (by institution/center/periodo)
  const fromFirestore = await loadFromFirestore(centerName, periodoLectivo);
  if (fromFirestore) {
    return fromFirestore;
  }

  // 2) Fallback to local JSON file (and then CSV)
  const safeCenter = sanitizeSegment(centerName) || "Centro";
  const safePeriodo = sanitizeSegment(periodoLectivo) || "Periodo";
  const baseDir = path.join(process.cwd(), "storage", safeCenter, safePeriodo);
  const filePath = path.join(baseDir, "students.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as StoredStudentPayload;

    if (!Array.isArray(parsed.students)) {
      return {
        centerName,
        periodoLectivo,
        students: [],
      };
    }

    return {
      centerName: parsed.centerName ?? centerName,
      periodoLectivo: parsed.periodoLectivo ?? periodoLectivo,
      generatedAt: parsed.generatedAt,
      students: parsed.students,
    };
  } catch {
    return loadFromCsvFallback(baseDir, centerName, periodoLectivo);
  }
}

async function loadFromFirestore(
  centerName: string,
  periodoLectivo: string,
): Promise<StoredStudentPayload | null> {
  try {
    const db = getAdminDb();
    const institutionId =
      (process.env.INSTITUTION_ID || process.env.NEXT_PUBLIC_INSTITUTION_ID || "default").trim();
    const safeCenter = sanitizeSegment(centerName) || "Centro";
    const safePeriodo = sanitizeSegment(periodoLectivo) || "Periodo";

    const periodRef = db
      .collection("institutions").doc(institutionId)
      .collection("centers").doc(safeCenter)
      .collection("periods").doc(safePeriodo);

    const metaSnap = await periodRef.get();
    if (!metaSnap.exists) {
      return null;
    }

    const studentsSnap = await periodRef.collection("students").get();
    const students = studentsSnap.docs
      .map((doc) => doc.data())
      .map((d) => ({
        id: String(d.id ?? ""),
        name: String(d.name ?? ""),
        birthDate: d.birthDate ? String(d.birthDate) : undefined,
        level: d.level ? String(d.level) : undefined,
        group: d.group ? String(d.group) : undefined,
        status: (d.status as any) === "Inactivo" ? "Inactivo" : "Activo",
      }))
      .filter((s) => s.id && s.name)
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

    const meta = metaSnap.data() as Partial<StoredStudentPayload> | undefined;
    return {
      centerName: meta?.centerName ?? centerName,
      periodoLectivo: meta?.periodoLectivo ?? periodoLectivo,
      generatedAt: meta?.generatedAt,
      students,
    };
  } catch (err) {
    console.warn("[students] No se pudo leer de Firestore, usando fallback:", err);
    return null;
  }
}

async function loadFromCsvFallback(
  baseDir: string,
  centerName: string,
  periodoLectivo: string,
): Promise<StoredStudentPayload> {
  try {
    const entries = await fs.readdir(baseDir);
    const csvEntries = await Promise.all(
      entries
        .filter((fileName) => fileName.toLowerCase().endsWith(".csv"))
        .map(async (fileName) => {
          const fullPath = path.join(baseDir, fileName);
          const stats = await fs.stat(fullPath);
          return { fileName, fullPath, mtime: stats.mtimeMs };
        }),
    );

    if (csvEntries.length === 0) {
      return {
        centerName,
        periodoLectivo,
        students: [],
      };
    }

    csvEntries.sort((a, b) => b.mtime - a.mtime);
    const latest = csvEntries[0];
    const rawCsv = await fs.readFile(latest.fullPath, "utf-8");
    const parsed = parseCsvContent(rawCsv);

    if (!parsed) {
      return {
        centerName,
        periodoLectivo,
        students: [],
      };
    }

    const mappings = createFallbackMappings(parsed.headerRow);
    const students = buildStudentsFromCsv(parsed, mappings).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );

    return {
      centerName,
      periodoLectivo,
      generatedAt: new Date(latest.mtime).toISOString(),
      students,
    };
  } catch {
    return {
      centerName,
      periodoLectivo,
      students: [],
    };
  }
}

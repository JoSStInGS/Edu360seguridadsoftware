import { promises as fs } from "fs";
import path from "path";
import { sanitizeSegment } from "./sanitize";
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

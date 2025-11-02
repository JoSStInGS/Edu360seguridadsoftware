import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { getAdminBucket } from "@/app/lib/firebaseAdmin";
import { sanitizeSegment } from "@/app/lib/sanitize";
import {
  ColumnMapping,
  buildStudentsFromCsv,
  createFallbackMappings,
  parseCsvContent,
} from "@/app/lib/student-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const centerName = (form.get("centerName") as string) || "Centro";
    const periodoLectivo = (form.get("periodoLectivo") as string) || "Periodo";
    const mappingsRaw = form.get("mappings");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo no encontrado en la solicitud" },
        { status: 400 },
      );
    }

    const originalName = sanitizeSegment(file.name || "archivo.csv");
    const safeCenter = sanitizeSegment(centerName) || "Centro";
    const safePeriodo = sanitizeSegment(periodoLectivo) || "Periodo";

    let columnMappings: ColumnMapping[] = [];
    if (typeof mappingsRaw === "string" && mappingsRaw.length > 0) {
      try {
        columnMappings = JSON.parse(mappingsRaw) as ColumnMapping[];
      } catch (error) {
        console.warn("No se pudieron interpretar los mapeos de columnas", error);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileContent = buffer.toString("utf-8");
    const parsedTable = parseCsvContent(fileContent);

    if (!parsedTable) {
      return NextResponse.json(
        { error: "No se pudo interpretar el archivo importado." },
        { status: 400 },
      );
    }

    if (columnMappings.length === 0) {
      console.warn(
        "No se recibieron mapeos de columnas. Intentando auto detectar encabezados.",
      );
      columnMappings = createFallbackMappings(parsedTable.headerRow);
    }

    const students = buildStudentsFromCsv(parsedTable, columnMappings).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );

    const payload = {
      centerName,
      periodoLectivo,
      generatedAt: new Date().toISOString(),
      students,
    };

    const baseDir = path.join(process.cwd(), "storage", safeCenter, safePeriodo);
    await fs.mkdir(baseDir, { recursive: true });
    const localCsvPath = path.join(baseDir, originalName);
    await fs.writeFile(localCsvPath, buffer);
    const localJsonPath = path.join(baseDir, "students.json");
    await fs.writeFile(localJsonPath, JSON.stringify(payload, null, 2));

    const objectPath = ["imports", safeCenter, safePeriodo, originalName]
      .filter(Boolean)
      .join("/");
    const jsonObjectPath = ["imports", safeCenter, safePeriodo, "students.json"].join("/");

    const responsePayload: Record<string, unknown> = {
      ok: true,
      centerName,
      periodoLectivo,
      studentsSaved: students.length,
    };

    try {
      const bucket = getAdminBucket();
      console.info(
        "[import] Subiendo a Storage bucket:",
        bucket.name,
        "objeto:",
        objectPath,
      );
      const fileRef = bucket.file(objectPath);
      const contentType = file.type || "text/csv";
      await fileRef.save(buffer, {
        contentType,
        resumable: false,
        metadata: { contentDisposition: `attachment; filename="${originalName}"` },
      });

      await bucket.file(jsonObjectPath).save(JSON.stringify(payload), {
        contentType: "application/json",
        resumable: false,
      });

      responsePayload.bucket = bucket.name;
      responsePayload.object = objectPath;
      responsePayload.path = `gs://${bucket.name}/${objectPath}`;
      responsePayload.studentsObject = `gs://${bucket.name}/${jsonObjectPath}`;
    } catch (cloudErr) {
      console.warn("Fallo al subir a Storage, utilizando almacenamiento local:", cloudErr);
      responsePayload.path = `storage/${safeCenter}/${safePeriodo}/${originalName}`;
      responsePayload.studentsObject = `storage/${safeCenter}/${safePeriodo}/students.json`;
      responsePayload.warning =
        "No se pudo subir a Firebase Storage. Archivo guardado localmente. Verifique credenciales del servidor.";
    }

    revalidatePath("/dashboard/students");

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("Error al guardar importación:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 },
    );
  }
}

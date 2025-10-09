import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAdminBucket } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

function sanitizeSegment(input: string) {
  // Remove path separators and trim; limit length
  return input
    .replace(/[/\\]/g, "-")
    .replace(/[^\p{L}\p{N}_.\-\s]/gu, "")
    .trim()
    .slice(0, 100);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const centerName = (form.get("centerName") as string) || "Centro";
    const periodoLectivo = (form.get("periodoLectivo") as string) || "Periodo";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo no encontrado en la solicitud" },
        { status: 400 },
      );
    }

    const originalName = sanitizeSegment(file.name || "archivo.csv");
    const safeCenter = sanitizeSegment(centerName) || "Centro";
    const safePeriodo = sanitizeSegment(periodoLectivo) || "Periodo";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ruta del objeto dentro del bucket
    const objectPath = ["imports", safeCenter, safePeriodo, originalName]
      .filter(Boolean)
      .join("/");

    try {
      const bucket = getAdminBucket();
      console.info("[import] Subiendo a Storage bucket:", bucket.name, "objeto:", objectPath);
      const fileRef = bucket.file(objectPath);
      await fileRef.save(buffer, {
        contentType: (file as any).type || "text/csv",
        resumable: false,
        metadata: { contentDisposition: `attachment; filename="${originalName}"` },
      });

      return NextResponse.json({
        ok: true,
        bucket: bucket.name,
        object: objectPath,
        path: `gs://${bucket.name}/${objectPath}`,
      });
    } catch (cloudErr) {
      console.warn("Fallo al subir a Storage, guardando localmente:", cloudErr);
      const baseDir = path.join(process.cwd(), "storage", safeCenter, safePeriodo);
      await fs.mkdir(baseDir, { recursive: true });
      const localDest = path.join(baseDir, originalName);
      await fs.writeFile(localDest, buffer);
      return NextResponse.json({
        ok: true,
        path: `storage/${safeCenter}/${safePeriodo}/${originalName}`,
        warning: "No se pudo subir a Firebase Storage. Archivo guardado localmente. Verifique credenciales del servidor.",
      });
    }
  } catch (err) {
    console.error("Error al guardar importación:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 },
    );
  }
}


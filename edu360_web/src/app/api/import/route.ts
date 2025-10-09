import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

    const baseDir = path.join(process.cwd(), "storage", safeCenter, safePeriodo);
    await fs.mkdir(baseDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const destPath = path.join(baseDir, originalName);
    await fs.writeFile(destPath, buffer);

    return NextResponse.json({ ok: true, path: `storage/${safeCenter}/${safePeriodo}/${originalName}` });
  } catch (err) {
    console.error("Error al guardar importación:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 },
    );
  }
}


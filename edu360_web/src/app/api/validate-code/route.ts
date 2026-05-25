import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

const ROLE_MAP: Record<string, string> = {
  admin: "center_admin",
  professor: "professor",
  parent: "guardian",
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { center, code, role } = (await request.json()) as {
      center?: string;
      code?: string;
      role?: string;
    };

    if (!center || !code || !role) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const expectedRole = ROLE_MAP[role];
    if (!expectedRole) {
      return NextResponse.json({ valid: false, message: "Rol invalido" }, { status: 200 });
    }

    const supabase = createAdminClient();
    const { data: activationCode, error } = await supabase
      .from("activation_codes")
      .select("id,purpose,role,academic_period_id,metadata,status,expires_at")
      .eq("center_id", center)
      .eq("code_hash", hashCode(code.trim()))
      .maybeSingle();

    if (error || !activationCode) {
      return NextResponse.json({ valid: false, message: "Código inválido" }, { status: 200 });
    }

    const codeRow = activationCode as {
      id: string;
      purpose: string;
      role: string | null;
      academic_period_id: string | null;
      metadata: { teacher_id?: string | null } | null;
      status: string;
      expires_at: string;
    };

    if (codeRow.status === "consumed") {
      return NextResponse.json({ valid: false, message: "Este código ya fue utilizado" }, { status: 200 });
    }

    if (codeRow.status !== "active" || new Date(codeRow.expires_at) <= new Date()) {
      return NextResponse.json({ valid: false, message: "Este código expiró o fue revocado" }, { status: 200 });
    }

    if (codeRow.role !== expectedRole) {
      return NextResponse.json(
        { valid: false, message: "El rol no coincide con el código proporcionado" },
        { status: 200 }
      );
    }

    const { data: studentLinks } = await supabase
      .from("activation_code_students")
      .select("student_id")
      .eq("activation_code_id", codeRow.id);

    return NextResponse.json({
      valid: true,
      message: "Código válido",
      profesorId: codeRow.metadata?.teacher_id ?? null,
      periodId: codeRow.academic_period_id,
      studentIds: (studentLinks ?? []).map((row) => row.student_id),
    });
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

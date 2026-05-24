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
    const { data, error } = await supabase.rpc("validate_activation_code", {
      p_center_id: center,
      p_code_hash: hashCode(code.trim()),
    });

    if (error || !data?.length) {
      return NextResponse.json({ valid: false, message: "Codigo invalido" }, { status: 200 });
    }

    const activationCode = data[0] as {
      purpose: string;
      role: string | null;
      academic_period_id: string | null;
      metadata: { teacher_id?: string | null } | null;
      student_ids: string[] | null;
    };

    if (activationCode.role !== expectedRole) {
      return NextResponse.json(
        { valid: false, message: "El rol no coincide con el codigo proporcionado" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: "Codigo valido",
      profesorId: activationCode.metadata?.teacher_id ?? null,
      periodId: activationCode.academic_period_id,
      studentCedulas: activationCode.student_ids ?? null,
    });
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

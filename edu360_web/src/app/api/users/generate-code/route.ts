import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { requireCenterAdmin } from "@/app/api/_lib/require-center-admin";

export const runtime = "nodejs";

const ROLE_MAP: Record<string, string> = {
  admin: "center_admin",
  professor: "professor",
  parent: "guardian",
};

function generateSixDigitCode() {
  return randomInt(100000, 1000000).toString();
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(request: Request) {
  try {
    const context = await requireCenterAdmin(request);
    if (context.response) return context.response;

    const { user, centerId, supabase } = context;
    const { role, profesorId, periodId, studentCedulas } = (await request.json()) as {
      role?: string;
      profesorId?: string;
      periodId?: string;
      studentCedulas?: string[];
    };

    const supabaseRole = role ? ROLE_MAP[role] : null;
    if (!role || !supabaseRole) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    }

    if (role === "professor" && profesorId) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("id", profesorId)
        .eq("center_id", centerId)
        .maybeSingle();

      if (!teacher) {
        return NextResponse.json({ error: "Profesor no encontrado" }, { status: 400 });
      }
    }

    if (role === "parent") {
      if (!Array.isArray(studentCedulas) || studentCedulas.length === 0) {
        return NextResponse.json({ error: "Debe seleccionar al menos un estudiante" }, { status: 400 });
      }

      if (!periodId) {
        return NextResponse.json({ error: "Se requiere un periodo activo" }, { status: 400 });
      }

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("center_id", centerId)
        .eq("academic_period_id", periodId)
        .in("id", studentCedulas);

      if (studentsError || (students ?? []).length !== studentCedulas.length) {
        return NextResponse.json({ error: "Uno o mas estudiantes no pertenecen al centro" }, { status: 400 });
      }
    }

    let code = generateSixDigitCode();
    let codeHash = hashCode(code);
    let attempts = 0;

    while (attempts < 10) {
      const { data: existingCode } = await supabase
        .from("activation_codes")
        .select("id")
        .eq("center_id", centerId)
        .eq("code_hash", codeHash)
        .maybeSingle();

      if (!existingCode) break;

      code = generateSixDigitCode();
      codeHash = hashCode(code);
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json({ error: "No se pudo generar un codigo unico" }, { status: 500 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const purpose = role === "parent" ? "guardian_link" : "registration";

    const { data: activationCode, error: insertError } = await supabase
      .from("activation_codes")
      .insert({
        center_id: centerId,
        code_hash: codeHash,
        purpose,
        role: supabaseRole,
        academic_period_id: periodId || null,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        metadata: {
          teacher_id: role === "professor" ? profesorId ?? null : null,
        },
      })
      .select("id")
      .single();

    if (insertError || !activationCode) {
      return NextResponse.json({ error: "No se pudo guardar el codigo" }, { status: 500 });
    }

    if (role === "parent" && studentCedulas?.length) {
      const { error: linkError } = await supabase.from("activation_code_students").insert(
        studentCedulas.map((studentId) => ({
          activation_code_id: activationCode.id,
          student_id: studentId,
          center_id: centerId,
        }))
      );

      if (linkError) {
        return NextResponse.json({ error: "No se pudo vincular estudiantes al codigo" }, { status: 500 });
      }
    }

    await supabase.from("audit_logs").insert({
      center_id: centerId,
      actor_id: user.id,
      action: "activation_code_created",
      entity_type: "activation_code",
      entity_id: activationCode.id,
      new_data: { purpose, role: supabaseRole, expires_at: expiresAt.toISOString() },
    });

    return NextResponse.json({
      code,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

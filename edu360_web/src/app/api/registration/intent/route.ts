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
  return createHash("sha256").update(code.trim()).digest("hex");
}

function getIntentMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("not found")) return "El código no existe o no pertenece al centro seleccionado.";
  if (normalized.includes("not active")) return "El código ya fue utilizado, expiró o fue revocado.";
  if (normalized.includes("role mismatch")) return "El rol no coincide con el código proporcionado.";
  return "No se pudo preparar el registro con este código.";
}

export async function POST(request: Request) {
  try {
    const { center, code, role, email } = (await request.json()) as {
      center?: string;
      code?: string;
      role?: string;
      email?: string;
    };

    if (!center || !code || !role || !email) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const expectedRole = ROLE_MAP[role];
    if (!expectedRole) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("create_registration_intent", {
      p_center_id: center,
      p_code_hash: hashCode(code),
      p_email: email.trim().toLowerCase(),
      p_expected_role: expectedRole,
    });

    if (error || !data?.length) {
      return NextResponse.json({ error: getIntentMessage(error?.message) }, { status: 400 });
    }

    return NextResponse.json({ success: true, intent: data[0] });
  } catch (error) {
    console.error("Error creating registration intent:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

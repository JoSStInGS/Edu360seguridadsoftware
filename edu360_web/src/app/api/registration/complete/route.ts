import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/app/api/_lib/require-supabase-user";
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

function getActivationCodeMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("not found")) return "El código no existe o no pertenece al centro seleccionado.";
  if (normalized.includes("not active")) return "El código ya fue utilizado, expiró o fue revocado.";
  if (normalized.includes("role mismatch")) return "El rol no coincide con el código proporcionado.";
  return "No se pudo completar el registro con este código.";
}

export async function POST(request: Request) {
  const { user, response } = await requireSupabaseUser(request);
  if (response || !user) return response;

  try {
    const { center, code, role, mepEmail } = (await request.json()) as {
      center?: string;
      code?: string;
      role?: string;
      mepEmail?: string;
    };

    if (!center || !code || !role) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const expectedRole = ROLE_MAP[role];
    if (!expectedRole) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("complete_registration_with_activation_code", {
      p_center_id: center,
      p_code_hash: hashCode(code.trim()),
      p_user_id: user.id,
      p_email: user.email?.trim().toLowerCase() ?? "",
      p_display_name:
        user.user_metadata?.display_name ??
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "Usuario",
      p_expected_role: expectedRole,
      p_mep_email: mepEmail?.trim().toLowerCase() || null,
      p_provider: user.app_metadata?.provider ?? "email",
    });

    if (error || !data?.length) {
      return NextResponse.json(
        { error: getActivationCodeMessage(error?.message) },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, registration: data[0] });
  } catch (error) {
    console.error("Error completing registration:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

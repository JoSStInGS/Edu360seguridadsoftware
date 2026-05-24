import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseUser } from "@/app/api/_lib/require-supabase-user";

const MEP_DOMAINS_BY_ROLE: Record<string, string> = {
  super_admin: "@mep.go.cr",
  center_admin: "@mep.go.cr",
  professor: "@mep.go.cr",
  student: "@est.mep.go.cr",
  guardian: "@est.mep.go.cr",
};

function isMepEmailForRole(email: string, roles: string[]) {
  return roles.some((role) => {
    const domain = MEP_DOMAINS_BY_ROLE[role];
    return Boolean(domain && email.endsWith(domain));
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user, response, supabase } = await requireSupabaseUser(req);
    if (response) return response;

    const body = (await req.json()) as { mepEmail?: string };
    const mepEmail = body.mepEmail?.trim().toLowerCase();

    if (!mepEmail) {
      return NextResponse.json({ error: "mepEmail es requerido" }, { status: 400 });
    }

    if (!mepEmail.includes("@")) {
      return NextResponse.json({ error: "Formato de correo invalido" }, { status: 400 });
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (rolesError) {
      return NextResponse.json(
        { error: "No se pudieron cargar los roles del usuario" },
        { status: 500 }
      );
    }

    const roles = (rolesData ?? [])
      .map((row) => row.role)
      .filter((role): role is string => typeof role === "string");

    if (roles.length === 0) {
      return NextResponse.json(
        { error: "Completa tu perfil antes de registrar el correo MEP" },
        { status: 400 }
      );
    }

    if (!isMepEmailForRole(mepEmail, roles)) {
      const expectedDomains = [
        ...new Set(roles.map((role) => MEP_DOMAINS_BY_ROLE[role]).filter(Boolean)),
      ];

      return NextResponse.json(
        { error: `El correo debe pertenecer al dominio ${expectedDomains.join(" o ")}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ mep_email: mepEmail })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "No se pudo guardar el correo MEP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving MEP email:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

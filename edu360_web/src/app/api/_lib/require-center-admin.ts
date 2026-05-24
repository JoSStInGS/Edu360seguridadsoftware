import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/app/api/_lib/require-supabase-user";
import { createAdminClient } from "@/app/lib/supabase/admin";

interface ActiveUserContextRow {
  center_id: string | null;
  center_name: string | null;
  role: string;
  is_active: boolean;
}

export async function requireCenterAdmin(request: Request) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return { response };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("active_user_context")
    .select("center_id,center_name,role,is_active")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .in("role", ["center_admin", "super_admin"]);

  if (error) {
    return {
      response: NextResponse.json(
        { error: "No se pudo validar el contexto administrativo" },
        { status: 500 }
      ),
    };
  }

  const rows = (data ?? []) as ActiveUserContextRow[];
  const centerAdminContext = rows.find((row) => row.role === "center_admin" && row.center_id);

  if (!centerAdminContext?.center_id) {
    return {
      response: NextResponse.json(
        { error: "Acceso denegado. Se requiere administrador de centro." },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    centerId: centerAdminContext.center_id,
    centerName: centerAdminContext.center_name,
    supabase,
    response: null,
  };
}

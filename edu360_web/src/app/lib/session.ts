import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { canAccessWeb, mapSupabaseRole, type UserRole } from "@/app/lib/roles";

export interface AuthContext {
  userId: string;
  email: string | null;
  displayName: string | null;
  mepEmail: string | null;
  centerId: string | null;
  roles: UserRole[];
}

interface ActiveUserContextRow {
  profile_id: string;
  email: string | null;
  mep_email: string | null;
  display_name: string | null;
  center_id: string | null;
  role: string;
  is_active: boolean;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("active_user_context")
    .select("profile_id,email,mep_email,display_name,center_id,role,is_active")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  if (error) {
    throw new Error("No se pudo cargar el contexto de sesión.");
  }

  const rows = (data ?? []) as ActiveUserContextRow[];
  const roles = Array.from(
    new Set(rows.map((row) => mapSupabaseRole(row.role)).filter(Boolean))
  ) as UserRole[];
  const firstRow = rows[0];

  return {
    userId: user.id,
    email: firstRow?.email ?? user.email ?? null,
    displayName:
      firstRow?.display_name ??
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      null,
    mepEmail: firstRow?.mep_email ?? null,
    centerId: firstRow?.center_id ?? null,
    roles,
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();

  if (!context) {
    redirect("/auth");
  }

  return context;
}

export async function requireWebAuthContext() {
  const context = await requireAuthContext();

  if (!canAccessWeb(context.roles)) {
    redirect("/access-denied");
  }

  return context;
}

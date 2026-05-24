import { NextResponse } from "next/server";
import { requireCenterAdmin } from "@/app/api/_lib/require-center-admin";

export const runtime = "nodejs";

const LEGACY_TO_SUPABASE_ROLE: Record<string, string> = {
  admin: "center_admin",
  professor: "professor",
  parent: "guardian",
};

function mapSupabaseRole(role: string) {
  switch (role) {
    case "super_admin":
    case "center_admin":
      return "admin";
    case "professor":
      return "professor";
    case "guardian":
    case "student":
      return "parent";
    default:
      return null;
  }
}

interface UserRoleRow {
  user_id: string;
  role: string;
  is_active: boolean;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  status: string;
  created_at: string | null;
}

export async function GET(request: Request) {
  try {
    const context = await requireCenterAdmin(request);
    if (context.response) return context.response;

    const { centerId, centerName, supabase } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id,role,is_active")
      .eq("center_id", centerId);

    if (error) {
      return NextResponse.json({ error: "Error al cargar usuarios" }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as UserRoleRow[];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: profilesData, error: profilesError } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id,email,display_name,status,created_at")
          .in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      return NextResponse.json({ error: "Error al cargar perfiles" }, { status: 500 });
    }

    const { data: teachersData } = userIds.length
      ? await supabase.from("teachers").select("id,profile_id").in("profile_id", userIds)
      : { data: [] };

    const profileById = new Map(
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );
    const teacherByProfileId = new Map(
      (teachersData ?? []).map((teacher) => [teacher.profile_id as string, teacher.id as string])
    );
    const usersById = new Map<
      string,
      {
        uid: string;
        email: string | null;
        displayName: string | null;
        roles: string[];
        status: string;
        centerId: string;
        centerName: string | null;
        profesorId: string | null;
        createdAt: string | null;
      }
    >();

    for (const row of rows) {
      const profile = profileById.get(row.user_id);
      if (!profile) continue;

      const existing =
        usersById.get(row.user_id) ??
        {
          uid: row.user_id,
          email: profile.email,
          displayName: profile.display_name,
          roles: [],
          status: profile.status,
          centerId,
          centerName,
          profesorId: teacherByProfileId.get(row.user_id) ?? null,
          createdAt: profile.created_at,
        };

      if (row.is_active) {
        const mappedRole = mapSupabaseRole(row.role);
        if (mappedRole && !existing.roles.includes(mappedRole)) {
          existing.roles.push(mappedRole);
        }
      }

      usersById.set(row.user_id, existing);
    }

    const users = [...usersById.values()].sort((a, b) =>
      (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? "")
    );

    const metrics = {
      total: users.length,
      admins: users.filter((user) => user.roles.includes("admin")).length,
      professors: users.filter((user) => user.roles.includes("professor")).length,
      parents: users.filter((user) => user.roles.includes("parent")).length,
    };

    return NextResponse.json({ users, metrics });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireCenterAdmin(request);
    if (context.response) return context.response;

    const { user, centerId, supabase } = context;
    const { targetUid, roles } = (await request.json()) as {
      targetUid?: string;
      roles?: string[];
    };

    if (!targetUid) {
      return NextResponse.json({ error: "targetUid es requerido" }, { status: 400 });
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: "roles es requerido" }, { status: 400 });
    }

    const nextRoles = [...new Set(roles)];
    if (nextRoles.some((role) => !LEGACY_TO_SUPABASE_ROLE[role])) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    }

    const { data: existingRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id,role,is_active")
      .eq("center_id", centerId)
      .eq("user_id", targetUid);

    if (rolesError) {
      return NextResponse.json({ error: "Usuario objetivo no encontrado" }, { status: 404 });
    }

    const targetRoles = nextRoles.map((role) => LEGACY_TO_SUPABASE_ROLE[role]);
    const existingByRole = new Map((existingRoles ?? []).map((row) => [row.role as string, row]));

    for (const role of targetRoles) {
      const existing = existingByRole.get(role);
      if (existing) {
        if (!existing.is_active) {
          await supabase.from("user_roles").update({ is_active: true }).eq("id", existing.id);
        }
      } else {
        await supabase.from("user_roles").insert({
          user_id: targetUid,
          center_id: centerId,
          role,
          is_active: true,
          created_by: user.id,
        });
      }
    }

    const rolesToDeactivate = (existingRoles ?? []).filter(
      (row) => !targetRoles.includes(row.role as string) && row.is_active
    );

    if (rolesToDeactivate.length > 0) {
      await supabase
        .from("user_roles")
        .update({ is_active: false })
        .in(
          "id",
          rolesToDeactivate.map((row) => row.id)
        );
    }

    await supabase.from("audit_logs").insert({
      center_id: centerId,
      actor_id: user.id,
      action: "user_roles_updated",
      entity_type: "profile",
      entity_id: targetUid,
      old_data: { roles: (existingRoles ?? []).filter((row) => row.is_active).map((row) => row.role) },
      new_data: { roles: targetRoles },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireCenterAdmin(request);
    if (context.response) return context.response;

    const { user, centerId, supabase } = context;
    const { searchParams } = new URL(request.url);
    const targetUid = searchParams.get("uid");

    if (!targetUid) {
      return NextResponse.json({ error: "uid es requerido" }, { status: 400 });
    }

    const { data: existingRoles, error } = await supabase
      .from("user_roles")
      .select("id,role,is_active")
      .eq("center_id", centerId)
      .eq("user_id", targetUid);

    if (error || !existingRoles?.length) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await supabase
      .from("user_roles")
      .update({ is_active: false })
      .eq("center_id", centerId)
      .eq("user_id", targetUid);

    await supabase.from("profiles").update({ status: "inactive" }).eq("id", targetUid);
    await supabase.from("audit_logs").insert({
      center_id: centerId,
      actor_id: user.id,
      action: "user_deactivated",
      entity_type: "profile",
      entity_id: targetUid,
      old_data: { roles: existingRoles },
      new_data: { status: "inactive" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

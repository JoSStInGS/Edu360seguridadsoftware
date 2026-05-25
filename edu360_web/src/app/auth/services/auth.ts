"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";
import { mapSupabaseRole, type UserRole } from "@/app/lib/roles";

const supabase = createClient();

export type AuthServiceUser = User & { uid: string; displayName: string | null };

function withLegacyUserAliases(user: User): AuthServiceUser {
  return {
    ...user,
    uid: user.id,
    displayName:
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      null,
  };
}

export async function signInWithGoogle(): Promise<AuthServiceUser | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
    },
  });

  if (error) throw error;
  return null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthServiceUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      throw new Error(
        "Correo o contraseña inválidos. Verifica que el usuario exista en Supabase Auth, tenga contraseña configurada y el email esté confirmado."
      );
    }

    throw error;
  }
  if (!data.user) throw new Error("No se pudo iniciar sesión.");

  return withLegacyUserAliases(data.user);
}

export async function registerWithEmail(email: string, password: string): Promise<AuthServiceUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{9,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error(
      "La contraseña debe ser mayor a 8 caracteres y contener al menos un número, una letra mayúscula y una letra minúscula."
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
    },
  });

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("user already registered") || message.includes("already registered")) {
      throw new Error("Ya existe una cuenta con este correo. Inicia sesión o usa recuperación de contraseña.");
    }

    if (message.includes("password")) {
      throw new Error("La contraseña no cumple con los requisitos de seguridad.");
    }

    if (message.includes("email")) {
      throw new Error("El correo no es válido o no puede usarse para crear la cuenta.");
    }

    if (message.includes("rate limit") || message.includes("too many")) {
      throw new Error("Se hicieron demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
    }

    throw new Error(`Supabase no pudo crear la cuenta: ${error.message}`);
  }

  if (data.user?.identities?.length === 0) {
    throw new Error("Ya existe una cuenta con este correo. Inicia sesión o usa recuperación de contraseña.");
  }

  if (!data.user) {
    throw new Error("Supabase no devolvió el usuario creado. Verifica si el correo ya existe o si la confirmación por email quedó pendiente.");
  }

  return withLegacyUserAliases(data.user);
}

export async function handleRedirectLoginIfNeeded(): Promise<void> {
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function ensureInitialUserDoc(): Promise<void> {
  return;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.roles[0] ?? null;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const profile = await getUserProfile(userId);
  return profile?.roles ?? [];
}

export interface UserProfileData {
  roles: UserRole[];
  centerId: string | null;
  profesorId: string | null;
  displayName: string | null;
  email: string | null;
  mepEmail: string | null;
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

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const { data, error } = await supabase
    .from("active_user_context")
    .select("profile_id,email,mep_email,display_name,center_id,role,is_active")
    .eq("profile_id", userId)
    .eq("is_active", true);

  if (error) throw error;

  const rows = (data ?? []) as ActiveUserContextRow[];
  if (rows.length === 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) return null;

    return {
      roles: [],
      centerId: null,
      profesorId: null,
      displayName:
        user.user_metadata?.display_name ??
        user.user_metadata?.full_name ??
        null,
      email: user.email ?? null,
      mepEmail: null,
    };
  }

  const roles = Array.from(
    new Set(rows.map((row) => mapSupabaseRole(row.role)).filter(Boolean))
  ) as UserRole[];

  return {
    roles,
    centerId: rows[0]?.center_id ?? null,
    profesorId: null,
    displayName: rows[0]?.display_name ?? null,
    email: rows[0]?.email ?? null,
    mepEmail: rows[0]?.mep_email ?? null,
  };
}

export function getMepDomain(roles: UserRole[]): string {
  if (roles.includes("parent")) return "@est.mep.go.cr";
  return "@mep.go.cr";
}

export function isMepEmail(email: string, roles: UserRole[]): boolean {
  const domain = getMepDomain(roles);
  return email.toLowerCase().endsWith(domain);
}

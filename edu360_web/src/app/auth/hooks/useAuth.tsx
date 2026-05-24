"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";
import { getUserProfile } from "@/app/auth/services/auth";
import type { UserRole } from "@/app/lib/roles";
import { useActiveRoleStore } from "@/app/stores/useActiveRoleStore";

const supabase = createClient();

export type AuthUser = User & {
  uid: string;
  displayName: string | null;
  getIdToken: () => Promise<string>;
};

function clearContext() {
  useActiveRoleStore.getState().initializeRoles([]);
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [mepEmail, setMepEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(currentUser: User | null) {
      if (!active) return;

      setUser(
        currentUser
          ? {
              ...currentUser,
              uid: currentUser.id,
              displayName:
                currentUser.user_metadata?.display_name ??
                currentUser.user_metadata?.full_name ??
                null,
              getIdToken: async () => {
                const { data } = await supabase.auth.getSession();
                return data.session?.access_token ?? "";
              },
            }
          : null
      );

      if (!currentUser) {
        setRoles([]);
        setCenterId(null);
        setProfesorId(null);
        setMepEmail(null);
        clearContext();
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.id);
        if (!active) return;

        const nextRoles = profile?.roles ?? [];
        setRoles(nextRoles);
        setCenterId(profile?.centerId ?? null);
        setProfesorId(profile?.profesorId ?? null);
        setMepEmail(profile?.mepEmail ?? null);
        useActiveRoleStore.getState().initializeRoles(nextRoles);
      } catch {
        if (!active) return;

        setRoles([]);
        setCenterId(null);
        setProfesorId(null);
        setMepEmail(null);
        clearContext();
      } finally {
        if (active) setLoading(false);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      void loadProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, roles, centerId, profesorId, mepEmail, loading };
}

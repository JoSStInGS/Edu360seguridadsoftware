"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sanitizeSegment } from "@/app/lib/sanitize";

type Role = "admin" | "professor";

export default function CompleteProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [role, setRole] = useState<Role | null>(null);
  const [centerName, setCenterName] = useState(
    params.get("center")?.trim() || "Centro Educativo Principal",
  );
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const institutionId = useMemo(
    () => process.env.NEXT_PUBLIC_INSTITUTION_ID?.trim() || "default",
    [],
  );

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth");
      }
    }
  }, [loading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!role) {
      setError("Selecciona un rol");
      return;
    }
    if (!code.trim()) {
      setError("Ingresa un código de activación");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await verifyCode(centerName, code.trim(), role, institutionId);
      if (!ok) {
        setError(
          "Código inválido o no coincide con el rol seleccionado. Verifica e intenta de nuevo.",
        );
        setSubmitting(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          role,
          center: centerName,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          provider: user.providerData?.[0]?.providerId ?? null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      router.replace("/welcome");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al completar el registro";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)] p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-sm dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
            Configuración inicial de perfil
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            Selecciona tu rol y valida tu código de activación.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <h2 className="pb-2 text-left text-base font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              Rol en la institución
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${role === "admin" ? "border-[var(--primary)] bg-[rgba(19,91,236,.05)]" : "border-[var(--border-light)] dark:border-[var(--border-dark)]"}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name="role"
                  value="admin"
                  checked={role === "admin"}
                  onChange={() => setRole("admin")}
                />
                <span className="material-symbols-outlined text-xl">corporate_fare</span>
                <span>Administrativo</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${role === "professor" ? "border-[var(--primary)] bg-[rgba(19,91,236,.05)]" : "border-[var(--border-light)] dark:border-[var(--border-dark)]"}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name="role"
                  value="professor"
                  checked={role === "professor"}
                  onChange={() => setRole("professor")}
                />
                <span className="material-symbols-outlined text-xl">school</span>
                <span>Profesor</span>
              </label>
            </div>
          </div>

          <div>
            <label className="pb-2 text-left text-base font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              Centro educativo
            </label>
            <input
              type="text"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              placeholder="Nombre del centro"
              className="mt-1 w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
            />
          </div>

          <div>
            <label className="pb-2 text-left text-base font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              Código de activación
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">key</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ingresa el código proporcionado"
                className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] py-2 pl-10 pr-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verificando..." : "Verificar y Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}

async function verifyCode(
  centerName: string,
  code: string,
  expectedRole: Role,
  institutionId: string,
): Promise<boolean> {
  const safeCenter = sanitizeSegment(centerName) || "Centro";
  const tryPaths = [
    ["institutions", institutionId, "centers", safeCenter, "users", "register_codes", code],
    ["centers", safeCenter, "users", "register_codes", code],
  ];

  for (const p of tryPaths) {
    const ref = doc(db, ...p);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { user_type?: string };
      const type = (data.user_type || "").toLowerCase();
      if (type === expectedRole) return true;
      return false;
    }
  }

  return false;
}


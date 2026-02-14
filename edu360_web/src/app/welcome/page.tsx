'use client'

import { useAuth } from '@/app/auth/hooks/useAuth'
import { logout } from '@/app/auth/services/auth'
import { canAccessWeb } from '@/app/lib/roles'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WelcomePage() {
    const { user, roles, loading } = useAuth();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (user) {
                if (canAccessWeb(roles)) {
                    router.replace('/dashboard');
                } else {
                    // Parent-only: redirect back to auth
                    router.replace('/auth');
                }
            } else {
                router.replace('/auth');
            }
        }
    }, [loading, router, user, roles]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
        router.replace('/auth');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Cargando...
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-6 text-[var(--muted-light)]">
            <span className="material-symbols-outlined text-4xl text-[var(--primary)]">hourglass</span>
            <p className="text-lg font-medium">Preparando tu tablero...</p>
            <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loggingOut ? 'Cerrando sesión...' : 'Cancelar y volver al inicio de sesión'}
            </button>
        </div>
    );
}

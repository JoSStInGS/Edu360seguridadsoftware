'use client'

import { useAuth } from '@/app/auth/hooks/useAuth'
import { logout } from '@/app/auth/services/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function WelcomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

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
        <div className="flex h-screen flex-col items-center justify-center gap-6">
            <h1 className="text-2xl font-semibold">
                Iniciaste sesion: {user?.email}
            </h1>
            <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded bg-[#0078D4] px-4 py-2 font-medium text-white hover:bg-[#005a9e] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
        </div>
    );
}

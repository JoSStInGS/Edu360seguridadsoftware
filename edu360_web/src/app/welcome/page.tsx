'use client'

import { useAuth } from '@/app/auth/hooks/useAuth'

export default function WelcomePage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Cargando...
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center">
            <h1 className="text-2xl font-semibold">
                Iniciaste sesion: {user?.email}
            </h1>
        </div>
    );
}

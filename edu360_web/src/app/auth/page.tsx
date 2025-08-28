'use client'


import { signInWithMicrosoft } from "@/app/auth/services/auth";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        if (user) {
            router.replace("/welcome");
        }
    }, [user, router]);

    const handleMicrosoftLogin = async () => {
        setSigningIn(true);
        try {
            const u = await signInWithMicrosoft();
            if (u) {
                router.push("/welcome");
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al iniciar sesión con Microsoft";
            alert(message);
        } finally {
            setSigningIn(false);
        }
    };

    return (
        <div
            className="bg-[var(--light-gray)] text-[var(--text-color)] flex min-h-screen flex-col md:h-screen md:overflow-hidden">
            {/* Header */}
            <header className="w-full bg-white shadow-sm">
                <div className="flex w-full items-center justify-between p-4">
                    {/* Izquierda: logo + nombre */}
                    <div className="flex items-center gap-3">
                        <svg className="h-8 w-8 text-[var(--brand-blue)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
                        </svg>
                        <h1 className="text-2xl font-bold text-[var(--text-color)]">Edu360</h1>
                    </div>

                    {/* Derecha: nav totalmente al extremo */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">Home</a>
                        <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">About</a>
                        <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">Support</a>
                    </nav>
                </div>
            </header>
            {/* Main */}
            <main className="flex-grow md:flex md:items-center md:justify-center md:py-0">
                <section className="mx-auto w-full max-w-screen-xl px-6 py-16 text-center md:py-0">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-8 md:mb-6">
                            <img
                                alt="Abstract illustration representing education, teachers, and technology"
                                className="mx-auto w-full max-w-md rounded-lg"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeCxF8Lgnm2Rjys_A2hxt5LIinfGLo1V49b2WKhR-Nx6m6RMuAFEckeSjH9L5yyG8oyOqTbgZEEkOkAOaiOLmK0f50t7siYLdNFgk-DoBGJN9lT5PwjV6Vgw_uHvTHTXNCqr1iMktZam0KilP3G5ijncBYuuL403gRpZBhNnVX2bx_rxmQzDZWNnpX9VN6rArvK-OFJ6Q8cfAMbKr9PZlHN17K7KINkKhwtjY_OPIJptxaaTFw6POk-d5Z1kBH7lxVSeqid0QBS7Y"
                            />
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-[var(--text-color)] sm:text-5xl md:text-6xl">
                            Welcome to <span className="text-[var(--brand-blue)]">Edu360</span>
                        </h1>

                        <p className="mt-6 text-lg leading-8 text-gray-600">
                            Impulsando a los profesores con innovación tecnológic
                        </p>

                        <p className="mt-4 mx-auto max-w-2xl text-base text-gray-500">
                            Nuestra plataforma está diseñada para brindar a los docentes del MEP las herramientas y
                            recursos necesarios para facilitar su labor, optimizar la gestión académica y potenciar el
                            aprendizaje de los estudiantes. Todo de manera integrada, sencilla y accesible.
                        </p>

                        <div className="mt-10 flex flex-col items-center gap-4">
                            <button
                                onClick={handleMicrosoftLogin}
                                disabled={signingIn}
                                className="flex items-center justify-center gap-3 rounded-lg bg-[#0078D4] px-6 py-3 text-lg font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-[#005a9e] disabled:cursor-not-allowed disabled:opacity-60">
                                {signingIn ? (
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                ) : (
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.5 22.5H2.5V13.5H11.5V22.5ZM21.5 11.5H12.5V2.5H21.5V11.5ZM11.5 11.5H2.5V2.5H11.5V11.5ZM21.5 22.5H12.5V13.5H21.5V22.5Z"></path>
                                    </svg>
                                )}
                                Acceder con cuenta Microsoft del MEP
                            </button>
                            <p className="text-sm text-[var(--dark-gray)]">
                                Acceso disponible solo para docentes del MEP
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

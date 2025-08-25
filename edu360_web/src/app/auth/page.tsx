'use client'
export default function LoginPage() {
    return (
        <div className="bg-[var(--bg-color)] flex items-center justify-center min-h-screen">
            <div className="bg-[var(--container-bg)] rounded-2xl shadow-xl p-12 w-full max-w-md border border-gray-200">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-[var(--text-color)]">Edu360</h1>
                    <p className="text-[var(--text-color)] mt-2">Bienvenido de nuevo</p>
                </div>

                {/* Form */}
                <form action="#" method="POST">
                    <div className="mb-6">
                        <label htmlFor="email" className="sr-only">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Correo electrónico"
                            required
                            className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none focus:border-[var(--button-bg)] transition-colors"
                        />
                    </div>

                    <div className="mb-8">
                        <label htmlFor="password" className="sr-only">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Contraseña"
                            required
                            className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none focus:border-[var(--button-bg)] transition-colors"
                        />
                    </div>

                    <div className="mb-6">
                        <button
                            type="submit"
                            className="w-full bg-[var(--button-bg)] text-[var(--button-text)] font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 ease-in-out transform hover:scale-105"
                        >
                            Iniciar sesión
                        </button>
                    </div>

                    <div className="text-center">
                        <a
                            href="#"
                            className="text-sm text-[var(--link-color)] hover:text-blue-700 transition-colors"
                        >
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}

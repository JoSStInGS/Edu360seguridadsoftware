import Link from 'next/link'

export default function Home() {
  return (
    <div className="bg-[var(--light-gray)] text-[var(--text-color)] flex min-h-screen flex-col md:h-screen md:overflow-hidden">
      <header className="w-full bg-white shadow-sm">
        <div className="flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-[var(--brand-blue)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <h1 className="text-2xl font-bold text-[var(--text-color)]">Edu360</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">Home</a>
            <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">About</a>
            <a className="text-base font-medium text-gray-600 hover:text-[var(--brand-blue)] transition-colors" href="#">Support</a>
          </nav>
        </div>
      </header>
      <main className="flex-grow md:flex md:items-center md:justify-center md:py-0">
        <section className="mx-auto w-full max-w-screen-xl px-6 py-16 text-center md:py-0">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-color)] sm:text-5xl md:text-6xl">
              Welcome to <span className="text-[var(--brand-blue)]">Edu360</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Impulsando a los profesores con innovación tecnológica
            </p>
            <p className="mt-4 mx-auto max-w-2xl text-base text-gray-500">
              Nuestra plataforma está diseñada para brindar a los docentes del MEP las herramientas y
              recursos necesarios para facilitar su labor, optimizar la gestión académica y potenciar el
              aprendizaje de los estudiantes. Todo de manera integrada, sencilla y accesible.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link
                href="/auth"
                className="rounded-lg bg-[var(--button-bg)] px-6 py-3 text-lg font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-blue-500"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

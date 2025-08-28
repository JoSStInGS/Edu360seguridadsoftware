# Edu360 Web

## Guía de ejecución

Sigue estos pasos para levantar la aplicación web de forma local.

### 1. Instalar dependencias básicas

Asegúrate de tener instalados:

- [Node.js 22.14](https://nodejs.org/en) (se recomienda usar [`nvm`](https://github.com/nvm-sh/nvm) para gestionar versiones)
- npm (incluido con Node)
- Git

### 2. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Edu360/edu360_web
```

### 3. Instalar las dependencias del proyecto

```bash
npm install
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en esta carpeta y pega las variables de entorno proporcionadas por el equipo.

### 5. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

### 6. Probar la aplicación

Abre <http://localhost:3000> en tu navegador para verificar que todo funciona correctamente.

---

#### Scripts disponibles

- `npm run dev` – levanta el servidor de desarrollo.
- `npm run build` – crea la versión de producción.
- `npm start` – ejecuta la versión de producción generada por `build`.
- `npm run lint` – analiza el código con ESLint.

Si encuentras algún problema, confirma que estás utilizando la versión correcta de Node y que las variables de entorno están configuradas correctamente.


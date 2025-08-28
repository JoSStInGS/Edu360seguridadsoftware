# Edu360

Guía rápida para ejecutar la aplicación web del proyecto.

## Prerrequisitos

- [Node.js 22.14](https://nodejs.org/en) (se recomienda usar [`nvm`](https://github.com/nvm-sh/nvm) para instalarlo)
- npm y Git

## Pasos para levantar la web

1. **Clonar el repositorio**

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Edu360/edu360_web
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Crea un archivo `.env` en `edu360_web` y pega las variables proporcionadas por el equipo.

4. **Ejecutar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

5. **Probar la aplicación**

   Abre <http://localhost:3000> en tu navegador.

Para más detalles consulta [`edu360_web/README.md`](edu360_web/README.md).


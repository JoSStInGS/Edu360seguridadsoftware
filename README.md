# Edu360 - Seguridad del Software
## Rama: jostin_parte_2_y_3
### Responsable: Jostin González Sánchez

## Vulnerabilidades corregidas

### Vulnerabilidad 8 (Cliente): Validación insegura de archivo CSV antes de subir
- **Archivo:** edu360_web/src/app/dashboard/students/import/page.tsx
- **Clasificación:** CWE-20 Improper Input Validation, CWE-1236 CSV Injection
- **Corrección:** Detección de fórmulas peligrosas (=, +, -, @) en el cliente antes de enviar al servidor

### Vulnerabilidad 9 (Servidor): Consulta de horarios por teacherId ajeno
- **Archivo:** edu360_web/src/app/api/schedules/route.ts
- **Clasificación:** OWASP A01 Broken Access Control, CWE-639 Authorization Bypass Through User-Controlled Key
- **Corrección:** Validación de que el profesor solo puede consultar sus propios horarios derivando su profesorId real desde Firestore

### Vulnerabilidad 10 (Servidor): Validación de códigos expone datos y facilita enumeración
- **Archivo:** edu360_web/src/app/api/validate-code/route.ts
- **Clasificación:** OWASP A04 Insecure Design, CWE-200, CWE-203, CWE-307
- **Corrección:** Mensajes de error genéricos y eliminación de datos sensibles (profesorId, periodId, studentCedulas) en la respuesta

### Vulnerabilidad 11 (Servidor): Gestión de usuarios permite cambios de rol demasiado amplios
- **Archivo:** edu360_web/src/app/api/users/route.ts
- **Clasificación:** OWASP A01 Broken Access Control, CWE-269 Improper Privilege Management
- **Corrección:** Validación del último admin activo del centro y registro de auditoría en cada cambio de rol o estado

### Vulnerabilidad 12 (Cliente): Formulario de agregar rol expone detalles del código
- **Archivo:** edu360_web/src/app/dashboard/add-role/page.tsx
- **Clasificación:** CWE-200 Exposure of Sensitive Information, CWE-359 Exposure of Private Personal Information
- **Corrección:** Eliminación de console.error y limpieza del código de activación tras cada intento exitoso o fallido

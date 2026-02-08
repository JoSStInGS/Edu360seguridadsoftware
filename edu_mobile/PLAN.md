# Edu360 Mobile - Plan de Desarrollo

## Resumen
App móvil React Native (Expo) para profesores. Permite iniciar sesión, ver horarios y pasar lista de asistencia.

---

## Checklist de Tareas

### Fase 1: Configuración Base
- [x] 1.1 Instalar dependencias (Firebase, AsyncStorage, fonts, etc.)
- [x] 1.2 Configurar tema/diseño (colores, fuentes Lexend, constantes)
- [x] 1.3 Configurar Firebase (auth + firestore)

### Fase 2: Autenticación
- [x] 2.1 Crear pantalla de Login (email/password, Google, Microsoft)
- [x] 2.2 Implementar servicios de autenticación Firebase
- [x] 2.3 Validación de rol profesor (solo profesores pueden acceder)
- [x] 2.4 Configurar navegación auth vs app (protección de rutas)

### Fase 3: Estructura de Navegación
- [x] 3.1 Configurar Bottom Tab Bar (Inicio, Horario, Asistencia, Perfil)
- [x] 3.2 Crear layouts y placeholders para cada pantalla

### Fase 4: Pantalla de Inicio (Dashboard)
- [x] 4.1 Mostrar info del profesor logueado
- [x] 4.2 Mostrar clase actual según horario
- [x] 4.3 Acceso rápido a pasar lista del grupo actual

### Fase 5: Pantalla de Horario
- [x] 5.1 Obtener horarios del profesor desde Firestore
- [x] 5.2 Vista semanal del horario
- [x] 5.3 Indicador de clase actual

### Fase 6: Pantalla de Asistencia
- [x] 6.1 Selección de grupo (auto-selección por horario actual)
- [x] 6.2 Lista de estudiantes del grupo
- [x] 6.3 Toggle presente/ausente por estudiante
- [x] 6.4 Guardar asistencia en Firestore
- [ ] 6.5 Historial de asistencias previas

### Fase 7: Pantalla de Perfil
- [x] 7.1 Info del profesor
- [x] 7.2 Cerrar sesión

### Fase 8: Pendientes / Mejoras futuras
- [ ] 8.1 Login con Google OAuth nativo (expo-auth-session)
- [ ] 8.2 Login con Microsoft OAuth nativo (expo-auth-session)
- [ ] 8.3 Historial de asistencias previas (ver y editar)
- [ ] 8.4 Notificaciones push para recordar pasar lista
- [ ] 8.5 Modo offline con sincronización
- [ ] 8.6 Vincular profesorId por campo explícito en Firestore (no solo email)

---

## Stack Tecnológico
- Expo SDK 54 + Expo Router 6
- Firebase Auth + Firestore
- React Native 0.81
- TypeScript
- Fuente: Lexend (igual que web)

## Diseño (basado en edu360_web)
- Primary: #135bec
- Button: #3498db
- Brand Blue: #1E3A8A
- Success: #16A34A
- Error: #e73c08
- Text: #111827
- Background: #f6f6f8
- Card: #ffffff
- Border: #e8eaf3
- Muted: #506295
- Font: Lexend (400, 500, 700)

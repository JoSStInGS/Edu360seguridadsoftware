# SRS — Especificación de Requisitos de Software
## Edu360 — Sistema de Gestión Educativa
**Versión:** 1.0
**Fecha:** 25 de febrero de 2026
**Estado:** En desarrollo activo

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Descripción General del Sistema](#2-descripción-general-del-sistema)
3. [Stakeholders y Roles de Usuario](#3-stakeholders-y-roles-de-usuario)
4. [Arquitectura Técnica](#4-arquitectura-técnica)
5. [Módulos y Funcionalidades](#5-módulos-y-funcionalidades)
6. [Modelo de Datos (Firestore)](#6-modelo-de-datos-firestore)
7. [Flujos de Autenticación](#7-flujos-de-autenticación)
8. [Estado Actual de Implementación](#8-estado-actual-de-implementación)
9. [Deuda Técnica y WIP](#9-deuda-técnica-y-wip)
10. [Recomendaciones Prioritarias](#10-recomendaciones-prioritarias)
11. [Roadmap Sugerido](#11-roadmap-sugerido)

---

## 1. Introducción

### 1.1 Propósito del Documento

Este documento especifica los requisitos funcionales y no funcionales de **Edu360**, un sistema de gestión educativa desarrollado para instituciones del Ministerio de Educación Pública (MEP) de Costa Rica. Sirve como referencia oficial para el equipo de desarrollo, ya que el proyecto avanzó sin documentación formal y este SRS busca remediar ese vacío.

### 1.2 Alcance del Sistema

Edu360 es un sistema completo de gestión educativa compuesto por:

- **Plataforma web** para administradores y profesores
- **Aplicación móvil** (Android/iOS) para profesores y padres de familia
- **Backend serverless** usando Firebase (Firestore, Auth, Storage, Functions)
- **API REST** expuesta a través de Next.js Route Handlers

El sistema permite gestionar asistencia, horarios, comunicaciones, justificaciones de ausencias y la vinculación de padres con sus hijos estudiantes dentro de centros educativos del MEP.

### 1.3 Contexto del Proyecto

El sistema está orientado al contexto del sistema educativo costarricense, donde:
- Los profesores y administradores poseen correos institucionales con dominio `@mep.go.cr`
- Los padres de familia poseen correos con dominio `@est.mep.go.cr`
- Cada institución es un "centro educativo" con períodos lectivos definidos
- El acceso al sistema requiere validación de dominio MEP

---

## 2. Descripción General del Sistema

### 2.1 Visión del Producto

Edu360 centraliza la gestión educativa diaria en una plataforma accesible tanto en web como en móvil, eliminando el uso de hojas de cálculo y sistemas desconectados para el registro de asistencia, horarios y comunicaciones.

### 2.2 Componentes del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        Edu360 System                         │
│                                                              │
│  ┌─────────────────┐          ┌──────────────────────────┐  │
│  │   Web App        │          │      Mobile App           │  │
│  │   (Next.js 15)   │          │    (Expo / React Native)  │  │
│  │                  │          │                           │  │
│  │  Admin Panel     │          │  Profesor (tabs)          │  │
│  │  Profesor Panel  │          │  Padre de familia (tabs)  │  │
│  └────────┬─────────┘          └───────────┬───────────────┘  │
│           │                               │                  │
│           └──────────┬────────────────────┘                  │
│                      │                                        │
│           ┌──────────▼────────────┐                          │
│           │   Firebase Backend    │                          │
│           │                       │                          │
│           │  - Auth               │                          │
│           │  - Firestore (DB)     │                          │
│           │  - Storage            │                          │
│           │  - Cloud Functions    │                          │
│           └───────────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Restricciones del Dominio

- El sistema es exclusivo para instituciones del MEP de Costa Rica.
- El registro requiere un código de activación generado por un administrador (no hay registro libre).
- El correo MEP es obligatorio para todos los usuarios.
- La información está particionada por centro educativo (`centerId`).

---

## 3. Stakeholders y Roles de Usuario

### 3.1 Roles Definidos

| Rol | Dominio MEP requerido | Descripción |
|-----|----------------------|-------------|
| `admin` | `@mep.go.cr` | Gestiona el centro educativo, usuarios y configuración general |
| `professor` | `@mep.go.cr` | Gestiona asistencia, horarios y comunicaciones de sus clases |
| `parent` | `@est.mep.go.cr` | Visualiza asistencia de sus hijos y envía justificaciones |

### 3.2 Capacidades por Rol

**Administrador:**
- Gestión completa de usuarios (crear, editar, ver)
- Generación de códigos de registro para todos los roles
- Gestión de períodos lectivos y centros educativos
- Importación masiva de datos (horarios, profesores, estudiantes via CSV)
- Vista global de ausencias de profesores

**Profesor:**
- Ver y registrar asistencia de sus grupos
- Consultar su horario de clases
- Enviar comunicados a estudiantes/padres
- Registrar y gestionar sus propias ausencias programadas

**Padre de Familia:**
- Ver asistencia en tiempo real de sus hijos vinculados
- Enviar justificaciones de ausencia (con adjuntos)
- Recibir comunicados de profesores
- Agregar hijos adicionales con nuevos códigos
- Gestionar su perfil

---

## 4. Arquitectura Técnica

### 4.1 Stack Tecnológico

#### Web Application (`edu360_web/`)
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 15.5.9 |
| UI | React | 19.1.0 |
| Componentes | Radix UI + shadcn/ui | Latest |
| Estilos | Tailwind CSS | v4 |
| Estado global | Zustand | 5.0.8 |
| Iconos | Lucide React | Latest |
| Backend-as-a-Service | Firebase (Auth + Firestore + Admin) | 12.x |

#### Mobile Application (`edu_mobile/`)
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Expo | 54.0.33 |
| Runtime | React Native | 0.81.5 |
| Enrutamiento | Expo Router (file-based) | 6.0.23 |
| Navegación | React Navigation Bottom Tabs | 7.4.0 |
| Estado | React Context API | — |
| Firebase | Firebase SDK | 12.9.0 |

#### Backend/Infraestructura
| Servicio | Proveedor | Uso |
|---------|----------|-----|
| Base de datos | Firebase Firestore | Datos en tiempo real |
| Autenticación | Firebase Auth | Email/password + Google |
| Almacenamiento | Firebase Storage | Adjuntos de justificaciones |
| Funciones serverless | Firebase Cloud Functions v2 | Procesamiento CSV |
| API REST | Next.js Route Handlers | Lógica de negocio servidor |

### 4.2 Estructura de Rutas — Web

```
/
├── /auth
│   ├── /                    Login principal
│   ├── /complete-profile    Registro en 2 pasos
│   └── /mep-email          Captura de correo MEP
├── /dashboard
│   ├── /                    Panel principal
│   ├── /users               Gestión de usuarios
│   ├── /attendance          Registro de asistencia
│   ├── /schedules           Horarios
│   ├── /students            Gestión de estudiantes
│   ├── /teachers            Gestión de profesores
│   ├── /groups              Gestión de grupos
│   └── /my-classes          Mis clases (profesor)
└── /welcome                 Redirección post-login
```

### 4.3 Estructura de Pantallas — Mobile

```
app/
├── login.tsx               Login (compartido)
├── register.tsx            Registro en 2 pasos
├── mep-email.tsx           Captura de correo MEP
├── add-child.tsx           Agregar hijo adicional
├── add-role.tsx            Agregar rol
├── compose-comunicado.tsx  Redactar comunicado
│
├── (tabs)/                 Navegación PROFESOR
│   ├── index              Home / Mis clases
│   ├── schedule           Horario
│   ├── attendance         Asistencia
│   ├── comunicados        Mensajes
│   └── profile            Perfil
│
└── (tabs-parent)/          Navegación PADRE
    ├── index              Home / Resumen de asistencia
    ├── attendance         Asistencia detallada
    ├── justificaciones    Justificaciones
    ├── comunicados        Mensajes
    ├── profile            Perfil (acceso por avatar)
    └── nueva-justificacion Nueva justificación
```

---

## 5. Módulos y Funcionalidades

### 5.1 Módulo de Autenticación

**Proveedores:**
- Email y contraseña (Firebase Auth)
- Google OAuth

**Flujo de Registro:**
1. Administrador genera código de activación (6 dígitos, expira en 15 min)
2. Usuario ingresa código → sistema valida rol, vigencia y cédulas de estudiantes (para padres)
3. Usuario crea cuenta (email/contraseña o Google)
4. Si el email no pertenece al dominio MEP → redirige a captura de correo MEP
5. Sistema guarda el correo MEP y redirige al dashboard/home

**Flujo de Login:**
1. Usuario ingresa credenciales
2. Sistema valida rol permitido
3. Verifica si falta el correo MEP → redirige si es necesario
4. Redirige al área correspondiente según rol

### 5.2 Módulo de Asistencia

**Requisitos funcionales:**
- RF-AS-01: Un profesor puede registrar asistencia por grupo y fecha
- RF-AS-02: El sistema muestra la lista de estudiantes del grupo para cada clase del horario
- RF-AS-03: El estado de asistencia es: `Presente`, `Ausente`, o `Justificado`
- RF-AS-04: Los registros se identifican por `{grupoId}_{fecha}_{scheduleId}`
- RF-AS-05: Los padres pueden ver en tiempo real el estado de asistencia de sus hijos
- RF-AS-06: El sistema muestra resumen diario y por materia para padres

### 5.3 Módulo de Horarios

**Requisitos funcionales:**
- RF-HO-01: Los administradores pueden importar horarios desde CSV
- RF-HO-02: Los profesores pueden consultar su horario desde web y móvil
- RF-HO-03: El horario se organiza por día, período y hora de inicio/fin
- RF-HO-04: Cada entrada de horario está asociada a un grupo y materia

### 5.4 Módulo de Justificaciones

**Requisitos funcionales:**
- RF-JU-01: Los padres pueden enviar justificaciones de tipo `preventiva` o `posterior`
- RF-JU-02: Las justificaciones pueden incluir archivos adjuntos (imagen o PDF)
- RF-JU-03: El estado de una justificación es: `pending` o `approved`
- RF-JU-04: Los profesores reciben y gestionan las justificaciones de sus estudiantes
- RF-JU-05: Las justificaciones afectan el estado de asistencia de `Ausente` a `Justificado`

### 5.5 Módulo de Comunicados

**Requisitos funcionales:**
- RF-CO-01: Los profesores pueden enviar comunicados a estudiantes o padres
- RF-CO-02: Los padres pueden ver y responder comunicados de profesores
- RF-CO-03: Los comunicados se almacenan en Firestore con referencia al período activo
- RF-CO-04: El sistema soporta comunicados bidireccionales

### 5.6 Módulo de Padres de Familia

**Requisitos funcionales:**
- RF-PA-01: Un padre se registra con un código generado por el administrador
- RF-PA-02: El código contiene las cédulas de los estudiantes vinculados
- RF-PA-03: Un padre puede tener múltiples hijos vinculados
- RF-PA-04: Los padres pueden agregar hijos adicionales con nuevos códigos
- RF-PA-05: El vínculo padre-estudiante se almacena en `parent_students`

### 5.7 Módulo de Gestión de Usuarios (Admin)

**Requisitos funcionales:**
- RF-US-01: El administrador puede ver la lista paginada de todos los usuarios del centro
- RF-US-02: El administrador puede editar el perfil de cualquier usuario
- RF-US-03: El administrador genera códigos de registro por rol
- RF-US-04: Para códigos de padres, el administrador especifica las cédulas de los hijos
- RF-US-05: Los códigos expiran a los 15 minutos de generados

### 5.8 Módulo de Ausencias de Profesores

**Requisitos funcionales:**
- RF-AUS-01: Los profesores pueden registrar sus ausencias programadas
- RF-AUS-02: El administrador puede ver todas las ausencias del centro
- RF-AUS-03: Las ausencias se definen por rango de fechas

---

## 6. Modelo de Datos (Firestore)

### 6.1 Esquema Principal

```
users/{uid}
├── email: string
├── displayName: string | null
├── roles: string[]           ← formato nuevo (preferido)
├── role: string              ← formato legado (mantener por compatibilidad)
├── centerId: string
├── centerName: string
├── mepEmail: string
├── profesorId: string        ← solo si es profesor
├── photoURL: string | null
├── provider: "email" | "google"
├── createdAt: string (ISO)
└── updatedAt: string (ISO)

centers/{centerId}
├── name: string
├── register_codes/{code}
│   ├── role: "admin" | "professor" | "parent"
│   ├── expires_at: Timestamp
│   ├── createdAt: Timestamp
│   ├── used: boolean
│   ├── usedBy: string | null
│   ├── createdBy: string (uid)
│   ├── periodId: string
│   └── studentCedulas: string[]   ← solo para rol "parent"
│
└── periods/{periodId}
    ├── name: string
    ├── startDate: Timestamp
    ├── endDate: Timestamp
    ├── active: boolean
    │
    ├── students/{cedula}
    │   ├── fullName: string
    │   ├── cedula: string
    │   ├── grupoId: string
    │   └── grupoNombre: string
    │
    ├── profesores/{profesorId}
    │   ├── nombre: string
    │   └── email: string
    │
    ├── schedules/{scheduleId}
    │   ├── dia: string
    │   ├── periodo: number
    │   ├── horaInicio: string
    │   ├── horaFin: string
    │   ├── grupoId: string
    │   └── profesorId: string
    │
    ├── attendance/{grupoId}_{fecha}_{scheduleId}
    │   ├── grupoId: string
    │   ├── date: string (YYYY-MM-DD)
    │   ├── scheduleId: string
    │   └── records: StudentAttendance[]
    │       ├── cedula: string
    │       ├── name: string
    │       └── status: "present" | "absent" | "justified"
    │
    ├── parent_students/{autoId}
    │   ├── parentUid: string
    │   ├── parentEmail: string
    │   ├── studentCedula: string
    │   ├── studentName: string
    │   ├── grupoId: string
    │   ├── grupoNombre: string
    │   ├── linkedAt: Timestamp
    │   └── linkedVia: "registration_code" | "admin_manual"
    │
    ├── justifications/{justificationId}
    │   ├── studentCedula: string
    │   ├── type: "preventiva" | "posterior"
    │   ├── status: "pending" | "approved"
    │   ├── attachmentUrl: string | null
    │   └── createdAt: Timestamp
    │
    ├── comunicados/{comunicadoId}
    │   ├── profesorId: string
    │   ├── studentCedula: string
    │   ├── subject: string
    │   ├── body: string
    │   └── createdAt: Timestamp
    │
    └── teacher_absences/{absenceId}
        ├── profesorId: string
        ├── startDate: string
        ├── endDate: string
        └── reason: string
```

---

## 7. Flujos de Autenticación

### 7.1 Registro de Profesor/Admin

```
1. Admin genera código en dashboard web
       ↓
2. Nuevo usuario abre la app o web
       ↓
3. Ingresa código → POST /api/validate-code
       ↓
4. Selecciona rol, centro (pre-llenado del código)
       ↓
5. Crea cuenta (email/contraseña o Google OAuth)
       ↓
6. Sistema evalúa si el email es dominio MEP
   ├── SÍ → guarda mepEmail automáticamente
   └── NO → redirige a /auth/mep-email (web) o /mep-email (mobile)
       ↓
7. Redirige a dashboard (web) o home (mobile)
```

### 7.2 Registro de Padre de Familia

```
1. Admin genera código "parent" con cédulas de estudiantes
       ↓
2. Padre ingresa código → sistema valida y recupera cédulas vinculadas
       ↓
3. Padre crea cuenta (email/contraseña)
       ↓
4. POST /api/users/create-parent-links → crea documentos en parent_students
       ↓
5. Validación de correo MEP (@est.mep.go.cr)
       ↓
6. Redirige a /(tabs-parent)/
```

### 7.3 Login Existente

```
1. Usuario ingresa credenciales
       ↓
2. Firebase Auth valida identidad
       ↓
3. Sistema lee perfil de users/{uid}
       ↓
4. Verifica que el rol sea válido para la plataforma
       ↓
5. Verifica si mepEmail está presente
   ├── Presente → continúa
   └── Ausente  → redirige a captura de correo MEP
       ↓
6. Redirige según rol:
   ├── admin/professor → /dashboard (web) o /(tabs)/ (mobile)
   └── parent → /(tabs-parent)/ (mobile)
```

---

## 8. Estado Actual de Implementación

### 8.1 Funcionalidades Completadas

| Módulo | Web | Mobile | Notas |
|--------|-----|--------|-------|
| Autenticación (email/password) | ✅ | ✅ | Completo |
| Autenticación (Google OAuth) | ✅ | ⚠️ | Solo web; mobile tiene placeholder |
| Registro con código | ✅ | ✅ | Ambas plataformas |
| Captura de correo MEP | ✅ | ✅ | Con validación de dominio por rol |
| Dashboard admin | ✅ | — | No aplica en mobile |
| Gestión de usuarios | ✅ | — | Solo web |
| Generación de códigos | ✅ | — | Solo web (admin) |
| Horarios (ver) | ✅ | ✅ | Ambas plataformas |
| Importar horarios CSV | ✅ | — | Solo web (admin) |
| Asistencia (registrar) | ✅ | ✅ | Profesor en ambas |
| Asistencia (ver, padre) | — | ✅ | Solo mobile, en tiempo real |
| Justificaciones (enviar) | — | ✅ | Solo mobile (padre) |
| Justificaciones (gestionar) | ✅ | — | Solo web (profesor) |
| Comunicados (enviar) | ✅ | ✅ | Ambas plataformas |
| Comunicados (ver) | ✅ | ✅ | Ambas plataformas |
| Ausencias de profesores | ✅ | ✅ | Ambas plataformas |
| Perfil de usuario | ✅ | ✅ | Ambas plataformas |
| Vinculación padre-hijo | ✅ | ✅ | API web + lectura mobile |
| Agregar hijo adicional | — | ✅ | Solo mobile |
| Importar profesores CSV | ✅ | — | Solo web |
| Importar estudiantes CSV | ✅ | — | Solo web |
| Dark mode | — | ✅ | Solo mobile |
| Notificaciones push | — | — | No implementado |

### 8.2 Endpoints de API Implementados

| Endpoint | Método | Estado |
|----------|--------|--------|
| `/api/validate-code` | POST | ✅ |
| `/api/users/generate-code` | POST | ✅ |
| `/api/users/create-parent-links` | POST | ✅ |
| `/api/users/save-mep-email` | POST | ✅ |
| `/api/users/add-role` | POST | ✅ |
| `/api/users/link-professor` | POST | ✅ |
| `/api/users` | GET | ✅ |
| `/api/centers` | GET | ✅ |
| `/api/attendance` | GET/POST | ✅ |
| `/api/attendance/students` | GET | ✅ |
| `/api/attendance/teacher-schedule` | GET | ✅ |
| `/api/schedules` | GET/POST | ✅ |
| `/api/schedules/import` | POST | ✅ |
| `/api/students` | GET | ✅ |
| `/api/teachers` | GET | ✅ |
| `/api/teachers/import` | POST | ✅ |
| `/api/justifications` | GET/POST | ✅ |
| `/api/justifications/[id]` | GET/DELETE | ✅ |
| `/api/comunicados` | GET/POST | ✅ |
| `/api/teacher-absences` | GET/POST | ✅ |
| `/api/my-classes` | GET | ✅ |
| `/api/import` | POST | ✅ |

---

## 9. Deuda Técnica y WIP

### 9.1 Problemas Técnicos Conocidos

| Problema | Severidad | Descripción |
|---------|-----------|-------------|
| Doble formato de roles | Media | El campo `role` (string) y `roles` (array) coexisten. Hay código que lee uno u otro según el contexto. Debe unificarse en `roles[]`. |
| Google OAuth en mobile | Media | El botón existe pero muestra un `Alert` de placeholder. Necesita implementación con `expo-auth-session` o similar. |
| Sin validación de token en API | Alta | Algunas rutas de la API de Next.js no verifican el token de Firebase del cliente antes de procesar. Deben protegerse con middleware de auth. |
| Sin paginación en Firestore | Media | Consultas como `getDocs(collection(...))` sin límite pueden ser costosas a escala. |
| Cloud Functions básicas | Baja | Las funciones en `/functions` son de ejemplo (addmessage, makeuppercase) y el procesamiento de CSV no está integrado con el flujo real del sistema. |

### 9.2 Funcionalidades Incompletas

| Feature | Estado | Detalle |
|---------|--------|---------|
| Google OAuth — mobile | 🟡 WIP | Solo placeholder, sin implementación real |
| Estadísticas de asistencia | 🟡 Parcial | Vista diaria existe, faltan resúmenes semanales/mensuales |
| Asignación de sustitutos | 🟡 Parcial | Ausencias de profesores se registran pero no hay flujo de sustitución |
| Notificaciones push | 🔴 Pendiente | Dependencia Firebase Messaging instalada pero sin integrar |
| Soporte offline (mobile) | 🔴 Pendiente | Sin cola de operaciones offline |
| Multi-centro por usuario | 🔴 Pendiente | Un usuario solo puede pertenecer a un centro actualmente |
| Calificaciones/Notas | 🔴 Pendiente | No iniciado |
| Reportes para padres | 🔴 Pendiente | Solo vista de asistencia diaria |

---

## 10. Recomendaciones Prioritarias

### 10.1 Seguridad (Prioridad ALTA)

**R-SEC-01: Proteger todos los endpoints de la API**

Actualmente los Route Handlers de Next.js no verifican que el usuario autenticado tenga permisos para ejecutar cada operación. Se debe implementar middleware que:
- Verifique el `Authorization: Bearer <token>` en cada request
- Valide el token con Firebase Admin SDK
- Verifique el rol del usuario contra la operación solicitada

```typescript
// Patrón recomendado para cada API Route
import { verifyFirebaseToken } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  const user = await verifyFirebaseToken(req);
  if (!user || !user.roles.includes("admin")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... lógica de negocio
}
```

**R-SEC-02: Configurar Firestore Security Rules**

Actualmente no hay evidencia de reglas de Firestore declaradas en el repositorio. Sin reglas, la seguridad depende 100% de la API, lo que es frágil. Se deben definir reglas que:
- Permitan lectura de asistencia solo a profesores del centro o padres vinculados al estudiante
- Permitan escritura de asistencia solo al profesor de la clase
- Permitan lectura de comunicados solo a las partes involucradas

**R-SEC-03: Unificar el modelo de roles**

Migrar todos los usuarios al formato `roles: string[]` y eliminar el campo `role: string`. Esto evita bugs silenciosos donde el código lee el campo incorrecto.

### 10.2 Calidad de Código (Prioridad MEDIA)

**R-CAL-01: Centralizar tipos compartidos**

Los tipos TypeScript como `UserRole`, `AttendanceRecord`, `StudentInfo` están duplicados entre web y mobile. Se recomienda:
- Crear un paquete compartido `@edu360/shared-types` (monorepo con Turborepo o similar)
- O mantener un archivo `types/shared.ts` en cada proyecto sincronizados manualmente

**R-CAL-02: Implementar manejo de errores consistente**

Los errores de Firebase (permisos, network) deben producir mensajes claros al usuario. Se recomienda un helper centralizado `handleFirebaseError(error)` tanto en web como mobile.

**R-CAL-03: Agregar variables de entorno tipadas**

En web, usar `src/env.ts` con validación via `zod` para evitar errores de runtime por variables faltantes.

### 10.3 Experiencia de Usuario (Prioridad MEDIA)

**R-UX-01: Implementar soporte offline en mobile**

La app mobile actualmente falla silenciosamente cuando no hay conexión. Se recomienda:
- Usar `@react-native-community/netinfo` para detectar conectividad
- Mostrar banner de "Sin conexión" claramente
- Hacer caché local con AsyncStorage para datos críticos (horario, último estado de asistencia)

**R-UX-02: Agregar dark mode a la web**

El mobile ya tiene dark mode con un sistema de tema robusto. La web usa variables CSS pero no tiene un toggle. Se puede implementar con `next-themes`.

**R-UX-03: Estados de carga y error explícitos**

Revisar que todas las pantallas tengan estados de: loading skeleton, error con opción de retry, y empty state cuando no hay datos.

### 10.4 Funcionalidades Faltantes Importantes (Prioridad MEDIA-ALTA)

**R-FEAT-01: Notificaciones push**

La dependencia ya está instalada. Implementar notificaciones para:
- Nuevo comunicado del profesor → notificar al padre
- Justificación aprobada → notificar al padre
- Nuevo comunicado → notificar al profesor

Usar Expo Notifications en mobile y Firebase Cloud Messaging.

**R-FEAT-02: Google OAuth en mobile**

Completar la implementación con `expo-auth-session` y `expo-web-browser` para que sea funcional en Android e iOS.

**R-FEAT-03: Reportes y estadísticas de asistencia**

Los padres y profesores necesitan vistas de resumen:
- % de asistencia por materia/período
- Historial de ausencias justificadas vs no justificadas
- Alertas cuando el % de asistencia baja de un umbral (ej. 85%)

### 10.5 Infraestructura y Escalabilidad (Prioridad BAJA-MEDIA)

**R-INF-01: Limitar consultas Firestore con paginación**

Añadir `limit()` y cursores a todas las consultas que devuelven colecciones grandes.

**R-INF-02: Integrar Cloud Functions con el flujo real**

Las funciones actuales son de demostración. Se pueden usar para:
- Procesar importaciones CSV pesadas de forma asíncrona
- Enviar notificaciones en masa
- Calcular estadísticas de asistencia periódicamente

**R-INF-03: Configurar entornos (dev / staging / prod)**

Separar el proyecto Firebase en al menos dos entornos: desarrollo y producción. Usar variables de entorno diferentes por entorno.

**R-INF-04: Agregar CI/CD básico**

Configurar GitHub Actions para:
- `npm run lint` y `npm run build` en cada PR
- Deploy automático a Vercel (web) y EAS build (mobile) en merge a `main`

---

## 11. Roadmap Sugerido

### Fase 1 — Estabilización (Inmediata)
- [ ] Implementar verificación de token en todos los endpoints de la API
- [ ] Escribir Firestore Security Rules
- [ ] Migrar modelo de `role` → `roles[]` en todos los usuarios
- [ ] Completar Google OAuth en mobile
- [ ] Agregar manejo de errores de red en mobile (banner + cache básico)

### Fase 2 — Mejoras de Producto (1-2 meses)
- [ ] Notificaciones push (comunicados + justificaciones)
- [ ] Estadísticas de asistencia (porcentaje, alertas de umbral)
- [ ] Dark mode en la web
- [ ] Estados de loading/error/empty en todas las pantallas
- [ ] Reportes exportables (PDF o CSV) para administradores

### Fase 3 — Nuevas Funcionalidades (2-4 meses)
- [ ] Módulo de calificaciones/notas
- [ ] Soporte para múltiples centros por usuario (admin regional)
- [ ] Asignación de sustitutos para ausencias de profesores
- [ ] App web progresiva (PWA) para acceso móvil sin instalar

### Fase 4 — Escala y Madurez (4+ meses)
- [ ] Migración a monorepo (Turborepo) para compartir tipos y lógica
- [ ] Separar entornos dev/staging/prod en Firebase
- [ ] CI/CD completo con GitHub Actions
- [ ] Tests automatizados (unitarios + integración)
- [ ] Analíticas de uso con Firebase Analytics

---

## Apéndice A — Convenciones de Código

- **Nombrado de archivos:** `kebab-case` para componentes y páginas
- **Tipos:** PascalCase para interfaces y types
- **Funciones de servicio:** camelCase, en archivos `*.service.ts` o `*.ts` dentro de `/services`
- **Variables de entorno web:** `NEXT_PUBLIC_*` para cliente, sin prefijo para servidor
- **Variables de entorno mobile:** `EXPO_PUBLIC_*` para cliente

## Apéndice B — Comandos de Desarrollo

```bash
# Web
cd edu360_web
npm install
npm run dev          # Puerto 3000

# Mobile
cd edu_mobile
npm install
npm start            # Expo DevTools
npm run android      # Emulador Android
npm run ios          # Simulador iOS

# Firebase Functions
cd functions/functions
npm install
firebase emulators:start
```

---

*Documento generado el 25 de febrero de 2026. Debe mantenerse actualizado conforme avance el proyecto.*

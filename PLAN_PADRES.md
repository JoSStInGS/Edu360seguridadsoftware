# Plan de Implementacion: Modulo de Padres de Familia

## Resumen
Permitir que padres de familia se registren en la app movil usando un codigo de activacion
(generado por el admin) que viene pre-vinculado con las cedulas de sus hijos. Al registrarse,
el padre puede ver en tiempo real la asistencia de cada uno de sus hijos.

---

## Modelo de Datos

### Codigo de registro ampliado
```
centers/{centerId}/register_codes/{code}
  role: "parent"
  expires_at: Date
  createdAt: Date
  used: false
  usedBy: null
  createdBy: "admin-uid"
  studentCedulas: ["1-1234-5678", "1-2345-6789"]   // NUEVO - array de cedulas de hijos
```

### Nueva coleccion: parent_students
```
centers/{centerId}/periods/{periodId}/parent_students/{autoId}
  parentUid: "firebase-uid-del-padre"
  parentEmail: "padre@email.com"
  studentCedula: "1-1234-5678"
  studentName: "Pablo Perez"          // denormalizado
  grupoId: "grupo-10A"               // denormalizado
  grupoNombre: "10-A"                // denormalizado
  linkedAt: Timestamp
  linkedVia: "registration_code" | "admin_manual"
```

### Documento de usuario padre
```
users/{uid}
  email: "padre@email.com"
  displayName: "Juan Perez"
  role: "parent"
  centerId: "centro-123"
  centerName: "Liceo ABC"
  provider: "email"
  createdAt: Timestamp
```

---

## Fases de Implementacion

---

### FASE 1: Backend Web - Generacion de codigos para padres
**Archivos a modificar:**

#### 1.1 API generate-code (`edu360_web/src/app/api/users/generate-code/route.ts`)
- [x] Aceptar campo `studentCedulas: string[]` en el body cuando `role === "parent"`
- [x] Validar que `studentCedulas` no este vacio cuando el rol es parent
- [x] Validar que cada cedula exista en `centers/{centerId}/periods/{periodId}/students`
- [x] Guardar `studentCedulas` en el documento del codigo

#### 1.2 API validate-code (`edu360_web/src/app/api/validate-code/route.ts`)
- [x] Retornar `studentCedulas` en la respuesta cuando el codigo es de tipo parent
- [x] Retornar `periodId` para padres (necesario para crear las relaciones)

#### 1.3 Nueva API: create-parent-links (`edu360_web/src/app/api/users/create-parent-links/route.ts`)
- [x] Endpoint POST que recibe: `centerId`, `periodId`, `parentUid`, `parentEmail`, `studentCedulas`
- [x] Para cada cedula, buscar el estudiante en Firestore y crear un doc en `parent_students`
- [x] Denormalizar: studentName, grupoId, grupoNombre
- [x] Si el padre ya tiene vinculos existentes, no duplicar (idempotente)
- [x] Retornar la lista de vinculos creados

---

### FASE 2: Frontend Web - Selector de estudiantes en GenerateCodeModal
**Archivos a modificar:**

#### 2.1 GenerateCodeModal (`edu360_web/src/app/dashboard/users/components/GenerateCodeModal.tsx`)
- [x] Cuando `selectedRole === "parent"`, mostrar un buscador de estudiantes
- [x] Permitir buscar por cedula o nombre
- [x] Permitir seleccionar multiples estudiantes (chips/tags)
- [x] Mostrar lista de estudiantes seleccionados con opcion de quitar
- [x] Pasar `studentCedulas` al `onGenerate` callback
- [x] Deshabilitar boton "Generar" si no hay estudiantes seleccionados (para parent)

#### 2.2 Users Page (`edu360_web/src/app/dashboard/users/page.tsx`)
- [x] Actualizar `handleGenerateCode` para enviar `studentCedulas` al API
- [x] Cargar lista de estudiantes del periodo activo (para el buscador del modal)
- [x] Actualizar interface de `onGenerate` para aceptar `studentCedulas`

---

### FASE 3: App Movil - Registro de padres
**Archivos a crear/modificar:**

#### 3.1 Pantalla de registro (`edu_mobile/app/register.tsx`) - NUEVO
- [x] Pantalla con 2 pasos (similar a la web):
  - **Paso 1**: Ingresar codigo de 6 digitos + seleccionar centro educativo
    - Validar codigo via API (reutilizar endpoint web existente)
    - El rol se detecta automaticamente del codigo (no es necesario que el padre lo seleccione)
  - **Paso 2**: Crear cuenta con email y contrasena
    - Campos: nombre completo, email, contrasena, confirmar contrasena
    - Crear usuario en Firebase Auth
    - Crear doc en `users/{uid}` con `role: "parent"`
    - Llamar API `create-parent-links` para vincular con hijos
- [x] Navegacion: desde login.tsx agregar boton "Crear cuenta" que lleva a register.tsx

#### 3.2 Actualizar login (`edu_mobile/app/login.tsx`)
- [x] Cambiar texto "Solo para profesores registrados" -> "Para profesores y padres de familia"
- [x] Agregar link/boton "No tienes cuenta? Registrate aqui"

#### 3.3 Actualizar auth service (`edu_mobile/services/auth.ts`)
- [x] `signInWithEmail`: aceptar roles `"professor"` y `"parent"` (no solo professor)
- [x] Nueva funcion `registerWithEmail(email, password)` que crea cuenta en Firebase Auth
- [x] Nueva funcion `createUserProfile(uid, data)` que crea doc en `users/{uid}`

#### 3.4 Actualizar AuthContext (`edu_mobile/contexts/AuthContext.tsx`)
- [x] Aceptar `role === "professor"` O `role === "parent"` como autenticado
- [x] Exponer `role` de forma accesible para determinar que navegacion mostrar

---

### FASE 4: App Movil - Navegacion condicional por rol
**Archivos a crear/modificar:**

#### 4.1 Root index (`edu_mobile/app/index.tsx`)
- [x] Si `role === "professor"` -> redirigir a `/(tabs-professor)` o `/(tabs)` (existente)
- [x] Si `role === "parent"` -> redirigir a `/(tabs-parent)` (nuevo)

#### 4.2 Tabs de profesor (mantener existente) (`edu_mobile/app/(tabs)/_layout.tsx`)
- [x] Sin cambios mayores, sigue igual (Inicio, Horario, Asistencia, Perfil)

#### 4.3 Tabs de padre - NUEVO (`edu_mobile/app/(tabs-parent)/_layout.tsx`)
- [x] Crear nuevo grupo de tabs para padres:
  - **Inicio**: Dashboard con resumen de hijos y asistencia del dia
  - **Asistencia**: Vista detallada de asistencia por hijo
  - **Perfil**: Datos del padre + logout
- [x] Wrappear en `ParentProvider` (nuevo context)

---

### FASE 5: App Movil - Contexto y servicios de padre
**Archivos a crear:**

#### 5.1 ParentContext (`edu_mobile/contexts/ParentContext.tsx`) - NUEVO
- [x] Estado:
  ```typescript
  centerId: string | null
  periodoId: string | null
  children: ParentChild[]  // hijos vinculados
  loading: boolean
  error: string | null
  refreshChildren: () => Promise<void>
  ```
- [x] Al montar: consultar `parent_students` donde `parentUid == user.uid`
- [x] Para cada hijo, obtener datos actualizados del estudiante
- [x] Exponer via context

#### 5.2 Tipos nuevos (`edu_mobile/types/index.ts`) - MODIFICAR
- [x] Agregar:
  ```typescript
  interface ParentChild {
    studentCedula: string
    studentName: string
    grupoId: string
    grupoNombre: string
  }

  interface ChildAttendanceStatus {
    scheduleEntry: ScheduleEntry
    status: 'pending' | 'present' | 'absent'
    date: string
  }
  ```

#### 5.3 Servicios Firestore para padres (`edu_mobile/services/parentFirestore.ts`) - NUEVO
- [x] `getParentChildren(centerId, periodId, parentUid)`: obtener hijos vinculados
- [x] `getChildSchedule(centerId, periodId, grupoId)`: obtener horario del grupo del hijo
- [x] `getChildAttendanceForDate(centerId, periodId, studentCedula, date)`:
  - Buscar todos los registros de `attendance` del dia para el grupo del hijo
  - Filtrar los records donde `studentId === studentCedula`
  - Retornar el estado (presente/ausente/pendiente) por cada clase
- [x] `getChildAttendanceHistory(centerId, periodId, studentCedula, dateRange)`:
  - Historial de asistencia para vista detallada

---

### FASE 6: App Movil - Pantallas de padre
**Archivos a crear:**

#### 6.1 Home del padre (`edu_mobile/app/(tabs-parent)/index.tsx`) - NUEVO
- [x] Saludo con nombre del padre
- [x] Si tiene 1 hijo: mostrar directamente el resumen del dia
- [x] Si tiene multiples hijos: mostrar tarjetas por cada hijo
- [x] Cada tarjeta de hijo muestra:
  - Nombre del hijo + grupo
  - Clase actual o proxima clase
  - Estado de asistencia del dia: "3/5 clases registradas" + icono por estado
  - Indicador visual: verde (presente), rojo (ausente), gris (pendiente)
- [x] Pull-to-refresh para actualizar datos

#### 6.2 Asistencia del padre (`edu_mobile/app/(tabs-parent)/attendance.tsx`) - NUEVO
- [x] Si multiples hijos: selector de hijo (tabs o dropdown)
- [x] Vista del dia actual por defecto
- [x] Lista de clases del dia con estado de asistencia:
  ```
  [09:00 - 09:40]  Matematicas     ✅ Presente
  [09:40 - 10:20]  Espanol         ❌ Ausente
  [10:40 - 11:20]  Ciencias        ⏳ Pendiente (el profesor aun no pasa lista)
  [11:20 - 12:00]  Ingles          ⏳ Pendiente
  ```
- [x] Selector de fecha para ver dias anteriores
- [x] Resumen estadistico: % asistencia semanal/mensual (futuro, opcional)

#### 6.3 Perfil del padre (`edu_mobile/app/(tabs-parent)/profile.tsx`) - NUEVO
- [x] Avatar con iniciales
- [x] Nombre + email del padre
- [x] Centro educativo
- [x] Lista de hijos vinculados con grupo
- [x] Boton de cerrar sesion

---

### FASE 7: Mejora - Agregar mas hijos con nuevo codigo
**Archivos a modificar:**

#### 7.1 API create-parent-links (ya creada en Fase 1)
- [x] Asegurar que sea idempotente: si ya existe la relacion, no duplicar
- [x] Soportar agregar nuevas cedulas a un padre existente

#### 7.2 API validate-code para padres existentes
- [x] Si un padre ya registrado valida un nuevo codigo (misma cuenta):
  - El codigo tiene `role: "parent"` con nuevas `studentCedulas`
  - No crear cuenta nueva, solo agregar las relaciones
- [x] En la app movil: agregar opcion en Perfil -> "Agregar otro hijo"
  - Abre un mini-flujo: ingresar codigo -> validar -> vincular -> refrescar lista

#### 7.3 Pantalla "Agregar hijo" en mobile (`edu_mobile/app/add-child.tsx`) - NUEVO
- [x] Input para codigo de 6 digitos
- [x] Validar codigo
- [x] Si valido, llamar `create-parent-links` con las nuevas cedulas
- [x] Mostrar confirmacion con nombres de hijos agregados
- [x] Volver al perfil con lista actualizada

---

## Orden de Ejecucion Recomendado

```
Fase 1 (Backend APIs)
  └── Fase 2 (Frontend web - modal con selector de estudiantes)
        └── Fase 3 (Mobile - registro de padres)
              └── Fase 4 (Mobile - navegacion condicional)
                    └── Fase 5 (Mobile - contexto y servicios)
                          └── Fase 6 (Mobile - pantallas UI)
                                └── Fase 7 (Mejora - agregar mas hijos)
```

---

## Archivos Clave Existentes (Referencia)

| Archivo | Proposito |
|---------|-----------|
| `edu360_web/src/app/api/users/generate-code/route.ts` | API generacion de codigos |
| `edu360_web/src/app/api/validate-code/route.ts` | API validacion de codigos |
| `edu360_web/src/app/api/users/link-professor/route.ts` | Referencia para crear link-parent |
| `edu360_web/src/app/dashboard/users/components/GenerateCodeModal.tsx` | Modal de generacion |
| `edu360_web/src/app/dashboard/users/page.tsx` | Pagina de usuarios |
| `edu360_web/src/app/auth/complete-profile/page.tsx` | Flujo registro web (referencia) |
| `edu_mobile/services/auth.ts` | Servicio auth mobile |
| `edu_mobile/services/firestore.ts` | Servicio firestore mobile |
| `edu_mobile/contexts/AuthContext.tsx` | Contexto de autenticacion |
| `edu_mobile/contexts/TeacherContext.tsx` | Contexto de profesor (referencia para ParentContext) |
| `edu_mobile/app/login.tsx` | Pantalla de login |
| `edu_mobile/app/(tabs)/_layout.tsx` | Layout de tabs profesor |
| `edu_mobile/types/index.ts` | Tipos compartidos |

---

## Consultas de Firestore Nuevas

### Para obtener hijos de un padre:
```
collection: centers/{centerId}/periods/{periodId}/parent_students
where: parentUid == "uid-del-padre"
```

### Para obtener asistencia de un hijo en un dia:
```
collection: centers/{centerId}/periods/{periodId}/attendance
where: grupoId == "grupo-del-hijo" AND date == "YYYY-MM-DD"
// Luego filtrar en cliente: record.records.find(r => r.studentId === cedula)
```

### Para saber si una clase ya tiene asistencia pasada:
```
docId: {grupoId}_{date}_{scheduleId}
// Si el doc existe -> asistencia ya fue pasada
// Buscar el estudiante en records[] -> present: true/false
// Si el doc NO existe -> pendiente (profesor no ha pasado lista)
```

---

## Notas Importantes

1. **Seguridad**: Los padres solo pueden leer datos de sus hijos vinculados. Las Firestore Rules
   deben validar que el `parentUid` del documento `parent_students` coincida con el `request.auth.uid`.

2. **Tiempo real**: Usar `onSnapshot` en lugar de `getDocs` para las consultas de asistencia
   del padre, asi cuando el profesor pase lista, el padre ve el cambio al instante.

3. **Cross-period**: Cuando se crea un nuevo periodo, se necesitara un mecanismo para
   migrar las relaciones `parent_students` (o re-vincular). Esto puede ser una tarea futura.

4. **La app movil NO tiene registro actualmente**: La Fase 3 agrega el primer flujo de
   registro a la app movil. Esto beneficia tambien a futuros profesores que quieran registrarse
   desde mobile.

5. **Mejora simple (Fase 7)**: Si un padre necesita agregar hijos despues, el admin genera
   un nuevo codigo con las cedulas adicionales. El padre ingresa el codigo desde su perfil
   y las nuevas relaciones se crean sin necesidad de una cuenta nueva.

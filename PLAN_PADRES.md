# Plan de Adaptacion: Modulo de Encargados Legales

## Proposito
Este plan reemplaza el enfoque anterior de "crear el modulo de padres" por uno de
adaptacion del trabajo ya construido al estado objetivo definido en
`backlog-refinado.md`.

El modulo existente ya cubre buena parte de la experiencia de vinculacion,
consulta de asistencia y justificaciones. La prioridad ya no es rehacer esas
pantallas, sino migrar sus contratos, persistencia y seguridad desde Firebase a
Supabase/PostgreSQL, y cerrar las brechas del backlog refinado.

## Historias del backlog que gobiernan este plan
- HU-03 — Vinculacion de estudiantes a encargados legales.
- HU-07 — Justificacion de ausencia posterior.
- HU-21 — Solicitud de ausencia anticipada.
- HU-22 — Historial de solicitudes y consulta administrativa.
- HU-23 — Centro de notificaciones en app.
- HU-33 — Consulta de tareas, entregas y asistencia resumida para seguimiento.
- Dependencias tecnicas relevantes: HU-01, HU-16 y HU-24.

## Base actual que se conserva
El repo ya contiene una base funcional que debe reutilizarse y migrarse, no
descartarse:

- Web:
  - Generacion de codigos para `parent` en `GenerateCodeModal`.
  - Endpoints de validacion de codigo y creacion de vinculos.
  - Integracion de seleccion de estudiantes desde la gestion de usuarios.
- Mobile:
  - Registro con codigo.
  - Flujo `add-child`.
  - Navegacion especifica para encargados en `(tabs-parent)`.
  - `ParentContext`, servicios de asistencia por hijo y vistas de perfil.
  - Flujo de justificaciones ya visible en la app.

Estos elementos sirven como inventario de migracion. Si una pantalla o flujo
ya existe y el backlog no cambia su experiencia, el trabajo debe enfocarse en
adaptarlo a Supabase y reforzar permisos, no en redisenarlo desde cero.

## Cambio de enfoque obligatorio
- Persistencia:
  - Sustituir Firestore por PostgreSQL/Supabase.
  - Sustituir consultas denormalizadas por tablas y vistas controladas.
- Autenticacion:
  - Migrar Firebase Auth a Supabase Auth.
  - Resolver perfil, roles y centro desde `profiles` y `user_roles`.
- Seguridad:
  - Reemplazar confianza en endpoints ad hoc por validacion JWT de Supabase,
    RLS y funciones server-side/Edge Functions cuando aplique.
- Terminologia de dominio:
  - Mantener "Encargado legal" en UX.
  - Alinear el modelo nuevo con `guardian_students`, aunque el codigo legado use
    nombres `parent*` durante la transicion.
- Cumplimiento del backlog:
  - Registrar consentimiento de tratamiento de datos al vincular estudiantes.
  - Verificar acceso exclusivo a estudiantes vinculados.
  - Preparar el modulo para historial, alertas y resumenes familiares posteriores.

## Modelo objetivo de datos
Los nombres exactos pueden ajustarse al esquema final, pero el plan debe partir
de esta separacion:

```sql
profiles
  id uuid primary key references auth.users(id)
  email text
  display_name text
  center_id uuid
  status text

user_roles
  user_id uuid
  role text
  center_id uuid
  is_active boolean

activation_codes
  id uuid
  code text
  center_id uuid
  role text
  expires_at timestamptz
  consumed_at timestamptz null
  consumed_by uuid null
  created_by uuid

guardian_link_codes
  id uuid
  code text
  center_id uuid
  expires_at timestamptz
  consumed_at timestamptz null
  created_by uuid

guardian_link_code_students
  code_id uuid
  student_id uuid

guardian_students
  guardian_id uuid
  student_id uuid
  center_id uuid
  consent_accepted_at timestamptz
  linked_at timestamptz
  linked_via text
  status text
```

## Fases de adaptacion

### Fase 0 — Inventario funcional y matriz de migracion
- [ ] Mapear cada archivo ya existente del modulo a su equivalente futuro en
      Supabase.
- [ ] Separar claramente que piezas se reutilizan sin cambios de UX, cuales se
      refactorizan y cuales se reemplazan.
- [ ] Cruzar el flujo actual con los CA de HU-03 y registrar brechas:
  - consentimiento,
  - uso unico/expiracion de codigos,
  - multiples encargados por estudiante,
  - acceso restringido por vinculo.

### Fase 1 — Codigos y vinculacion sobre Supabase
- [ ] Convertir la generacion y validacion de codigos desde colecciones Firestore
      a tablas PostgreSQL.
- [ ] Implementar consumo transaccional del codigo y creacion idempotente de
      vinculos `guardian_students`.
- [ ] Decidir si la validacion y consumo se resuelven mediante Route Handler,
      Edge Function o RPC, dejando una unica via canonica.
- [ ] Registrar consentimiento informado junto al vinculo.
- [ ] Conservar soporte para:
  - primer registro de encargado,
  - vinculacion de multiples estudiantes,
  - agregar nuevos hijos a una cuenta existente.

### Fase 2 — Adaptacion del panel web administrativo
- [ ] Reutilizar el modal y la UX ya construida para seleccionar estudiantes.
- [ ] Cambiar los endpoints web de generacion/validacion de codigos para que usen
      Supabase y validen JWT/rol de administrador.
- [ ] Mostrar estado del codigo conforme a HU-24:
  - vigente,
  - usado,
  - expirado.
- [ ] Mantener el flujo centrado en modificar la implementacion actual, no en
      redisenar la pantalla.

### Fase 3 — Registro y vinculacion en mobile
- [ ] Migrar `register.tsx`, `add-child.tsx` y servicios de autenticacion desde
      Firebase Auth a Supabase Auth.
- [ ] Resolver perfil, centro y rol desde las tablas nuevas despues del registro.
- [ ] Adaptar errores y estados de carga sin romper la experiencia existente.
- [ ] Revalidar los CA de HU-03 sobre el flujo actual antes de agregar UI nueva.

### Fase 4 — Contexto, consultas y vistas del encargado
- [ ] Migrar `ParentContext` y servicios `parentFirestore*` a repositorios o
      clientes Supabase.
- [ ] Sustituir lecturas denormalizadas por consultas seguras sobre vistas,
      joins o RPCs autorizadas.
- [ ] Mantener las pantallas ya disponibles:
  - resumen,
  - asistencia detallada,
  - perfil,
  - justificaciones.
- [ ] Evaluar Supabase Realtime solo donde aporte valor real; en el resto,
      conservar refresco controlado.

### Fase 5 — Justificaciones, historial y extensiones obligatorias
- [ ] Migrar adjuntos de justificaciones a Supabase Storage con policies
      alineadas a HU-07.
- [ ] Ajustar el historial de solicitudes para cubrir HU-22.
- [ ] Acomodar la ausencia anticipada de HU-21 sin duplicar flujos ya existentes.
- [ ] Preparar hooks de notificacion y resumen familiar para HU-23 y HU-33 sin
      introducir funcionalidad fuera de alcance en esta misma fase.

### Fase 6 — Seguridad, RLS y evidencia de cierre
- [ ] Implementar RLS para `guardian_students`, solicitudes y lecturas familiares.
- [ ] Probar que un encargado no puede leer ni mutar datos de estudiantes no
      vinculados.
- [ ] Verificar que endpoints server-side rechacen JWT invalido o rol incorrecto.
- [ ] Agregar pruebas automatizadas para:
  - vinculacion valida,
  - codigo vencido/usado,
  - consentimiento obligatorio,
  - acceso cruzado denegado.
- [ ] Documentar que evidencia valida cada CA de HU-03.

### Fase 7 — Corte de migracion y regresion
- [ ] Definir el orden de reemplazo de servicios Firebase restantes del modulo.
- [ ] Mantener pruebas de regresion de:
  - registro,
  - agregar hijo,
  - asistencia visible,
  - crear justificacion,
  - consultar historial.
- [ ] Retirar dependencias Firebase del modulo solo cuando los equivalentes
      Supabase esten verificados.

## Orden recomendado
```text
Fase 0 -> Fase 1 -> Fase 2 -> Fase 3 -> Fase 4 -> Fase 5 -> Fase 6 -> Fase 7
```

## Criterio para considerar este plan actualizado
El plan queda bien adaptado si cada tarea futura responde una de estas dos
preguntas:

1. Que parte funcional ya existente se conserva y se migra?
2. Que brecha concreta del backlog refinado se cierra?

Si una tarea no responde ninguna, probablemente pertenece a otro plan.

import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";
import type {
    ScheduleTeacher,
    ScheduleSubject,
    ScheduleGroup,
    ScheduleDivision,
    ScheduleClassroom,
    ScheduleTimeSlot,
    ScheduleEntry,
} from "@/types/schedule";

export const dynamic = "force-dynamic";

// Estructura esperada del payload
interface ImportPayload {
    periodoLectivo: string;
    data: {
        profesores: ScheduleTeacher[];
        asignaturas: ScheduleSubject[];
        grupos: ScheduleGroup[];
        divisiones: ScheduleDivision[];
        aulas: ScheduleClassroom[];
        periodosHorario: ScheduleTimeSlot[];
        horarios: ScheduleEntry[];
    };
}

export async function POST(request: Request) {
    try {
        // ============================================
        // 1. AUTENTICACIÓN
        // ============================================
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const app = ensureAdminApp();
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();

        // ============================================
        // 2. OBTENER CENTRO DEL USUARIO
        // ============================================
        const userDoc = await db.collection("users").doc(uid).get();
        const centerId = userDoc.data()?.centerId;

        if (!centerId) {
            return NextResponse.json(
                { error: "Usuario no tiene un centro asociado" },
                { status: 400 }
            );
        }

        // ============================================
        // 3. VALIDAR PAYLOAD
        // ============================================
        const { periodoLectivo, data }: ImportPayload = await request.json();

        if (!periodoLectivo || !data) {
            return NextResponse.json(
                { error: "Faltan campos requeridos: periodoLectivo y data" },
                { status: 400 }
            );
        }

        const {
            profesores = [],
            asignaturas = [],
            grupos = [],
            divisiones = [],
            aulas = [],
            periodosHorario = [],
            horarios = []
        } = data;

        if (horarios.length === 0) {
            return NextResponse.json(
                { error: "No hay horarios para importar" },
                { status: 400 }
            );
        }

        // ============================================
        // 4. REFERENCIA BASE DEL PERIODO
        // ============================================
        const periodRef = db.doc(`centers/${centerId}/periods/${periodoLectivo}`);

        // Asegurar que el documento del periodo existe
        const periodDoc = await periodRef.get();
        if (!periodDoc.exists) {
            await periodRef.set({
                periodoLectivo,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // ============================================
        // 5. CONTROL DE BATCHES
        // ============================================
        const MAX_OPS = 450; // Firestore limit = 500, dejamos margen
        let batch = db.batch();
        let operationCount = 0;

        const commitIfNeeded = async () => {
            if (operationCount >= MAX_OPS) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        };

        // ============================================
        // 6. HELPER PARA GUARDAR COLECCIONES
        // ============================================
        const saveToCollection = async <T extends { id: string }>(
            collectionName: string,
            items: T[],
            transform?: (item: T) => Record<string, unknown>
        ) => {
            for (const item of items) {
                const docRef = periodRef.collection(collectionName).doc(item.id);
                const docData = transform ? transform(item) : item;

                batch.set(docRef, {
                    ...docData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, { merge: true });

                operationCount++;
                await commitIfNeeded();
            }
        };

        // ============================================
        // 7. GUARDAR CATÁLOGOS
        // ============================================

        // Profesores
        await saveToCollection("profesores", profesores, (p) => ({
            id: p.id,
            nombre: p.nombre,
            nombreCorto: p.nombreCorto,
            email: p.email || null,
            source: p.source,
            status: "active"
        }));

        // Asignaturas
        await saveToCollection("asignaturas", asignaturas, (a) => ({
            id: a.id,
            nombre: a.nombre,
            nombreCorto: a.nombreCorto,
            source: a.source
        }));

        // Grupos
        await saveToCollection("grupos", grupos, (g) => ({
            id: g.id,
            nombre: g.nombre,
            nombreCorto: g.nombreCorto,
            aulaAsignada: g.aulaAsignada || null,
            hasDivisions: g.hasDivisions || false,
            source: g.source
        }));

        // Divisiones (subgrupos de cada clase)
        await saveToCollection("divisiones", divisiones, (d) => ({
            id: d.id,
            nombre: d.nombre,
            grupoId: d.grupoId,
            entireClass: d.entireClass,
            divisionTag: d.divisionTag
        }));

        // Aulas
        await saveToCollection("aulas", aulas, (a) => ({
            id: a.id,
            nombre: a.nombre,
            nombreCorto: a.nombreCorto,
            capacidad: a.capacidad || null,
            source: a.source
        }));

        // Periodos horarios (franjas del día)
        await saveToCollection("periodosHorario", periodosHorario, (p) => ({
            id: p.id,
            periodo: p.periodo,
            nombre: p.nombre,
            horaInicio: p.horaInicio,
            horaFin: p.horaFin
        }));

        // ============================================
        // 8. GUARDAR HORARIOS (colección principal)
        // ============================================
        await saveToCollection("horarios", horarios, (h) => ({
            id: h.id,
            // Día
            dia: h.dia,
            diaIndex: h.diaIndex,
            // Tiempo
            periodo: h.periodo,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            // Profesor (desnormalizado)
            profesorId: h.profesorId,
            profesorNombre: h.profesorNombre,
            // Grupo (desnormalizado)
            grupoId: h.grupoId,
            grupoNombre: h.grupoNombre,
            // División (desnormalizado)
            divisionId: h.divisionId || null,
            divisionNombre: h.divisionNombre || null,
            isEntireClass: h.isEntireClass ?? true,
            // Asignatura (desnormalizado)
            asignaturaId: h.asignaturaId,
            asignaturaNombre: h.asignaturaNombre,
            // Aula (desnormalizado)
            aulaId: h.aulaId,
            aulaNombre: h.aulaNombre,
            // Metadata
            source: h.source
        }));

        // ============================================
        // 9. COMMIT FINAL
        // ============================================
        if (operationCount > 0) {
            await batch.commit();
        }

        // ============================================
        // 10. RESPUESTA EXITOSA
        // ============================================
        return NextResponse.json({
            success: true,
            message: "Horarios importados exitosamente",
            counts: {
                profesores: profesores.length,
                asignaturas: asignaturas.length,
                grupos: grupos.length,
                divisiones: divisiones.length,
                aulas: aulas.length,
                periodosHorario: periodosHorario.length,
                horarios: horarios.length
            }
        });

    } catch (error) {
        console.error("Error en importación de horarios:", error);

        // Manejo específico de errores de Firebase
        if (error instanceof Error) {
            if (error.message.includes("PERMISSION_DENIED")) {
                return NextResponse.json(
                    { error: "Permisos insuficientes para realizar esta operación" },
                    { status: 403 }
                );
            }
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// ============================================
// DOCUMENTACIÓN DE CONSULTAS FIRESTORE
// ============================================
/**
 * EJEMPLOS DE CONSULTAS PARA EL FRONTEND:
 *
 * 1. Horario completo de un profesor:
 * ```typescript
 * const q = query(
 *   collection(db, `centers/${centerId}/periods/${periodo}/horarios`),
 *   where("profesorId", "==", profesorId),
 *   orderBy("diaIndex"),
 *   orderBy("periodo")
 * );
 * ```
 *
 * 2. Clases del profesor X el día Lunes:
 * ```typescript
 * const q = query(
 *   collection(db, `centers/${centerId}/periods/${periodo}/horarios`),
 *   where("profesorId", "==", profesorId),
 *   where("dia", "==", "Lunes"),
 *   orderBy("periodo")
 * );
 * ```
 *
 * 3. Horario de un grupo específico:
 * ```typescript
 * const q = query(
 *   collection(db, `centers/${centerId}/periods/${periodo}/horarios`),
 *   where("grupoId", "==", grupoId),
 *   orderBy("diaIndex"),
 *   orderBy("periodo")
 * );
 * ```
 *
 * 4. Todas las clases de una asignatura:
 * ```typescript
 * const q = query(
 *   collection(db, `centers/${centerId}/periods/${periodo}/horarios`),
 *   where("asignaturaId", "==", asignaturaId),
 *   orderBy("diaIndex"),
 *   orderBy("periodo")
 * );
 * ```
 *
 * 5. Disponibilidad de un aula:
 * ```typescript
 * const q = query(
 *   collection(db, `centers/${centerId}/periods/${periodo}/horarios`),
 *   where("aulaId", "==", aulaId),
 *   where("dia", "==", "Lunes"),
 *   orderBy("periodo")
 * );
 * ```
 *
 * ÍNDICES COMPUESTOS RECOMENDADOS (crear en Firebase Console):
 * - horarios: profesorId ASC, diaIndex ASC, periodo ASC
 * - horarios: grupoId ASC, diaIndex ASC, periodo ASC
 * - horarios: profesorId ASC, dia ASC, periodo ASC
 */

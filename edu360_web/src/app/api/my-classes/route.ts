import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";
import type { GroupedClass, ClassSession } from "@/types/myClasses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
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
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const centerId = userData.centerId as string;

        if (!centerId) {
            return NextResponse.json({ error: "Usuario sin centro asociado" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");

        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        // Resolve teacherDocId — same pattern as teacher-schedule/route.ts
        let teacherDocId = userData.profesorId as string | undefined;
        const email = userData.email as string | undefined;

        if (!teacherDocId && email) {
            const profSnap = await db
                .collection("centers").doc(centerId)
                .collection("periods").doc(periodId)
                .collection("profesores")
                .where("email", "==", email)
                .limit(1)
                .get();

            if (!profSnap.empty) {
                teacherDocId = profSnap.docs[0].id;
            }
        }

        if (!teacherDocId) {
            return NextResponse.json({ classes: [] });
        }

        // Fetch all horarios and filter in memory to avoid composite index requirements
        const horariosSnap = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("horarios")
            .get();

        const myHorarios = horariosSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown> & { id: string }))
            .filter((h) => h.profesorId === teacherDocId);

        // Group by asignaturaId__grupoId
        const groupMap = new Map<string, GroupedClass>();

        for (const h of myHorarios) {
            const asignaturaId = (h.asignaturaId as string) || "";
            const grupoId = (h.grupoId as string) || "";
            const key = `${asignaturaId}__${grupoId}`;

            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    key,
                    asignaturaId,
                    asignaturaNombre: (h.asignaturaNombre as string) || asignaturaId,
                    grupoId,
                    grupoNombre: (h.grupoNombre as string) || grupoId,
                    aulaId: (h.aulaId as string) || "",
                    aulaNombre: (h.aulaNombre as string) || (h.aulaId as string) || "",
                    studentCount: 0,
                    sessions: [],
                });
            }

            const session: ClassSession = {
                scheduleId: h.id,
                dia: (h.dia as string) || "",
                diaIndex: typeof h.diaIndex === "number" ? h.diaIndex : 99,
                horaInicio: (h.horaInicio as string) || "",
                horaFin: (h.horaFin as string) || "",
            };

            groupMap.get(key)!.sessions.push(session);
        }

        // Sort sessions within each group by diaIndex then horaInicio
        for (const gc of groupMap.values()) {
            gc.sessions.sort((a, b) => {
                if (a.diaIndex !== b.diaIndex) return a.diaIndex - b.diaIndex;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
        }

        // Count students per group in parallel
        const groupedClasses = Array.from(groupMap.values());

        const uniqueGrupoIds = [...new Set(groupedClasses.map((gc) => gc.grupoId))];

        const studentCounts = await Promise.all(
            uniqueGrupoIds.map(async (gid) => {
                const snap = await db
                    .collection("centers").doc(centerId)
                    .collection("periods").doc(periodId)
                    .collection("students")
                    .where("grupoId", "==", gid)
                    .get();
                return { grupoId: gid, count: snap.size };
            })
        );

        const countMap = new Map(studentCounts.map((sc) => [sc.grupoId, sc.count]));

        for (const gc of groupedClasses) {
            gc.studentCount = countMap.get(gc.grupoId) ?? 0;
        }

        // Sort result by asignaturaNombre then grupoNombre
        groupedClasses.sort((a, b) => {
            const bySubject = a.asignaturaNombre.localeCompare(b.asignaturaNombre);
            if (bySubject !== 0) return bySubject;
            return a.grupoNombre.localeCompare(b.grupoNombre);
        });

        return NextResponse.json({ classes: groupedClasses, profesorId: teacherDocId });
    } catch (error) {
        console.error("Error fetching my-classes:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

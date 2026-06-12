import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period");
        const teacherId = searchParams.get("teacherId");
        const groupId = searchParams.get("groupId");
        const divisionId = searchParams.get("divisionId"); // Para filtrar por división específica

        if (!period) {
            return NextResponse.json({ error: "Period parameter is required" }, { status: 400 });
        }

        // Auth
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const app = ensureAdminApp();
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const db = getAdminFirestore();

        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        const centerId = userData?.centerId;
        const userRole = userData?.role;

        if (!centerId) {
            return NextResponse.json({ error: "No center found for user" }, { status: 400 });
        }

        // CORRECCIÓN: Si el usuario es profesor, obtener su profesorId real desde Firestore
        // y bloquear cualquier intento de consultar el teacherId de otro profesor
        if (userRole === "professor") {
            const profesorSnapshot = await db
                .collection(`centers/${centerId}/periods/${period}/profesores`)
                .where("uid", "==", uid)
                .limit(1)
                .get();

            if (profesorSnapshot.empty) {
                return NextResponse.json(
                    { error: "No se encontró el perfil de profesor para este usuario." },
                    { status: 403 }
                );
            }

            const realProfesorId = profesorSnapshot.docs[0].id;

            // Si intentó consultar un teacherId ajeno, bloquearlo
            if (teacherId && teacherId !== realProfesorId) {
                return NextResponse.json(
                    { error: "Acceso denegado. No puede consultar horarios de otro profesor." },
                    { status: 403 }
                );
            }

            // Si consultó por groupId, verificar que el profesor tiene clases en ese grupo
            if (groupId && !teacherId) {
                const grupoSnapshot = await db
                    .collection(`centers/${centerId}/periods/${period}/horarios`)
                    .where("grupoId", "==", groupId)
                    .where("profesorId", "==", realProfesorId)
                    .limit(1)
                    .get();

                if (grupoSnapshot.empty) {
                    return NextResponse.json(
                        { error: "Acceso denegado. No tiene clases asignadas en este grupo." },
                        { status: 403 }
                    );
                }
            }
        }

        const periodRef = db.doc(`centers/${centerId}/periods/${period}`);

        // 1. Check if ANY schedules exist (by checking if 'horarios' collection is not empty)
        // We can limit 1 just to check existence
        const schedulesSnapshot = await periodRef.collection("horarios").limit(1).get();
        const hasSchedules = !schedulesSnapshot.empty;

        if (!hasSchedules) {
            return NextResponse.json({
                hasSchedules: false,
                teachers: [],
                groups: [],
                divisions: [],
                timeSlots: [],
                schedules: []
            });
        }

        // 2. Fetch Teachers (for the dropdown)
        const teachersSnapshot = await periodRef.collection("profesores").orderBy("nombre").get();
        const teachers = teachersSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre,
            ...doc.data()
        }));

        // 3. Fetch Groups (for the dropdown)
        const groupsSnapshot = await periodRef.collection("grupos").orderBy("nombre").get();
        const groups = groupsSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre,
            hasDivisions: doc.data().hasDivisions || false,
            ...doc.data()
        }));

        // 4. Fetch Divisions (subgrupos)
        const divisionsSnapshot = await periodRef.collection("divisiones").get();
        const divisions = divisionsSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre,
            grupoId: doc.data().grupoId,
            entireClass: doc.data().entireClass,
            divisionTag: doc.data().divisionTag
        }));

        // 5. Fetch Time Slots (periodos horarios de la institución)
        const timeSlotsSnapshot = await periodRef.collection("periodosHorario").orderBy("periodo").get();
        const timeSlots = timeSlotsSnapshot.docs.map(doc => ({
            id: doc.id,
            periodo: doc.data().periodo,
            nombre: doc.data().nombre,
            horaInicio: doc.data().horaInicio,
            horaFin: doc.data().horaFin
        }));

        // 6. Fetch schedules based on filter (teacherId or groupId with optional divisionId)
        interface ScheduleItem {
            id: string;
            divisionId?: string;
            isEntireClass?: boolean;
            [key: string]: unknown;
        }
        let schedules: ScheduleItem[] = [];

        if (teacherId) {
            const teacherSchedulesSnapshot = await periodRef.collection("horarios")
                .where("profesorId", "==", teacherId)
                .orderBy("diaIndex")
                .orderBy("periodo")
                .get();

            schedules = teacherSchedulesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ScheduleItem[];
        } else if (groupId) {
            // Obtener todos los horarios del grupo
            const groupSchedulesSnapshot = await periodRef.collection("horarios")
                .where("grupoId", "==", groupId)
                .orderBy("diaIndex")
                .orderBy("periodo")
                .get();

            const allSchedules = groupSchedulesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ScheduleItem[];

            // Si se especifica una división, filtrar por ella
            // divisionId puede ser "all" para ver todas o un id específico
            if (divisionId && divisionId !== "all") {
                schedules = allSchedules.filter((s) =>
                    s.divisionId === divisionId || s.isEntireClass === true
                );
            } else {
                schedules = allSchedules;
            }
        }

        return NextResponse.json({
            hasSchedules: true,
            teachers,
            groups,
            divisions,
            timeSlots,
            schedules
        });

    } catch (error) {
        console.error("Error fetching schedules:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

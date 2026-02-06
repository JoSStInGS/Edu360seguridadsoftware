import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { QuerySnapshot } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export interface Student {
    id: string;
    cedula: string;
    centerId: string;
    centerName: string;
    createdAt: FirebaseFirestore.Timestamp | null;
    updatedAt: FirebaseFirestore.Timestamp | null;
    name: string | null;
    lastName1: string | null;
    lastName2: string | null;
    fullName: string | null;
    fullName_lower: string | null;
    grupoId: string | null;
    grupoNombre: string | null;
    periodoLectivo: string;
    specialty: string | null;
    birthdate: string | null;
}


export async function GET(request: Request) {
    try {
        // 1. Get the authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        // 2. Verify the token
        const { getAuth } = await import("firebase-admin/auth");
        const { ensureAdminApp } = await import("@/app/lib/firebaseAdmin");

        const app = ensureAdminApp();
        const auth = getAuth(app);

        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();

        // 3. Get user's center from their profile
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const centerId = userData?.centerId;

        if (!centerId) {
            return NextResponse.json({ error: "User is not associated with a center" }, { status: 400 });
        }

        // 4. Parse pagination and search parameters
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get("limit");
        const lastVisibleId = searchParams.get("lastVisibleId");
        const search = searchParams.get("search");
        const period = searchParams.get("period");
        const grupoId = searchParams.get("grupoId");

        if (!period) {
            return NextResponse.json({ error: "Period is required" }, { status: 400 });
        }

        const limit = limitParam ? parseInt(limitParam, 10) : 10;


        // 5. Fetch students
        const studentsRef = db
            .collection("centers")
            .doc(centerId)
            .collection("periods")
            .doc(period)
            .collection("students");

        let students: Student[] = [];
        let newLastVisibleId = null;

        if (search) {
            // Search logic - search by cedula or fullName_lower
            const searchLower = search.toLowerCase().trim();
            const searchEnd = searchLower + "\uf8ff";

            // Try searching by cedula first (if looks like a cedula)
            const isCedulaLike = /^[\d\-]+$/.test(search.trim());

            if (isCedulaLike) {
                // Search by cedula (prefix match)
                const cleanSearch = search.replace(/-/g, '').trim();
                const snapshot = await studentsRef
                    .where("cedula", ">=", cleanSearch)
                    .where("cedula", "<=", cleanSearch + "\uf8ff")
                    .limit(limit)
                    .get();
                students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
            }

            // If no results from cedula search or it wasn't cedula-like, search by name
            if (students.length === 0) {
                const fullNameSnap = await studentsRef
                    .where("fullName_lower", ">=", searchLower)
                    .where("fullName_lower", "<=", searchEnd)
                    .limit(limit)
                    .get();

                students = fullNameSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
            }

            // If still no results, try individual name fields
            if (students.length === 0) {
                const [nameSnap, lastName1Snap, lastName2Snap] = await Promise.all([
                    studentsRef.where("name", ">=", search).where("name", "<=", search + "\uf8ff").limit(limit).get(),
                    studentsRef.where("lastName1", ">=", search).where("lastName1", "<=", search + "\uf8ff").limit(limit).get(),
                    studentsRef.where("lastName2", ">=", search).where("lastName2", "<=", search + "\uf8ff").limit(limit).get(),
                ]);

                // Merge results by ID to avoid duplicates
                const studentsMap = new Map<string, Student>();

                const addToMap = (snap: QuerySnapshot) => {
                    snap.docs.forEach((doc) => {
                        if (!studentsMap.has(doc.id)) {
                            studentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Student);
                        }
                    });
                };

                addToMap(nameSnap);
                addToMap(lastName1Snap);
                addToMap(lastName2Snap);

                students = Array.from(studentsMap.values());

                // Sort by fullName in memory
                students.sort((a: Student, b: Student) => {
                    const nameA = (a.fullName || '').toLowerCase();
                    const nameB = (b.fullName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                students = students.slice(0, limit);
            }
        } else if (grupoId) {
            // Filter by group - needs composite index: grupoId ASC, cedula ASC
            let studentsQuery = studentsRef
                .where("grupoId", "==", grupoId)
                .orderBy("cedula")
                .limit(limit);

            if (lastVisibleId) {
                const lastVisibleDoc = await studentsRef.doc(lastVisibleId).get();
                if (lastVisibleDoc.exists) {
                    studentsQuery = studentsQuery.startAfter(lastVisibleDoc);
                }
            }

            const snapshot = await studentsQuery.get();
            students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Student));
        } else {
            // Standard Pagination Logic - order by cedula (always exists as doc ID)
            let studentsQuery = studentsRef.orderBy("cedula").limit(limit);

            if (lastVisibleId) {
                const lastVisibleDoc = await studentsRef.doc(lastVisibleId).get();
                if (lastVisibleDoc.exists) {
                    studentsQuery = studentsQuery.startAfter(lastVisibleDoc);
                }
            }

            const snapshot = await studentsQuery.get();
            students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Student));
        }

        // Determine the last visible ID for the next page
        newLastVisibleId = students.length > 0 ? students[students.length - 1].id : null;

        // Get total count for pagination (only when not searching)
        let totalCount = 0;
        try {
            if (!search) {
                const countSnapshot = await studentsRef.count().get();
                totalCount = countSnapshot.data().count;
            }
        } catch (countError) {
            console.error("Error getting count:", countError);
            // If count fails, estimate based on current page
            totalCount = students.length;
        }

        return NextResponse.json({
            students,
            lastVisibleId: newLastVisibleId,
            totalCount,
            totalPages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        });

    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

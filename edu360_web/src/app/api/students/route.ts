import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function formatCedula(value: string) {
    const clean = value.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length > 1) {
        formatted = clean.slice(0, 1) + '-' + clean.slice(1);
    }
    if (clean.length > 5) {
        formatted = formatted.slice(0, 6) + '-' + formatted.slice(6);
    }
    return formatted;
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

        let students = [];
        let newLastVisibleId = null;

        if (search) {
            // Search logic
            const cleanSearch = search.replace(/-/g, '');
            const isNumeric = /^\d+$/.test(cleanSearch) && cleanSearch.length > 0;

            if (isNumeric) {
                // Search by Cedula (Prefix match with formatting)
                const formattedCedula = formatCedula(cleanSearch);
                const endCedula = formattedCedula + "\uf8ff";

                const snapshot = await studentsRef
                    .where("ced", ">=", formattedCedula)
                    .where("ced", "<=", endCedula)
                    .limit(limit)
                    .get();
                students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                // Search by Name/LastNames (Prefix match)
                // Firestore doesn't support OR across different fields natively, so we run parallel queries.
                // Note: This is case-sensitive.
                const term = search;
                const endTerm = term + "\uf8ff";

                const [nameSnap, lastName1Snap, lastName2Snap] = await Promise.all([
                    studentsRef.where("name", ">=", term).where("name", "<=", endTerm).get(),
                    studentsRef.where("lastName1", ">=", term).where("lastName1", "<=", endTerm).get(),
                    studentsRef.where("lastName2", ">=", term).where("lastName2", "<=", endTerm).get()
                ]);

                // Merge results by ID to avoid duplicates
                const studentsMap = new Map();

                const addToMap = (snap: any) => {
                    snap.docs.forEach((doc: any) => {
                        if (!studentsMap.has(doc.id)) {
                            studentsMap.set(doc.id, { id: doc.id, ...doc.data() });
                        }
                    });
                };

                addToMap(nameSnap);
                addToMap(lastName1Snap);
                addToMap(lastName2Snap);

                students = Array.from(studentsMap.values());

                // Sort by name in memory
                students.sort((a: any, b: any) => {
                    const nameA = `${a.name} ${a.lastName1} ${a.lastName2}`.toLowerCase();
                    const nameB = `${b.name} ${b.lastName1} ${b.lastName2}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                // Apply limit (and simple offset pagination if we wanted, but for now just limit)
                // If we wanted to support pagination with search, we'd need to filter after the lastVisibleId in memory
                // which is inefficient for large result sets but okay for search results usually.
                if (lastVisibleId) {
                    const startIndex = students.findIndex((s: any) => s.id === lastVisibleId);
                    if (startIndex !== -1) {
                        students = students.slice(startIndex + 1);
                    }
                }

                students = students.slice(0, limit);
            }
        } else {
            // Standard Pagination Logic
            let studentsQuery = studentsRef.orderBy("name").limit(limit);

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
            }));
        }

        // Determine the last visible ID for the next page
        newLastVisibleId = students.length > 0 ? students[students.length - 1].id : null;

        return NextResponse.json({
            students,
            lastVisibleId: newLastVisibleId
        });

    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

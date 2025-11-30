import { useEffect } from 'react';
import { useAuth } from '@/app/auth/hooks/useAuth';
import { usePeriodStore } from '@/app/stores/usePeriodStore';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export function useFetchPeriods() {
    const { user } = useAuth();
    const { setPeriods, setSelectedPeriod, setLoading, periods, selectedPeriod } = usePeriodStore();

    useEffect(() => {
        const fetchPeriods = async () => {
            if (!user) return;

            // Avoid re-fetching if we already have periods (unless we want to support real-time updates, but simple fetch is fine for now)
            if (periods.length > 0) return;

            setLoading(true);
            try {
                console.log('Fetching periods for user:', user.uid);
                // 1. Get user's centerId
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    console.error('User profile not found');
                    return;
                }

                const userData = userDoc.data();
                const centerId = userData?.centerId;
                console.log('User centerId:', centerId);

                if (!centerId) {
                    console.error('User is not associated with a center');
                    return;
                }

                // 2. Fetch periods
                const periodsCollectionRef = collection(db, 'centers', centerId, 'periods');
                const periodsSnapshot = await getDocs(periodsCollectionRef);

                console.log('Periods snapshot empty?', periodsSnapshot.empty);
                const fetchedPeriods = periodsSnapshot.docs.map(doc => doc.id);
                console.log('Fetched periods:', fetchedPeriods);

                // Sort periods descending (assuming they are years like "2025", "2024")
                fetchedPeriods.sort((a, b) => b.localeCompare(a));

                setPeriods(fetchedPeriods);

                // 3. Set default selected period if not already set
                if (!selectedPeriod && fetchedPeriods.length > 0) {
                    // Prefer current year if available, otherwise first one
                    const currentYear = new Date().getFullYear().toString();
                    if (fetchedPeriods.includes(currentYear)) {
                        setSelectedPeriod(currentYear);
                    } else {
                        setSelectedPeriod(fetchedPeriods[0]);
                    }
                }

            } catch (error) {
                console.error('Error fetching periods:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPeriods();
    }, [user, periods.length, selectedPeriod, setPeriods, setSelectedPeriod, setLoading]);
}

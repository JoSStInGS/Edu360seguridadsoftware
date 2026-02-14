import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacher } from '@/contexts/TeacherContext';
import { useTheme } from '@/hooks/useTheme';
import { getCurrentClass, getNextClass, getTodayClasses, formatTime, getCurrentDayName } from '@/utils/schedule';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useState } from 'react';

export default function HomeScreen() {
  const { userData } = useAuth();
  const { schedule, loading, error, refreshSchedule, activeAbsence } = useTeacher();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const currentClass = getCurrentClass(schedule);
  const nextClass = getNextClass(schedule);
  const todayClasses = getTodayClasses(schedule);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSchedule();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando datos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting()}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userData?.displayName ?? 'Profesor'}
            </Text>
          </View>
          <View style={[styles.dayBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.dayText, { color: colors.primary }]}>
              {getCurrentDayName()}
            </Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="warning" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          </View>
        ) : null}

        {/* Absence banner */}
        {activeAbsence && (
          <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
            <View style={[styles.absenceBanner, { backgroundColor: colors.errorLight }]}>
              <View style={styles.absenceBannerHeader}>
                <Ionicons name="person-remove" size={22} color={colors.error} />
                <Text style={[styles.absenceBannerTitle, { color: colors.error }]}>
                  Marcado como ausente
                </Text>
              </View>
              <Text style={[styles.absenceBannerDates, { color: colors.text }]}>
                {activeAbsence.startDate === activeAbsence.endDate
                  ? `Fecha: ${formatAbsenceDate(activeAbsence.startDate)}`
                  : `Del ${formatAbsenceDate(activeAbsence.startDate)} al ${formatAbsenceDate(activeAbsence.endDate)}`}
              </Text>
              <Text style={[styles.absenceBannerReason, { color: colors.textSecondary }]}>
                Motivo: {activeAbsence.reason}
              </Text>
              {activeAbsence.substituteProfesorNombre && (
                <View style={[styles.substituteChip, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
                  <Text style={[styles.substituteChipText, { color: colors.warning }]}>
                    Sustituto: {activeAbsence.substituteProfesorNombre}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Current Class Card */}
        {currentClass ? (
          <View style={[styles.card, { backgroundColor: colors.primary }, Shadows.md]}>
            <View style={styles.currentClassHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Clase en curso</Text>
              </View>
              <Text style={styles.currentClassTime}>
                {formatTime(currentClass.horaInicio)} - {formatTime(currentClass.horaFin)}
              </Text>
            </View>
            <Text style={styles.currentClassSubject}>
              {currentClass.asignaturaNombre}
            </Text>
            <Text style={styles.currentClassGroup}>
              {currentClass.grupoNombre} - {currentClass.aulaNombre}
            </Text>
            <TouchableOpacity
              style={styles.attendanceButton}
              onPress={() => router.push('/(tabs)/attendance')}
              activeOpacity={0.8}
            >
              <Ionicons name="clipboard" size={18} color={colors.primary} />
              <Text style={[styles.attendanceButtonText, { color: colors.primary }]}>
                Pasar lista
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
            <View style={styles.noClassContainer}>
              <Ionicons name="cafe-outline" size={32} color={colors.muted} />
              <Text style={[styles.noClassText, { color: colors.textSecondary }]}>
                No hay clase en este momento
              </Text>
            </View>
          </View>
        )}

        {/* Next Class */}
        {nextClass && !currentClass ? (
          <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Siguiente clase
            </Text>
            <View style={styles.nextClassRow}>
              <View style={[styles.timeChip, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.timeChipText, { color: colors.primary }]}>
                  {formatTime(nextClass.horaInicio)}
                </Text>
              </View>
              <View style={styles.nextClassInfo}>
                <Text style={[styles.nextClassSubject, { color: colors.text }]}>
                  {nextClass.asignaturaNombre}
                </Text>
                <Text style={[styles.nextClassDetails, { color: colors.muted }]}>
                  {nextClass.grupoNombre} - {nextClass.aulaNombre}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Today's Schedule */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Clases de hoy
            </Text>
            <Text style={[styles.classCount, { color: colors.muted }]}>
              {todayClasses.length} {todayClasses.length === 1 ? 'clase' : 'clases'}
            </Text>
          </View>

          {todayClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sunny-outline" size={28} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No hay clases programadas para hoy
              </Text>
            </View>
          ) : (
            todayClasses.map((entry, idx) => {
              const isCurrent = currentClass?.id === entry.id;
              const isAbsent = !!activeAbsence;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.classItem,
                    idx < todayClasses.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                    isCurrent && !isAbsent && { backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md },
                    isAbsent && { opacity: 0.5 },
                  ]}
                >
                  <View style={styles.classTimeColumn}>
                    <Text style={[styles.classTimeStart, { color: isCurrent && !isAbsent ? colors.primary : colors.text }]}>
                      {formatTime(entry.horaInicio)}
                    </Text>
                    <Text style={[styles.classTimeEnd, { color: colors.muted }]}>
                      {formatTime(entry.horaFin)}
                    </Text>
                  </View>
                  <View style={[styles.classTimeLine, { backgroundColor: isCurrent && !isAbsent ? colors.primary : colors.border }]} />
                  <View style={styles.classDetails}>
                    <Text style={[styles.classSubject, { color: isCurrent && !isAbsent ? colors.primary : colors.text }]}>
                      {entry.asignaturaNombre}
                    </Text>
                    <Text style={[styles.classGroup, { color: colors.muted }]}>
                      {entry.grupoNombre} - {entry.aulaNombre}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatAbsenceDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  dayText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    flex: 1,
  },
  // Absence banner
  absenceBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  absenceBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  absenceBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  absenceBannerDates: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginBottom: 4,
  },
  absenceBannerReason: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  substituteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  substituteChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  // Current class
  currentClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  liveText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.9)',
  },
  currentClassTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  currentClassSubject: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#fff',
    marginBottom: 4,
  },
  currentClassGroup: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.lg,
  },
  attendanceButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  attendanceButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  // No class
  noClassContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noClassText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  // Next class
  nextClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
  },
  timeChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  nextClassInfo: {
    flex: 1,
  },
  nextClassSubject: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  nextClassDetails: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classCount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  // Class list items
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  classTimeColumn: {
    width: 65,
    alignItems: 'flex-end',
  },
  classTimeStart: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  classTimeEnd: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  classTimeLine: {
    width: 3,
    height: '100%',
    minHeight: 36,
    borderRadius: 2,
  },
  classDetails: {
    flex: 1,
  },
  classSubject: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  classGroup: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});

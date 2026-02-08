import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTeacher } from '@/contexts/TeacherContext';
import { useTheme } from '@/hooks/useTheme';
import {
  groupScheduleByDay,
  getDayName,
  getDayShortName,
  formatTime,
  getCurrentDayIndex,
  getCurrentClass,
} from '@/utils/schedule';
import {
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

const WEEKDAYS = [0, 1, 2, 3, 4]; // Lun-Vie

export default function ScheduleScreen() {
  const { schedule, loading, refreshSchedule } = useTeacher();
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState(
    Math.max(0, getCurrentDayIndex())
  );
  const [refreshing, setRefreshing] = useState(false);

  const grouped = groupScheduleByDay(schedule);
  const dayClasses = grouped[selectedDay] ?? [];
  const currentClass = getCurrentClass(schedule);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSchedule();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mi Horario
        </Text>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {WEEKDAYS.map((dayIdx) => {
            const isSelected = dayIdx === selectedDay;
            const isToday = dayIdx === getCurrentDayIndex();
            const hasClasses = (grouped[dayIdx] ?? []).length > 0;

            return (
              <TouchableOpacity
                key={dayIdx}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.card,
                    borderColor: isToday && !isSelected
                      ? colors.primary
                      : colors.border,
                    borderWidth: isToday && !isSelected ? 1.5 : 1,
                  },
                  isSelected && Shadows.sm,
                ]}
                onPress={() => setSelectedDay(dayIdx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayButtonShort,
                    {
                      color: isSelected
                        ? '#fff'
                        : isToday
                          ? colors.primary
                          : colors.muted,
                    },
                  ]}
                >
                  {getDayShortName(dayIdx)}
                </Text>
                {hasClasses && (
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: isSelected
                          ? '#fff'
                          : colors.primary,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Day Title */}
      <View style={styles.dayTitleContainer}>
        <Text style={[styles.dayTitle, { color: colors.text }]}>
          {getDayName(selectedDay)}
        </Text>
        <Text style={[styles.dayClassCount, { color: colors.muted }]}>
          {dayClasses.length}{' '}
          {dayClasses.length === 1 ? 'clase' : 'clases'}
        </Text>
      </View>

      {/* Schedule List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {dayClasses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <Ionicons name="calendar-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Sin clases
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              No tienes clases programadas este día
            </Text>
          </View>
        ) : (
          dayClasses.map((entry, idx) => {
            const isCurrent =
              currentClass?.id === entry.id &&
              selectedDay === getCurrentDayIndex();

            return (
              <View
                key={entry.id}
                style={[
                  styles.scheduleCard,
                  { backgroundColor: colors.card },
                  Shadows.sm,
                  isCurrent && {
                    borderLeftColor: colors.primary,
                    borderLeftWidth: 4,
                  },
                ]}
              >
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <View
                      style={[
                        styles.currentDot,
                        { backgroundColor: colors.success },
                      ]}
                    />
                    <Text
                      style={[
                        styles.currentLabel,
                        { color: colors.success },
                      ]}
                    >
                      En curso
                    </Text>
                  </View>
                )}

                <View style={styles.scheduleCardHeader}>
                  <View
                    style={[
                      styles.periodBadge,
                      {
                        backgroundColor: isCurrent
                          ? colors.primaryLight
                          : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        {
                          color: isCurrent
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      P{entry.periodo}
                    </Text>
                  </View>
                  <Text
                    style={[styles.scheduleTime, { color: colors.muted }]}
                  >
                    {formatTime(entry.horaInicio)} -{' '}
                    {formatTime(entry.horaFin)}
                  </Text>
                </View>

                <Text
                  style={[styles.scheduleSubject, { color: colors.text }]}
                >
                  {entry.asignaturaNombre}
                </Text>

                <View style={styles.scheduleDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color={colors.muted}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {entry.grupoNombre}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.muted}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {entry.aulaNombre}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
  },
  daySelectorContainer: {
    paddingBottom: Spacing.md,
  },
  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  dayButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonShort: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },
  dayTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  dayTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
  },
  dayClassCount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  scheduleCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  currentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  currentLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  periodBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  periodText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  scheduleTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  scheduleSubject: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.sm,
  },
  scheduleDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
});

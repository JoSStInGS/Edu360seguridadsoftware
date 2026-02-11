import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getChildSchedule,
  subscribeToChildAttendance,
} from '@/services/parentFirestore';
import type { ChildAttendanceStatus, ParentChild, ScheduleEntry } from '@/types';

export default function ParentAttendanceScreen() {
  const { colors } = useTheme();
  const { children, centerId, periodoId, loading } = useParent();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<ChildAttendanceStatus[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedChild = children[selectedChildIndex] || null;

  // Get day index from date
  const getDayIndexFromDate = (dateStr: string): number => {
    const date = new Date(dateStr + 'T12:00:00');
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  // Load schedule for child's group
  const loadSchedule = useCallback(async () => {
    if (!centerId || !periodoId || !selectedChild?.grupoId) {
      setScheduleEntries([]);
      return;
    }

    try {
      const schedule = await getChildSchedule(centerId, periodoId, selectedChild.grupoId);
      // Filter by selected day
      const dayIndex = getDayIndexFromDate(selectedDate);
      const daySchedule = schedule
        .filter((s) => s.diaIndex === dayIndex)
        .sort((a, b) => a.periodo - b.periodo);
      setScheduleEntries(daySchedule);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setScheduleEntries([]);
    }
  }, [centerId, periodoId, selectedChild, selectedDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Subscribe to real-time attendance
  useEffect(() => {
    if (!centerId || !periodoId || !selectedChild?.grupoId || scheduleEntries.length === 0) {
      setAttendanceStatuses([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const unsubscribe = subscribeToChildAttendance(
      centerId,
      periodoId,
      selectedChild.studentCedula,
      selectedChild.grupoId,
      selectedDate,
      scheduleEntries,
      (statuses) => {
        setAttendanceStatuses(statuses);
        setLoadingData(false);
      }
    );

    return () => unsubscribe();
  }, [centerId, periodoId, selectedChild, selectedDate, scheduleEntries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  // Date navigation
  const changeDate = (offset: number) => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-CR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      default: return 'time-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return colors.success;
      case 'absent': return colors.error;
      default: return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Presente';
      case 'absent': return 'Ausente';
      default: return 'Pendiente';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'present': return colors.successLight;
      case 'absent': return colors.errorLight;
      default: return 'rgba(107,114,128,0.1)';
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="people-outline" size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>No hay hijos vinculados</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>Asistencia</Text>

      {/* Child selector (if multiple children) */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
          {children.map((child, index) => (
            <TouchableOpacity
              key={child.studentCedula}
              style={[
                styles.childTab,
                {
                  backgroundColor: index === selectedChildIndex ? colors.primary : colors.card,
                  borderColor: index === selectedChildIndex ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedChildIndex(index)}
            >
              <Text
                style={[
                  styles.childTabText,
                  { color: index === selectedChildIndex ? '#fff' : colors.text },
                ]}
              >
                {child.studentName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Selected child info */}
      {selectedChild && (
        <View style={[styles.childInfoCard, { backgroundColor: colors.card }, Shadows.sm]}>
          <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.miniAvatarText, { color: colors.primary }]}>
              {selectedChild.studentName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.childNameText, { color: colors.text }]}>{selectedChild.studentName}</Text>
            <Text style={[styles.childGroupText, { color: colors.textSecondary }]}>
              {selectedChild.grupoNombre || 'Sin grupo'}
            </Text>
          </View>
        </View>
      )}

      {/* Date navigator */}
      <View style={[styles.dateNav, { backgroundColor: colors.card }, Shadows.sm]}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {isToday ? 'Hoy' : formatDateDisplay(selectedDate)}
          </Text>
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              <Text style={[styles.todayLink, { color: colors.primary }]}>Ir a hoy</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Attendance list */}
      {loadingData ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing['3xl'] }} />
      ) : attendanceStatuses.length === 0 && scheduleEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No hay clases programadas para este dia
          </Text>
        </View>
      ) : (
        <View style={styles.attendanceList}>
          {attendanceStatuses.map((item, index) => (
            <View
              key={item.scheduleEntry.id}
              style={[styles.attendanceItem, { backgroundColor: colors.card }, Shadows.sm]}
            >
              {/* Time column */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeStart, { color: colors.text }]}>
                  {item.scheduleEntry.horaInicio}
                </Text>
                <Text style={[styles.timeEnd, { color: colors.muted }]}>
                  {item.scheduleEntry.horaFin}
                </Text>
              </View>

              {/* Divider */}
              <View style={styles.dividerColumn}>
                <View style={[styles.dividerDot, { backgroundColor: getStatusColor(item.status) }]} />
                {index < attendanceStatuses.length - 1 && (
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Content */}
              <View style={styles.contentColumn}>
                <Text style={[styles.subjectName, { color: colors.text }]}>
                  {item.scheduleEntry.asignaturaNombre}
                </Text>
                <Text style={[styles.teacherName, { color: colors.textSecondary }]}>
                  {item.scheduleEntry.profesorNombre}
                </Text>
                {item.scheduleEntry.aulaNombre && (
                  <Text style={[styles.roomText, { color: colors.muted }]}>
                    Aula: {item.scheduleEntry.aulaNombre}
                  </Text>
                )}

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                  <Ionicons
                    name={getStatusIcon(item.status) as any}
                    size={16}
                    color={getStatusColor(item.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing['5xl'] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },

  title: { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold, marginBottom: Spacing.lg },

  // Child selector
  childSelector: { marginBottom: Spacing.lg },
  childTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  childTabText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium },

  // Child info card
  childInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontSize: FontSize.base, fontFamily: FontFamily.bold },
  childNameText: { fontSize: FontSize.base, fontFamily: FontFamily.medium },
  childGroupText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },

  // Date navigator
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  dateNavBtn: { padding: Spacing.xs },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: FontSize.base, fontFamily: FontFamily.medium },
  todayLink: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, marginTop: 2 },

  // Attendance list
  attendanceList: { gap: Spacing.sm },
  attendanceItem: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },

  // Time column
  timeColumn: { width: 50, alignItems: 'center', justifyContent: 'center' },
  timeStart: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  timeEnd: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  // Divider
  dividerColumn: { width: 24, alignItems: 'center', marginHorizontal: Spacing.sm },
  dividerDot: { width: 10, height: 10, borderRadius: 5 },
  dividerLine: { width: 2, flex: 1, marginTop: 4 },

  // Content
  contentColumn: { flex: 1 },
  subjectName: { fontSize: FontSize.base, fontFamily: FontFamily.medium },
  teacherName: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: 2 },
  roomText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  statusText: { fontSize: FontSize.xs, fontFamily: FontFamily.medium },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, marginTop: Spacing.md, textAlign: 'center' },
});

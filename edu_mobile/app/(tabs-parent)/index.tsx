import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getChildAttendanceForDate, getChildSchedule } from '@/services/parentFirestore';
import type { ChildAttendanceStatus, ParentChild } from '@/types';

export default function ParentHomeScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { children, centerId, periodoId, loading, error } = useParent();
  const [refreshing, setRefreshing] = useState(false);
  const [childrenAttendance, setChildrenAttendance] = useState<
    Map<string, ChildAttendanceStatus[]>
  >(new Map());
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getFirstName = () => {
    const name = userData?.displayName || '';
    return name.split(' ')[0];
  };

  const loadAttendance = useCallback(async () => {
    if (!centerId || !periodoId || children.length === 0) return;

    setLoadingAttendance(true);
    try {
      const newMap = new Map<string, ChildAttendanceStatus[]>();

      for (const child of children) {
        if (!child.grupoId) continue;
        const statuses = await getChildAttendanceForDate(
          centerId,
          periodoId,
          child.studentCedula,
          child.grupoId,
          today
        );
        newMap.set(child.studentCedula, statuses);
      }

      setChildrenAttendance(newMap);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, [centerId, periodoId, children, today]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  const getAttendanceSummary = (cedula: string) => {
    const statuses = childrenAttendance.get(cedula) || [];
    if (statuses.length === 0) return { total: 0, present: 0, absent: 0, pending: 0 };
    return {
      total: statuses.length,
      present: statuses.filter((s) => s.status === 'present').length,
      absent: statuses.filter((s) => s.status === 'absent').length,
      pending: statuses.filter((s) => s.status === 'pending').length,
    };
  };

  const getCurrentClass = (cedula: string) => {
    const statuses = childrenAttendance.get(cedula) || [];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return statuses.find((s) => {
      return currentTime >= s.scheduleEntry.horaInicio && currentTime <= s.scheduleEntry.horaFin;
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && children.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {getGreeting()},
        </Text>
        <Text style={[styles.name, { color: colors.text }]}>
          {getFirstName()} 👋
        </Text>
        <Text style={[styles.dateText, { color: colors.muted }]}>
          {new Date().toLocaleDateString('es-CR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Children Cards */}
      {children.map((child) => (
        <ChildCard
          key={child.studentCedula}
          child={child}
          summary={getAttendanceSummary(child.studentCedula)}
          currentClass={getCurrentClass(child.studentCedula)}
          colors={colors}
          loadingAttendance={loadingAttendance}
        />
      ))}
    </ScrollView>
  );
}

function ChildCard({
  child,
  summary,
  currentClass,
  colors,
  loadingAttendance,
}: {
  child: ParentChild;
  summary: { total: number; present: number; absent: number; pending: number };
  currentClass: ChildAttendanceStatus | undefined;
  colors: Record<string, string>;
  loadingAttendance: boolean;
}) {
  return (
    <View style={[styles.childCard, { backgroundColor: colors.card }, Shadows.md]}>
      {/* Child header */}
      <View style={styles.childHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {child.studentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={[styles.childName, { color: colors.text }]}>{child.studentName}</Text>
          <Text style={[styles.childGroup, { color: colors.textSecondary }]}>
            {child.grupoNombre || 'Sin grupo'}
          </Text>
        </View>
      </View>

      {/* Current class */}
      {currentClass && (
        <View style={[styles.currentClassBanner, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>En clase</Text>
          </View>
          <Text style={[styles.currentClassName, { color: colors.primary }]}>
            {currentClass.scheduleEntry.asignaturaNombre}
          </Text>
          <Text style={[styles.currentClassTime, { color: colors.textSecondary }]}>
            {currentClass.scheduleEntry.horaInicio} - {currentClass.scheduleEntry.horaFin}
          </Text>
          {currentClass.status !== 'pending' && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: currentClass.status === 'present' ? colors.successLight : colors.errorLight },
            ]}>
              <Ionicons
                name={currentClass.status === 'present' ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={currentClass.status === 'present' ? colors.success : colors.error}
              />
              <Text style={{
                fontSize: FontSize.xs,
                fontFamily: FontFamily.medium,
                color: currentClass.status === 'present' ? colors.success : colors.error,
              }}>
                {currentClass.status === 'present' ? 'Presente' : 'Ausente'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Attendance summary */}
      {loadingAttendance ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.md }} />
      ) : summary.total > 0 ? (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.summaryNumber, { color: colors.success }]}>{summary.present}</Text>
            <Text style={[styles.summaryLabel, { color: colors.success }]}>Presente</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={[styles.summaryNumber, { color: colors.error }]}>{summary.absent}</Text>
            <Text style={[styles.summaryLabel, { color: colors.error }]}>Ausente</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: 'rgba(107,114,128,0.1)' }]}>
            <Ionicons name="time" size={16} color={colors.muted} />
            <Text style={[styles.summaryNumber, { color: colors.muted }]}>{summary.pending}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Pendiente</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noClassesContainer}>
          <Text style={[styles.noClassesText, { color: colors.muted }]}>
            No hay clases programadas para hoy
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing['5xl'] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, marginTop: Spacing.md, textAlign: 'center' },

  // Header
  headerSection: { marginBottom: Spacing['2xl'] },
  greeting: { fontSize: FontSize.base, fontFamily: FontFamily.regular },
  name: { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold, marginTop: Spacing.xs },
  dateText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: Spacing.xs },

  // Child card
  childCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  childInfo: { marginLeft: Spacing.md, flex: 1 },
  childName: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  childGroup: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },

  // Current class
  currentClassBanner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  liveText: { fontSize: FontSize.xs, fontFamily: FontFamily.medium },
  currentClassName: { fontSize: FontSize.base, fontFamily: FontFamily.bold },
  currentClassTime: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: 2 },
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

  // Summary
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryItem: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  summaryNumber: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  summaryLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  noClassesContainer: { paddingVertical: Spacing.md, alignItems: 'center' },
  noClassesText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
});

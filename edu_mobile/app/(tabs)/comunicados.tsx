import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTeacher } from '@/contexts/TeacherContext';
import { useTheme } from '@/hooks/useTheme';
import { getProfessorComunicados } from '@/services/comunicadoFirestore';
import type { Comunicado } from '@/types';
import {
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

export default function ProfessorComunicadosScreen() {
  const { colors } = useTheme();
  const { centerId, periodoId, profesorId } = useTeacher();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadComunicados = useCallback(async () => {
    if (!centerId || !periodoId || !profesorId) return;
    try {
      const list = await getProfessorComunicados(centerId, periodoId, profesorId);
      setComunicados(list);
    } catch (err) {
      console.error('Error loading comunicados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [centerId, periodoId, profesorId]);

  useEffect(() => {
    loadComunicados();
  }, [loadComunicados]);

  const onRefresh = () => {
    setRefreshing(true);
    loadComunicados();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Comunicado }) => {
    const hasReaders = item.readBy && item.readBy.length > 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardSubject, { color: colors.text }]} numberOfLines={1}>
              {item.subject}
            </Text>
            <Text style={[styles.cardDate, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text>
          </View>
          <View
            style={[
              styles.readBadge,
              { backgroundColor: hasReaders ? colors.successLight : colors.warningLight },
            ]}
          >
            <Ionicons
              name={hasReaders ? 'checkmark-done' : 'time'}
              size={14}
              color={hasReaders ? colors.success : colors.warning}
            />
            <Text
              style={[
                styles.readBadgeText,
                { color: hasReaders ? colors.success : colors.warning },
              ]}
            >
              {hasReaders ? 'Leido' : 'No leido'}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.studentRow}>
            <Ionicons name="person" size={14} color={colors.primary} />
            <Text style={[styles.studentText, { color: colors.textSecondary }]}>
              {item.studentName} - {item.grupoNombre}
            </Text>
          </View>
          <Text style={[styles.cardMessage, { color: colors.muted }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comunicados</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Comunicados enviados a encargados legales
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Cargando comunicados...</Text>
        </View>
      ) : comunicados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Sin comunicados
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Envia tu primer comunicado a un encargado legal
          </Text>
        </View>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }, Shadows.lg]}
        onPress={() => router.push('/compose-comunicado')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'] },
  headerSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, marginTop: 2 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing['3xl'],
  },
  emptyTitle: { fontFamily: FontFamily.medium, fontSize: FontSize.lg },
  emptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, textAlign: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardHeaderLeft: { flex: 1, marginRight: Spacing.sm },
  cardSubject: { fontFamily: FontFamily.bold, fontSize: FontSize.base },
  cardDate: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, marginTop: 2 },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  readBadgeText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  cardBody: { gap: Spacing.xs },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  studentText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  cardMessage: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

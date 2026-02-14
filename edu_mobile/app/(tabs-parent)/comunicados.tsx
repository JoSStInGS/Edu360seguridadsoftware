import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import {
  subscribeToComunicadosForChildren,
  markAsRead,
} from '@/services/comunicadoFirestore';
import type { Comunicado } from '@/types';
import {
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

export default function ParentComunicadosScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { centerId, periodoId, children } = useParent();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId || !periodoId || children.length === 0 || !user) {
      setLoading(false);
      return;
    }

    const cedulas = children.map((c) => c.studentCedula);

    const unsubscribe = subscribeToComunicadosForChildren(
      centerId,
      periodoId,
      cedulas,
      (list) => {
        setComunicados(list);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [centerId, periodoId, children, user]);

  const handleExpand = async (comunicado: Comunicado) => {
    if (expandedId === comunicado.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(comunicado.id);

    // Mark as read if not already
    if (user && !comunicado.readBy?.includes(user.uid)) {
      if (centerId && periodoId) {
        try {
          await markAsRead(centerId, periodoId, comunicado.id, user.uid);
        } catch (err) {
          console.error('Error marking as read:', err);
        }
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Comunicado }) => {
    const isRead = user ? item.readBy?.includes(user.uid) : false;
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card },
          !isRead && styles.unreadCard,
          !isRead && { borderLeftColor: colors.primary },
          Shadows.sm,
        ]}
        onPress={() => handleExpand(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.subjectRow}>
              {!isRead && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              )}
              <Text style={[styles.cardSubject, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                {item.subject}
              </Text>
            </View>
            <Text style={[styles.professorText, { color: colors.textSecondary }]}>
              {item.profesorNombre}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="person" size={12} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{item.studentName}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text>
        </View>

        {isExpanded && (
          <View style={[styles.messageContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{item.message}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comunicados</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Mensajes de los profesores
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
            Aqui apareceran los comunicados de los profesores
          </Text>
        </View>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: { flex: 1, marginRight: Spacing.sm },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardSubject: { fontFamily: FontFamily.bold, fontSize: FontSize.base, flex: 1 },
  professorText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  dateText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  messageContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  messageText: { fontFamily: FontFamily.regular, fontSize: FontSize.base, lineHeight: 22 },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import { subscribeToParentJustifications } from '@/services/justificationFirestore';
import type { AbsenceJustification } from '@/types';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const STATUS_COLORS: Record<string, string> = {};
const STATUS_ICONS: Record<string, string> = {
  pending: 'time-outline',
  approved: 'checkmark-circle',
  rejected: 'close-circle',
  partial: 'alert-circle',
  expired: 'ban',
};

function StatusPill({ status, colors }: { status: AbsenceJustification['status']; colors: Record<string, string> }) {
  const config = {
    pending: { color: colors.warning, bg: colors.warningLight, label: 'Pendiente' },
    approved: { color: colors.success, bg: colors.successLight, label: 'Aprobada' },
    rejected: { color: colors.error, bg: colors.errorLight, label: 'Rechazada' },
    partial: { color: colors.warning, bg: colors.warningLight, label: 'Parcial' },
    expired: { color: colors.muted, bg: 'rgba(107,114,128,0.1)', label: 'Vencida' },
  }[status] ?? { color: colors.muted, bg: 'rgba(107,114,128,0.1)', label: status };

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Ionicons name={STATUS_ICONS[status] as any ?? 'help-circle'} size={12} color={config.color} />
      <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isExpired(j: AbsenceJustification): boolean {
  if (j.status !== 'pending') return false;
  const today = new Date().toISOString().split('T')[0];
  return j.deadlineDate < today;
}

interface DetailModalProps {
  justification: AbsenceJustification | null;
  onClose: () => void;
  colors: Record<string, string>;
}

function DetailModal({ justification: j, onClose, colors }: DetailModalProps) {
  if (!j) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Detalle de justificación</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Info general */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Estudiante</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{j.studentName}</Text>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Fecha de ausencia</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(j.targetDate)}</Text>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Tipo</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {j.type === 'preventiva' ? 'Preventiva (anticipada)' : 'Posterior'}
            </Text>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Motivo</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{j.reason}</Text>
            {j.type === 'posterior' && (
              <>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Fecha límite</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(j.deadlineDate)}</Text>
              </>
            )}
          </View>

          {/* Estado general */}
          <View style={styles.pillRow}>
            <StatusPill status={isExpired(j) ? 'expired' : j.status} colors={colors} />
          </View>

          {/* Decisiones por profesor */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Revisión por profesor</Text>
          {j.decisions.map((d) => (
            <View key={d.scheduleId} style={[styles.decisionCard, { backgroundColor: colors.card }, Shadows.sm]}>
              <View style={styles.decisionHeader}>
                <Text style={[styles.decisionSubject, { color: colors.text }]}>{d.asignaturaNombre}</Text>
                <StatusPill status={d.status} colors={colors} />
              </View>
              <Text style={[styles.decisionTeacher, { color: colors.textSecondary }]}>
                Prof. {d.profesorNombre}
              </Text>
              {d.profesorComment && (
                <View style={[styles.commentBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.commentText, { color: colors.text }]}>"{d.profesorComment}"</Text>
                </View>
              )}
              {d.reviewedAt && (
                <Text style={[styles.reviewedAt, { color: colors.muted }]}>
                  Revisado el {formatDate(d.reviewedAt.split('T')[0])}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function JustificacionesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { centerId, periodoId, children } = useParent();
  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildCedula, setSelectedChildCedula] = useState<string | 'all'>('all');
  const [detailJust, setDetailJust] = useState<AbsenceJustification | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!centerId || !periodoId || children.length === 0) {
      setLoading(false);
      return;
    }
    const cedulas = children.map((c) => c.studentCedula);
    const unsub = subscribeToParentJustifications(centerId, periodoId, cedulas, (list) => {
      setJustifications(list);
      setLoading(false);
    });
    return () => unsub();
  }, [centerId, periodoId, children]);

  const filtered = justifications.filter((j) =>
    selectedChildCedula === 'all' || j.studentCedula === selectedChildCedula
  );

  const pending = filtered.filter((j) => j.status === 'pending' || isExpired(j));
  const history = filtered.filter((j) => j.status !== 'pending' && !isExpired(j));

  const renderCard = (j: AbsenceJustification) => {
    const expired = isExpired(j);
    const displayStatus = expired ? 'expired' : j.status;
    return (
      <TouchableOpacity
        key={j.id}
        style={[styles.card, { backgroundColor: colors.card }, Shadows.sm]}
        onPress={() => setDetailJust(j)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={[styles.cardDate, { color: colors.text }]}>
              {formatDate(j.targetDate)}
            </Text>
            <Text style={[styles.cardStudent, { color: colors.textSecondary }]}>
              {j.studentName} · {j.scope === 'all_day' ? 'Todo el día' : `${j.scheduleDetails.length} clase${j.scheduleDetails.length !== 1 ? 's' : ''}`}
            </Text>
            <Text style={[styles.cardType, { color: colors.muted }]}>
              {j.type === 'preventiva' ? '📅 Preventiva' : '📋 Posterior'}
            </Text>
          </View>
          <StatusPill status={displayStatus} colors={colors} />
        </View>
        {expired && (
          <View style={[styles.expiredBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning" size={12} color={colors.error} />
            <Text style={[styles.expiredText, { color: colors.error }]}>Plazo vencido</Text>
          </View>
        )}
        {j.type === 'posterior' && !expired && j.status === 'pending' && (
          <View style={[styles.deadlineBanner, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.deadlineText, { color: colors.warning }]}>
              Vence el {formatDate(j.deadlineDate)}
              {j.deadlineDate === today ? ' · ¡Hoy!' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Justificaciones</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs-parent)/nueva-justificacion' as never)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Child selector */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
          <TouchableOpacity
            style={[styles.childTab, {
              backgroundColor: selectedChildCedula === 'all' ? colors.primary : colors.card,
              borderColor: selectedChildCedula === 'all' ? colors.primary : colors.border,
            }]}
            onPress={() => setSelectedChildCedula('all')}
          >
            <Text style={[styles.childTabText, { color: selectedChildCedula === 'all' ? '#fff' : colors.text }]}>
              Todos
            </Text>
          </TouchableOpacity>
          {children.map((c) => (
            <TouchableOpacity
              key={c.studentCedula}
              style={[styles.childTab, {
                backgroundColor: selectedChildCedula === c.studentCedula ? colors.primary : colors.card,
                borderColor: selectedChildCedula === c.studentCedula ? colors.primary : colors.border,
              }]}
              onPress={() => setSelectedChildCedula(c.studentCedula)}
            >
              <Text style={[styles.childTabText, { color: selectedChildCedula === c.studentCedula ? '#fff' : colors.text }]}>
                {c.studentName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sin justificaciones</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Toca "Nueva" para crear una solicitud de justificación de ausencia.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {pending.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Pendientes ({pending.length})
              </Text>
              {pending.map(renderCard)}
            </>
          )}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Historial</Text>
              {history.map(renderCard)}
            </>
          )}
        </ScrollView>
      )}

      <DetailModal justification={detailJust} onClose={() => setDetailJust(null)} colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'] },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  newBtnText: { color: '#fff', fontFamily: FontFamily.medium, fontSize: FontSize.sm },

  childSelector: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  childTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    alignSelf: 'flex-start',
  },
  childTabText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle: { fontFamily: FontFamily.medium, fontSize: FontSize.lg },
  emptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, textAlign: 'center' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  sectionLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.base, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDate: { fontFamily: FontFamily.bold, fontSize: FontSize.base },
  cardStudent: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, marginTop: 2 },
  cardType: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, marginTop: 2 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  pillText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  pillRow: { flexDirection: 'row', marginVertical: Spacing.sm },

  expiredBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, padding: Spacing.xs, borderRadius: BorderRadius.sm },
  expiredText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  deadlineBanner: { marginTop: Spacing.sm, padding: Spacing.xs, borderRadius: BorderRadius.sm },
  deadlineText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg },
  modalBody: { padding: Spacing.lg, gap: Spacing.md },
  infoCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.xs },
  infoLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  infoValue: { fontFamily: FontFamily.medium, fontSize: FontSize.base, marginBottom: Spacing.sm },
  decisionCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm },
  decisionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  decisionSubject: { fontFamily: FontFamily.bold, fontSize: FontSize.base, flex: 1, marginRight: Spacing.sm },
  decisionTeacher: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  commentBox: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md },
  commentText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, fontStyle: 'italic' },
  reviewedAt: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, marginTop: Spacing.xs },
});

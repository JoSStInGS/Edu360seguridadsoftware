import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacher } from '@/contexts/TeacherContext';
import { logout } from '@/services/auth';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, userData } = useAuth();
  const { schedule } = useTeacher();
  const { colors } = useTheme();

  // Estadísticas rápidas
  const uniqueGroups = new Set(schedule.map((s) => s.grupoId)).size;
  const uniqueSubjects = new Set(schedule.map((s) => s.asignaturaId)).size;
  const totalClasses = schedule.length;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const getInitials = () => {
    const name = userData?.displayName ?? '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'P';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }, Shadows.sm]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {getInitials()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {userData?.displayName ?? 'Profesor'}
          </Text>
          <Text style={[styles.email, { color: colors.muted }]}>
            {userData?.email ?? user?.email ?? ''}
          </Text>
          <View style={styles.rolesContainer}>
            {(userData?.roles ?? ['professor']).map((role) => (
              <View key={role} style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={role === 'professor' ? 'school' : role === 'parent' ? 'people' : 'shield'} size={14} color={colors.primary} />
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {role === 'professor' ? 'Profesor' : role === 'parent' ? 'Padre' : 'Admin'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Center Info */}
        {userData?.centerName && (
          <View style={[styles.infoCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Centro educativo</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {userData.centerName}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalClasses}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Clases/semana</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <Ionicons name="people" size={24} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{uniqueGroups}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Grupos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
            <Ionicons name="book" size={24} color={colors.warning} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{uniqueSubjects}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Materias</Text>
          </View>
        </View>

        {/* Add another role */}
        <TouchableOpacity
          style={[styles.addRoleButton, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
          onPress={() => router.push('/add-role' as never)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.addRoleText, { color: colors.primary }]}>Agregar otro rol</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.errorLight }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={[styles.version, { color: colors.muted }]}>
          Edu360 Mobile v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  // Profile card
  profileCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginBottom: 4,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  addRoleText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  // Info card
  infoCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  infoValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    marginTop: 2,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  logoutText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  // Version
  version: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});

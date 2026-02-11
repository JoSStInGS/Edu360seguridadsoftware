import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import { logout } from '@/services/auth';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ParentProfileScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { children } = useParent();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (userData?.displayName || 'U')
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');

  const handleLogout = () => {
    Alert.alert('Cerrar sesion', 'Estas seguro que deseas cerrar sesion?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
            router.replace('/login');
          } catch (err) {
            console.error('Logout error:', err);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleAddChild = () => {
    router.push('/add-child');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile header */}
      <View style={[styles.profileCard, { backgroundColor: colors.card }, Shadows.md]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.nameText, { color: colors.text }]}>
          {userData?.displayName || 'Usuario'}
        </Text>
        <Text style={[styles.emailText, { color: colors.textSecondary }]}>
          {userData?.email || ''}
        </Text>
        {userData?.centerName && (
          <View style={styles.centerRow}>
            <Ionicons name="school-outline" size={14} color={colors.muted} />
            <Text style={[styles.centerText, { color: colors.muted }]}>{userData.centerName}</Text>
          </View>
        )}
        <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people" size={14} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>Padre de familia</Text>
        </View>
      </View>

      {/* Children section */}
      <View style={[styles.section, { backgroundColor: colors.card }, Shadows.sm]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hijos vinculados</Text>
          <TouchableOpacity onPress={handleAddChild} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {children.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No hay hijos vinculados</Text>
        ) : (
          children.map((child) => (
            <View key={child.studentCedula} style={[styles.childRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.childAvatar, { backgroundColor: colors.successLight }]}>
                <Ionicons name="person" size={16} color={colors.success} />
              </View>
              <View style={styles.childDetails}>
                <Text style={[styles.childName, { color: colors.text }]}>{child.studentName}</Text>
                <Text style={[styles.childMeta, { color: colors.textSecondary }]}>
                  {child.studentCedula} {child.grupoNombre ? `· ${child.grupoNombre}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.error }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>
          {loggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
        </Text>
      </TouchableOpacity>

      {/* App version */}
      <Text style={[styles.versionText, { color: colors.muted }]}>Edu360 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing['5xl'] },

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
  avatarText: { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold },
  nameText: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  emailText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: Spacing.xs },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  centerText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  roleText: { fontSize: FontSize.xs, fontFamily: FontFamily.medium },

  // Section
  section: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  addButton: { padding: Spacing.xs },

  // Children list
  emptyText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center', paddingVertical: Spacing.md },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  childAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childDetails: { flex: 1 },
  childName: { fontSize: FontSize.base, fontFamily: FontFamily.medium },
  childMeta: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, marginTop: 2 },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoutText: { fontSize: FontSize.base, fontFamily: FontFamily.medium },

  versionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
});

import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ParentProvider } from '@/contexts/ParentContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { FontFamily, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function ParentTabLayout() {
  const { isAuthenticated, loading, needsMepEmail } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (needsMepEmail) {
    return <Redirect href="/mep-email" />;
  }

  return (
    <ParentProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarLabelStyle: {
            fontFamily: FontFamily.medium,
            fontSize: 11,
          },
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
            ...Shadows.sm,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Asistencia',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="justificaciones"
          options={{
            title: 'Justificaciones',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="comunicados"
          options={{
            title: 'Comunicados',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        {/* Perfil se accede desde el avatar en el home, no como tab */}
        <Tabs.Screen
          name="profile"
          options={{ href: null }}
        />
        {/* Formulario de nueva justificación — push desde justificaciones o asistencia */}
        <Tabs.Screen
          name="nueva-justificacion"
          options={{ href: null }}
        />
      </Tabs>
    </ParentProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

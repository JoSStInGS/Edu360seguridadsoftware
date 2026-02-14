import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { isAuthenticated, userData, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (isAuthenticated && userData) {
    // Professor takes priority if user has both roles
    if (userData.roles.includes('professor')) {
      return <Redirect href="/(tabs)" />;
    }
    if (userData.roles.includes('parent')) {
      return <Redirect href="/(tabs-parent)" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});

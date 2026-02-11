import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lexend_400Regular, Lexend_500Medium, Lexend_700Bold } from '@expo-google-fonts/lexend';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_700Bold,
  });

  // Set the root view background to match the app theme.
  // This prevents the white flash behind the keyboard on Android (edge-to-edge).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[colorScheme].background);
  }, [colorScheme]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Slot />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

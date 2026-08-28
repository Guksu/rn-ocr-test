import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const RootLayout = () => (
  <SafeAreaProvider>
    <StatusBar style="auto" />
    <Stack screenOptions={{ headerShown: false }} />
  </SafeAreaProvider>
);

export default RootLayout;

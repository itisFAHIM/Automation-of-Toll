import { Stack, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import GlobalLoader from '../components/GlobalLoader';

export default function RootLayout() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Every time pathname changes, trigger the loader
    setIsNavigating(true);
    // Dynamic delay between 1000ms and 1500ms
    const randomDelay = Math.floor(Math.random() * 500) + 1000;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, randomDelay);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {isNavigating && <GlobalLoader />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }
});
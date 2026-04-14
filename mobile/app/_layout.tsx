import { Stack, usePathname } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import GlobalLoader from '../components/GlobalLoader';

export default function RootLayout() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathHistory = useRef<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip loader completely just on first boot
    if (isInitialMount.current) {
        isInitialMount.current = false;
        pathHistory.current.push(pathname);
        return;
    }

    let isBack = false;
    if (pathHistory.current.length > 1 && pathHistory.current[pathHistory.current.length - 2] === pathname) {
       isBack = true;
       pathHistory.current.pop();
    } else if (pathHistory.current[pathHistory.current.length - 1] !== pathname) {
       pathHistory.current.push(pathname);
    }

    if (!isBack) {
      setIsNavigating(true);
      const randomDelay = Math.floor(Math.random() * 500) + 500; // 0.5s - 1.0s
      const timer = setTimeout(() => setIsNavigating(false), randomDelay);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
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
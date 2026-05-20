import { Stack, usePathname } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import GlobalLoader from '../components/GlobalLoader';
import { NotificationProvider, useNotification } from '../components/NotificationProvider';

function RootLayoutContent() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathHistory = useRef<string[]>([]);
  const isInitialMount = useRef(true);
  const notifiedDisables = useRef<Set<number>>(new Set());
  const { showNotification } = useNotification();

  useEffect(() => {
    const pollDisables = async () => {
       try {
           const res = await fetch('http://192.168.0.106:8000/api/bridges/recent-disables/');
           if (!res.ok) return;
           const disables = await res.json();
           
           for (const item of disables) {
               if (!notifiedDisables.current.has(item.id)) {
                   notifiedDisables.current.add(item.id);
                   showNotification(
                       '⚠️ Service Update Alert',
                       `Admin restricted ${item.vehicle_type.toUpperCase()}s at ${item.bridge_name}. 1h left to pass.`,
                       'warning'
                   );
               }
           }
       } catch (e) {}
    };

    const interval = setInterval(pollDisables, 10000);
    pollDisables();
    return () => clearInterval(interval);
  }, []);

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

import { ThemeProvider } from '../components/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <RootLayoutContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }
});
import { Stack, usePathname } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import GlobalLoader from '../components/GlobalLoader';
import { NotificationProvider, useNotification } from '../components/NotificationProvider';
import { ThemeProvider } from '../components/ThemeContext';

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
      const randomDelay = Math.floor(Math.random() * 500) + 500;
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

export default function RootLayout() {
  // On web: center the content with a clean max-width — no weird phone frame
  if (Platform.OS === 'web') {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <View style={styles.webRoot}>
            <View style={styles.webContent}>
              <RootLayoutContent />
            </View>
          </View>
        </NotificationProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <RootLayoutContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // Native
  container: { flex: 1, backgroundColor: '#0f172a' },

  // Web — seamless, no outer frame
  webRoot: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  } as any,

  webContent: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#0f172a',
  } as any,
});
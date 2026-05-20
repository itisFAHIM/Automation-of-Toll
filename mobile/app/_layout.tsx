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
  // On web: wrap in a centered dark shell with phone-width column
  if (Platform.OS === 'web') {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <View style={styles.webShell}>
            <View style={styles.webBlob1} />
            <View style={styles.webBlob2} />
            <View style={styles.webPhoneFrame}>
              <RootLayoutContent />
            </View>
          </View>
        </NotificationProvider>
      </ThemeProvider>
    );
  }

  // Native: render as-is
  return (
    <ThemeProvider>
      <NotificationProvider>
        <RootLayoutContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  webShell: {
    flex: 1,
    backgroundColor: '#070d1a',
    alignItems: 'center',
    justifyContent: 'flex-start',
  } as any,

  webBlob1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#3b82f608',
    top: -100,
    left: -150,
    zIndex: 0,
  } as any,

  webBlob2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8b5cf608',
    bottom: -80,
    right: -120,
    zIndex: 0,
  } as any,

  webPhoneFrame: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 30,
    overflow: 'hidden',
    zIndex: 1,
  } as any,
});
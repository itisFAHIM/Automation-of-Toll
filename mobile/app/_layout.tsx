import { Stack, usePathname } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import GlobalLoader from '../components/GlobalLoader';

export default function RootLayout() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathHistory = useRef<string[]>([]);
  const isInitialMount = useRef(true);
  const notifiedDisables = useRef<Set<number>>(new Set());

  useEffect(() => {
    const pollDisables = async () => {
       try {
           const res = await fetch('http://192.168.0.102:8000/api/bridges/recent-disables/');
           if (!res.ok) return;
           const disables = await res.json();
           
           for (const item of disables) {
               if (!notifiedDisables.current.has(item.id)) {
                   notifiedDisables.current.add(item.id);
                   Alert.alert(
                       '⚠️ Service Update Alert',
                       `Admin has restricted the ${item.vehicle_type.toUpperCase()} service for ${item.bridge_name}.\nYou have 1 hour remaining to pass via this toll.`,
                       [{text: 'Understood'}]
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }
});
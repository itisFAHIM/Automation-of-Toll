import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

function CountUp({ target }: { target: number | null }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === null) return;
    let start = 0;
    const duration = 600;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [target]);
  if (target === null) return <Text style={styles.statValue}>—</Text>;
  return <Text style={styles.statValue}>{display}</Text>;
}

function GridCard({ item, index }: { item: any; index: number }) {
  const router = useRouter();
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, delay: 150 + index * 70, friction: 7, useNativeDriver: true }).start();
  }, []);

  const onPressIn = () => { Haptics.selectionAsync(); Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start(); };
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.gridItem, {
      opacity: entrance,
      transform: [
        { scale: Animated.multiply(entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), scale) },
        { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }
      ]
    }]}>
      <TouchableOpacity
        onPress={() => item.route && router.push(item.route)}
        onPressIn={item.route ? onPressIn : undefined}
        onPressOut={item.route ? onPressOut : undefined}
        activeOpacity={item.route ? 1 : 0.8}
        style={!item.route ? { opacity: 0.5 } : {}}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}25` }]}>
          <Ionicons name={item.icon} size={30} color={item.color} />
        </View>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
        <View style={[styles.arrowBadge, { backgroundColor: `${item.color}15` }]}>
          <Ionicons name={item.route ? "arrow-forward" : "lock-closed"} size={12} color={item.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [bridgesCount, setBridgesCount] = useState<number | null>(null);
  const [pendingEmployees, setPendingEmployees] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('...');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    router.replace('/login');
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const [profileRes, bridgesRes, employeesRes] = await Promise.all([
        fetch('http://192.168.0.102:8000/api/users/profile/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://192.168.0.102:8000/api/bridges/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://192.168.0.102:8000/api/users/pending-employees/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
        setUserName(fullName || profileData.username || 'Administrator');
        setProfilePic(profileData.profile_picture ? `${profileData.profile_picture}?t=${Date.now()}` : null);
      }
      
      if (bridgesRes.ok) {
        const data = await bridgesRes.json();
        setBridgesCount(Array.isArray(data) ? data.length : 0);
      } else {
        setBridgesCount(0);
      }
      
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setPendingEmployees(Array.isArray(data) ? data.length : 0);
      } else {
        setPendingEmployees(0);
      }

    } catch (e) {
      setBridgesCount(0); setPendingEmployees(0); setUserName('Administrator');
    }
  };

  useFocusEffect(useCallback(() => {
    headerAnim.setValue(0); statsAnim.setValue(0);
    fetchStats().then(() => {
      Animated.stagger(100, [
        Animated.spring(headerAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.spring(statsAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    });
  }, []));

  const menuItems = [
    { id: 'employees', title: 'Employees', subtitle: 'Manage staff', icon: 'people-circle' as const, color: '#3b82f6', route: '/(admin-tabs)/employees' as any },
    { id: 'bridges', title: 'Toll Plazas', subtitle: 'Control gates & rates', icon: 'business' as const, color: '#10b981', route: '/(admin-tabs)/bridges' as any },
    { id: 'revenue', title: 'Revenue', subtitle: 'Coming soon', icon: 'cash' as const, color: '#64748b', route: null },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <View>
          <Text style={styles.greeting}>God Mode,</Text>
          <Text style={styles.driverName}>{userName}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={22} color="#64748b" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={[styles.statsContainer, { opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <View style={styles.statBox}>
          <Ionicons name="business" size={18} color="#10b981" style={{ marginBottom: 6 }} />
          <CountUp target={bridgesCount} />
          <Text style={styles.statLabel}>Total Plazas</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#ef444440' }]}>
          <Ionicons name="people" size={18} color="#ef4444" style={{ marginBottom: 6 }} />
          <CountUp target={pendingEmployees} />
          <Text style={styles.statLabel}>Pending Staff</Text>
        </View>
      </Animated.View>

      <Text style={styles.sectionTitle}>System Overview</Text>

      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <GridCard key={item.id} item={item} index={index} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 50 },
  blob1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#3b82f610', top: -40, right: -60, zIndex: 0 },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#8b5cf610', top: 80, left: -60, zIndex: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, zIndex: 1 },
  greeting: { fontSize: 14, color: '#8b5cf6', fontWeight: '500' },
  driverName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  profileBtn: { padding: 2 },
  profileImage: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#8b5cf6' },
  profilePlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430', justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', gap: 14, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#1e293b', padding: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#10b98120' },
  statValue: { fontSize: 34, fontWeight: '900', color: '#10b981' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  iconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  arrowBadge: { alignSelf: 'flex-start', padding: 4, borderRadius: 8, marginTop: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  itemSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 15 },
});

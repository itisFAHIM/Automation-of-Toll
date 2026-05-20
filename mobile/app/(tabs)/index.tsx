import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import DynamicDashboardChart from '@/components/DynamicDashboardChart';

function CountUp({ target, style }: { target: number | null, style?: any }) {
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
  if (target === null) return <Text style={[styles.statValue, style]}>—</Text>;
  return <Text style={[styles.statValue, style]}>{display}</Text>;
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
        onPress={() => router.push(item.route as any)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}25` }]}>
          <Ionicons name={item.icon} size={30} color={item.color} />
        </View>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
        <View style={[styles.arrowBadge, { backgroundColor: `${item.color}15` }]}>
          <Ionicons name="arrow-forward" size={12} color={item.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [activePasses, setActivePasses] = useState<number | null>(null);
  const [totalTrips, setTotalTrips] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('...');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [inactiveBridges, setInactiveBridges] = useState<any[]>([]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const [paymentsRes, profileRes, bridgesRes] = await Promise.all([
        fetch('http://192.168.0.106:8000/api/payments/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://192.168.0.106:8000/api/users/profile/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://192.168.0.106:8000/api/bridges/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
        setUserName(fullName || profileData.username || 'Driver');
        setProfilePic(profileData.profile_picture ? `${profileData.profile_picture}?t=${Date.now()}` : null);
      }
      
      const data = await paymentsRes.json();
      if (Array.isArray(data)) {
        setTotalTrips(data.length);
        setActivePasses(data.filter((p: any) => p.pass_status === 'active').length);
      } else { 
        setTotalTrips(0); 
        setActivePasses(0); 
      }

      if (bridgesRes.ok) {
        const bridgesData = await bridgesRes.json();
        if (Array.isArray(bridgesData)) {
          const inactive = bridgesData.filter((b: any) => !b.is_active);
          setInactiveBridges(inactive);
        }
      }
    } catch (e) {
      setTotalTrips(0); setActivePasses(0); setUserName('Driver');
    }
  };

  useFocusEffect(useCallback(() => {
    headerAnim.setValue(0); 
    statsAnim.setValue(0);
    bannerAnim.setValue(0);
    
    fetchStats().then(() => {
      Animated.stagger(100, [
        Animated.spring(headerAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.spring(statsAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    });
  }, []));

  // Trigger banner slide animation and warning haptic vibration
  const prevCount = useRef(0);
  useEffect(() => {
    if (inactiveBridges.length > 0) {
      Animated.spring(bannerAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
      if (inactiveBridges.length > prevCount.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      Animated.timing(bannerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
    prevCount.current = inactiveBridges.length;
  }, [inactiveBridges]);

  // Auto poll bridge status telemetry every 6 seconds to stay completely in sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'pay-toll', title: 'Pay Toll', subtitle: 'Purchase a new pass', icon: 'card-outline' as const, color: '#3b82f6', route: '/pay-toll' },
    { id: 'active-passes', title: 'Active Passes', subtitle: 'Show QR to operator', icon: 'qr-code-outline' as const, color: '#10b981', route: '/passes' },
    { id: 'history', title: 'History', subtitle: 'View your past trips', icon: 'receipt-outline' as const, color: '#8b5cf6', route: '/history' },
    { id: 'vehicles', title: 'My Vehicles', subtitle: 'Manage your cars', icon: 'car-sport-outline' as const, color: '#f59e0b', route: '/my-vehicles' },
    { id: 'bridge-status', title: 'Bridge Status', subtitle: 'Operational info', icon: 'map-outline' as const, color: '#ec4899', route: '/bridge-status' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Decorative gradient blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Driver Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.driverName} numberOfLines={1}>{userName}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={22} color="#64748b" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Overview Stats in beautiful 2-column glassmorphic cards */}
      <Animated.View style={[styles.dashboardGrid, { opacity: statsAnim }]}>
        <View style={[styles.dashboardCard, { borderTopColor: '#38bdf8', borderTopWidth: 3 }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>ACTIVE PASSES</Text>
            <View style={[styles.cardIconBadge, { backgroundColor: '#38bdf815' }]}>
              <Ionicons name="qr-code" size={14} color="#38bdf8" />
            </View>
          </View>
          <CountUp target={activePasses} style={styles.cardValue} />
          <Text style={styles.cardTrendGreen}>▲ {activePasses && activePasses > 0 ? 'Ready' : 'None'} <Text style={styles.cardTrendSub}>to tap</Text></Text>
        </View>

        <View style={[styles.dashboardCard, { borderTopColor: '#8b5cf6', borderTopWidth: 3 }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>TOTAL TRIPS</Text>
            <View style={[styles.cardIconBadge, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="receipt" size={14} color="#8b5cf6" />
            </View>
          </View>
          <CountUp target={totalTrips} style={styles.cardValue} />
          <Text style={styles.cardTrendGreen}>▲ 12.0% <Text style={styles.cardTrendSub}>crossings</Text></Text>
        </View>

        <View style={[styles.dashboardCard, { borderTopColor: '#10b981', borderTopWidth: 3 }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>CO2 SAVED</Text>
            <View style={[styles.cardIconBadge, { backgroundColor: '#10b98115' }]}>
              <Ionicons name="leaf" size={14} color="#10b981" />
            </View>
          </View>
          <Text style={styles.cardValue}>12.4 kg</Text>
          <Text style={styles.cardTrendGreen}>▲ 14.3% <Text style={styles.cardTrendSub}>eco score</Text></Text>
        </View>

        <View style={[styles.dashboardCard, { borderTopColor: '#ec4899', borderTopWidth: 3 }]}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>TIME SAVED</Text>
            <View style={[styles.cardIconBadge, { backgroundColor: '#ec489915' }]}>
              <Ionicons name="flash" size={14} color="#ec4899" />
            </View>
          </View>
          <Text style={styles.cardValue}>1.8 hrs</Text>
          <Text style={styles.cardTrendGreen}>▲ 24 min <Text style={styles.cardTrendSub}>via express</Text></Text>
        </View>
      </Animated.View>

      {/* Render Dynamic Smooth Curve Graph */}
      <Animated.View style={[{ marginBottom: 28 }, { opacity: statsAnim }]}>
        <DynamicDashboardChart 
          title="Toll Spend Activity"
          subtitle="Monthly crossing BDT spend flow — today"
          points={[
            { label: 'Jan', value: 850, subValue: '2 Trips' },
            { label: 'Feb', value: 1200, subValue: '4 Trips' },
            { label: 'Mar', value: 950, subValue: '3 Trips' },
            { label: 'Apr', value: 1800, subValue: '6 Trips' },
            { label: 'May', value: 2400, subValue: '8 Trips' },
            { label: 'Jun', value: 1500, subValue: '5 Trips' }
          ]}
          accentColor="#3b82f6"
          valuePrefix="৳"
        />
      </Animated.View>

      {/* NEW: Live Bridge suspension alert warning banner */}
      {inactiveBridges.length > 0 && (
        <Animated.View style={[styles.warningBanner, { 
          opacity: bannerAnim, 
          transform: [{ 
            translateY: bannerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }] 
        }]}>
          <View style={styles.warningIconBox}>
            <Ionicons name="warning" size={22} color="#f59e0b" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.warningTitle}>PLAZA TRAFFIC ALERT</Text>
            <Text style={styles.warningDesc}>
              Toll processing gates at <Text style={{fontWeight: '800', color: '#fff'}}>{inactiveBridges.map(b => b.name).join(', ')}</Text> are temporarily suspended by operators. Plan routes accordingly.
            </Text>
          </View>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>Quick Access</Text>

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
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#10b98110', top: 80, left: -60, zIndex: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, zIndex: 1 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  driverName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  profileBtn: { padding: 2 },
  profileImage: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#3b82f6' },
  profilePlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430', justifyContent: 'center', alignItems: 'center' },
  
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  dashboardCard: { width: '48%', backgroundColor: '#1e293b', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#334155', minHeight: 110, justifyContent: 'space-between', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 9, color: '#64748b', fontWeight: '800', letterSpacing: 0.5 },
  cardIconBadge: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardValue: { fontSize: 18, color: '#fff', fontWeight: '900', marginTop: 8, fontFamily: 'monospace' },
  cardTrendGreen: { fontSize: 9, color: '#10b981', fontWeight: '700', marginTop: 4 },
  cardTrendSub: { color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: 18, color: '#fff', fontWeight: '900' },
  
  // Warning Banner Styles
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b10', borderRadius: 20, borderWidth: 1, borderColor: '#f59e0b25', padding: 16, marginBottom: 28 },
  warningIconBox: { backgroundColor: '#f59e0b18', padding: 10, borderRadius: 12 },
  warningTitle: { color: '#f59e0b', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  warningDesc: { color: '#cbd5e1', fontSize: 12, marginTop: 4, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  iconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  arrowBadge: { alignSelf: 'flex-start', padding: 4, borderRadius: 8, marginTop: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  itemSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 15 },
}) as any;
import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import TelemetryChart from '@/components/TelemetryChart';

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

function BridgeCard({ item, index, toggleActive }: { item: any; index: number; toggleActive: any }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, delay: 300 + index * 100, friction: 8, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.bridgeCard, {
      opacity: entrance,
      transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
    }]}>
      <View style={styles.bridgeIconBox}>
        <Ionicons name="business" size={24} color={item.is_active ? "#10b981" : "#ef4444"} />
      </View>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={styles.bridgeName}>{item.name}</Text>
        <Text style={item.is_active ? styles.statusActive : styles.statusInactive}>
          {item.is_active ? 'OPERATIONAL' : 'DISABLED'}
        </Text>
      </View>
      <Switch 
        value={item.is_active} 
        onValueChange={() => {
          Haptics.selectionAsync();
          toggleActive(item.id, item.is_active);
        }}
        trackColor={{ false: '#334155', true: '#10b981' }}
        thumbColor="#fff"
      />
    </Animated.View>
  );
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [bridges, setBridges] = useState<any[]>([]);
  const [activeBridgesCount, setActiveBridgesCount] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('...');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loadingBridges, setLoadingBridges] = useState(true);

  // Live Scans Activity Feed
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [shiftRevenue, setShiftRevenue] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const targetProgress = useRef(new Animated.Value(0)).current;

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    router.replace('/login');
  };

  const fetchScans = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const scansRes = await fetch('http://192.168.0.106:8000/api/passes/recent-scans/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (scansRes.ok) {
        const scansData = await scansRes.json();
        const scansArr = Array.isArray(scansData) ? scansData : [];
        setRecentScans(scansArr);
        
        // Sum exact revenues dynamically from actual verified pass payment amounts
        const totalRevenue = scansArr.reduce((acc: number, scan: any) => acc + (scan.amount || 0), 0);
        setShiftRevenue(totalRevenue);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScans(false);
    }
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const [profileRes, bridgesRes] = await Promise.all([
        fetch('http://192.168.0.106:8000/api/users/profile/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://192.168.0.106:8000/api/bridges/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
        setUserName(fullName || profileData.username || 'Employee');
        setProfilePic(profileData.profile_picture ? `${profileData.profile_picture}?t=${Date.now()}` : null);
      }
      
      if (bridgesRes.ok) {
        const data = await bridgesRes.json();
        const arr = Array.isArray(data) ? data : [];
        setBridges(arr);
        setActiveBridgesCount(arr.filter((b: any) => b.is_active).length);
      } else {
        setBridges([]);
        setActiveBridgesCount(0);
      }
    } catch (e) {
      setBridges([]); setActiveBridgesCount(0); setUserName('Employee');
    } finally {
      setLoadingBridges(false);
    }
  };

  // Run initial anims and data fetch
  useFocusEffect(useCallback(() => {
    headerAnim.setValue(0); 
    statsAnim.setValue(0); 
    targetProgress.setValue(0);
    setLoadingBridges(true);
    setLoadingScans(true);
    
    Promise.all([fetchData(), fetchScans()]).then(() => {
      Animated.stagger(100, [
        Animated.spring(headerAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.spring(statsAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    });
  }, []));

  // Animate targetProgress dynamically whenever recentScans list updates!
  useEffect(() => {
    const SHIFT_TARGET_GOAL = 15;
    const currentPercent = Math.min(1.0, recentScans.length / SHIFT_TARGET_GOAL);
    Animated.timing(targetProgress, {
      toValue: currentPercent,
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, [recentScans]);

  // Auto poll recent scans every 8 seconds to show real-time stream updates!
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScans();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const toggleBridgeActive = async (id: number, currentStatus: boolean) => {
    const isNowActive = !currentStatus;
    setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: isNowActive } : b));
    setActiveBridgesCount(prev => prev !== null ? prev + (isNowActive ? 1 : -1) : null);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.106:8000/api/bridges/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: isNowActive })
      });
      if (!res.ok) {
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        setActiveBridgesCount(prev => prev !== null ? prev + (currentStatus ? 1 : -1) : null);
        Alert.alert('Error', 'Failed to toggle status');
      }
    } catch { 
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        setActiveBridgesCount(prev => prev !== null ? prev + (currentStatus ? 1 : -1) : null);
        Alert.alert('Error', 'Network error'); 
    }
  };

  const menuItems = [
    { id: 'scanner', title: 'Scan Passes', subtitle: 'Verify traveler QR', icon: 'scan-outline' as const, color: '#3b82f6', route: '/(employee-tabs)/scanner' as any },
    { id: 'renewals', title: 'Renewal Requests', subtitle: 'Approve pass top-ups', icon: 'sync-circle-outline' as const, color: '#f59e0b', route: '/(employee-tabs)/renewals' as any },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Operator Header info */}
      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <View>
          <Text style={styles.greeting}>Operator Desk,</Text>
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

      {/* Primary stats widget */}
      <Animated.View style={[styles.statsContainer, { opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <View style={styles.statBox}>
          <Ionicons name="business" size={18} color="#10b981" style={{ marginBottom: 6 }} />
          <CountUp target={activeBridgesCount} style={{color: '#10b981'}} />
          <Text style={styles.statLabel}>Online Plazas</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#f59e0b40' }]}>
          <Ionicons name="alert-circle" size={18} color="#f59e0b" style={{ marginBottom: 6 }} />
          <CountUp target={bridges.length - (activeBridgesCount || 0)} style={{color: '#f59e0b'}} />
          <Text style={styles.statLabel}>Offline Gates</Text>
        </View>
      </Animated.View>

      {/* NEW: Shift performance telemetry indicator card */}
      <Animated.View style={[styles.shiftCard, { opacity: statsAnim }]}>
        <View style={styles.shiftCardHeader}>
          <View>
            <Text style={styles.shiftTitle}>CURRENT SHIFT METRICS</Text>
            <Text style={styles.shiftSubtitle}>Real-time performance tracking</Text>
          </View>
          <View style={styles.shiftRevenueBadge}>
            <Text style={styles.revenueBadgeLabel}>REVENUE</Text>
            <Text style={styles.revenueBadgeVal}>BDT {shiftRevenue}</Text>
          </View>
        </View>

        {/* Visual progress bar targeting shift metrics */}
        <View style={styles.progressContainer}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>Shift Target Status ({recentScans.length} of 15 Scans)</Text>
            <Text style={styles.progressPercent}>{Math.round(Math.min(100, (recentScans.length / 15) * 100))}% completed</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, {
              width: targetProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }]} />
          </View>
        </View>
      </Animated.View>

      <View style={{ marginBottom: 32 }}>
        <TelemetryChart />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <GridCard key={item.id} item={item} index={index} />
        ))}
      </View>

      {/* NEW: Live scans activity telemetry feed */}
      <View style={{ marginTop: 32 }}>
        <View style={styles.feedHeaderRow}>
          <Text style={styles.sectionTitle}>Live Plaza Scan Stream</Text>
          <View style={styles.liveStreamBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveStreamLabel}>LIVE TELEMETRY</Text>
          </View>
        </View>
        
        {loadingScans ? (
          <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.feedContainer}>
            {recentScans.length > 0 ? recentScans.map((scan) => (
              <View key={scan.id} style={styles.scanFeedCard}>
                <View style={styles.scanIconBox}>
                  <Ionicons name={scan.vehicle_icon || 'car-sport-outline'} size={20} color="#3b82f6" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateText}>{scan.vehicle}</Text>
                    </View>
                    <Text style={styles.scanTimeText}>
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.scanDetailText}>
                    Passed <Text style={{fontWeight: '700', color: '#fff'}}>{scan.bridge}</Text> • Driver: <Text style={{color: '#94a3b8'}}>{scan.driver}</Text>
                  </Text>
                </View>
              </View>
            )) : (
              <Text style={styles.emptyFeedText}>No vehicle scans recorded in this shift yet.</Text>
            )}
          </View>
        )}
      </View>

      {/* Global overrides toggle section */}
      <View style={{ marginTop: 32 }}>
        <Text style={styles.sectionTitle}>Global Plaza Overrides</Text>
        <Text style={styles.subtitle}>Toggle instantly to halt incoming traffic toll processing</Text>
        
        {loadingBridges ? (
          <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 24 }} />
        ) : (
          <View style={{ marginTop: 16 }}>
            {bridges.map((bridge, index) => (
              <BridgeCard 
                key={bridge.id} 
                item={bridge} 
                index={index} 
                toggleActive={toggleBridgeActive} 
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 50 },
  blob1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#10b98110', top: -40, right: -60, zIndex: 0 },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#3b82f610', top: 180, left: -60, zIndex: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, zIndex: 1 },
  greeting: { fontSize: 14, color: '#10b981', fontWeight: '500' },
  driverName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  profileBtn: { padding: 2 },
  profileImage: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#10b981' },
  profilePlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430', justifyContent: 'center', alignItems: 'center' },
  
  statsContainer: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1e293b', padding: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#10b98120' },
  statValue: { fontSize: 34, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Shift card styles
  shiftCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 32 },
  shiftCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  shiftSubtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  shiftRevenueBadge: { backgroundColor: '#10b98112', borderWidth: 1, borderColor: '#10b98125', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'flex-end' },
  revenueBadgeLabel: { color: '#10b981', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  revenueBadgeVal: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 2 },
  progressContainer: { marginTop: 20 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  progressPercent: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  progressBarBg: { height: 8, backgroundColor: '#0f172a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  subtitle: { color: '#94a3b8', fontSize: 12, marginBottom: 16, lineHeight: 18 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  iconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  arrowBadge: { alignSelf: 'flex-start', padding: 4, borderRadius: 8, marginTop: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  itemSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 15 },
  
  // Live Feed styles
  feedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  liveStreamBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f612', borderWidth: 1, borderColor: '#3b82f625', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  liveStreamLabel: { color: '#3b82f6', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  feedContainer: { gap: 12 },
  scanFeedCard: { backgroundColor: '#1e293b', borderLeftWidth: 3, borderLeftColor: '#3b82f6', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  scanIconBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 12 },
  plateBadge: { backgroundColor: '#0f172a', borderWidth: 1.5, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  plateText: { color: '#38bdf8', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  scanTimeText: { color: '#64748b', fontSize: 11 },
  scanDetailText: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  emptyFeedText: { color: '#64748b', fontSize: 13, textAlign: 'center', marginVertical: 14 },

  bridgeCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center' },
  bridgeIconBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12 },
  bridgeName: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  statusActive: { fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: '900', letterSpacing: 1 },
  statusInactive: { fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: '900', letterSpacing: 1 }
});

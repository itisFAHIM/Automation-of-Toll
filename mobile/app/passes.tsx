import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

type TollPass = { 
  id: number; 
  bridge: string; 
  vehicle: string; 
  qr_code_url: string; 
  status: string; 
  pass_status: string; 
  renewal_status: string; 
  transaction_id: string; 
  token: string; 
  paid_at: string;
  created_at: string;
  expires_at: string;
};

function ActivePassCard({ item }: { item: TollPass }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>('00h 00m 00s');
  const [percentLeft, setPercentLeft] = useState<number>(1);
  const colorAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Pulse/blink animation for security watermark
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Border color cycling animation
  useEffect(() => {
    const cycle = Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false
      })
    );
    cycle.start();
    return () => cycle.stop();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981']
  });

  const parseSafeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    try {
      const formatted = dateStr.toString().replace(' ', 'T');
      const parsed = Date.parse(formatted);
      if (!isNaN(parsed)) return parsed;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.getTime();
    } catch (e) {
      console.warn("Date parse error", dateStr, e);
    }
    return null;
  };

  // Timer update
  useEffect(() => {
    const updateTimer = () => {
      const parsedExpires = parseSafeDate(item.expires_at);
      const parsedPaid = parseSafeDate(item.paid_at || item.created_at);
      
      const paidTime = parsedPaid || Date.now();
      const expiresTime = parsedExpires || (paidTime + 6 * 60 * 60 * 1000);
      
      const totalDuration = expiresTime - paidTime > 0 ? expiresTime - paidTime : 6 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expiresTime - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setPercentLeft(0);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hString = hours.toString().padStart(2, '0');
        const mString = minutes.toString().padStart(2, '0');
        const sString = seconds.toString().padStart(2, '0');
        
        setTimeLeft(`${hString}h ${mString}m ${sString}s`);
        setPercentLeft(Math.max(0, Math.min(1, diff / totalDuration)));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [item.expires_at, item.paid_at, item.created_at]);

  const progressBarColor = percentLeft > 0.33 ? '#10b981' : percentLeft > 0.16 ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.passCard}>
      {/* Premium Ticket Header with details */}
      <View style={styles.passHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bridgeName}>{item.bridge}</Text>
          <Text style={styles.vehicleInfo}>Vehicle: {item.vehicle}</Text>
        </View>
        <Animated.View style={[styles.liveBadge, { opacity: blinkAnim }]}>
          <Ionicons name="radio-button-on" size={14} color="#10b981" />
          <Text style={styles.liveBadgeText}>SECURE PASS</Text>
        </Animated.View>
      </View>

      {/* Ticket Tear line styling */}
      <View style={styles.ticketDivider}>
        <View style={styles.ticketLeftCutout} />
        <View style={styles.ticketDotLine} />
        <View style={styles.ticketRightCutout} />
      </View>

      {/* Dynamic Security Visualizer QR Area */}
      <View style={styles.visualizerArea}>
        <Animated.View style={[styles.qrBorderWrapper, { borderColor }]}>
          <View style={styles.qrContainer}>
            <Image 
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PASS:${item.token}` }} 
              style={{ width: 190, height: 190 }} 
            />
          </View>
        </Animated.View>
        <Text style={styles.watermarkText}>SCAN AT TOLL BOOTH</Text>
      </View>

      {/* NFC simulated trigger button */}
      <TouchableOpacity 
        style={styles.nfcButton} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({
            pathname: '/express-pass',
            params: {
              token: item.token,
              bridge: item.bridge,
              vehicle: item.vehicle,
              txn: item.transaction_id
            }
          });
        }}
      >
        <Ionicons name="wifi" size={18} color="#fff" style={{ transform: [{ rotate: '90deg' }], marginRight: 8 }} />
        <Text style={styles.nfcButtonText}>NFC CONTACTLESS TAP</Text>
      </TouchableOpacity>

      {/* Expiry Ticker Panel */}
      <View style={styles.tickerPanel}>
        <View style={styles.tickerHeader}>
          <Ionicons name="time-outline" size={14} color="#94a3b8" />
          <Text style={styles.tickerLabel}>TIME REMAINING</Text>
        </View>
        <Text style={[styles.tickerValue, timeLeft === 'Expired' && { color: '#ef4444' }]}>
          {timeLeft}
        </Text>

        {/* Linear Progress Bar Indicator */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percentLeft * 100}%`, backgroundColor: progressBarColor }]} />
        </View>
      </View>

      <Text style={styles.tokenText}>TXN: {item.transaction_id}</Text>
    </View>
  );
}

export default function PassesScreen() {
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<TollPass[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'used'>('active');

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.106:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const requestRenewal = async (tokenString: string) => {
    try {
      const t = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.106:8000/api/passes/request-renewal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({ token: tokenString })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Renewal requested! Pending employee approval.');
        fetchPasses();
      } else {
        Alert.alert('Error', data.error || 'Failed to request');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const currentPasses = passes.filter(p => p.pass_status === activeTab);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Passes</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.activeTab]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'expired' && styles.activeTab]} onPress={() => setActiveTab('expired')}>
          <Text style={[styles.tabText, activeTab === 'expired' && styles.activeTabText]}>Expired</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'used' && styles.activeTab]} onPress={() => setActiveTab('used')}>
          <Text style={[styles.tabText, activeTab === 'used' && styles.activeTabText]}>Used</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {activeTab === 'active' ? 'Present this secure QR Code to the operator' : activeTab === 'expired' ? 'Passes that missed the 6-hour window' : 'Completed journeys'}
      </Text>
      
      {loading ? <ActivityIndicator size="large" color="#10b981" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={currentPasses}
          keyExtractor={(p: any) => p.id.toString()}
          renderItem={({item}) => {
            if (activeTab === 'active') {
              return <ActivePassCard item={item} />;
            }
            return (
              <View style={styles.passCard}>
                <View style={styles.passHeader}>
                  <Text style={styles.bridgeName}>{item.bridge}</Text>
                  <Text style={item.pass_status === 'active' ? styles.statusActive : styles.statusInactive}>
                    {item.pass_status.toUpperCase()}
                  </Text>
                </View>
                
                <Text style={styles.vehicleInfo}>Vehicle: {item.vehicle}</Text>
                
                {item.pass_status === 'expired' && (
                  <View style={styles.renewalBox}>
                    {item.renewal_status === 'requested' ? (
                      <Text style={styles.pendingText}>Renewal Pending Approval</Text>
                    ) : item.renewal_status === 'rejected' ? (
                      <Text style={styles.rejectedText}>Renewal Rejected</Text>
                    ) : (
                      <TouchableOpacity style={styles.renewBtn} onPress={() => requestRenewal(item.token)}>
                        <Text style={styles.renewBtnText}>Request 6-Hour Renewal</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                <Text style={styles.tokenText}>TXN: {item.transaction_id}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No {activeTab} passes found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 40, marginBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#334155' },
  tabText: { color: '#94a3b8', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20, textAlign: 'center' },
  passCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bridgeName: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  statusActive: { backgroundColor: '#10b98120', color: '#10b981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold' },
  statusInactive: { backgroundColor: '#ef444420', color: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold' },
  vehicleInfo: { color: '#cbd5e1', fontSize: 15, marginBottom: 4 },
  qrContainer: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  tokenText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontFamily: 'monospace', fontSize: 11 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 50 },
  renewalBox: { marginTop: 10, alignItems: 'center', padding: 16, backgroundColor: '#0f172a', borderRadius: 12, width: '100%' },
  renewBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  renewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  pendingText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 },
  rejectedText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },

  // Live ticket styles
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98115', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#10b98130' },
  liveBadgeText: { color: '#10b981', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  ticketDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, position: 'relative' },
  ticketLeftCutout: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0f172a', marginLeft: -32 },
  ticketRightCutout: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0f172a', marginRight: -32 },
  ticketDotLine: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', marginHorizontal: 8 },
  visualizerArea: { alignItems: 'center', marginVertical: 6 },
  qrBorderWrapper: { borderWidth: 4, borderRadius: 24, padding: 12, backgroundColor: '#fff', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  watermarkText: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 14, textTransform: 'uppercase' },
  tickerPanel: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#1e293b', width: '100%' },
  tickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tickerLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  tickerValue: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 0.5, fontFamily: 'monospace' },
  progressBarBg: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  nfcButton: { backgroundColor: '#ec4899', height: 48, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#ec489950' },
  nfcButtonText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

type PaymentHistory = {
  id: number; bridge: string; vehicle: string; amount: string;
  payment_method: string; status: string; pass_status?: string;
  transaction_id: string; paid_at: string;
};

function HistoryCard({ item, index }: { item: PaymentHistory; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: index * 60, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const badgeStatus = item.pass_status || item.status;
  const badgeColor = badgeStatus === 'active' ? '#10b981' : badgeStatus === 'used' ? '#8b5cf6' : '#ef4444';

  return (
    <Animated.View style={[styles.card, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }]
    }]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.bridgeName}>{item.bridge}</Text>
          <Text style={styles.dateText}>{formatDate(item.paid_at)}</Text>
        </View>
        <Text style={styles.amount}>BDT {item.amount}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.cardBottom}>
        <View style={styles.row}>
          <Ionicons name="car-outline" size={15} color="#94a3b8" />
          <Text style={styles.detailText}>{item.vehicle}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="card-outline" size={15} color="#94a3b8" />
          <Text style={styles.detailText}>{item.payment_method.toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeStatus.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.txnText}>TXN: {item.transaction_id}</Text>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, []));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>All your purchased trips</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingBottom: 40 }}
          data={history}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({ item, index }) => <HistoryCard item={item} index={index} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor="#8b5cf6" colors={['#8b5cf6']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>No payment history found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bridgeName: { fontSize: 17, color: '#fff', fontWeight: '700' },
  dateText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  amount: { fontSize: 20, color: '#8b5cf6', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  txnText: { color: '#64748b', fontSize: 10, marginTop: 14, fontFamily: 'monospace' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 16 },
});

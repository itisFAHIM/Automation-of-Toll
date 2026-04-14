import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PaymentHistory = {
  id: number;
  bridge: string;
  vehicle: string;
  amount: string;
  payment_method: string;
  status: string;
  pass_status?: string;
  transaction_id: string;
  paid_at: string;
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PaymentHistory[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/payments/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Payment History</Text>
      <Text style={styles.subtitle}>A record of all your purchased trips</Text>
      
      {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={history}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
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
                  <Ionicons name="car-outline" size={16} color="#94a3b8" />
                  <Text style={styles.detailText}>{item.vehicle}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="card-outline" size={16} color="#94a3b8" />
                  <Text style={styles.detailText}>{item.payment_method.toUpperCase()}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.pass_status ? item.pass_status.toUpperCase() : item.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.txnText}>TXN: {item.transaction_id}</Text>
            </View>
          )}
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
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bridgeName: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  amount: { fontSize: 20, color: '#8b5cf6', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  badge: { backgroundColor: '#10b98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#10b981', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  txnText: { color: '#64748b', fontSize: 10, marginTop: 16, fontFamily: 'monospace' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 16 }
});

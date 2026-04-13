import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TollPass = { id: number; bridge: string; vehicle: string; qr_code_url: string; status: string; transaction_id: string; paid_at: string };

export default function PassesScreen() {
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<TollPass[]>([]);

  useEffect(() => {
    const fetchPasses = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch('http://192.168.0.102:8000/api/payments/', {
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
    fetchPasses();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Active Passes</Text>
      <Text style={styles.subtitle}>Present this QR Code to the operator</Text>
      
      {loading ? <ActivityIndicator size="large" color="#10b981" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={passes}
          keyExtractor={(p: any) => p.id.toString()}
          renderItem={({item}) => (
            <View style={styles.passCard}>
              <View style={styles.passHeader}>
                <Text style={styles.bridgeName}>{item.bridge}</Text>
                <Text style={item.status === 'paid' ? styles.statusActive : styles.statusInactive}>ACTIVE</Text>
              </View>
              
              <Text style={styles.vehicleInfo}>Vehicle: {item.vehicle}</Text>
              
              <View style={styles.qrContainer}>
                <Image 
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PASS:${item.transaction_id}` }} 
                  style={{width: 250, height: 250}} 
                />
              </View>
              
              <Text style={styles.tokenText}>TXN: {item.transaction_id}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No active passes found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 20 },
  passCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bridgeName: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  statusActive: { backgroundColor: '#10b98120', color: '#10b981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold' },
  statusInactive: { backgroundColor: '#ef444420', color: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold' },
  vehicleInfo: { color: '#cbd5e1', fontSize: 16, marginBottom: 24 },
  qrContainer: { alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  tokenText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontFamily: 'monospace' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 50 }
});

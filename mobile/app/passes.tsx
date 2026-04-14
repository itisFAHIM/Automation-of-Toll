import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TollPass = { id: number; bridge: string; vehicle: string; qr_code_url: string; status: string; pass_status: string; renewal_status: string; transaction_id: string; token: string; paid_at: string };

export default function PassesScreen() {
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<TollPass[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'used'>('active');

  const fetchPasses = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchPasses();
  }, []);

  const requestRenewal = async (tokenString: string) => {
    try {
      const t = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/passes/request-renewal/', {
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
        {activeTab === 'active' ? 'Present this QR Code to the operator' : activeTab === 'expired' ? 'Passes that missed the 6-hour window' : 'Completed journeys'}
      </Text>
      
      {loading ? <ActivityIndicator size="large" color="#10b981" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={currentPasses}
          keyExtractor={(p: any) => p.id.toString()}
          renderItem={({item}) => (
            <View style={styles.passCard}>
              <View style={styles.passHeader}>
                <Text style={styles.bridgeName}>{item.bridge}</Text>
                <Text style={item.pass_status === 'active' ? styles.statusActive : styles.statusInactive}>
                  {item.pass_status.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.vehicleInfo}>Vehicle: {item.vehicle}</Text>
              
              {item.pass_status === 'active' && (
                <View style={styles.qrContainer}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PASS:${item.token}` }} 
                    style={{width: 250, height: 250}} 
                  />
                </View>
              )}
              
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
          )}
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
  vehicleInfo: { color: '#cbd5e1', fontSize: 16, marginBottom: 24 },
  qrContainer: { alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  tokenText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontFamily: 'monospace' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 50 },
  renewalBox: { marginTop: 10, alignItems: 'center', padding: 16, backgroundColor: '#0f172a', borderRadius: 12 },
  renewBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  renewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  pendingText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 },
  rejectedText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
});

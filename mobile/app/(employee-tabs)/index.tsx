import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

type Bridge = { id: number; name: string; is_active: boolean };

export default function EmployeeDashboard() {
  const router = useRouter();
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBridges(); }, []);

  const fetchBridges = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/bridges/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBridges(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    router.replace('/login');
  };

  const toggleBridgeActive = async (id: number, currentStatus: boolean) => {
    setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) {
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        Alert.alert('Error', 'Failed to toggle status');
      }
    } catch { 
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        Alert.alert('Error', 'Network error'); 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Toll Operator Mode</Text>
          <Text style={styles.name}>Employee Desk</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={32} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/(employee-tabs)/scanner')}>
        <Ionicons name="scan-outline" size={64} color="#fff" />
        <Text style={styles.scanText}>Scan Toll Pass</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Global Plaza Overrides</Text>
      <Text style={styles.subtitle}>Toggle instantly to halt incoming traffic toll processing</Text>
      
      {loading ? <ActivityIndicator size="small" color="#10b981" /> : (
        <FlatList 
          style={{marginTop: 16}}
          data={bridges}
          keyExtractor={(b) => b.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="business" size={24} color="#8b5cf6" />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={styles.bridgeName}>{item.name}</Text>
                <Text style={item.is_active ? styles.statusActive : styles.statusInactive}>
                  {item.is_active ? 'OPERATIONAL' : 'DISABLED'}
                </Text>
              </View>
              <Switch 
                value={item.is_active} 
                onValueChange={() => toggleBridgeActive(item.id, item.is_active)}
                trackColor={{ false: '#334155', true: '#10b981' }}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 16, color: '#94a3b8' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  logoutBtn: { padding: 8 },
  scanBtn: { backgroundColor: '#10b981', padding: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10, marginBottom: 30 },
  scanText: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 12 },
  sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12 },
  bridgeName: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  statusActive: { fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: '900', letterSpacing: 1 },
  statusInactive: { fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: '900', letterSpacing: 1 }
});

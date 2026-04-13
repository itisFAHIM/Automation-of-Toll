import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>God Mode</Text>
          <Text style={styles.name}>Administrator</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={32} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>System Overview</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(admin-tabs)/employees')}>
          <Ionicons name="people-circle" size={48} color="#3b82f6" />
          <Text style={styles.gridText}>Manage Employees</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(admin-tabs)/bridges')}>
          <Ionicons name="business" size={48} color="#10b981" />
          <Text style={styles.gridText}>Toll Plazas & Bridges</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItemLocked}>
          <Ionicons name="cash" size={48} color="#64748b" />
          <Text style={styles.gridTextLocked}>Revenue (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  greeting: { fontSize: 16, color: '#94a3b8' },
  name: { fontSize: 28, fontWeight: '800', color: '#8b5cf6', marginTop: 4 },
  logoutBtn: { padding: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  gridItem: { width: '47%', backgroundColor: '#1e293b', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  gridItemLocked: { width: '47%', backgroundColor: '#0f172a', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', opacity: 0.5 },
  gridText: { color: '#fff', marginTop: 12, fontWeight: 'bold', textAlign: 'center' },
  gridTextLocked: { color: '#64748b', marginTop: 12, fontWeight: 'bold', textAlign: 'center' }
});

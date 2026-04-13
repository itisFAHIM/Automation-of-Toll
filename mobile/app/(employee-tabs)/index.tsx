import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EmployeeDashboard() {
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
          <Text style={styles.greeting}>Toll Operator Mode</Text>
          <Text style={styles.name}>Employee Desk</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={32} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-done-outline" size={32} color="#10b981" />
          <Text style={styles.statLabel}>Ready</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/(employee-tabs)/scanner')}>
        <Ionicons name="scan-outline" size={64} color="#fff" />
        <Text style={styles.scanText}>Scan Toll Pass</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  greeting: { fontSize: 16, color: '#94a3b8' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  logoutBtn: { padding: 8 },
  statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  statBox: { flex: 1, backgroundColor: '#1e293b', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statLabel: { color: '#cbd5e1', marginTop: 8, fontWeight: '500' },
  scanBtn: { backgroundColor: '#10b981', padding: 40, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  scanText: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 16 }
});

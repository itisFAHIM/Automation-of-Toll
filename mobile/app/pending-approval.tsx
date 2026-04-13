import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PendingApprovalScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={100} color="#f59e0b" />
      <Text style={styles.title}>Approval Pending</Text>
      <Text style={styles.subtitle}>
        Your account is currently registered as a Toll Employee. You must wait for an Administrator to approve your access before you can use the scanner.
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 24, marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  button: { backgroundColor: '#1e293b', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

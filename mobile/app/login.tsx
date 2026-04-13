import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.102:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem('token', data.access);
        
        // Fetch User Profile to get Role
        const profileRes = await fetch('http://192.168.0.102:8000/api/users/profile/', {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        const profileData = await profileRes.json();
        const role = profileData.role || 'driver';
        
        await AsyncStorage.setItem('role', role);

        if (role === 'admin') {
          router.replace('/(admin-tabs)' as any);
        } else if (role === 'employee') {
          router.replace('/(employee-tabs)' as any);
        } else if (role === 'employee_pending') {
          router.replace('/pending-approval' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } else {
        Alert.alert('Login Failed', data.detail || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toll Management</Text>
      <Text style={styles.subtitle}>Driver Login</Text>

      <View style={styles.form}>
        <TextInput 
          style={styles.input} 
          placeholder="Username" 
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkButton}>
          <Text style={styles.linkText}>New driver? Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  form: { gap: 16 },
  input: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: 10 },
  linkText: { color: '#38bdf8', fontSize: 14 }
});

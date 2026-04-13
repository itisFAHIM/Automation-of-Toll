import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', requested_role: 'driver' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.username || !form.password) {
      Alert.alert('Error', 'Username and Password are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.102:8000/api/users/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (response.ok || response.status === 201) {
        Alert.alert(
          'Registration Success', 
          form.requested_role === 'employee' ? 'Your Employee Application was sent to Admins for approval!' : 'Account created successfully!', 
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert('Registration Failed', JSON.stringify(data));
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join Toll Management System</Text>

      <View style={styles.form}>
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleBtn, form.requested_role === 'driver' && styles.roleActive]} 
            onPress={() => setForm({...form, requested_role: 'driver'})}>
            <Text style={[styles.roleText, form.requested_role === 'driver' && styles.roleTextActive]}>Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, form.requested_role === 'employee' && styles.roleActive]} 
            onPress={() => setForm({...form, requested_role: 'employee'})}>
            <Text style={[styles.roleText, form.requested_role === 'employee' && styles.roleTextActive]}>Toll Employee</Text>
          </TouchableOpacity>
        </View>

        <TextInput 
          style={styles.input} 
          placeholder="Username *" 
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          value={form.username}
          onChangeText={(v) => setForm({...form, username: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(v) => setForm({...form, email: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="First Name" 
          placeholderTextColor="#64748b"
          value={form.first_name}
          onChangeText={(v) => setForm({...form, first_name: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Last Name" 
          placeholderTextColor="#64748b"
          value={form.last_name}
          onChangeText={(v) => setForm({...form, last_name: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password *" 
          placeholderTextColor="#64748b"
          secureTextEntry
          value={form.password}
          onChangeText={(v) => setForm({...form, password: v})}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  form: { gap: 16 },
  roleContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  roleBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  roleActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  roleText: { color: '#94a3b8', fontWeight: 'bold' },
  roleTextActive: { color: '#fff' },
  input: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: 10 },
  linkText: { color: '#94a3b8', fontSize: 14 }
});

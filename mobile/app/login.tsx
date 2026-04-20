import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        const profileRes = await fetch('http://192.168.0.102:8000/api/users/profile/', {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        const profileData = await profileRes.json();
        const role = profileData.role || 'driver';
        await AsyncStorage.setItem('role', role);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (role === 'admin') router.replace('/(admin-tabs)' as any);
        else if (role === 'employee') router.replace('/(employee-tabs)' as any);
        else if (role === 'employee_pending') router.replace('/pending-approval' as any);
        else router.replace('/(tabs)' as any);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login Failed', data.detail || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const logoTranslateY = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  const formTranslateY = formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ translateY: logoTranslateY }] }]}>
        <View style={styles.iconBadge}>
          <Ionicons name="car-sport" size={36} color="#3b82f6" />
        </View>
        <Text style={styles.title}>Toll Management</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </Animated.View>

      <Animated.View style={[styles.form, { opacity: formAnim, transform: [{ translateY: formTranslateY }] }]}>
        {/* Username */}
        <View style={[styles.inputWrapper, focusedInput === 'username' && styles.inputWrapperFocused]}>
          <Ionicons name="person-outline" size={18} color={focusedInput === 'username' ? '#3b82f6' : '#64748b'} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            onFocus={() => setFocusedInput('username')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* Password */}
        <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputWrapperFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'password' ? '#3b82f6' : '#64748b'} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={loading}
            activeOpacity={1}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In →</Text>
            }
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkButton}>
          <Text style={styles.linkText}>New driver? <Text style={styles.linkBold}>Create an account</Text></Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 28, justifyContent: 'center', overflow: 'hidden' },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#1d4ed820', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#10b98115', bottom: -40, left: -60 },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  iconBadge: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#3b82f630' },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 6 },
  form: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1.5, borderColor: '#334155', paddingHorizontal: 14 },
  inputWrapperFocused: { borderColor: '#3b82f6', backgroundColor: '#1e293b' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, color: '#fff', fontSize: 16 },
  eyeBtn: { padding: 6 },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  linkButton: { alignItems: 'center', marginTop: 6 },
  linkText: { color: '#64748b', fontSize: 14 },
  linkBold: { color: '#38bdf8', fontWeight: '600' },
});


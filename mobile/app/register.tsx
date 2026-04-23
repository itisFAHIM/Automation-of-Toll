import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', requested_role: 'driver', phone_number: '' });
  const [nidImage, setNidImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const pickNidImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required to upload your NID.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setNidImage(result.assets[0]);
    }
  };

  const handleRequestOTP = async () => {
    if (!form.username || !form.password || !form.email) {
      Alert.alert('Error', 'Username, Email and Password are required');
      return;
    }
    if (!form.phone_number) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!nidImage) {
      Alert.alert('Error', 'NID card image is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.102:8000/api/users/request-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOtpModalVisible(true);
      } else {
        Alert.alert('Request Failed', JSON.stringify(data.error || data));
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
      if (!otpCode || otpCode.length !== 6) {
          Alert.alert('Error', 'Please enter a valid 6-digit OTP code.');
          return;
      }
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('username', form.username);
        formData.append('email', form.email);
        formData.append('password', form.password);
        formData.append('first_name', form.first_name);
        formData.append('last_name', form.last_name);
        formData.append('requested_role', form.requested_role);
        formData.append('otp', otpCode);
        formData.append('phone_number', form.phone_number);
        
        if (nidImage) {
          const uri = nidImage.uri;
          const filename = uri.split('/').pop() || 'nid.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('nid_image', { uri, name: filename, type } as any);
        }

        const response = await fetch('http://192.168.0.102:8000/api/users/register/', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (response.ok || response.status === 201) {
          setOtpModalVisible(false);
          Alert.alert(
            'Registration Success', 
            form.requested_role === 'employee' ? 'Your Employee Application was sent to Admins for approval!' : 'Account created successfully!', 
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
        } else {
          const errMsg = data.otp || data.nid_image || data.phone_number || JSON.stringify(data);
          Alert.alert('Registration Failed', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        }
      } catch (e) {
        Alert.alert('Error', 'Network error.');
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
          placeholder="Valid Email Required *" 
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(v) => setForm({...form, email: v})}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Phone Number *" 
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={form.phone_number}
          onChangeText={(v) => setForm({...form, phone_number: v})}
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

        {/* NID Card Image Picker */}
        <Text style={styles.label}>NID Card Image *</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickNidImage}>
          {nidImage ? (
            <Image source={{ uri: nidImage.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="id-card-outline" size={32} color="#64748b" />
              <Text style={styles.imagePickerText}>Tap to upload NID image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleRequestOTP} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Verification Code</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Email Verification</Text>
                <Text style={styles.modalSub}>A 6-digit code has been sent to {form.email}. Please enter it below to create your account.</Text>
                
                <TextInput 
                    style={styles.otpInput}
                    placeholder="------"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    textAlign="center"
                />

                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Create</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => setOtpModalVisible(false)}>
                    <Text style={{color: '#ef4444'}}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

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
  label: { color: '#94a3b8', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  imagePicker: { borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 16, overflow: 'hidden', backgroundColor: '#0f172a' },
  imagePickerPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  imagePickerText: { color: '#64748b', marginTop: 8, fontSize: 14 },
  previewImage: { width: '100%', height: 160, resizeMode: 'cover' },
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: 10 },
  linkText: { color: '#94a3b8', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  otpInput: { backgroundColor: '#0f172a', color: '#fff', fontSize: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', letterSpacing: 8 }
});

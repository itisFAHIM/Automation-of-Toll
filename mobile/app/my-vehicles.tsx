import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API = 'http://192.168.0.102:8000/api';

type Vehicle = {
  id: number;
  registration_number: string;
  vehicle_type: string;
  owner_name: string;
  status: string;
  submitted_at: string;
  eligible_for_approval_at: string | null;
  approved_at: string | null;
  vehicle_image_url: string | null;
  number_plate_image_url: string | null;
  document_image_url: string | null;
};

type VehicleType = { id: number; name: string; icon: string };

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const end = new Date(targetDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
        return;
      }
      setTimeLeft({
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;
  if (timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0) {
    return <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>Eligible for approval</Text>;
  }
  return (
    <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>
      Eligible in {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
    </Text>
  );
}

export default function MyVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [newReg, setNewReg] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newType, setNewType] = useState('car');
  const [vehicleImg, setVehicleImg] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [plateImg, setPlateImg] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [docImg, setDocImg] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await fetch(`${API}/vehicles/types/`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTypes(data);
        if (data.length > 0) setNewType(data[0].name);
      }
    } catch (e) {}
  };

  const fetchVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const r = await fetch(`${API}/vehicles/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await r.json();
      setVehicles(Array.isArray(d) ? d : []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (setter: (img: ImagePicker.ImagePickerAsset) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setter(result.assets[0]);
    }
  };

  const appendImage = (formData: FormData, fieldName: string, asset: ImagePicker.ImagePickerAsset | null) => {
    if (!asset) return;
    const uri = asset.uri;
    const filename = uri.split('/').pop() || `${fieldName}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append(fieldName, { uri, name: filename, type } as any);
  };

  const handleAdd = async () => {
    if (!newReg || !newOwner) { Alert.alert('Error', 'Registration number and owner name are required.'); return; }
    if (!vehicleImg) { Alert.alert('Error', 'Vehicle image is required.'); return; }
    if (!plateImg) { Alert.alert('Error', 'Number plate image is required.'); return; }
    if (!docImg) { Alert.alert('Error', 'Vehicle document image is required.'); return; }

    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('registration_number', newReg);
      formData.append('owner_name', newOwner);
      formData.append('vehicle_type', newType);
      appendImage(formData, 'vehicle_image', vehicleImg);
      appendImage(formData, 'number_plate_image', plateImg);
      appendImage(formData, 'document_image', docImg);

      const res = await fetch(`${API}/vehicles/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewReg(''); setNewOwner('');
        setVehicleImg(null); setPlateImg(null); setDocImg(null);
        setModalVisible(false);
        fetchVehicles();

        // Show pop-up based on day
        const now = new Date();
        const isThursday = now.getDay() === 4; // JS: 0=Sun, 4=Thu
        const waitTime = isThursday ? '72 hours' : '24 hours';
        const message = isThursday
          ? `Your vehicle has been submitted!\n\n⚠️ Thursday submissions require a minimum of 72 hours before admin approval.`
          : `Your vehicle has been submitted!\n\nPlease allow a minimum of 24 hours for admin review and approval.`;
        
        Alert.alert('📋 Vehicle Submitted', message, [{ text: 'Got it' }]);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.registration_number?.[0] || 'Could not add vehicle.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network request failed');
    }
    setAdding(false);
  };

  const pendingVehicles = vehicles.filter(v => v.status === 'pending');
  const approvedVehicles = vehicles.filter(v => v.status === 'approved');
  const rejectedVehicles = vehicles.filter(v => v.status === 'rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#f59e0b20', color: '#f59e0b', text: 'PENDING' };
      case 'approved': return { bg: '#10b98120', color: '#10b981', text: 'APPROVED' };
      case 'rejected': return { bg: '#ef444420', color: '#ef4444', text: 'REJECTED' };
      default: return { bg: '#64748b20', color: '#64748b', text: status.toUpperCase() };
    }
  };

  const renderVehicleCard = (item: Vehicle) => {
    const badge = getStatusBadge(item.status);
    return (
      <View style={styles.card} key={item.id}>
        {item.vehicle_image_url && (
          <Image source={{ uri: item.vehicle_image_url }} style={styles.cardImage} />
        )}
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.regNo}>{item.registration_number}</Text>
            <Text style={styles.owner}>{item.owner_name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: '#3b82f620' }]}>
              <Text style={[styles.typeBadgeText, { color: '#38bdf8' }]}>{item.vehicle_type}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
            {item.status === 'pending' && item.eligible_for_approval_at && (
              <View style={{ marginTop: 6 }}>
                <CountdownTimer targetDate={item.eligible_for_approval_at} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Vehicles</Text>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-outline" size={20} color="#fff" />
          <Text style={styles.headerAddText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 50 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Pending Section */}
          {pendingVehicles.length > 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={18} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>Pending Requests ({pendingVehicles.length})</Text>
              </View>
              {pendingVehicles.map(renderVehicleCard)}
            </View>
          )}

          {/* Approved Section */}
          {approvedVehicles.length > 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>Approved ({approvedVehicles.length})</Text>
              </View>
              {approvedVehicles.map(renderVehicleCard)}
            </View>
          )}

          {/* Rejected Section */}
          {rejectedVehicles.length > 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Rejected ({rejectedVehicles.length})</Text>
              </View>
              {rejectedVehicles.map(renderVehicleCard)}
            </View>
          )}

          {vehicles.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>No vehicles registered yet.</Text>
              <Text style={styles.emptySubText}>Tap 'Add Vehicle' to get started.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ADD VEHICLE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Register New Vehicle</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle-outline" size={32} color="#64748b" />
                </TouchableOpacity>
              </View>

              <TextInput style={styles.input} placeholder="Registration No. (e.g. DHK-123) *" placeholderTextColor="#64748b" value={newReg} onChangeText={setNewReg} />
              <TextInput style={styles.input} placeholder="Owner Name *" placeholderTextColor="#64748b" value={newOwner} onChangeText={setNewOwner} />

              <Text style={styles.label}>Vehicle Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                {types.map(t => (
                  <TouchableOpacity key={t.id} style={[styles.typeBtn, newType === t.name && styles.typeBtnActive]} onPress={() => setNewType(t.name)}>
                    <Text style={[styles.typeText, newType === t.name && styles.typeTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vehicle Image */}
              <Text style={styles.label}>Vehicle Image *</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setVehicleImg)}>
                {vehicleImg ? (
                  <Image source={{ uri: vehicleImg.uri }} style={styles.previewImg} />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color="#64748b" />
                    <Text style={styles.imgPlaceholderText}>Tap to upload vehicle photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Number Plate Image */}
              <Text style={styles.label}>Number Plate Image *</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setPlateImg)}>
                {plateImg ? (
                  <Image source={{ uri: plateImg.uri }} style={styles.previewImg} />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Ionicons name="card-outline" size={28} color="#64748b" />
                    <Text style={styles.imgPlaceholderText}>Tap to upload number plate photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Document Image */}
              <Text style={styles.label}>Vehicle Document *</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setDocImg)}>
                {docImg ? (
                  <Image source={{ uri: docImg.uri }} style={styles.previewImg} />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Ionicons name="document-outline" size={28} color="#64748b" />
                    <Text style={styles.imgPlaceholderText}>Tap to upload vehicle document</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Submit Vehicle</Text>}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  header: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 4 },
  headerAddText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  sectionBox: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: '#1e293b', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  cardImage: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  regNo: { color: '#fff', fontSize: 18, fontWeight: '800' },
  owner: { color: '#94a3b8', marginTop: 4, fontSize: 13 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  typeBadgeText: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontWeight: '900', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 18, marginTop: 16, fontWeight: '600' },
  emptySubText: { color: '#64748b', fontSize: 14, marginTop: 8 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  label: { color: '#94a3b8', marginBottom: 8, fontWeight: '700', marginTop: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155', fontSize: 16 },

  typeRow: { gap: 8, marginBottom: 10 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  typeBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  typeText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  typeTextActive: { color: '#fff' },

  imagePicker: { borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 16, overflow: 'hidden', backgroundColor: '#0f172a', marginBottom: 10 },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  imgPlaceholderText: { color: '#64748b', marginTop: 6, fontSize: 13 },
  previewImg: { width: '100%', height: 150, resizeMode: 'cover' },

  addBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

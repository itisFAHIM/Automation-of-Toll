import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Vehicle = { id: number; registration_number: string; vehicle_type: string; owner_name: string };
type VehicleType = { id: number; name: string; icon: string };

export default function MyVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);

  const [newReg, setNewReg] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newType, setNewType] = useState('car');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await fetch('http://192.168.0.102:8000/api/vehicles/types/');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTypes(data);
        if (data.length > 0) setNewType(data[0].name);
      }
    } catch(e) {}
  };

  const fetchVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const r = await fetch('http://192.168.0.102:8000/api/vehicles/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const d = await r.json();
      setVehicles(Array.isArray(d) ? d : []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newReg || !newOwner) { Alert.alert('Error', 'Fill all fields'); return; }
    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/vehicles/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ registration_number: newReg, owner_name: newOwner, vehicle_type: newType })
      });
      if (res.ok) {
        setNewReg(''); setNewOwner(''); setModalVisible(false); fetchVehicles();
      } else {
        Alert.alert('Error', 'Could not add vehicle. Check your connection.');
      }
    } catch (e) {}
    setAdding(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Vehicles</Text>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-outline" size={24} color="#fff" />
          <Text style={styles.headerAddText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? <ActivityIndicator color="#3b82f6" size="large" style={{marginTop: 50}}/> : (
        <FlatList
          contentContainerStyle={{ paddingBottom: 100 }}
          data={vehicles}
          keyExtractor={(v) => v.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.regNo}>{item.registration_number}</Text>
                <Text style={styles.owner}>{item.owner_name}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.vehicle_type}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>No vehicles registered yet.</Text>
              <Text style={styles.emptySubText}>Tap 'Add Vehicle' to get started.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Vehicle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={32} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Registration No. (e.g. DHK-123)" placeholderTextColor="#64748b" value={newReg} onChangeText={setNewReg} />
            <TextInput style={styles.input} placeholder="Owner Name" placeholderTextColor="#64748b" value={newOwner} onChangeText={setNewOwner} />
            
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.row}>
              {types.map(t => (
                <TouchableOpacity key={t.id} style={[styles.typeBtn, newType === t.name && styles.typeBtnActive]} onPress={() => setNewType(t.name)}>
                  <Text style={[styles.typeText, newType === t.name && styles.typeTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              {adding ? <ActivityIndicator color="#fff"/> : <Text style={styles.addBtnText}>Save Vehicle</Text>}
            </TouchableOpacity>
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
  headerAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  headerAddText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  regNo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  owner: { color: '#94a3b8', marginTop: 6, fontSize: 14 },
  badge: { backgroundColor: '#3b82f620', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#38bdf8', fontWeight: '900', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 18, marginTop: 16, fontWeight: '600' },
  emptySubText: { color: '#64748b', fontSize: 14, marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  label: { color: '#94a3b8', marginBottom: 10, fontWeight: '600', marginTop: 10 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  typeBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  typeText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  typeTextActive: { color: '#fff' },
  addBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});

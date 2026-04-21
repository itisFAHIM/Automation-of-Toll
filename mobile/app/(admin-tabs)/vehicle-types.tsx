import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type VehicleType = { id: number; name: string; icon: string };

const ICON_CHOICES = ['car-sport', 'bus', 'construct', 'bicycle', 'boat', 'airplane', 'subway'];

export default function ManageVehicleTypesScreen() {
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<VehicleType[]>([]);
  
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('car-sport');

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    try {
      const res = await fetch('http://192.168.0.102:8000/api/vehicles/types/');
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) {} finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return Alert.alert('Error', 'Name is required');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/vehicles/types/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName.toLowerCase(), icon: newIcon })
      });
      if (res.ok) {
        setNewName(''); setNewIcon('car-sport'); setCreateModal(false); fetchTypes();
      } else { Alert.alert('Error', 'Could not create vehicle type. It may already exist.'); }
    } catch { Alert.alert('Error', 'Network request failed'); }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this vehicle type?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          await fetch(`http://192.168.0.102:8000/api/vehicles/types/${id}/`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchTypes();
        } catch { Alert.alert('Error', 'Network error'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Vehicle Classes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Define recognized modes of transport</Text>
      
      {loading ? <ActivityIndicator size="large" color="#f59e0b" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={types}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({item}) => (
             <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name={item.icon as any} size={24} color="#f59e0b" />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={styles.name}>{item.name.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={{padding: 8, backgroundColor: '#ef444420', borderRadius: 8}}>
                 <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal animationType="slide" transparent={true} visible={createModal} onRequestClose={() => setCreateModal(false)}>
        <View style={styles.modalBgCenter}>
          <View style={styles.modalCenterContent}>
            <Text style={styles.modalTitle}>Add Vehicle Type</Text>
            
            <TextInput 
              style={styles.modalInput}
              placeholder="e.g. ambulance, truck"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.label}>Select Icon</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10}}>
              {ICON_CHOICES.map(i => (
                <TouchableOpacity key={i} onPress={() => setNewIcon(i)} style={newIcon === i ? styles.iconBtnActive : styles.iconBtn}>
                  <Ionicons name={i as any} size={24} color={newIcon === i ? '#fff' : '#64748b'} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24}}>
               <TouchableOpacity style={styles.btnCancel} onPress={() => setCreateModal(false)}>
                 <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.btnCreate} onPress={handleCreate}>
                 <Text style={{color: '#fff', fontWeight: 'bold'}}>Save</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 12 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20, marginTop: 5 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12 },
  name: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  
  modalBgCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCenterContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  modalInput: { color: '#fff', backgroundColor: '#0f172a', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#94a3b8', marginTop: 20, fontWeight: '600' },
  
  iconBtn: { padding: 12, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  iconBtnActive: { padding: 12, borderRadius: 10, backgroundColor: '#f59e0b', borderWidth: 1, borderColor: '#f59e0b' },
  
  btnCancel: { backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  btnCreate: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 }
});

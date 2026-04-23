import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API = 'http://192.168.0.102:8000/api';

type District = { id: number; name: string; is_active: boolean };

export default function ManageDistrictsScreen() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editDistrict, setEditDistrict] = useState<District | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDistricts();
  }, []);

  const getHeaders = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchDistricts = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      // Fetch all districts, including inactive ones, for admin view
      const res = await fetch(`${API}/bridges/districts/`, { headers });
      const data = await res.json();
      setDistricts(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch districts');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return Alert.alert('Error', 'District name cannot be empty.');
    try {
      setSaving(true);
      const headers = await getHeaders();
      const res = await fetch(`${API}/bridges/districts/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newName.trim(), is_active: true }),
      });
      if (res.ok) {
        Alert.alert('Success', `"${newName.trim()}" has been added!`);
        setNewName('');
        setAddModal(false);
        fetchDistricts();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.name?.[0] || 'Could not add district. It may already exist.');
      }
    } catch {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editDistrict || !newName.trim()) return;
    try {
      setSaving(true);
      const headers = await getHeaders();
      const res = await fetch(`${API}/bridges/districts/${editDistrict.id}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        Alert.alert('Updated', `Renamed to "${newName.trim()}"`);
        setEditDistrict(null);
        setNewName('');
        fetchDistricts();
      } else {
        Alert.alert('Error', 'Could not update district.');
      }
    } catch {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (district: District) => {
    Alert.alert(
      'Delete District',
      `Are you sure you want to delete "${district.name}"? This may affect existing routes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const res = await fetch(`${API}/bridges/districts/${district.id}/`, { method: 'DELETE', headers });
              if (res.ok || res.status === 204) {
                fetchDistricts();
              } else {
                Alert.alert('Error', 'Could not delete this district.');
              }
            } catch {
              Alert.alert('Error', 'Network request failed');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (district: District) => {
    // Optimistic update
    setDistricts(prev => prev.map(d => d.id === district.id ? { ...d, is_active: !d.is_active } : d));
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API}/bridges/districts/${district.id}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: !district.is_active }),
      });
      if (!res.ok) {
        // Revert on failure
        setDistricts(prev => prev.map(d => d.id === district.id ? { ...d, is_active: district.is_active } : d));
        Alert.alert('Error', 'Failed to update status.');
      }
    } catch {
      setDistricts(prev => prev.map(d => d.id === district.id ? { ...d, is_active: district.is_active } : d));
    }
  };

  const openEdit = (district: District) => {
    setEditDistrict(district);
    setNewName(district.name);
  };

  const filteredDistricts = districts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Districts</Text>
          <Text style={styles.subtitle}>{districts.length} districts total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setNewName(''); setAddModal(true); }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput
          placeholder="Search district..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredDistricts}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 60 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.dot, { backgroundColor: item.is_active ? '#10b981' : '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.districtName}>{item.name}</Text>
                <Text style={item.is_active ? styles.statusOn : styles.statusOff}>
                  {item.is_active ? 'VISIBLE IN CALCULATOR' : 'HIDDEN'}
                </Text>
              </View>
              <View style={styles.actions}>
                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor="#fff"
                />
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="pencil" size={16} color="#8b5cf6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="location-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748b', marginTop: 12 }}>No districts found</Text>
            </View>
          }
        />
      )}

      {/* ADD MODAL */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New District</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>District Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Manikganj"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add District</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={!!editDistrict} animationType="slide" transparent onRequestClose={() => setEditDistrict(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit District</Text>
              <TouchableOpacity onPress={() => setEditDistrict(null)}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>New Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="District name"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleEdit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  addBtn: { backgroundColor: '#8b5cf6', padding: 10, borderRadius: 14 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  districtName: { fontSize: 16, color: '#f1f5f9', fontWeight: '700' },
  statusOn: { fontSize: 10, color: '#10b981', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  statusOff: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { padding: 8, backgroundColor: '#8b5cf620', borderRadius: 10 },
  deleteBtn: { padding: 8, backgroundColor: '#ef444420', borderRadius: 10 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000090' },
  modalSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  modalInput: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  saveBtn: { backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

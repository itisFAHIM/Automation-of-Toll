import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type Bridge = { id: number; name: string; is_active: boolean };

export default function ManageBridgesScreen() {
  const [loading, setLoading] = useState(true);
  const [bridges, setBridges] = useState<Bridge[]>([]);

  useEffect(() => {
    fetchBridges();
  }, []);

  const fetchBridges = async () => {
    try {
      // In a real app we might have a specific Admin bridge endpoint. 
      // For now we read the public bridge list layout.
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/bridges/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBridges(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Toll Plazas</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Currently active bridges in the system</Text>
      
      {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={bridges}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="business-outline" size={24} color="#3b82f6" />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={item.is_active ? styles.statusActive : styles.statusInactive}>
                  {item.is_active ? 'OPERATIONAL' : 'DISABLED'}
                </Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: '#8b5cf6', padding: 8, borderRadius: 12 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20, marginTop: 5 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12 },
  name: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  statusActive: { fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: '900', letterSpacing: 1 },
  statusInactive: { fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: '900', letterSpacing: 1 }
});

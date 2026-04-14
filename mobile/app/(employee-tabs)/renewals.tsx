import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

type RenewalRequest = {
  id: number;
  token: string;
  driver: string;
  vehicle: string;
  bridge: string;
  created_at: string;
  expires_at: string;
};

export default function RenewalsDesk() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RenewalRequest[]>([]);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/passes/pending-renewals/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRenewals();
    }, [])
  );

  const handleAction = async (tokenString: string, action: 'approve' | 'reject') => {
    try {
      const t = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/passes/approve-renewal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({ token: tokenString, action })
      });
      if (res.ok) {
        Alert.alert('Success', `Renewal ${action}d successfully`);
        fetchRenewals();
      } else {
        Alert.alert('Error', 'Failed to process request');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Renewal Inbox</Text>
      <Text style={styles.subtitle}>Approve drivers requesting a 6-hour extension</Text>
      
      {loading ? <ActivityIndicator size="large" color="#f59e0b" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={requests}
          keyExtractor={(r: any) => r.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.vehicleText}>{item.vehicle}</Text>
                <Text style={styles.driverText}>{item.driver}</Text>
              </View>
              
              <Text style={styles.bridgeText}>Bridge: {item.bridge}</Text>
              <Text style={styles.dateText}>Expired: {new Date(item.expires_at).toLocaleString()}</Text>
              
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item.token, 'reject')}>
                  <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(item.token, 'approve')}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>Inbox clear! No active requests.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 40 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  vehicleText: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  driverText: { color: '#8b5cf6', fontWeight: 'bold' },
  bridgeText: { color: '#cbd5e1', fontSize: 16, marginBottom: 4 },
  dateText: { color: '#ef4444', fontSize: 12, marginBottom: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  approveBtn: { flex: 1, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 16 }
});

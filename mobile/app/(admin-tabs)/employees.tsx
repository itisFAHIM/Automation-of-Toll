import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type PendingEmployee = { id: number; username: string; name: string; email: string };

export default function ManageEmployeesScreen() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingEmployee[]>([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/users/pending-employees/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPending(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/users/approve-employee/${userId}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        Alert.alert("Success", "Employee has been granted scanning access!");
        fetchPending(); // Refresh list
      } else {
        const errorData = await res.json();
        Alert.alert("Error", errorData.error || "Failed to approve.");
      }
    } catch (e) {
      Alert.alert("Network Error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Employee Approvals</Text>
      <Text style={styles.subtitle}>Review accounts requesting Toll Operator status</Text>
      
      {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={pending}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.name}>{item.name || item.username}</Text>
                <Text style={styles.email}>@{item.username} • {item.email || 'No email'}</Text>
              </View>
              
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#334155" />
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubText}>No pending employee requests.</Text>
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
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20, marginTop: 5 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  email: { fontSize: 12, color: '#64748b', marginTop: 4 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  approveText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 18, marginTop: 16, fontWeight: 'bold' },
  emptySubText: { color: '#64748b', fontSize: 14, marginTop: 8 }
});

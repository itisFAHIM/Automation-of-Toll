import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API = 'http://192.168.0.102:8000/api';

type PendingVehicle = {
  id: number;
  owner_name: string;
  registration_number: string;
  vehicle_type: string;
  username: string;
  submitted_at: string;
  eligible_for_approval_at: string | null;
  can_approve: boolean;
  vehicle_image: string | null;
  number_plate_image: string | null;
  document_image: string | null;
};

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
    return <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>Ready for approval</Text>;
  }
  return (
    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700' }}>
      Wait: {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
    </Text>
  );
}

export default function VehicleApprovalsScreen() {
  const [vehicles, setVehicles] = useState<PendingVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/vehicles/pending/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch pending vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (vehicleId: number) => {
    setActionLoading(vehicleId);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/vehicles/${vehicleId}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Approved!', data.message);
        fetchPending();
      } else {
        Alert.alert('Cannot Approve', data.error);
      }
    } catch {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (vehicleId: number) => {
    Alert.alert('Reject Vehicle', 'Are you sure you want to reject this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setActionLoading(vehicleId);
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API}/vehicles/${vehicleId}/reject/`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
              Alert.alert('Rejected', data.message);
              fetchPending();
            }
          } catch {
            Alert.alert('Error', 'Network request failed');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Vehicle Approvals</Text>
          <Text style={styles.subtitle}>{vehicles.length} pending requests</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPending}>
          <Ionicons name="refresh-outline" size={22} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 60 }} />
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>No pending vehicle requests</Text>
          <Text style={styles.emptySubText}>All vehicles have been processed!</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 60 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Images Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
                {item.vehicle_image && (
                  <View style={styles.imgContainer}>
                    <Image source={{ uri: item.vehicle_image }} style={styles.img} />
                    <Text style={styles.imgLabel}>Vehicle</Text>
                  </View>
                )}
                {item.number_plate_image && (
                  <View style={styles.imgContainer}>
                    <Image source={{ uri: item.number_plate_image }} style={styles.img} />
                    <Text style={styles.imgLabel}>Plate</Text>
                  </View>
                )}
                {item.document_image && (
                  <View style={styles.imgContainer}>
                    <Image source={{ uri: item.document_image }} style={styles.img} />
                    <Text style={styles.imgLabel}>Document</Text>
                  </View>
                )}
              </ScrollView>

              {/* Details */}
              <View style={styles.cardDetails}>
                <Text style={styles.regNo}>{item.registration_number}</Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Owner: </Text>{item.owner_name}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User: </Text>@{item.username}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type: </Text>{item.vehicle_type}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted: </Text>{new Date(item.submitted_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>

                {item.eligible_for_approval_at && (
                  <View style={{ marginTop: 6 }}>
                    <CountdownTimer targetDate={item.eligible_for_approval_at} />
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item.id)}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.btnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.id)}
                  disabled={actionLoading === item.id}
                >
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  refreshBtn: { padding: 10, backgroundColor: '#8b5cf620', borderRadius: 12 },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', fontSize: 18, marginTop: 16, fontWeight: '600' },
  emptySubText: { color: '#64748b', fontSize: 14, marginTop: 6 },

  card: { backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 16, overflow: 'hidden' },

  imagesRow: { gap: 10, padding: 12 },
  imgContainer: { alignItems: 'center' },
  img: { width: 120, height: 90, borderRadius: 12, resizeMode: 'cover' },
  imgLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  cardDetails: { paddingHorizontal: 16, paddingBottom: 12 },
  regNo: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  detailRow: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  detailLabel: { color: '#64748b', fontWeight: '700' },

  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#334155' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', paddingVertical: 14, gap: 6 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 14, gap: 6 },
  btnDisabled: { backgroundColor: '#475569', opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

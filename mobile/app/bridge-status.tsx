import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Bridge = { id: number; name: string; location: string; is_active: boolean; status: string; status_message: string };

function PulsingDot({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [active]);

  const color = active ? '#10b981' : '#ef4444';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      {active && (
        <Animated.View style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#10b98130', transform: [{ scale: pulse }] }} />
      )}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

function BridgeCard({ item, index }: { item: Bridge; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#64748b" />
            <Text style={styles.location}>{item.location}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <PulsingDot active={item.is_active} />
          <Text style={[styles.statusText, { color: item.is_active ? '#10b981' : '#ef4444' }]}>
            {item.is_active ? 'Active' : 'Offline'}
          </Text>
        </View>
      </View>
      {item.status_message ? (
        <View style={styles.messageBox}>
          <Ionicons name="information-circle-outline" size={14} color="#94a3b8" />
          <Text style={styles.message}>{item.status_message}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function BridgeStatusScreen() {
  const router = useRouter();
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBridges = async () => {
    try {
      const res = await fetch('http://192.168.0.102:8000/api/bridges/');
      const data = await res.json();
      setBridges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBridges(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Loading bridges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Bridge Status</Text>
          <Text style={styles.subtitle}>{bridges.filter(b => b.is_active).length} of {bridges.length} active</Text>
        </View>
      </View>
      <FlatList
        data={bridges}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => <BridgeCard item={item} index={index} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBridges(); }} tintColor="#10b981" colors={['#10b981']} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color="#334155" />
            <Text style={{ color: '#64748b', marginTop: 12 }}>No bridges found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: '#fff' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { color: '#64748b', fontSize: 13 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '700', fontSize: 13 },
  messageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#0f172a', padding: 10, borderRadius: 10 },
  message: { color: '#94a3b8', fontSize: 13, flex: 1 },
  empty: { alignItems: 'center', marginTop: 80 },
});

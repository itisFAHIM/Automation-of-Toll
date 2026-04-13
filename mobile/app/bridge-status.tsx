import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';

type Bridge = {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
  status: string;
  status_message: string;
};

export default function BridgeStatusScreen() {
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://192.168.0.102:8000/api/bridges/')
      .then((res) => res.json())
      .then((data) => {
        setBridges(data);
        setLoading(false);
      })
      .catch((err) => {
        console.log('Error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={{ color: 'white', marginTop: 10 }}>
          Loading bridges...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Active Bridges</Text>
      <Text style={styles.subtitle}>Check bridge operational status</Text>

      <FlatList
        data={bridges}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.location}>{item.location}</Text>

            <Text style={item.is_active ? styles.active : styles.inactive}>
              {item.is_active ? 'Active' : 'Unavailable'}
            </Text>

            {item.status_message ? (
              <Text style={styles.message}>{item.status_message}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  location: {
    color: '#cbd5f5',
    marginTop: 4,
  },
  active: {
    color: '#22c55e',
    marginTop: 8,
    fontWeight: '600',
  },
  inactive: {
    color: '#ef4444',
    marginTop: 8,
    fontWeight: '600',
  },
  message: {
    color: '#e2e8f0',
    marginTop: 6,
  },
});

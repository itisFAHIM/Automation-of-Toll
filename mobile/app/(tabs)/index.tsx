import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();

  const menuItems = [
    {
      id: 'pay-toll',
      title: 'Pay Toll',
      subtitle: 'Purchase a new toll pass',
      icon: 'card-outline' as const,
      color: '#3b82f6', // Blue
      route: '/pay-toll',
    },
    {
      id: 'active-passes',
      title: 'Active Passes',
      subtitle: 'Show QR to operator',
      icon: 'qr-code-outline' as const,
      color: '#10b981', // Green
      route: '/passes',
    },
    {
      id: 'history',
      title: 'Payment History',
      subtitle: 'View your past trips',
      icon: 'receipt-outline' as const,
      color: '#8b5cf6', // Purple
      route: '/history',
    },
    {
      id: 'vehicles',
      title: 'My Vehicles',
      subtitle: 'Manage your cars',
      icon: 'car-sport-outline' as const,
      color: '#f59e0b', // Amber
      route: '/my-vehicles',
    },
    {
      id: 'bridge-status',
      title: 'Bridge Status',
      subtitle: 'Current operational info',
      icon: 'map-outline' as const,
      color: '#ec4899', // Pink
      route: '/bridge-status',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.driverName}>Driver</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={40} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="log-out-outline" size={32} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>Active Passes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Dashboard</Text>

      <View style={styles.grid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon} size={32} color={item.color} />
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Sleek dark slate
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#94a3b8',
  },
  driverName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  profileBtn: {
    padding: 2,
  },
  logoutBtn: {
    padding: 2,
    marginLeft: 10,
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38bdf8', // Light blue accent
  },
  statLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
});
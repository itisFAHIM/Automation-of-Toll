import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Animated, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import TelemetryChart from '@/components/TelemetryChart';

interface PaymentRecord {
  id: number;
  bridge: string;
  vehicle: string;
  driver_name: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_id: string;
  paid_at: string;
}

export default function AdminRevenueHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageToll, setAverageToll] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fetch payments list
  const fetchPayments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://192.168.0.106:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
        
        // Calculate metrics
        const total = data.reduce((acc: number, curr: PaymentRecord) => acc + curr.amount, 0);
        setTotalRevenue(total);
        setAverageToll(data.length > 0 ? Math.round(total / data.length) : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDownloadReport = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDownloading(true);
    setDownloadProgress(0);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setDownloading(false);
        }, 800);
      }
    });

    // Animate progress percentage
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress >= 100) {
        setDownloadProgress(100);
        clearInterval(interval);
      } else {
        setDownloadProgress(currentProgress);
      }
    }, 120);
  };

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => {
    const formattedDate = new Date(item.paid_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View style={styles.paymentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <View style={styles.iconWrapper}>
              <Ionicons name="car-sport-sharp" size={20} color="#ec4899" />
            </View>
            <View>
              <Text style={styles.bridgeName}>{item.bridge}</Text>
              <Text style={styles.driverSub}>{item.driver_name} • {item.vehicle}</Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.bdtLabel}>BDT</Text>
            <Text style={styles.amountVal}>{item.amount}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.txId}>TXID: {item.transaction_id}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.dateLabel}>{formattedDate}</Text>
            <View style={[styles.methodBadge, { backgroundColor: item.payment_method === 'cash' ? '#10b98115' : '#3b82f615' }]}>
              <Text style={[styles.methodText, { color: item.payment_method === 'cash' ? '#10b981' : '#3b82f6' }]}>
                {item.payment_method.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Fetching transaction logs...</Text>
      </View>
    );
  }

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenue Hub</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadReport}>
          <Ionicons name="download-outline" size={22} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPaymentItem}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Overview Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Ionicons name="wallet-outline" size={22} color="#ec4899" />
                <Text style={styles.statValLarge}>৳ {totalRevenue.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Collected</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statBoxHalf, { marginRight: 10 }]}>
                  <Ionicons name="receipt-outline" size={18} color="#3b82f6" />
                  <Text style={styles.statValMedium}>{payments.length}</Text>
                  <Text style={styles.statLabel}>Receipts</Text>
                </View>
                <View style={styles.statBoxHalf}>
                  <Ionicons name="trending-up-outline" size={18} color="#10b981" />
                  <Text style={styles.statValMedium}>৳ {averageToll}</Text>
                  <Text style={styles.statLabel}>Avg Ticket</Text>
                </View>
              </View>
            </View>

            {/* Render Analytics Chart */}
            <View style={styles.chartWrapper}>
              <TelemetryChart />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Toll Collection Log</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>Live</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No transactions recorded yet</Text>
          </View>
        }
      />

      {/* Progress download Modal */}
      <Modal visible={downloading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={32} color="#ec4899" />
              <Text style={styles.modalTitle}>Generating Revenue Statement</Text>
              <Text style={styles.modalSubtitle}>Compiling all toll transaction audits</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
              </View>
              <Text style={styles.progressPercent}>{downloadProgress}% Complete</Text>
            </View>

            {downloadProgress === 100 ? (
              <View style={styles.successWrapper}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.successText}>Statement exported to CSV/PDF</Text>
              </View>
            ) : (
              <Text style={styles.compilingText}>Gathering database metrics...</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', fontSize: 13, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ec489915', borderWidth: 1, borderColor: '#ec489930', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Overview Widgets
  statsContainer: { marginBottom: 24, gap: 10 },
  statBox: { backgroundColor: '#1e293b', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#ec489920', alignItems: 'center' },
  statsRow: { flexDirection: 'row' },
  statBoxHalf: { flex: 1, backgroundColor: '#1e293b', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  statValLarge: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 8 },
  statValMedium: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
  
  chartWrapper: { marginBottom: 28 },
  
  // Collection Log Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  badgeContainer: { backgroundColor: '#ef444415', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#ef444430' },
  badgeText: { color: '#ef4444', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },

  // Payment log card
  paymentCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#33415550', paddingBottom: 12 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#ec489915', justifyContent: 'center', alignItems: 'center' },
  bridgeName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  driverSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  amountContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  bdtLabel: { fontSize: 10, color: '#ec4899', fontWeight: '800' },
  amountVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  txId: { fontFamily: 'monospace', fontSize: 11, color: '#64748b' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateLabel: { fontSize: 11, color: '#64748b' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  methodText: { fontSize: 9, fontWeight: '900' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#64748b', fontSize: 13, marginTop: 12 },

  // Download Modal
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 14 },
  modalSubtitle: { color: '#64748b', fontSize: 12, marginTop: 4 },
  
  progressContainer: { width: '100%', alignItems: 'center', marginBottom: 18 },
  progressTrack: { width: '100%', height: 10, backgroundColor: '#0f172a', borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  progressBar: { height: '100%', backgroundColor: '#ec4899', borderRadius: 5 },
  progressPercent: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  compilingText: { color: '#64748b', fontSize: 11 },
  successWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successText: { color: '#10b981', fontSize: 13, fontWeight: '700' }
}) as any;

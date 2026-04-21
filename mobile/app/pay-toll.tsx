import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type Bridge = { id: number; name: string; is_active: boolean };
type Vehicle = { id: number; registration_number: string; vehicle_type: string };

const PAYMENT_METHODS = [
  { label: 'bKash', method: 'bkash', icon: 'wallet-outline', color: '#e91e8c' },
  { label: 'Nagad', method: 'nagad', icon: 'cash-outline', color: '#f97316' },
  { label: 'Rocket', method: 'rocket', icon: 'rocket-outline', color: '#8b5cf6' },
  { label: 'Bank', method: 'bank', icon: 'business-outline', color: '#3b82f6' },
];


function StepBar({ current }: { current: number }) {
  const steps = ['Bridge', 'Vehicle', 'Amount', 'Pay'];
  return (
    <View style={stepStyles.container}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={stepStyles.stepWrapper}>
            <View style={[stepStyles.dot, done && stepStyles.dotDone, active && stepStyles.dotActive]}>
              {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={stepStyles.dotText}>{i + 1}</Text>}
            </View>
            <Text style={[stepStyles.label, (done || active) && stepStyles.labelActive]}>{label}</Text>
            {i < steps.length - 1 && <View style={[stepStyles.line, done && stepStyles.lineDone]} />}
          </View>
        );
      })}
    </View>
  );
}

function AnimatedChip({ label, selected, onPress, icon, color }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.chip, selected && { backgroundColor: (color || '#3b82f6') + '20', borderColor: color || '#3b82f6' }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {icon && <Ionicons name={icon} size={15} color={selected ? (color || '#3b82f6') : '#64748b'} />}
        <Text style={[styles.chipText, selected && { color: color || '#3b82f6', fontWeight: '700' }]}>{label}</Text>
        {selected && <Ionicons name="checkmark-circle" size={15} color={color || '#3b82f6'} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PayTollScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [selectedBridge, setSelectedBridge] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('bkash');
  const [tollAmount, setTollAmount] = useState<string | null>(null);
  const [closingSoon, setClosingSoon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const amountAnim = useRef(new Animated.Value(0)).current;

  const currentStep = !selectedBridge ? 0 : !selectedVehicle ? 1 : !tollAmount || tollAmount.includes('...') ? 2 : 3;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const [bridgeRes, vehicleRes, typeRes] = await Promise.all([
          fetch('http://192.168.0.102:8000/api/bridges/'),
          fetch('http://192.168.0.102:8000/api/vehicles/', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://192.168.0.102:8000/api/vehicles/types/')
        ]);
        const bridgeData = await bridgeRes.json();
        const vehicleData = await vehicleRes.json();
        const typeData = await typeRes.json();
        setBridges(Array.isArray(bridgeData) ? bridgeData.filter((b: Bridge) => b.is_active) : []);
        setAllVehicles(Array.isArray(vehicleData) ? vehicleData : []);
        setVehicleTypes(Array.isArray(typeData) ? typeData : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBridge && selectedVehicle) {
      setTollAmount('Calculating...');
      amountAnim.setValue(0);
      AsyncStorage.getItem('token').then(token => {
        fetch(`http://192.168.0.102:8000/api/bridges/calculate/?bridge_id=${selectedBridge}&vehicle_id=${selectedVehicle}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(data => {
            setTollAmount(data.amount ? `BDT ${data.amount}` : 'Unavailable');
            setClosingSoon(!!data.closing_soon);
            Animated.spring(amountAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
          }).catch(() => { setTollAmount('Error'); setClosingSoon(false); });
      });
    } else {
      setTollAmount(null);
      setClosingSoon(false);
    }
  }, [selectedBridge, selectedVehicle]);

  const handlePay = async () => {
    if (!selectedBridge || !selectedVehicle) {
      Alert.alert('Error', 'Please select a Bridge and a Vehicle.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bridge_id: selectedBridge, vehicle_id: selectedVehicle, payment_method: selectedMethod })
      });
      const data = await res.json();
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Payment Successful!', 'Your toll pass has been generated.', [
          { text: 'View Pass', onPress: () => router.replace('/passes') }
        ]);
      } else {
        Alert.alert('Failed', data.error || 'Payment failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setProcessing(false);
    }
  };

  const availableVehicles = allVehicles.filter(v => v.vehicle_type === selectedType);
  const showAmount = tollAmount && !tollAmount.includes('...') && !tollAmount.includes('Error') && tollAmount !== 'Unavailable';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={styles.header}>Pay Toll</Text>
      <StepBar current={currentStep} />

      <Text style={styles.label}>1. Select Bridge</Text>
      <View style={styles.row}>
        {bridges.map(b => (
          <AnimatedChip key={b.id} label={b.name} icon="map-outline" color="#3b82f6" selected={selectedBridge === b.id} onPress={() => setSelectedBridge(b.id)} />
        ))}
        {bridges.length === 0 && <Text style={styles.emptyText}>No active bridges found.</Text>}
      </View>

      <Text style={styles.label}>2. Select Vehicle Type</Text>
      <View style={styles.row}>
        {vehicleTypes.map(({ name, icon }) => (
          <AnimatedChip key={name} label={name.toUpperCase()} icon={icon as any} color="#f59e0b" selected={selectedType === name} onPress={() => { setSelectedType(name); setSelectedVehicle(null); }} />
        ))}
      </View>

      {selectedType && (
        <>
          <Text style={styles.label}>3. Select Registration No.</Text>
          <View style={styles.row}>
            {availableVehicles.length > 0 ? availableVehicles.map(v => (
              <AnimatedChip key={v.id} label={v.registration_number} icon="car-outline" color="#10b981" selected={selectedVehicle === v.id} onPress={() => setSelectedVehicle(v.id)} />
            )) : <Text style={styles.errorText}>No {selectedType}s registered. Add a vehicle first.</Text>}
          </View>
        </>
      )}

      {tollAmount && (
        <Animated.View style={[styles.amountBox, tollAmount === 'Unavailable' && { borderColor: '#ef4444' }, closingSoon && { borderColor: '#f59e0b' }, { opacity: amountAnim, transform: [{ scale: amountAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <Text style={[styles.amountLabel, tollAmount === 'Unavailable' && { color: '#ef4444' }, closingSoon && { color: '#f59e0b' }]}>
            {tollAmount === 'Unavailable' ? 'Vehicle Restricted' : 'Total Toll Amount'}
          </Text>
          <Text style={[styles.amountValue, tollAmount === 'Unavailable' && { fontSize: 16, textAlign: 'center', marginTop: 12 }]}>
            {tollAmount === 'Unavailable' ? 'This vehicle type is currently restricted by the administration from passing this bridge. Travel with another Vehicle.' : tollAmount}
          </Text>
          {closingSoon && (
            <Text style={{color: '#f59e0b', fontSize: 13, textAlign: 'center', marginTop: 10, fontWeight: 'bold'}}>
              ⚠️ Service for this vehicle type is turning off soon. You have less than 1 hour to pass.
            </Text>
          )}
        </Animated.View>
      )}

      {showAmount && (
        <>
          <Text style={styles.label}>4. Payment Method</Text>
          <View style={styles.row}>
            {PAYMENT_METHODS.map(p => (
              <AnimatedChip key={p.method} label={p.label} icon={p.icon as any} color={p.color} selected={selectedMethod === p.method} onPress={() => setSelectedMethod(p.method)} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.payButton, processing && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Confirm & Pay with {PAYMENT_METHODS.find(p => p.method === selectedMethod)?.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 28, marginTop: 8 },
  stepWrapper: { alignItems: 'center', position: 'relative', flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  dotActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  dotDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dotText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  label: { color: '#64748b', fontSize: 10, marginTop: 4, fontWeight: '600' },
  labelActive: { color: '#fff' },
  line: { position: 'absolute', right: '-50%', top: 13, width: '100%', height: 2, backgroundColor: '#334155', zIndex: -1 },
  lineDone: { backgroundColor: '#10b981' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20, marginTop: 50 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155' },
  chipText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  amountBox: { marginTop: 30, backgroundColor: '#1e293b', padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#10b981' },
  amountLabel: { color: '#10b981', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 6 },
  payButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14 },
});

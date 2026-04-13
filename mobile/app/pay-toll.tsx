import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Bridge = { id: number; name: string; is_active: boolean };
type Vehicle = { id: number; registration_number: string; vehicle_type: string };

const PAYMENT_METHODS = ['Bkash', 'Nagad', 'Rocket', 'Bank'];
const VEHICLE_TYPES = ['car', 'bus', 'truck', 'bike'];

export default function PayTollScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  const [selectedBridge, setSelectedBridge] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('Bkash');

  const [tollAmount, setTollAmount] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const [bridgeRes, vehicleRes] = await Promise.all([
          fetch('http://192.168.0.102:8000/api/bridges/'),
          fetch('http://192.168.0.102:8000/api/vehicles/', { headers: { 'Authorization': `Bearer ${token}` }})
        ]);
        
        const bridgeData = await bridgeRes.json();
        const vehicleData = await vehicleRes.json();
        
        setBridges(Array.isArray(bridgeData) ? bridgeData.filter((b: Bridge) => b.is_active) : []);
        setAllVehicles(Array.isArray(vehicleData) ? vehicleData : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBridge && selectedVehicle) {
      setTollAmount('Calculating...');
      AsyncStorage.getItem('token').then(token => {
        fetch(`http://192.168.0.102:8000/api/bridges/calculate/?bridge_id=${selectedBridge}&vehicle_id=${selectedVehicle}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(data => {
            if (data.amount) setTollAmount(`BDT ${data.amount}`);
            else setTollAmount('N/A (Rate not set)');
          }).catch(() => setTollAmount('Error calculating'));
      });
    } else {
      setTollAmount(null);
    }
  }, [selectedBridge, selectedVehicle]);

  const handlePay = async () => {
    if (!selectedBridge || !selectedVehicle) {
      Alert.alert('Error', 'Please select a Bridge and a Vehicle first.');
      return;
    }
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.102:8000/api/payments/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          bridge_id: selectedBridge,
          vehicle_id: selectedVehicle,
          payment_method: selectedMethod.toLowerCase()
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Payment Successful! Pass generated.', [
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4ade80" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.header}>Pay Toll</Text>
      
      <Text style={styles.label}>1. Select Bridge</Text>
      <View style={styles.row}>
        {bridges.map(b => (
          <TouchableOpacity 
            key={b.id} 
            style={[styles.chip, selectedBridge === b.id && styles.chipActive]}
            onPress={() => setSelectedBridge(b.id)}>
            <Text style={[styles.chipText, selectedBridge === b.id && styles.chipTextActive]}>{b.name}</Text>
          </TouchableOpacity>
        ))}
        {bridges.length === 0 && <Text style={{color: '#94a3b8'}}>No active bridges found.</Text>}
      </View>

      <Text style={styles.label}>2. Select Vehicle Type</Text>
      <View style={styles.row}>
        {VEHICLE_TYPES.map(type => (
          <TouchableOpacity 
            key={type} 
            style={[styles.chip, selectedType === type && styles.chipActive]}
            onPress={() => { setSelectedType(type); setSelectedVehicle(null); }}>
            <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedType && (
        <>
          <Text style={styles.label}>3. Select Registration No.</Text>
          <View style={styles.row}>
            {availableVehicles.length > 0 ? availableVehicles.map(v => (
              <TouchableOpacity 
                key={v.id} 
                style={[styles.chip, selectedVehicle === v.id && styles.chipActive]}
                onPress={() => setSelectedVehicle(v.id)}>
                <Text style={[styles.chipText, selectedVehicle === v.id && styles.chipTextActive]}>{v.registration_number}</Text>
              </TouchableOpacity>
            )) : <Text style={{color: '#f87171'}}>No {selectedType}s registered. Please add a vehicle first.</Text>}
          </View>
        </>
      )}

      {tollAmount && (
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Toll Amount</Text>
          <Text style={styles.amountValue}>{tollAmount}</Text>
        </View>
      )}

      {tollAmount && !tollAmount.includes('Error') && !tollAmount.includes('N/A') && !tollAmount.includes('...') && (
        <>
          <Text style={styles.label}>4. Select Payment Method</Text>
          <View style={styles.row}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity 
                key={m} 
                style={[styles.chip, selectedMethod === m && styles.chipActive]}
                onPress={() => setSelectedMethod(m)}>
                <Text style={[styles.chipText, selectedMethod === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={processing}>
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay with {selectedMethod}</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20, marginTop: 40 },
  label: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 24, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#cbd5e1', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  amountBox: { marginTop: 30, backgroundColor: '#1e293b', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#10b981' },
  amountLabel: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  amountValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 8 },
  payButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});

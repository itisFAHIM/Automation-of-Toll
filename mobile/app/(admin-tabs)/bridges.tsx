import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type Bridge = { id: number; name: string; is_active: boolean };
type TollRate = { id: number; bridge: number; vehicle_type: string; amount: string; disabled_at?: string };

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{m: number, s: number} | null>(null);

  useEffect(() => {
    const end = new Date(targetDate).getTime() + 60 * 60 * 1000;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = end - now;
      if (distance < 0) {
        setTimeLeft({m: 0, s: 0});
        clearInterval(interval);
      } else {
        setTimeLeft({
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return <Text style={{color: '#f59e0b', fontSize: 9, marginTop: 4, fontWeight: 'bold'}}>Calculating...</Text>;
  return <Text style={{color: '#f59e0b', fontSize: 9, marginTop: 4, fontWeight: 'bold'}}>Shutting down: {timeLeft.m}:{timeLeft.s.toString().padStart(2, '0')}</Text>;
}

export default function ManageBridgesScreen() {
  const [loading, setLoading] = useState(true);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  
  // Rate Modal state
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rates, setRates] = useState<TollRate[]>([]);
  const [inputs, setInputs] = useState<{[key: string]: string}>({});

  const [createModal, setCreateModal] = useState(false);
  const [newBridgeName, setNewBridgeName] = useState('');
  const [newBridgeRates, setNewBridgeRates] = useState<{[key: string]: {allowed: boolean, amount: string}}>({});
  
  // Vehicle Types
  const [vehicleTypes, setVehicleTypes] = useState<{id: number, name: string, icon: string}[]>([]);

  useEffect(() => {
    fetchBridges();
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await fetch('http://192.168.0.102:8000/api/vehicles/types/');
      const data = await res.json();
      setVehicleTypes(Array.isArray(data) ? data : []);
    } catch(e){}
  };

  const fetchBridges = async () => {
    try {
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

  const handleCreateBridge = async () => {
    if (!newBridgeName.trim()) return Alert.alert('Error', 'Name is required');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newBridgeName, is_active: false })
      });
      if (res.ok) {
        const newlyCreatedBridge = await res.json();
        
        const ratePromises = vehicleTypes.map(async (vType) => {
           const rateData = newBridgeRates[vType.name];
           if (rateData && rateData.allowed && rateData.amount) {
               await fetch(`http://192.168.0.102:8000/api/bridges/${newlyCreatedBridge.id}/rates/`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                 body: JSON.stringify({ bridge: newlyCreatedBridge.id, vehicle_type: vType.name, amount: rateData.amount })
               });
           }
        });
        await Promise.all(ratePromises);

        Alert.alert('Created', `${newBridgeName} has been fully configured!`);
        setNewBridgeName('');
        setNewBridgeRates({});
        setCreateModal(false);
        fetchBridges();
      } else { Alert.alert('Error', 'Could not create bridge'); }
    } catch { Alert.alert('Error', 'Network request failed'); }
  };

  const toggleBridgeActive = async (id: number, currentStatus: boolean) => {
    // Optimistic UI update
    setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) {
        // Revert on error
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        Alert.alert('Error', 'Failed to toggle status');
      }
    } catch { 
        setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: currentStatus } : b));
        Alert.alert('Error', 'Network error'); 
    }
  };

  const openBridgeRates = async (bridge: Bridge) => {
    setSelectedBridge(bridge);
    setRatesLoading(true);
    setInputs({});
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/${bridge.id}/rates/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const newInputs: {[key: string]: string} = {};
      if (Array.isArray(data)) {
        setRates(data);
        data.forEach((r) => { newInputs[r.vehicle_type] = String(r.amount); });
      }
      setInputs(newInputs);
    } catch (e) { } finally { setRatesLoading(false); }
  };

  const closeBridgeRates = () => { setSelectedBridge(null); setRates([]); setInputs({}); };

  const handleSetRate = async (vehicle_type: string) => {
    if (!selectedBridge) return;
    const amount = inputs[vehicle_type];
    if (!amount) return Alert.alert('Error', 'Please enter an amount.');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/${selectedBridge.id}/rates/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bridge: selectedBridge.id, vehicle_type, amount })
      });
      if (res.ok) {
        Alert.alert('Success', `${vehicle_type.toUpperCase()} rate set!`);
        openBridgeRates(selectedBridge);
      }
    } catch { Alert.alert('Error', 'Network request failed'); }
  };

  const handleUpdateRate = async (rateId: number, vehicle_type: string) => {
    const amount = inputs[vehicle_type];
    if (!amount) return Alert.alert('Error', 'Amount cannot be empty.');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/rates/${rateId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        Alert.alert('Success', `${vehicle_type.toUpperCase()} updated!`);
        openBridgeRates(selectedBridge!);
      }
    } catch { Alert.alert('Error', 'Network request failed'); }
  };

  const handleDeleteRate = async (rateId: number, vehicle_type: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://192.168.0.102:8000/api/bridges/rates/${rateId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        Alert.alert('Deleted', `${vehicle_type.toUpperCase()} removed.`);
        openBridgeRates(selectedBridge!);
      }
    } catch { Alert.alert('Error', 'Network request failed'); }
  };

  const handleToggleExistingRate = (vType: string, existingRate: any, value: boolean) => {
    if (value) {
      handleSetRate(vType); 
    } else if (!value && existingRate) {
      Alert.alert('Confirm Disable', `Are you sure you want to disable ${vType.toUpperCase()} on this bridge?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => handleDeleteRate(existingRate.id, vType) }
      ]);
    }
  };

  const handleInputChange = (vType: string, val: string) => {
    setInputs(prev => ({ ...prev, [vType]: val }));
  };

  return (
    <View style={styles.container}>
      {/* Existing Bridge List */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Toll Plazas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Select a bridge to configure rates</Text>
      
      {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop: 50}}/> : (
        <FlatList 
          contentContainerStyle={{paddingBottom: 40}}
          data={bridges}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({item}) => (
             <TouchableOpacity style={styles.card} onPress={() => openBridgeRates(item)}>
              <View style={styles.iconBox}>
                <Ionicons name="business-outline" size={24} color="#3b82f6" />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={item.is_active ? styles.statusActive : styles.statusInactive}>
                  {item.is_active ? 'OPERATIONAL' : 'DISABLED'}
                </Text>
              </View>
              <Switch 
                value={item.is_active} 
                onValueChange={() => toggleBridgeActive(item.id, item.is_active)}
                trackColor={{ false: '#334155', true: '#10b981' }}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* CREATE BRIDGE MODAL */}
      <Modal animationType="slide" transparent={true} visible={createModal} onRequestClose={() => setCreateModal(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, {height: '85%'}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Construct & Configure Bridge</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Ionicons name="close-circle" size={32} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <TextInput 
              style={styles.modalInput}
              placeholder="e.g. Padma Bridge"
              placeholderTextColor="#64748b"
              value={newBridgeName}
              onChangeText={setNewBridgeName}
            />

            <Text style={[styles.modalSubtitle, {marginTop: 20}]}>Allow Vehicles & Set initial Fares (BDT)</Text>
            
            <ScrollView style={{marginTop: 10}}>
              {vehicleTypes.map((vTypeObj) => {
                const vType = vTypeObj.name;
                const isAllowed = newBridgeRates[vType]?.allowed || false;
                const amt = newBridgeRates[vType]?.amount || '';
                return (
                  <View key={vType} style={[styles.rateRow, !isAllowed && {opacity: 0.5}]}>
                    <View style={styles.vehicleCol}>
                      <Ionicons name={vTypeObj.icon as any} size={24} color="#94a3b8" />
                      <Text style={styles.vehicleLabel}>{vType.toUpperCase()}</Text>
                    </View>
                    
                    <Switch 
                      value={isAllowed} 
                      onValueChange={(val) => setNewBridgeRates(prev => ({...prev, [vType]: {...prev[vType], allowed: val}}))}
                      trackColor={{ false: '#334155', true: '#10b981' }}
                    />

                    {isAllowed && (
                      <TextInput 
                        style={styles.inputCreate}
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={amt}
                        onChangeText={(val) => setNewBridgeRates(prev => ({...prev, [vType]: {...prev[vType], amount: val}}))}
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingBottom: 10}}>
               <TouchableOpacity style={[styles.btnCreate, {width: '100%', alignItems: 'center', paddingVertical: 14}]} onPress={handleCreateBridge}>
                 <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Build & Publish</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* The Toll Config Overlay Modal */}
      <Modal animationType="slide" transparent={true} visible={!!selectedBridge} onRequestClose={closeBridgeRates}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedBridge?.name}</Text>
              <TouchableOpacity onPress={closeBridgeRates}>
                <Ionicons name="close-circle" size={32} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Configure Toll Rates (BDT)</Text>

            {ratesLoading ? <ActivityIndicator size="large" color="#10b981" style={{marginTop: 40}} /> : (
              <ScrollView style={{marginTop: 20}}>
                {vehicleTypes.map((vTypeObj) => {
                  const vType = vTypeObj.name;
                  const existingRate = rates.find(r => r.vehicle_type === vType);
                  const isClosing = existingRate && existingRate.disabled_at;
                  const isAllowed = existingRate && !existingRate.disabled_at;
                  return (
                    <View key={vType} style={[styles.rateRow, (!isAllowed && !isClosing) && {opacity: 0.7}]}>
                      <View style={{flexDirection: 'column', width: 95}}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Ionicons name={vTypeObj.icon as any} size={24} color="#94a3b8" />
                          <Text style={styles.vehicleLabel}>{vType.toUpperCase()}</Text>
                        </View>
                        {isClosing && <CountdownTimer targetDate={existingRate.disabled_at as string} />}
                      </View>

                      <Switch 
                        value={isAllowed} 
                        onValueChange={(val) => handleToggleExistingRate(vType, existingRate, val)}
                        trackColor={{ false: '#334155', true: '#10b981' }}
                      />
                      
                      <TextInput 
                        style={isAllowed ? styles.inputUpdate : styles.inputCreate}
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={inputs[vType] || ''}
                        onChangeText={(val) => handleInputChange(vType, val)}
                      />

                      {isAllowed && existingRate && String(existingRate.amount) !== inputs[vType] && (
                        <TouchableOpacity style={[styles.btnUpdate, {marginLeft: 10}]} onPress={() => handleUpdateRate(existingRate.id, vType)}>
                          <Ionicons name="save" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  statusInactive: { fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: '900', letterSpacing: 1 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%', borderWidth: 1, borderColor: '#334155' },
  modalBgCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCenterContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155' },
  modalInput: { color: '#fff', backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginTop: 16, fontSize: 16, borderWidth: 1, borderColor: '#334155' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: '#10b981', marginTop: 4, fontWeight: '600' },
  
  rateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  vehicleCol: { flexDirection: 'row', alignItems: 'center', width: 90 },
  vehicleLabel: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  
  inputCreate: { flex: 1, color: '#fff', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#10b98133', marginLeft: 16 },
  inputUpdate: { flex: 1, color: '#fff', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#3b82f633', marginLeft: 16 },
  
  actionCol: { flexDirection: 'row', width: 90, justifyContent: 'flex-end', gap: 6 },
  btnCreate: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnCreateText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnUpdate: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8 },
  btnDelete: { backgroundColor: '#ef4444', padding: 10, borderRadius: 8 }
});

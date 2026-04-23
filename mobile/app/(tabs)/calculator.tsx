import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Modal, FlatList, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_BASE_URL = 'http://192.168.0.102:8000/api';

interface District {
  id: number;
  name: string;
}

interface TollRate {
  id: number;
  vehicle_type: string;
  amount: string;
  disabled_at: string | null;
}

interface RouteOption {
  id: number;
  name: string;
  estimated_time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bridges: string[];
}

function getVehicleIcon(type: string): keyof typeof Ionicons.glyphMap {
  const t = type.toLowerCase();
  if (t.includes('motor')) return 'bicycle';
  if (t.includes('bus') && t.includes('micro')) return 'car-sport';
  if (t.includes('bus')) return 'bus';
  if (t.includes('truck')) return 'cube';
  if (t.includes('trailer')) return 'train';
  return 'car';
}

// Dropdown Modal Component
function DistrictDropdown({
  label,
  selected,
  districts,
  onSelect,
  accentColor,
}: {
  label: string;
  selected: District | null;
  districts: District[];
  onSelect: (d: District) => void;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = districts.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (d: District) => {
    Haptics.selectionAsync();
    onSelect(d);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.dropdownBtn, selected && { borderColor: accentColor }]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="location-outline" size={18} color={selected ? accentColor : '#64748b'} />
        <Text style={[styles.dropdownBtnText, selected && { color: '#fff' }]}>
          {selected ? selected.name : `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={16} color={selected ? accentColor : '#64748b'} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
                <Ionicons name="close-circle" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#64748b" />
              <TextInput
                placeholder="Search district..."
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isSelected = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.districtRow, isSelected && { backgroundColor: `${accentColor}20` }]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.districtRowText, isSelected && { color: accentColor }]}>
                      {item.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function CalculatorScreen() {
  const [mode, setMode] = useState<'single' | 'smart'>('smart');
  const [bridges, setBridges] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Single Bridge State
  const [selectedBridgeId, setSelectedBridgeId] = useState<number | null>(null);
  const [rates, setRates] = useState<TollRate[]>([]);

  // Smart Route State
  const [origin, setOrigin] = useState<District | null>(null);
  const [destination, setDestination] = useState<District | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [aggregatedRates, setAggregatedRates] = useState<TollRate[]>([]);

  const [loadingBridges, setLoadingBridges] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      headerAnim.setValue(0);
      Animated.spring(headerAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    }, [])
  );

  useEffect(() => {
    fetchBridgesAndDistricts();
  }, []);

  // Fetch routes when origin + destination are both selected
  useEffect(() => {
    if (mode === 'smart' && origin && destination) {
      fetchRoutes(origin.id, destination.id);
    } else {
      setRouteOptions([]);
      setSelectedOptionId(null);
      setAggregatedRates([]);
    }
  }, [origin, destination, mode]);

  // Fetch rates when an option is selected
  useEffect(() => {
    if (mode === 'single' && selectedBridgeId) {
      fetchSingleBridgeRates(selectedBridgeId);
    } else if (mode === 'smart' && selectedOptionId !== null) {
      fetchSmartRates(selectedOptionId);
    }
  }, [selectedBridgeId, selectedOptionId, mode]);

  const getHeaders = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchBridgesAndDistricts = async () => {
    try {
      setLoadingBridges(true);
      const headers = await getHeaders();
      const [bRes, dRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bridges/`, { headers }),
        fetch(`${API_BASE_URL}/bridges/districts/`, { headers }),
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        setBridges(data);
        if (data.length > 0) setSelectedBridgeId(data[0].id);
      }
      if (dRes.ok) {
        const data = await dRes.json();
        setDistricts(data);
      }
    } catch (err) {
      console.error('Failed to fetch init data:', err);
    } finally {
      setLoadingBridges(false);
    }
  };

  const fetchRoutes = async (originId: number, destId: number) => {
    try {
      setLoadingRoutes(true);
      setRouteOptions([]);
      setAggregatedRates([]);
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/bridges/routes/search/?origin_id=${originId}&destination_id=${destId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const opts: RouteOption[] = data.options || [];
        setRouteOptions(opts);
        if (opts.length > 0) setSelectedOptionId(opts[0].id);
      } else {
        setRouteOptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchSingleBridgeRates = async (bridgeId: number) => {
    try {
      setLoadingRates(true);
      listAnim.setValue(0);
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/bridges/${bridgeId}/rates/`, { headers });
      if (res.ok) {
        setRates(await res.json());
        Animated.spring(listAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchSmartRates = async (optionId: number) => {
    try {
      setLoadingRates(true);
      listAnim.setValue(0);
      const option = routeOptions.find(o => o.id === optionId);
      if (!option) return;

      if (option.bridges.length === 0) {
        setAggregatedRates([
          { id: 1, vehicle_type: 'Motor Cycle', amount: '0', disabled_at: null },
          { id: 2, vehicle_type: 'Car', amount: '0', disabled_at: null },
          { id: 3, vehicle_type: 'Bus', amount: '0', disabled_at: null },
          { id: 4, vehicle_type: 'Truck', amount: '0', disabled_at: null },
        ]);
        Animated.spring(listAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
        return;
      }

      const headers = await getHeaders();
      const matchingBridges = bridges.filter(b => option.bridges.includes(b.name));
      const rateGroups = await Promise.all(
        matchingBridges.map(b => fetch(`${API_BASE_URL}/bridges/${b.id}/rates/`, { headers }).then(r => r.json()))
      );

      const agg: Record<string, number> = {};
      rateGroups.forEach(group => {
        if (!Array.isArray(group)) return;
        group.forEach(rate => {
          agg[rate.vehicle_type] = (agg[rate.vehicle_type] || 0) + parseFloat(rate.amount);
        });
      });

      const combined: TollRate[] = Object.keys(agg).map((vt, idx) => ({
        id: idx, vehicle_type: vt, amount: agg[vt].toString(), disabled_at: null,
      }));
      setAggregatedRates(combined);
      Animated.spring(listAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRates(false);
    }
  };

  const currentRates = mode === 'single' ? rates : aggregatedRates;
  const currentOption = routeOptions.find(o => o.id === selectedOptionId);

  return (
    <View style={styles.container}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
        }]}>
          <Text style={styles.title}>Toll Calculator</Text>
          <Text style={styles.subtitle}>Estimate your journey cost</Text>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'single' && styles.toggleBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('single'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, mode === 'single' && styles.toggleTextActive]}>Single Bridge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'smart' && styles.toggleBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('smart'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={13} color={mode === 'smart' ? '#fff' : '#64748b'} style={{ marginRight: 4 }} />
              <Text style={[styles.toggleText, mode === 'smart' && styles.toggleTextActive]}>Smart Route</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── SINGLE BRIDGE MODE ─── */}
        {mode === 'single' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Bridge</Text>
            {loadingBridges ? <ActivityIndicator color="#38bdf8" /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {bridges.map(bridge => {
                  const sel = selectedBridgeId === bridge.id;
                  return (
                    <TouchableOpacity key={bridge.id} style={[styles.bridgeChip, sel && styles.bridgeChipActive]}
                      onPress={() => { Haptics.selectionAsync(); setSelectedBridgeId(bridge.id); }} activeOpacity={0.8}>
                      <Ionicons name="map-outline" size={15} color={sel ? '#fff' : '#64748b'} />
                      <Text style={[styles.bridgeChipText, sel && styles.bridgeChipTextActive]}>{bridge.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : (
          /* ─── SMART ROUTE MODE ─── */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From</Text>
            <DistrictDropdown label="Origin" selected={origin} districts={districts} onSelect={setOrigin} accentColor="#38bdf8" />

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>To</Text>
            <DistrictDropdown label="Destination" selected={destination} districts={districts} onSelect={setDestination} accentColor="#8b5cf6" />

            {/* Route Options */}
            {loadingRoutes ? (
              <ActivityIndicator color="#8b5cf6" style={{ marginTop: 24 }} />
            ) : routeOptions.length > 0 ? (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Route Options</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {routeOptions.map(opt => {
                    const sel = selectedOptionId === opt.id;
                    return (
                      <TouchableOpacity key={opt.id} activeOpacity={0.8}
                        style={[styles.routeChip, sel && { borderColor: opt.color, backgroundColor: `${opt.color}18` }]}
                        onPress={() => { Haptics.selectionAsync(); setSelectedOptionId(opt.id); }}>
                        <Ionicons name={opt.icon as any} size={20} color={sel ? opt.color : '#64748b'} />
                        <View>
                          <Text style={[styles.routeName, sel && { color: opt.color }]}>{opt.name}</Text>
                          <Text style={[styles.routeTime, sel && { color: '#e2e8f0' }]}>{opt.estimated_time}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : origin && destination ? (
              <View style={styles.noRoute}>
                <Ionicons name="alert-circle-outline" size={32} color="#64748b" />
                <Text style={styles.noRouteText}>No configured route found between these districts.</Text>
                <Text style={styles.noRouteHint}>Ask your admin to add this route in the dashboard.</Text>
              </View>
            ) : null}

            {/* Visual Route Plan */}
            {currentOption && (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionTitle, { color: currentOption.color }]}>Route Plan</Text>
                <View style={[styles.routePlanBox, { borderColor: `${currentOption.color}40`, backgroundColor: `${currentOption.color}0e` }]}>
                  {currentOption.bridges.length > 0 ? (
                    currentOption.bridges.map((name, idx) => (
                      <View key={name} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <Text style={styles.routePlanNode}>{name}</Text>
                        {idx < currentOption.bridges.length - 1 && (
                          <Ionicons name="arrow-forward" size={13} color={currentOption.color} style={{ marginHorizontal: 6 }} />
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.routePlanNode}>🛣️  Alternative Highway — No Toll Bridges</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── FARE RESULTS ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{mode === 'single' ? 'Toll Rates' : 'Combined Fare'}</Text>
          {loadingRates ? (
            <ActivityIndicator color="#10b981" style={{ marginTop: 20 }} />
          ) : currentRates.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calculator-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>
                {mode === 'smart' && (!origin || !destination)
                  ? 'Select origin and destination to see fares.'
                  : 'No rates available.'}
              </Text>
            </View>
          ) : (
            currentRates.map((rate, index) => (
              <Animated.View key={rate.id} style={[styles.rateCard, {
                opacity: listAnim,
                transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + index * 10, 0] }) }],
              }]}>
                <View style={styles.rateLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name={getVehicleIcon(rate.vehicle_type)} size={22} color="#38bdf8" />
                  </View>
                  <Text style={styles.vehicleType}>{rate.vehicle_type}</Text>
                </View>
                <View style={styles.rateRight}>
                  <Text style={[styles.amountSymbol, rate.amount === '0' && { color: '#64748b' }]}>৳</Text>
                  <Text style={[styles.amountText, rate.amount === '0' && { color: '#94a3b8' }]}>
                    {parseFloat(rate.amount).toFixed(0)}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60 },
  blob1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#38bdf810', top: -50, right: -100 },
  blob2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#10b98108', bottom: 100, left: -100 },

  header: { paddingHorizontal: 24, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 4 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  toggleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#38bdf820' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  toggleTextActive: { color: '#fff' },

  section: { paddingHorizontal: 24, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  chipRow: { gap: 10, paddingBottom: 4 },
  bridgeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, borderWidth: 1, borderColor: '#334155', gap: 7 },
  bridgeChipActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  bridgeChipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  bridgeChipTextActive: { color: '#fff', fontWeight: '700' },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  dropdownBtnText: { color: '#64748b', fontSize: 15, fontWeight: '600', flex: 1 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  modalSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  districtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#0f172a30' },
  districtRowText: { color: '#cbd5e1', fontSize: 15, fontWeight: '600' },

  // Route Chips
  routeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: '#334155', gap: 10, minWidth: 160 },
  routeName: { color: '#94a3b8', fontSize: 14, fontWeight: '800' },
  routeTime: { color: '#64748b', fontSize: 12, fontWeight: '500', marginTop: 2 },

  routePlanBox: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap' },
  routePlanNode: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },

  noRoute: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#1e293b60', borderRadius: 16, marginTop: 16 },
  noRouteText: { color: '#64748b', fontSize: 14, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  noRouteHint: { color: '#475569', fontSize: 12, marginTop: 6, textAlign: 'center' },

  rateCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 12, elevation: 3 },
  rateLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 44, height: 44, backgroundColor: '#38bdf815', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vehicleType: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  rateRight: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  amountSymbol: { fontSize: 14, color: '#10b981', fontWeight: '700', marginTop: 2, marginRight: 2 },
  amountText: { fontSize: 22, fontWeight: '800', color: '#fff' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#64748b', fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 22 },
});
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, RefreshControl, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

type Bridge = { 
  id: number; 
  name: string; 
  location: string; 
  is_active: boolean; 
  status_message: string 
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom coordinates mapping for stylized vector map positioning (percentages of the map wrapper)
const BRIDGE_COORDINATES: { [key: string]: { x: number; y: number } } = {
  'Padma Bridge': { x: 35, y: 55 },
  'Meghna Bridge': { x: 62, y: 46 },
  'Jamuna Bridge': { x: 30, y: 30 },
  'Lalon Shah Bridge': { x: 22, y: 42 },
  'Kanchan Bridge': { x: 55, y: 32 }
};

export default function InteractiveBridgeMap() {
  const router = useRouter();
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);
  
  // Animation refs
  const mapEntrance = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchBridges = async () => {
    try {
      const res = await fetch('http://192.168.0.106:8000/api/bridges/');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBridges(data);
        // Default select the first bridge
        if (data.length > 0) {
          setSelectedBridge(data[0]);
        }
      }
    } catch (err) {
      console.log('Error fetching bridges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBridges();
    // Start entrance animations
    Animated.spring(mapEntrance, { toValue: 1, tension: 30, friction: 8, useNativeDriver: true }).start();
  }, []);

  // Pulsing active highlight animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Slide-in animation for bottom info sheet on change
  useEffect(() => {
    if (selectedBridge) {
      cardEntrance.setValue(0);
      Animated.spring(cardEntrance, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    }
  }, [selectedBridge]);

  const handleSelectBridge = (bridge: Bridge) => {
    Haptics.selectionAsync();
    setSelectedBridge(bridge);
  };

  // Mocked additional stats per bridge to display in the bottom sheet
  const getBridgeMetadata = (name: string) => {
    const isPadma = name.includes('Padma');
    const isMeghna = name.includes('Meghna');
    return {
      congestion: isPadma ? 'Medium Traffic' : isMeghna ? 'Clear Expressway' : 'Light Traffic',
      congestionColor: isPadma ? '#f59e0b' : isMeghna ? '#10b981' : '#38bdf8',
      speedLimit: '80 km/h',
      lanes: '4 Lanes Open'
    };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Calibrating GPS grid...</Text>
      </View>
    );
  }

  const activeBridgesCount = bridges.filter(b => b.is_active).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Expressway Map</Text>
          <Text style={styles.subtitle}>{activeBridgesCount} of {bridges.length} Plazas Operational</Text>
        </View>
      </View>

      {/* Styled Interactive Vector Grid Map */}
      <Animated.View style={[styles.mapContainer, { opacity: mapEntrance, transform: [{ scale: mapEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        {/* Abstract Highway Grid Vectors */}
        <View style={styles.highwayOverlay}>
          {/* Main Expressway Line (Dhaka - Padma - Chittagong) */}
          <View style={[styles.expresswayPath, { width: '80%', height: 3, top: '48%', left: '10%', transform: [{ rotate: '25deg' }] }]} />
          {/* North Link Expressway */}
          <View style={[styles.expresswayPath, { width: '50%', height: 3, top: '35%', left: '20%', transform: [{ rotate: '-35deg' }] }]} />
          {/* Side Bypass Expressway */}
          <View style={[styles.expresswayPath, { width: '40%', height: 2, top: '40%', left: '35%', borderStyle: 'dashed', transform: [{ rotate: '70deg' }] }]} />
        </View>

        {/* Dynamic Nodes Mapping */}
        {bridges.map((b, index) => {
          const coords = BRIDGE_COORDINATES[b.name] || { x: 15 + index * 15, y: 20 + index * 12 };
          const isSelected = selectedBridge?.id === b.id;

          return (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.8}
              onPress={() => handleSelectBridge(b)}
              style={[styles.mapNodeContainer, { top: `${coords.y}%`, left: `${coords.x}%` }]}
            >
              {isSelected ? (
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
              ) : null}
              
              <View style={[
                styles.nodeDot, 
                { backgroundColor: b.is_active ? '#10b981' : '#ef4444' },
                isSelected && styles.nodeDotActive
              ]} />
              
              <Text style={[styles.nodeLabel, isSelected && styles.nodeLabelActive]} numberOfLines={1}>
                {b.name.replace(' Bridge', '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Interactive Bottom Sheet */}
      {selectedBridge && (
        <Animated.View style={[styles.bottomSheet, {
          opacity: cardEntrance,
          transform: [{
            translateY: cardEntrance.interpolate({
              inputRange: [0, 1],
              outputRange: [60, 0]
            })
          }]
        }]}>
          {/* Metadata */}
          {(() => {
            const meta = getBridgeMetadata(selectedBridge.name);
            return (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>{selectedBridge.name}</Text>
                    <View style={styles.sheetSub}>
                      <Ionicons name="location" size={13} color="#ec4899" />
                      <Text style={styles.sheetLocText}>{selectedBridge.location}</Text>
                    </View>
                  </View>

                  <View style={[styles.sheetStatus, { backgroundColor: selectedBridge.is_active ? '#10b98115' : '#ef444415', borderColor: selectedBridge.is_active ? '#10b98130' : '#ef444430' }]}>
                    <View style={[styles.statusIndicatorDot, { backgroundColor: selectedBridge.is_active ? '#10b981' : '#ef4444' }]} />
                    <Text style={[styles.statusText, { color: selectedBridge.is_active ? '#10b981' : '#ef4444' }]}>
                      {selectedBridge.is_active ? 'OPERATIONAL' : 'SUSPENDED'}
                    </Text>
                  </View>
                </View>

                {/* Status/Warning Messages */}
                {selectedBridge.status_message ? (
                  <View style={styles.announcementBox}>
                    <Ionicons name="megaphone-outline" size={16} color="#f59e0b" />
                    <Text style={styles.announcementText}>{selectedBridge.status_message}</Text>
                  </View>
                ) : null}

                {/* Technical stats breakdown */}
                <View style={styles.statsRow}>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsLabel}>LIVE TRAFFIC</Text>
                    <Text style={[styles.statsVal, { color: meta.congestionColor }]}>{meta.congestion}</Text>
                  </View>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsLabel}>SPEED LIMIT</Text>
                    <Text style={styles.statsVal}>{meta.speedLimit}</Text>
                  </View>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsLabel}>CONGESTION</Text>
                    <Text style={styles.statsVal}>{meta.lanes}</Text>
                  </View>
                </View>

                {/* Action button */}
                {selectedBridge.is_active ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.payBtn}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      router.push('/pay-toll');
                    }}
                  >
                    <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.payBtnText}>Buy Instant Toll Pass</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.suspendedBtn}>
                    <Ionicons name="lock-closed" size={18} color="#64748b" style={{ marginRight: 8 }} />
                    <Text style={styles.suspendedBtnText}>Processing Suspended</Text>
                  </View>
                )}
              </>
            );
          })()}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  loadingText: { color: '#94a3b8', fontSize: 13, marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 60, marginBottom: 12 },
  backBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Stylized expressway map
  mapContainer: { flex: 1, backgroundColor: '#0b0f19', margin: 20, borderRadius: 24, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', minHeight: 320 },
  highwayOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  expresswayPath: { position: 'absolute', backgroundColor: '#cbd5e1' },

  // Nodes positioning
  mapNodeContainer: { position: 'absolute', alignItems: 'center', zIndex: 10 },
  pulseCircle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#ec489920', top: -8, left: -8 },
  nodeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#0b0f19' },
  nodeDotActive: { width: 14, height: 14, borderRadius: 7, borderColor: '#fff', borderWidth: 2, shadowColor: '#ec4899', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
  nodeLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 4, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  nodeLabelActive: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Sheet panel
  bottomSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#334155', padding: 24, paddingBottom: 34 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  sheetSub: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sheetLocText: { fontSize: 12, color: '#94a3b8' },
  
  sheetStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusIndicatorDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  announcementBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f59e0b10', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f59e0b25', marginBottom: 16 },
  announcementText: { color: '#cbd5e1', fontSize: 12, flex: 1, lineHeight: 18 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statsCard: { flex: 1, backgroundColor: '#0f172a', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  statsLabel: { fontSize: 9, color: '#64748b', fontWeight: '800', letterSpacing: 0.5 },
  statsVal: { fontSize: 12, color: '#fff', fontWeight: '700', marginTop: 4 },

  payBtn: { backgroundColor: '#ec4899', height: 48, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  suspendedBtn: { backgroundColor: '#33415540', height: 48, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  suspendedBtnText: { color: '#64748b', fontWeight: '700', fontSize: 14 }
}) as any;

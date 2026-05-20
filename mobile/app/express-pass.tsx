import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExpressContactlessPass() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const token = params.token as string;
  const bridge = params.bridge as string;
  const vehicle = params.vehicle as string;
  const txn = params.txn as string;

  const [status, setStatus] = useState<'idle' | 'transmitting' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Radar wave scale and opacity animations
  const wave1Scale = useRef(new Animated.Value(1)).current;
  const wave1Opacity = useRef(new Animated.Value(0.6)).current;
  const wave2Scale = useRef(new Animated.Value(1)).current;
  const wave2Opacity = useRef(new Animated.Value(0.4)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // Pulse animation loops for signal waves
  useEffect(() => {
    if (status !== 'transmitting') return;

    const animateWaves = () => {
      wave1Scale.setValue(1);
      wave1Opacity.setValue(0.8);
      wave2Scale.setValue(1);
      wave2Opacity.setValue(0.6);

      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(wave1Scale, { toValue: 2.2, duration: 1200, useNativeDriver: true }),
              Animated.timing(wave1Opacity, { toValue: 0, duration: 1200, useNativeDriver: true })
            ]),
            Animated.delay(200)
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(400),
            Animated.parallel([
              Animated.timing(wave2Scale, { toValue: 2.2, duration: 1200, useNativeDriver: true }),
              Animated.timing(wave2Opacity, { toValue: 0, duration: 1200, useNativeDriver: true })
            ])
          ])
        )
      ]).start();
    };

    animateWaves();
  }, [status]);

  const handleSimulateTap = async () => {
    if (status !== 'idle') return;
    
    // Play light click haptic
    Haptics.selectionAsync();
    setStatus('transmitting');

    // Simulate standard card compression/tap bounce
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1.0, duration: 100, useNativeDriver: true })
    ]).start();

    try {
      const jwtToken = await AsyncStorage.getItem('token');
      
      // Let's call the backend verify endpoint to mark the pass as used instantly!
      const res = await fetch('http://192.168.0.106:8000/api/passes/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ token: token })
      });
      const data = await res.json();

      // Artificial short delay to let the radar wave animate
      setTimeout(() => {
        if (res.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStatus('success');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setErrorMessage(data.message || 'Pass validation failed');
          setStatus('failed');
        }
      }, 1500);

    } catch (e) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage('Check server connection');
        setStatus('failed');
      }, 1500);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Express Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Glowing Pulse Signal Area */}
        <View style={styles.signalArea}>
          {status === 'transmitting' && (
            <>
              <Animated.View style={[styles.signalWave, { transform: [{ scale: wave1Scale }], opacity: wave1Opacity }]} />
              <Animated.View style={[styles.signalWave, { transform: [{ scale: wave2Scale }], opacity: wave2Opacity }]} />
            </>
          )}

          {/* Simulated NFC Express Card */}
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }] }]}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={handleSimulateTap} 
              style={[
                styles.nfcCard, 
                status === 'success' && styles.cardSuccess,
                status === 'failed' && styles.cardFailed
              ] as any}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardBrand}>TollExpress Pass</Text>
                  <Text style={styles.cardDesc}>Instant Contactless Clearance</Text>
                </View>
                <Ionicons name="wifi" size={24} color="#fff" style={styles.nfcIcon} />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardBridgeName}>{bridge || 'Padma Bridge'}</Text>
                <Text style={styles.cardVehicleReg}>{vehicle || 'KA-123456'}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>TOKEN REFERENCE</Text>
                  <Text style={styles.footerVal}>{token ? `${token.substring(0, 8)}...` : 'NFC-PASS-54A'}</Text>
                </View>
                <View style={styles.chipWrapper}>
                  <View style={styles.nfcChip} />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Dynamic Status / Actions Panel */}
        <View style={styles.actionPanel}>
          {status === 'idle' && (
            <>
              <Text style={styles.instructionText}>Hold your device near the booth reader and tap the card to simulate NFC contactless clearance.</Text>
              <TouchableOpacity style={styles.tapButton} onPress={handleSimulateTap}>
                <Ionicons name="wifi-outline" size={20} color="#fff" style={{ marginRight: 8, transform: [{ rotate: '90deg' }] }} />
                <Text style={styles.tapButtonText}>Tap to Transmit</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'transmitting' && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#ec4899" />
              <Text style={styles.statusBoxText}>Emitting RFID wave signal...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusBox}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.successHeadline}>CLEARANCE SUCCESSFUL!</Text>
              <Text style={styles.successDetail}>Toll gate opened. Safe travels!</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneBtnText}>Return to Passes</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'failed' && (
            <View style={styles.statusBox}>
              <Ionicons name="close-circle" size={48} color="#ef4444" />
              <Text style={styles.failedHeadline}>TRANSMISSION FAILED</Text>
              <Text style={styles.failedDetail}>{errorMessage || 'Toll reader rejected the pass.'}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => setStatus('idle')}>
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  
  content: { flex: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 50 },
  
  // Wave/Radar Signal Area
  signalArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 30, position: 'relative' },
  signalWave: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#ec489950', backgroundColor: '#ec489905' },
  
  // NFC Card Styles
  cardWrapper: { zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 12 },
  nfcCard: { backgroundColor: '#ec4899', width: SCREEN_WIDTH - 60, height: 210, borderRadius: 24, padding: 24, justifyContent: 'space-between', borderWidth: 1, borderColor: '#ec489980' },
  cardSuccess: { backgroundColor: '#10b981', borderColor: '#10b98180' },
  cardFailed: { backgroundColor: '#ef4444', borderColor: '#ef444480' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  cardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2, fontWeight: '500' },
  nfcIcon: { transform: [{ rotate: '90deg' }] },
  
  cardBody: { marginVertical: 12 },
  cardBridgeName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  cardVehicleReg: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700', marginTop: 4, fontFamily: 'monospace' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  footerVal: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  chipWrapper: { width: 38, height: 28, borderRadius: 6, backgroundColor: '#facc1530', borderWidth: 1, borderColor: '#facc1560', justifyContent: 'center', alignItems: 'center' },
  nfcChip: { width: 20, height: 16, borderRadius: 3, backgroundColor: '#eab30880' },

  // Bottom action sheet
  actionPanel: { alignItems: 'center', width: '100%' },
  instructionText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12, marginBottom: 24 },
  tapButton: { backgroundColor: '#1e293b', width: '100%', height: 50, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
  tapButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  
  statusBox: { alignItems: 'center', width: '100%', paddingVertical: 10 },
  statusBoxText: { color: '#ec4899', fontSize: 13, fontWeight: '700', marginTop: 12 },
  
  successHeadline: { color: '#10b981', fontSize: 20, fontWeight: '900', marginTop: 16, letterSpacing: 0.5 },
  successDetail: { color: '#64748b', fontSize: 13, marginTop: 4 },
  doneBtn: { backgroundColor: '#10b98115', borderEndColor: '#10b98130', borderWidth: 1, width: '100%', height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  doneBtnText: { color: '#10b981', fontWeight: '800', fontSize: 14 },
  
  failedHeadline: { color: '#ef4444', fontSize: 20, fontWeight: '900', marginTop: 16, letterSpacing: 0.5 },
  failedDetail: { color: '#64748b', fontSize: 13, marginTop: 4, textAlign: 'center' },
  retryBtn: { backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430', width: '100%', height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  retryBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 14 }
}) as any;

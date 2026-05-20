import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ScannerScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error', data: any} | null>(null);
  const [scannerMode, setScannerMode] = useState<'qr' | 'nfc'>('qr');

  // Animation ref for pulsing RFID waves in NFC Mode
  const nfcPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

  // Pulsing active highlight animation for NFC Mode
  useEffect(() => {
    if (scannerMode !== 'nfc') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(nfcPulse, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(nfcPulse, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [scannerMode]);

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned || verifying) return;
    setScanned(true);
    setVerifying(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.0.106:8000/api/passes/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: data })
      });
      const responseBody = await res.json();

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScanResult({ type: 'success', data: responseBody });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setScanResult({ type: 'error', data: responseBody });
      }
    } catch (e) {
      setScanResult({ type: 'error', data: { message: 'Network Error connecting to Toll Servers' } });
    } finally {
      setVerifying(false);
    }
  };

  // Simulate NFC reception by detecting the most recent active payment/pass on the server
  const handleSimulateNFCTap = async () => {
    if (verifying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setVerifying(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      // 1. Fetch all payments/passes on the server to detect the latest active one
      const paymentsRes = await fetch('http://192.168.0.106:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!paymentsRes.ok) {
        throw new Error('Failed to reach server');
      }
      
      const payments = await paymentsRes.json();
      const activePasses = payments.filter((p: any) => p.pass_status === 'active');
      
      if (activePasses.length === 0) {
        // No active pass found, trigger error state
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setScanResult({
            type: 'error',
            data: { message: 'No active Driver contactless cards detected nearby.' }
          });
          setVerifying(false);
        }, 1200);
        return;
      }

      // 2. Select the latest active pass
      const latestPass = activePasses[0];

      // 3. Perform contactless verification
      const verifyRes = await fetch('http://192.168.0.106:8000/api/passes/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: latestPass.token })
      });
      const verifyData = await verifyRes.json();

      setTimeout(() => {
        if (verifyRes.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setScanResult({ type: 'success', data: verifyData });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setScanResult({ type: 'error', data: verifyData });
        }
        setVerifying(false);
      }, 1500);

    } catch (e) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setScanResult({ type: 'error', data: { message: 'Failed to complete contactless handshake.' } });
        setVerifying(false);
      }, 1500);
    }
  };

  const toggleMode = (mode: 'qr' | 'nfc') => {
    Haptics.selectionAsync();
    setScannerMode(mode);
    setScanResult(null);
    setScanned(false);
  };

  // If in NFC mode, we do not require camera check
  const renderNFCMode = () => (
    <View style={styles.nfcContainer}>
      <View style={styles.terminalHeader}>
        <Ionicons name="hardware-chip-outline" size={24} color="#ec4899" />
        <Text style={styles.terminalTitle}>RFID Operator Terminal</Text>
        <Text style={styles.terminalSubtitle}>Ready for Driver Card contact</Text>
      </View>

      {/* Pulsing NFC Radar Receiver Target */}
      <View style={styles.radarWrapper}>
        <Animated.View style={[styles.pulseRadar, { transform: [{ scale: nfcPulse }] }]} />
        <TouchableOpacity 
          activeOpacity={0.85} 
          onPress={handleSimulateNFCTap} 
          style={styles.radarCenter}
        >
          <Ionicons name="wifi" size={48} color="#fff" style={styles.wifiRotate} />
          <Text style={styles.radarTouchText}>TAP TO DETECT CARD</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.nfcInstruction}>
        Operators can simulate a contactless gate entry by selecting "Detect Card". This automatically checks for any active vehicle passes inside the toll network.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Dynamic Mode Switcher at top */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, scannerMode === 'qr' && styles.toggleBtnActive]} 
          onPress={() => toggleMode('qr')}
        >
          <Ionicons name="qr-code" size={16} color={scannerMode === 'qr' ? '#000' : '#94a3b8'} style={{ marginRight: 6 }} />
          <Text style={[styles.toggleBtnText, scannerMode === 'qr' && styles.toggleBtnTextActive]}>Camera Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.toggleBtn, scannerMode === 'nfc' && styles.toggleBtnActiveNfc]} 
          onPress={() => toggleMode('nfc')}
        >
          <Ionicons name="wifi" size={16} color={scannerMode === 'nfc' ? '#fff' : '#94a3b8'} style={{ marginRight: 6, transform: [{ rotate: '90deg' }] }} />
          <Text style={[styles.toggleBtnText, scannerMode === 'nfc' && styles.toggleBtnTextActiveNfc]}>NFC Express</Text>
        </TouchableOpacity>
      </View>

      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={scannerMode === 'nfc' ? '#ec4899' : '#10b981'} />
          <Text style={styles.overlayText}>Performing secure verification...</Text>
        </View>
      )}

      {scanResult && (
        <View style={[styles.resultOverlay, scanResult.type === 'success' ? styles.successBg : styles.errorBg]}>
          <View style={styles.resultContent}>
            {scanResult.type === 'success' ? (
              <>
                <Ionicons name={(scanResult.data.vehicle_icon as any) || 'car-sport'} size={120} color="#fff" />
                <Text style={styles.vehicleTypeText}>{scanResult.data.vehicle_type?.toUpperCase() || 'UNKNOWN'}</Text>
                <Text style={styles.regNumberText}>{scanResult.data.vehicle}</Text>
                <Text style={styles.bridgeText}>Bridge: {scanResult.data.bridge}</Text>
                <Text style={styles.successMessageText}>{scanResult.data.message}</Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={100} color="#fff" />
                <Text style={styles.errorTitleText}>ACCESS DENIED</Text>
                <Text style={styles.errorMessageText}>{scanResult.data.message}</Text>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.nextScanButton} 
              onPress={() => {
                Haptics.selectionAsync();
                setScanResult(null);
                setScanned(false);
              }}
            >
              <Text style={styles.nextScanButtonText}>Reset Reader</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Body depending on Scanner mode selection */}
      {scannerMode === 'nfc' ? (
        renderNFCMode()
      ) : (
        <>
          {hasPermission === null && <View style={styles.cameraAlt}><ActivityIndicator color="#10b981" size="large" /></View>}
          {hasPermission === false && <View style={styles.cameraAlt}><Text style={styles.errorText}>No access to camera. Swap to NFC Mode to test!</Text></View>}
          {hasPermission === true && (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scanBox} />
                <Text style={styles.instructionText}>Point Camera at Driver's QR Code</Text>
              </View>
            </CameraView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60 },
  camera: { flex: 1 },
  cameraAlt: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorText: { color: '#94a3b8', textAlign: 'center', paddingHorizontal: 32, fontSize: 15, lineHeight: 22 },
  
  // Toggle switches
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#1e293b', marginHorizontal: 20, marginBottom: 20, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#334155', zIndex: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleBtnActiveNfc: { backgroundColor: '#ec4899' },
  toggleBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  toggleBtnTextActive: { color: '#000' },
  toggleBtnTextActiveNfc: { color: '#fff' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.92)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: 'bold' },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.3)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#10b981', backgroundColor: 'transparent' },
  instructionText: { color: '#fff', marginTop: 40, fontSize: 14, fontWeight: '700' },
  
  resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 110, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successBg: { backgroundColor: '#10b981' },
  errorBg: { backgroundColor: '#ef4444' },
  resultContent: { alignItems: 'center', width: '100%' },
  vehicleTypeText: { fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 20, letterSpacing: 2, textAlign: 'center' },
  regNumberText: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 10, opacity: 0.9 },
  bridgeText: { fontSize: 18, color: '#fff', marginTop: 5, opacity: 0.8 },
  successMessageText: { fontSize: 15, color: '#fff', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 12, overflow: 'hidden', textAlign: 'center' },
  errorTitleText: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 20 },
  errorMessageText: { fontSize: 16, color: '#fff', marginTop: 10, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: 15, borderRadius: 12, overflow: 'hidden' },
  nextScanButton: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 16, marginTop: 45, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6 },
  nextScanButtonText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // NFC Mode Styles
  nfcContainer: { flex: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 40 },
  terminalHeader: { alignItems: 'center', marginTop: 20 },
  terminalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 10 },
  terminalSubtitle: { fontSize: 12, color: '#ec4899', fontWeight: '700', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  
  radarWrapper: { height: 260, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  pulseRadar: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 2, borderColor: '#ec489940', backgroundColor: '#ec489905' },
  radarCenter: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#ec4899', justifyContent: 'center', alignItems: 'center', shadowColor: '#ec4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, borderWidth: 2, borderColor: '#fff3' },
  wifiRotate: { transform: [{ rotate: '90deg' }] },
  radarTouchText: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 },
  
  nfcInstruction: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 }
}) as any;

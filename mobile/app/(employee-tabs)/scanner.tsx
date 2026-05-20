import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function ScannerScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error', data: any} | null>(null);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

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
        setScanResult({ type: 'success', data: responseBody });
      } else {
        setScanResult({ type: 'error', data: responseBody });
      }
    } catch (e) {
      setScanResult({ type: 'error', data: { message: 'Network Error connecting to Toll Servers' } });
    } finally {
      setVerifying(false);
    }
  };

  if (hasPermission === null) return <View style={styles.container}><ActivityIndicator color="#10b981" size="large" /></View>;
  if (hasPermission === false) return <View style={styles.container}><Text style={styles.errorText}>No access to camera</Text></View>;

  return (
    <View style={styles.container}>
      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.overlayText}>Verifying with Server...</Text>
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
                <Text style={styles.errorTitleText}>INVALID PASS</Text>
                <Text style={styles.errorMessageText}>{scanResult.data.message}</Text>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.nextScanButton} 
              onPress={() => {
                setScanResult(null);
                setScanned(false);
              }}
            >
              <Text style={styles.nextScanButtonText}>Next Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 100, fontSize: 18 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: '#fff', marginTop: 16, fontSize: 18, fontWeight: 'bold' },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#10b981', backgroundColor: 'transparent' },
  instructionText: { color: '#fff', marginTop: 40, fontSize: 16, fontWeight: 'bold' },
  resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successBg: { backgroundColor: '#10b981' },
  errorBg: { backgroundColor: '#ef4444' },
  resultContent: { alignItems: 'center', width: '100%' },
  vehicleTypeText: { fontSize: 48, fontWeight: '900', color: '#fff', marginTop: 20, letterSpacing: 2, textAlign: 'center' },
  regNumberText: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 10, opacity: 0.9 },
  bridgeText: { fontSize: 18, color: '#fff', marginTop: 5, opacity: 0.8 },
  successMessageText: { fontSize: 16, color: '#fff', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, overflow: 'hidden' },
  errorTitleText: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 20 },
  errorMessageText: { fontSize: 20, color: '#fff', marginTop: 10, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 8, overflow: 'hidden' },
  nextScanButton: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, marginTop: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  nextScanButtonText: { fontSize: 20, fontWeight: 'bold', color: '#000' }
});

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
      const res = await fetch('http://192.168.0.102:8000/api/passes/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: data })
      });
      const responseBody = await res.json();

      if (res.ok) {
        Alert.alert(
          '✅ PASS VERIFIED',
          `Bridge: ${responseBody.bridge}\nVehicle: ${responseBody.vehicle}\nMessage: ${responseBody.message}`,
          [{ text: 'Scan Another', onPress: () => setScanned(false) }]
        );
      } else {
        Alert.alert(
          '❌ INVALID PASS',
          responseBody.message || 'Pass failed verification',
          [{ text: 'Try Again', onPress: () => setScanned(false), style: 'cancel' }]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Network Error connecting to Toll Servers', [{ text: 'OK', onPress: () => setScanned(false) }]);
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
  instructionText: { color: '#fff', marginTop: 40, fontSize: 16, fontWeight: 'bold' }
});

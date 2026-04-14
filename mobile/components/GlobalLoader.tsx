import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GlobalLoader() {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Car bouncing up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ])
    ).start();

    // Spinner rotating
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, [bounceAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <Ionicons name="car-sport" size={40} color="#10b981" />
        </Animated.View>
      </View>
      <Text style={styles.pulseText}>LOADING...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Slightly translucent dark slate
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 9999,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderTopColor: '#10b981',
  },
  pulseText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
    opacity: 0.9,
  }
});

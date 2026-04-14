import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

export default function GlobalLoader() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wheel rolling (Counter-Clockwise -360)
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();

    // Road moving (Simulating the speed tracking)
    Animated.loop(
      Animated.timing(roadAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  }, [spinAnim, roadAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });

  const moveRoad = roadAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150] 
  });

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.loaderContainer}>
        {/* The Rolling Wheel */}
        <Animated.View style={[styles.wheelContainer, { transform: [{ rotate: spin }] }]}>
          <View style={styles.tire}>
             <View style={styles.rim}>
                <View style={styles.spokeHorizontal} />
                <View style={styles.spokeVertical} />
                <View style={styles.hub} />
             </View>
          </View>
        </Animated.View>

        {/* The Moving Road */}
        <View style={styles.roadContainer}>
          <Animated.View style={[styles.roadLine, { transform: [{ translateX: moveRoad }] }]} />
        </View>
      </View>
      <Text style={styles.pulseText}>PROCESSING...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 9999,
  },
  loaderContainer: {
    width: 200,
    height: 140,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  wheelContainer: {
    marginBottom: 10, // Keep it above the road physically
    zIndex: 2,
  },
  tire: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'transparent',
    borderWidth: 10,
    borderStyle: 'dashed',
    borderColor: '#373737', // Dark realistic tire
    alignItems: 'center',
    justifyContent: 'center',
  },
  rim: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 6,
    borderColor: '#7e7e7e', // Metallic Rim
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hub: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#808080',
    zIndex: 3,
  },
  spokeHorizontal: {
    position: 'absolute',
    width: 80,
    height: 8,
    backgroundColor: '#7e7e7e',
  },
  spokeVertical: {
    position: 'absolute',
    width: 8,
    height: 80,
    backgroundColor: '#7e7e7e',
  },
  roadContainer: {
    position: 'absolute',
    bottom: 12,
    width: '100%',
    height: 12,
    overflow: 'hidden',
    zIndex: 1,
  },
  roadLine: {
    width: 350,
    height: 10,
    backgroundColor: '#373737',
    borderRadius: 10,
    marginLeft: -75, // Starting safely off screen
  },
  pulseText: {
    color: '#808080',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
    opacity: 0.9,
  }
});

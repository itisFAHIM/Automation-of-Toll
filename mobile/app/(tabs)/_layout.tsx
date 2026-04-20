import { Tabs } from 'expo-router';
import { useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

function AnimatedTabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  if (focused) {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={focused ? { backgroundColor: color + '20', borderRadius: 10, padding: 4 } : {}}>
        <Ionicons name={name} size={24} color={color} />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? 'car-sport' : 'car-sport-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? 'calculator' : 'calculator-outline'} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
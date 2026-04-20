import { Tabs } from 'expo-router';
import { useRef } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarStyle: {
        backgroundColor: '#0f172a',
        borderTopColor: '#1e293b',
        borderTopWidth: 1,
        height: 66,
        paddingBottom: 10,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#8b5cf6', 
      tabBarInactiveTintColor: '#475569',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Admin', 
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? "shield-checkmark" : "shield-checkmark-outline"} color={color} focused={focused} /> 
        }} 
      />
      <Tabs.Screen 
        name="employees" 
        options={{ 
          title: 'Employees', 
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? "people" : "people-outline"} color={color} focused={focused} /> 
        }} 
      />
      <Tabs.Screen 
        name="bridges" 
        options={{ 
          title: 'Bridges', 
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon name={focused ? "business" : "business-outline"} color={color} focused={focused} /> 
        }} 
      />
    </Tabs>
  );
}

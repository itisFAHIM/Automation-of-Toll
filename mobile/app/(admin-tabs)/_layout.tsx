import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' }, 
      tabBarActiveTintColor: '#8b5cf6', 
      tabBarInactiveTintColor: '#64748b' 
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Admin', 
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="employees" 
        options={{ 
          title: 'Employees', 
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="bridges" 
        options={{ 
          title: 'Bridges', 
          tabBarIcon: ({ color }) => <Ionicons name="business" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}

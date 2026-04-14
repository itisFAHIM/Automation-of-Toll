import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EmployeeLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' }, 
      tabBarActiveTintColor: '#10b981', 
      tabBarInactiveTintColor: '#64748b' 
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Desk', 
          tabBarIcon: ({ color }) => <Ionicons name="briefcase" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="scanner" 
        options={{ 
          title: 'Scanner', 
          tabBarIcon: ({ color }) => <Ionicons name="scan" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="renewals" 
        options={{ 
          title: 'Requests', 
          tabBarIcon: ({ color }) => <Ionicons name="sync-circle-outline" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}

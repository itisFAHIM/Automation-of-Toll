import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Nav item definitions per role ────────────────────────────────────────────
const DRIVER_NAV = [
  { label: 'Home',         icon: 'home-outline',        activeIcon: 'home',              route: '/(tabs)/' },
  { label: 'Vehicles',     icon: 'car-sport-outline',   activeIcon: 'car-sport',         route: '/(tabs)/vehicles' },
  { label: 'Calculator',   icon: 'calculator-outline',  activeIcon: 'calculator',        route: '/(tabs)/calculator' },
  { label: 'Pay Toll',     icon: 'card-outline',        activeIcon: 'card',              route: '/pay-toll' },
  { label: 'My Passes',    icon: 'qr-code-outline',     activeIcon: 'qr-code',           route: '/passes' },
  { label: 'Trip History', icon: 'receipt-outline',     activeIcon: 'receipt',           route: '/history' },
  { label: 'Bridge Status',icon: 'map-outline',         activeIcon: 'map',               route: '/bridge-status' },
];

const EMPLOYEE_NAV = [
  { label: 'Desk',         icon: 'briefcase-outline',   activeIcon: 'briefcase',         route: '/(employee-tabs)/' },
  { label: 'Scanner',      icon: 'scan-outline',        activeIcon: 'scan',              route: '/(employee-tabs)/scanner' },
  { label: 'Requests',     icon: 'sync-circle-outline', activeIcon: 'sync-circle',       route: '/(employee-tabs)/renewals' },
];

const ADMIN_NAV = [
  { label: 'Dashboard',   icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark', route: '/(admin-tabs)/' },
  { label: 'Employees',   icon: 'people-outline',           activeIcon: 'people',           route: '/(admin-tabs)/employees' },
  { label: 'Bridges',     icon: 'business-outline',         activeIcon: 'business',         route: '/(admin-tabs)/bridges' },
  { label: 'Veh. Types',  icon: 'car-outline',              activeIcon: 'car',              route: '/(admin-tabs)/vehicle-types' },
  { label: 'Districts',   icon: 'location-outline',         activeIcon: 'location',         route: '/(admin-tabs)/districts' },
  { label: 'Approvals',   icon: 'clipboard-outline',        activeIcon: 'clipboard',        route: '/(admin-tabs)/vehicle-approvals' },
  { label: 'Revenue',     icon: 'bar-chart-outline',        activeIcon: 'bar-chart',        route: '/(admin-tabs)/revenue' },
];

// Accent colors per role
const ROLE_ACCENT: Record<string, string> = {
  driver:   '#38bdf8',
  employee: '#10b981',
  admin:    '#8b5cf6',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function WebSidebarLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [role,       setRole]       = useState<string>('driver');
  const [userName,   setUserName]   = useState<string>('User');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r    = await AsyncStorage.getItem('role')    || 'driver';
      const name = await AsyncStorage.getItem('username')|| 'User';
      const pic  = await AsyncStorage.getItem('profile_picture') || null;
      setRole(r.toLowerCase());
      setUserName(name);
      setProfilePic(pic);

      // Also try to fetch fresh profile data
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch('http://192.168.0.106:8000/api/users/profile/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
          setUserName(fullName || d.username || name);
          if (d.profile_picture) setProfilePic(d.profile_picture);
        }
      } catch {}
    })();
  }, []);

  const navItems = role === 'admin' ? ADMIN_NAV : role === 'employee' ? EMPLOYEE_NAV : DRIVER_NAV;
  const accent   = ROLE_ACCENT[role] || '#38bdf8';

  const isActive = (route: string) => {
    const clean = route.replace('/(tabs)/', '/(tabs)').replace('/(admin-tabs)/', '/(admin-tabs)').replace('/(employee-tabs)/', '/(employee-tabs)');
    return pathname === route || pathname.startsWith(clean) || pathname.includes(route.split('/').pop() || '');
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'role', 'username', 'profile_picture']);
    router.replace('/login');
  };

  return (
    <View style={styles.shell}>
      {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
      <View style={styles.sidebar}>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.brandIcon, { backgroundColor: `${accent}20`, borderColor: `${accent}40` }]}>
            <Ionicons name="shield-half-outline" size={22} color={accent} />
          </View>
          <View>
            <Text style={styles.brandName}>TollApp</Text>
            <Text style={[styles.brandRole, { color: accent }]}>
              {role.charAt(0).toUpperCase() + role.slice(1)} Portal
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        <View style={styles.navList}>
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navItem, active && { backgroundColor: `${accent}15` }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                {active && <View style={[styles.activeBar, { backgroundColor: accent }]} />}
                <View style={[styles.navIconWrap, active && { backgroundColor: `${accent}20` }]}>
                  <Ionicons
                    name={(active ? item.activeIcon : item.icon) as any}
                    size={18}
                    color={active ? accent : '#64748b'}
                  />
                </View>
                <Text style={[styles.navLabel, active && { color: accent, fontWeight: '700' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        <View style={styles.divider} />

        {/* User chip */}
        <View style={styles.userChip}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={[styles.avatar, { borderColor: accent }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: `${accent}40` }]}>
              <Ionicons name="person" size={16} color="#64748b" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.userRoleLabel}>{role}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <View style={styles.mainContent}>
        {children}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a1628',
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: '#0d1b2e',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandRole: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 0,
    marginVertical: 10,
  },
  navList: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 4,
  },
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },

  // User chip
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  userRoleLabel: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ef444415',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main content
  mainContent: {
    flex: 1,
    backgroundColor: '#0f172a',
    overflow: 'hidden' as any,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ChartTab = 'daily' | 'weekly' | 'monthly';

interface ChartDataPoint {
  label: string;
  value: number;
}

export default function TelemetryChart() {
  const [activeTab, setActiveTab] = useState<ChartTab>('daily');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  
  // Real Database values state
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<ChartDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);
  const [vehicleSplit, setVehicleSplit] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://192.168.0.106:8000/api/payments/analytics/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDailyData(data.daily || []);
        setWeeklyData(data.weekly || []);
        setMonthlyData(data.monthly || []);
        setVehicleSplit(data.vehicle_split || []);
      }
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const currentData = activeTab === 'daily' ? dailyData : activeTab === 'weekly' ? weeklyData : monthlyData;
  const maxValue = Math.max(...currentData.map(d => d.value), 1);

  // Animated heights array
  const animValues = useRef<Animated.Value[]>([]);

  useEffect(() => {
    // Reset selected bar on tab change
    setSelectedBar(null);

    // Initialize animated values to match data length
    animValues.current = currentData.map((_, i) => animValues.current[i] || new Animated.Value(0));

    // Run animations together
    const animations = currentData.map((d, index) => {
      const targetPercent = d.value / maxValue;
      return Animated.spring(animValues.current[index], {
        toValue: targetPercent,
        tension: 40,
        friction: 7,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [activeTab, currentData]);

  const handleBarPress = (index: number) => {
    Haptics.selectionAsync();
    setSelectedBar(selectedBar === index ? null : index);
  };

  if (loading) {
    return (
      <View style={[styles.chartCard, { height: 260, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12 }}>Loading dynamic charts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      {/* Chart Header */}
      <View style={styles.chartHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.chartTitle}>REVENUE ANALYTICS</Text>
          <Text style={styles.chartSubtitle}>Financial toll audit logs</Text>
        </View>
        
        {/* Chart Selector Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'daily' && styles.activeTabButton]}
            onPress={() => setActiveTab('daily')}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'weekly' && styles.activeTabButton]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>W</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'monthly' && styles.activeTabButton]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>M</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Bar Chart Visualization */}
      <View style={styles.barsWrapper}>
        {currentData.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 12 }}>No revenue collected for this period</Text>
          </View>
        ) : (
          <View style={styles.barsContainer}>
            {currentData.map((d, index) => {
              const isSelected = selectedBar === index;
              const barHeight = animValues.current[index] ? animValues.current[index].interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }) : '0%';

              return (
                <View key={d.label} style={styles.barColumn}>
                  {/* Floating tooltip popover for selected bar */}
                  {isSelected && (
                    <View style={styles.tooltipBox}>
                      <Text style={styles.tooltipText}>BDT {d.value.toLocaleString()}</Text>
                      <View style={styles.tooltipArrow} />
                    </View>
                  )}

                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => handleBarPress(index)}
                    style={styles.barTouchable}
                  >
                    <View style={styles.barTrackBg}>
                      <Animated.View style={[
                        styles.barFill, 
                        { height: barHeight },
                        isSelected && styles.selectedBarFill
                      ]} />
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.barLabel, isSelected && styles.selectedBarLabel]}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Dynamic Segmented Allocation Bar */}
      <View style={styles.allocationSection}>
        <Text style={styles.allocationTitle}>VEHICLE TYPE SEGMENTATION</Text>
        
        {/* Combined segmented bar */}
        <View style={styles.segmentedBar}>
          {vehicleSplit.map((v) => (
            <View 
              key={v.type} 
              style={[styles.segment, { width: `${v.percent}%`, backgroundColor: v.color }]} 
            />
          ))}
        </View>

        {/* Legend listing with metrics */}
        <View style={styles.legendGrid}>
          {vehicleSplit.map((v) => (
            <View key={v.type} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendIndicator, { backgroundColor: v.color }]} />
                <Text style={styles.legendName}>{v.type}</Text>
              </View>
              <Text style={styles.legendVal}>{v.percent}% ({v.count})</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155', width: '100%' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  chartTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  chartSubtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#334155' },
  tabButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#334155' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  activeTabText: { color: '#fff' },

  barsWrapper: { height: 160, justifyContent: 'flex-end', marginBottom: 24 },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', paddingHorizontal: 4 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' },
  barTouchable: { height: 110, width: 24, justifyContent: 'flex-end' },
  barTrackBg: { height: '100%', width: '100%', backgroundColor: '#0f172a', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b' },
  barFill: { width: '100%', backgroundColor: '#3b82f6', borderRadius: 12 },
  selectedBarFill: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10 },
  barLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 8 },
  selectedBarLabel: { color: '#10b981' },

  // Tooltip
  tooltipBox: { position: 'absolute', top: -38, backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, zIndex: 100, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5, borderWidth: 1, borderColor: '#334155' },
  tooltipText: { color: '#fff', fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  tooltipArrow: { width: 6, height: 6, backgroundColor: '#0f172a', transform: [{ rotate: '45deg' }], marginTop: -3, borderRightWidth: 1, borderBottomWidth: 1, borderRightColor: '#334155', borderBottomColor: '#334155' },

  // Allocation/Segmented styles
  allocationSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 20 },
  allocationTitle: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  segmentedBar: { height: 10, borderRadius: 5, backgroundColor: '#0f172a', overflow: 'hidden', flexDirection: 'row', width: '100%', marginBottom: 18 },
  segment: { height: '100%' },
  legendGrid: { gap: 10 },
  legendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendIndicator: { width: 8, height: 8, borderRadius: 4 },
  legendName: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  legendVal: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
});

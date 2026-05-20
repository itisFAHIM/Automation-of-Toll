import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export interface ChartPoint {
  label: string;
  value: number;
  subValue?: string;
}

interface DynamicDashboardChartProps {
  title: string;
  subtitle: string;
  points: ChartPoint[];
  accentColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64; // Adjusted to account for padding
const CHART_HEIGHT = 160;

export default function DynamicDashboardChart({
  title,
  subtitle,
  points,
  accentColor = '#3b82f6',
  valuePrefix = '',
  valueSuffix = '',
}: DynamicDashboardChartProps) {
  const [activeIndex, setActiveIndex] = useState<number>(points.length - 1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Triggers haptic tick when active index updates
  const selectPoint = (index: number) => {
    if (index !== activeIndex && index >= 0 && index < points.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIndex(index);
      
      // Bubble animation on selection
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1.0, duration: 150, useNativeDriver: true })
      ]).start();
    }
  };

  if (points.length === 0) {
    return (
      <View style={styles.cardEmpty}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Calculate scales
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const minValue = Math.min(...points.map((p) => p.value), 0);
  const valueRange = maxValue - minValue || 1;

  // Map coordinates to SVG coordinates
  const paddingX = 10;
  const paddingY = 20;
  const graphWidth = CHART_WIDTH - paddingX * 2;
  const graphHeight = CHART_HEIGHT - paddingY * 2;

  const coords = points.map((p, i) => {
    const x = paddingX + (i * graphWidth) / (points.length - 1);
    // Invert Y coordinate for SVG space (0 is top)
    const y = CHART_HEIGHT - paddingY - ((p.value - minValue) * graphHeight) / valueRange;
    return { x, y };
  });

  // Calculate Bezier path
  const getBezierPath = () => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath();

  // Closed path for under-curve gradient
  const fillPath = coords.length > 0 
    ? `${linePath} L ${coords[coords.length - 1].x} ${CHART_HEIGHT - paddingY} L ${coords[0].x} ${CHART_HEIGHT - paddingY} Z`
    : '';

  const activePoint = points[activeIndex];
  const activeCoord = coords[activeIndex];

  return (
    <View style={styles.card}>
      {/* Chart Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Animated.View style={[styles.activeValueContainer, { opacity: fadeAnim }]}>
          <Text style={[styles.activeValue, { color: accentColor }]}>
            {valuePrefix}{activePoint.value.toLocaleString()}{valueSuffix}
          </Text>
          <Text style={styles.activeLabel}>{activePoint.label} {activePoint.subValue ? `(${activePoint.subValue})` : ''}</Text>
        </Animated.View>
      </View>

      {/* SVG Canvas Area */}
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Dash Grid Lines */}
          <Line x1={paddingX} y1={paddingY} x2={CHART_WIDTH - paddingX} y2={paddingY} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={paddingX} y1={CHART_HEIGHT / 2} x2={CHART_WIDTH - paddingX} y2={CHART_HEIGHT / 2} stroke="#334155" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={paddingX} y1={CHART_HEIGHT - paddingY} x2={CHART_WIDTH - paddingX} y2={CHART_HEIGHT - paddingY} stroke="#334155" strokeWidth={1} />

          {/* Under-curve dynamic gradient area */}
          {fillPath ? <Path d={fillPath} fill="url(#areaGradient)" /> : null}

          {/* Smooth vector Bezier path curve */}
          {linePath ? <Path d={linePath} fill="none" stroke={accentColor} strokeWidth={3} /> : null}

          {/* Interactive Tooltip Vertical Guideline */}
          {activeCoord && (
            <Line
              x1={activeCoord.x}
              y1={paddingY}
              x2={activeCoord.x}
              y2={CHART_HEIGHT - paddingY}
              stroke={accentColor}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          )}

          {/* Data Coordinate Markers / Interactive Tap Targets */}
          {coords.map((c, i) => {
            const isActive = i === activeIndex;
            return (
              <Circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={isActive ? 6 : 3}
                fill={isActive ? '#fff' : accentColor}
                stroke={accentColor}
                strokeWidth={isActive ? 3 : 0}
              />
            );
          })}
        </Svg>

        {/* Dynamic Tooltip Float Indicator */}
        {activeCoord && (
          <View style={[styles.floatTooltip, { left: Math.max(10, Math.min(CHART_WIDTH - 110, activeCoord.x - 50)) }]}>
            <Text style={styles.tooltipText}>{valuePrefix}{activePoint.value}{valueSuffix}</Text>
          </View>
        )}
      </View>

      {/* Interactive Bottom Timeline Tap Selection */}
      <View style={styles.timelineRow}>
        {points.map((p, i) => {
          const isActive = i === activeIndex;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => selectPoint(i)}
              style={[
                styles.timelineButton,
                isActive && { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }
              ]}
            >
              <Text style={[styles.timelineText, isActive && { color: accentColor, fontWeight: '800' }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  cardEmpty: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2
  },
  activeValueContainer: {
    alignItems: 'flex-end'
  },
  activeValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace'
  },
  activeLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2
  },
  chartWrapper: {
    height: CHART_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  floatTooltip: {
    position: 'absolute',
    top: 5,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4
  },
  tooltipText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace'
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#33415550',
    paddingTop: 14
  },
  timelineButton: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  timelineText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600'
  }
});

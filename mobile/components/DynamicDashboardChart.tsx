/**
 * DynamicDashboardChart — Pure React Native Views, zero react-native-svg.
 * Works on Expo Go (mobile) AND Expo Web (browser).
 * Uses onLayout to measure real width so it fits correctly inside any container.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
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

const CHART_HEIGHT = 160;
const PADDING_X = 14;
const PADDING_Y = 22;
const BEZIER_STEPS = 40;

function cubicBezier(
  p0: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p1.y,
  };
}

export default function DynamicDashboardChart({
  title,
  subtitle,
  points,
  accentColor = '#3b82f6',
  valuePrefix = '',
  valueSuffix = '',
}: DynamicDashboardChartProps) {
  const [activeIndex, setActiveIndex] = useState<number>(points.length - 1);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const selectPoint = (index: number) => {
    if (index !== activeIndex && index >= 0 && index < points.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIndex(index);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
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

  // Wait until we have a real measured width before drawing
  const CHART_WIDTH = chartWidth > 0 ? chartWidth : 0;

  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const minValue = Math.min(...points.map((p) => p.value), 0);
  const valueRange = maxValue - minValue || 1;

  const graphWidth = CHART_WIDTH - PADDING_X * 2;
  const graphHeight = CHART_HEIGHT - PADDING_Y * 2;

  const coords =
    CHART_WIDTH > 0
      ? points.map((p, i) => ({
          x: PADDING_X + (i * graphWidth) / Math.max(points.length - 1, 1),
          y:
            CHART_HEIGHT -
            PADDING_Y -
            ((p.value - minValue) * graphHeight) / valueRange,
        }))
      : [];

  // Build Bezier line segments and fill strip data
  const lineSegments: { x: number; y: number; width: number; angle: number }[] = [];
  const fillPoints: { x: number; y: number }[] = [];

  for (let seg = 0; seg < coords.length - 1; seg++) {
    const p0 = coords[seg];
    const p1 = coords[seg + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;

    for (let step = 0; step < BEZIER_STEPS; step++) {
      const t0 = step / BEZIER_STEPS;
      const t1 = (step + 1) / BEZIER_STEPS;
      const a = cubicBezier(p0, { x: cpX1, y: p0.y }, { x: cpX2, y: p1.y }, p1, t0);
      const b = cubicBezier(p0, { x: cpX1, y: p0.y }, { x: cpX2, y: p1.y }, p1, t1);

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      lineSegments.push({ x: a.x, y: a.y, width: length + 0.5, angle });
      if (step === 0) fillPoints.push(a);
    }
  }
  if (coords.length > 0) fillPoints.push(coords[coords.length - 1]);

  const bottomY = CHART_HEIGHT - PADDING_Y;
  const areaStrips: { x: number; y: number; height: number }[] = [];
  for (let i = 0; i < fillPoints.length - 1; i++) {
    const a = fillPoints[i];
    const b = fillPoints[i + 1];
    const midY = (a.y + b.y) / 2;
    const stripWidth = b.x - a.x;
    if (stripWidth > 0) {
      areaStrips.push({ x: a.x, y: midY, height: bottomY - midY });
    }
  }

  const activePoint = points[activeIndex];
  const activeCoord = coords[activeIndex];
  const tooltipLeft = activeCoord
    ? Math.max(10, Math.min(CHART_WIDTH - 110, activeCoord.x - 44))
    : 10;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Animated.View style={[styles.activeValueContainer, { opacity: fadeAnim }]}>
          <Text style={[styles.activeValue, { color: accentColor }]}>
            {valuePrefix}{activePoint.value.toLocaleString()}{valueSuffix}
          </Text>
          <Text style={styles.activeLabel}>
            {activePoint.label}{activePoint.subValue ? ` (${activePoint.subValue})` : ''}
          </Text>
        </Animated.View>
      </View>

      {/* Chart canvas — measured via onLayout */}
      <View
        style={[styles.chartWrapper, { height: CHART_HEIGHT }]}
        onLayout={onLayout}
      >
        {CHART_WIDTH > 0 && (
          <>
            {/* Grid lines */}
            {[PADDING_Y, CHART_HEIGHT / 2].map((yPos, gi) => (
              <View
                key={gi}
                style={{
                  position: 'absolute',
                  left: PADDING_X,
                  top: yPos,
                  width: graphWidth,
                  height: 1,
                  borderStyle: 'dashed' as any,
                  borderTopWidth: 1,
                  borderTopColor: '#334155',
                  opacity: 0.5,
                }}
              />
            ))}
            {/* Solid baseline */}
            <View
              style={{
                position: 'absolute',
                left: PADDING_X,
                top: CHART_HEIGHT - PADDING_Y,
                width: graphWidth,
                height: 1,
                backgroundColor: '#334155',
              }}
            />

            {/* Area fill strips */}
            {areaStrips.map((strip, i) => {
              const stripW = CHART_WIDTH / Math.max(fillPoints.length, 1) + 1;
              const opacity = 0.03 + 0.12 * (i / areaStrips.length);
              return (
                <View
                  key={`fill-${i}`}
                  style={{
                    position: 'absolute',
                    left: strip.x,
                    top: strip.y,
                    width: stripW,
                    height: Math.max(0, strip.height),
                    backgroundColor: accentColor,
                    opacity,
                  }}
                />
              );
            })}

            {/* Bezier line segments */}
            {lineSegments.map((seg, i) => (
              <View
                key={`seg-${i}`}
                style={{
                  position: 'absolute',
                  left: seg.x,
                  top: seg.y - 1.5,
                  width: seg.width,
                  height: 3,
                  backgroundColor: accentColor,
                  borderRadius: 2,
                  transform: [{ rotate: `${seg.angle}deg` }],
                  transformOrigin: '0 50%' as any,
                }}
              />
            ))}

            {/* Active vertical guide */}
            {activeCoord && (
              <View
                style={{
                  position: 'absolute',
                  left: activeCoord.x,
                  top: PADDING_Y,
                  width: 1,
                  height: graphHeight,
                  backgroundColor: accentColor,
                  opacity: 0.4,
                }}
              />
            )}

            {/* Data dots */}
            {coords.map((c, i) => {
              const isActive = i === activeIndex;
              const size = isActive ? 12 : 6;
              return (
                <View
                  key={`dot-${i}`}
                  style={{
                    position: 'absolute',
                    left: c.x - size / 2,
                    top: c.y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isActive ? '#fff' : accentColor,
                    borderWidth: isActive ? 3 : 0,
                    borderColor: accentColor,
                  }}
                />
              );
            })}

            {/* Floating tooltip */}
            {activeCoord && (
              <View
                style={[
                  styles.floatTooltip,
                  { left: tooltipLeft, top: Math.max(4, activeCoord.y - 26) },
                ]}
              >
                <Text style={styles.tooltipText}>
                  {valuePrefix}{activePoint.value.toLocaleString()}{valueSuffix}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Timeline buttons */}
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
                isActive && {
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}50`,
                },
              ]}
            >
              <Text
                style={[
                  styles.timelineText,
                  isActive && { color: accentColor, fontWeight: '800' },
                ]}
              >
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
    elevation: 8,
  },
  cardEmpty: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: { color: '#64748b', fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  activeValueContainer: { alignItems: 'flex-end' },
  activeValue: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace' },
  activeLabel: { color: '#64748b', fontSize: 10, marginTop: 2 },
  chartWrapper: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    marginBottom: 2,
  },
  floatTooltip: {
    position: 'absolute',
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
    elevation: 4,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#33415550',
    paddingTop: 14,
  },
  timelineButton: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timelineText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
});

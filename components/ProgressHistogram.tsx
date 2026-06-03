import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { ProgressRecord } from '@/types/database';

const CARD_PADDING = 48;
const Y_AXIS_WIDTH = 36;
const BAR_MIN_WIDTH = 20;
const BAR_GAP = 8;

function calcScore(r: ProgressRecord): number {
  if (r.performance_score !== undefined) return r.performance_score;
  if (r.teacher_practice_rating > 0) {
    const teacherScore = (r.teacher_practice_rating / 5) * 100;
    return Math.round(
      teacherScore * 0.5 + (r.practice_score ?? 0) * 0.3 + (r.homework_completion ?? 0) * 0.2
    );
  }
  return 0;
}

interface Props {
  records: ProgressRecord[];
}

const CHART_HEIGHT = 160;
const Y_LABELS = [0, 25, 50, 75, 100];

function getBarColor(score: number): string {
  if (score >= 90) return '#16a34a';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs Practice';
  return 'Needs Attention';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProgressHistogram({ records }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  const sorted = [...records]
    .filter(r => calcScore(r) > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-8);

  if (sorted.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>
          Add progress records to see your growth chart
        </Text>
      </View>
    );
  }

  const availableWidth = screenWidth - CARD_PADDING - Y_AXIS_WIDTH;
  const totalGaps = (sorted.length - 1) * BAR_GAP;
  const barWidth = Math.max(
    Math.floor((availableWidth - totalGaps) / sorted.length),
    BAR_MIN_WIDTH
  );
  const chartWidth = sorted.length * barWidth + totalGaps;
  const selectedRecord = selectedIndex !== null ? sorted[selectedIndex] : null;

  return (
    <View>

      {selectedRecord ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailDate}>
              {formatFullDate(selectedRecord.created_at)}
            </Text>
            <Text style={[
              styles.detailLabel,
              { color: getBarColor(calcScore(selectedRecord)) }
            ]}>
              {getLabel(calcScore(selectedRecord))}
            </Text>
          </View>

          <View style={styles.detailScore}>
            <Text style={[
              styles.detailScoreNumber,
              { color: getBarColor(calcScore(selectedRecord)) }
            ]}>
              {calcScore(selectedRecord)}
            </Text>
            <Text style={styles.detailScoreMax}>/100</Text>
          </View>

          <View style={styles.breakdownContainer}>
            <BreakdownRow
              label="Teacher Rating"
              value={selectedRecord.teacher_practice_rating ?? 0}
              max={5}
              displayValue={`${selectedRecord.teacher_practice_rating ?? 0}/5`}
              color="#6366f1"
            />
            <BreakdownRow
              label="Practice"
              value={selectedRecord.practice_score ?? 0}
              max={100}
              displayValue={`${selectedRecord.practice_score ?? 0}%`}
              color="#3b82f6"
            />
            <BreakdownRow
              label="Homework"
              value={selectedRecord.homework_completion ?? 0}
              max={100}
              displayValue={`${selectedRecord.homework_completion ?? 0}%`}
              color="#10b981"
            />
          </View>

          {selectedRecord.notes ? (
            <Text style={styles.detailNote}>"{selectedRecord.notes}"</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap a bar to see details</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScroll}>

        <View style={styles.yAxis}>
          {[...Y_LABELS].reverse().map(val => (
            <Text key={val} style={styles.yLabel}>{val}</Text>
          ))}
        </View>

        <Svg
          width={Math.max(chartWidth, 200)}
          height={CHART_HEIGHT + 40}>

          {Y_LABELS.map(val => {
            const y = CHART_HEIGHT - (val / 100) * CHART_HEIGHT;
            return (
              <Line
                key={val}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
                strokeDasharray={val === 0 ? '0' : '4,4'}
              />
            );
          })}

          {sorted.map((record, index) => {
            const score = calcScore(record);
            const barHeight = (score / 100) * CHART_HEIGHT;
            const x = index * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - barHeight;
            const color = getBarColor(score);
            const isSelected = selectedIndex === index;

            return (
              <G key={record.id}>
                <Rect
                  x={x}
                  y={0}
                  width={barWidth}
                  height={CHART_HEIGHT}
                  fill="rgba(255,255,255,0.05)"
                  rx={6}
                />

                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={isSelected ? color : color + 'cc'}
                  rx={6}
                  onPress={() =>
                    setSelectedIndex(isSelected ? null : index)
                  }
                />

                {score > 15 && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y + 14}
                    fill="white"
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle">
                    {score}
                  </SvgText>
                )}

                {isSelected && (
                  <Rect
                    x={x + barWidth / 2 - 3}
                    y={CHART_HEIGHT + 6}
                    width={6}
                    height={6}
                    fill="white"
                    rx={3}
                  />
                )}

                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 24}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={9}
                  textAnchor="middle">
                  {formatDate(record.created_at)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      <View style={styles.legend}>
        {[
          { color: '#16a34a', label: 'Excellent (90-100)' },
          { color: '#3b82f6', label: 'Good (75-89)' },
          { color: '#f59e0b', label: 'Needs Practice (60-74)' },
          { color: '#ef4444', label: 'Needs Attention (0-59)' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

    </View>
  );
}

function BreakdownRow({
  label, value, max, displayValue, color
}: {
  label: string;
  value: number;
  max: number;
  displayValue: string;
  color: string;
}) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownBarBg}>
        <View style={[
          styles.breakdownBarFill,
          { width: `${percent}%` as any, backgroundColor: color }
        ]} />
      </View>
      <Text style={styles.breakdownValue}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noDataContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noDataText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
  tapHint: {
    alignItems: 'center',
    marginBottom: 12,
  },
  tapHintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  detailScoreNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  detailScoreMax: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginLeft: 4,
  },
  detailNote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
  },
  breakdownContainer: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    width: 100,
  },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownValue: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  chartScroll: {
    paddingBottom: 4,
  },
  yAxis: {
    height: CHART_HEIGHT + 40,
    justifyContent: 'space-between',
    paddingBottom: 28,
    marginRight: 6,
  },
  yLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    textAlign: 'right',
    width: Y_AXIS_WIDTH - 6,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '50%',
    marginBottom: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
});

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Market, Category } from '@/types';
import { MONTH_LABELS, CHART_COLORS } from '@/types';
import { getParticipantsByMarketCategory, getCapitalRecordsByMarketCategory, getCompetitionConfig } from '@/lib/dataStore';

interface PerformanceChartProps {
  market: Market;
  category: Category;
  months: number[];
  showAllMonths?: boolean;
}

interface ChartDataPoint {
  month: string;
  [key: string]: string | number;
}

export default function PerformanceChart({
  market,
  category,
  months,
  showAllMonths = true,
}: PerformanceChartProps) {
  const config = getCompetitionConfig();
  const participants = getParticipantsByMarketCategory(market, category);
  const allRecords = getCapitalRecordsByMarketCategory(market, category);
  const initialCapital = config.initialCapital[market];

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const displayMonths = showAllMonths ? months : months.slice(0, 1);
    return displayMonths.map((month) => {
      const point: ChartDataPoint = { month: MONTH_LABELS[month] || `${month}月` };
      participants.forEach((p) => {
        const record = allRecords.find(
          (r) => r.participantId === p.id && r.month === month
        );
        point[p.name] = record ? record.capital : initialCapital;
      });
      return point;
    });
  }, [participants, allRecords, months, showAllMonths, initialCapital]);

  const formatCurrency = (value: number) => {
    if (market === 'A_SHARES') {
      return `¥${value.toLocaleString()}`;
    }
    return `$${value.toLocaleString()}`;
  };

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, initialCapital * 2];
    let min = initialCapital;
    let max = initialCapital;
    chartData.forEach((point) => {
      participants.forEach((p) => {
        const val = Number(point[p.name]) || initialCapital;
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });
    const padding = (max - min) * 0.1;
    return [Math.max(0, Math.round(min - padding)), Math.round(max + padding)];
  }, [chartData, participants, initialCapital]);

  if (participants.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-4">
        <img src="/empty-state.svg" alt="No data" className="h-32 w-32 opacity-40" />
        <p className="text-sm" style={{ color: '#94A3B8' }}>暂无数据</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#64748B' }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            market === 'A_SHARES'
              ? `¥${(v / 10000).toFixed(0)}万`
              : `$${(v / 1000).toFixed(0)}K`
          }
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatCurrency(value), '']}
          labelStyle={{ color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine
          y={initialCapital}
          stroke="#94A3B8"
          strokeDasharray="6 4"
          strokeWidth={1}
          label={{
            value: '起始资金',
            position: 'insideTopRight',
            style: { fontSize: 10, fill: '#94A3B8' },
          }}
        />
        {participants.map((p, idx) => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={p.name}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

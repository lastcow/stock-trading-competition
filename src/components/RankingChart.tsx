import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { MonthlyRankingItem } from '@/types';

interface RankingChartProps {
  data: MonthlyRankingItem[];
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#D97706'];
const DEFAULT_COLOR = '#4F46E5';

export default function RankingChart({ data }: Omit<RankingChartProps, 'market'>) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({
        name: item.participantName,
        return: parseFloat(item.totalReturn.toFixed(2)),
        change: parseFloat(item.changePercent.toFixed(2)),
        rank: item.rank,
        color: item.rank <= 3 ? RANK_COLORS[item.rank - 1] : DEFAULT_COLOR,
      }));
  }, [data]);

  const formatValue = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center gap-4">
        <img src="/empty-state.svg" alt="No data" className="h-24 w-24 opacity-40" />
        <p className="text-sm" style={{ color: '#94A3B8' }}>暂无排名数据</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 60, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'return') return [formatValue(value), '累计收益率'];
            if (name === 'change') return [formatValue(value), '月度变动率'];
            return [value, name];
          }}
          labelStyle={{ color: '#0F172A', fontWeight: 600 }}
        />
        <ReferenceLine x={0} stroke="#E2E8F0" />
        <Bar dataKey="return" radius={[0, 6, 6, 0]} barSize={24} animationDuration={600}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.return >= 0 ? '#059669' : '#DC2626'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

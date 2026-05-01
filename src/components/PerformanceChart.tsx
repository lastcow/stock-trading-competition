import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { RankingItem } from "@/types";

const COLORS = ["#4F46E5", "#059669", "#DC2626", "#D97706", "#6366F1", "#0891B2", "#BE185D", "#65A30D"];

interface PerformanceChartProps {
  data: RankingItem[];
  initialCapital: number;
}

const labelFor = (item: RankingItem) => item.code ?? `#${item.participantId}`;

export default function PerformanceChart({ data, initialCapital }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    const xAxisPoints: Array<{ label: string; month?: number }> = [
      { label: "4月初" },
      { label: "4月底", month: 4 },
      { label: "5月底", month: 5 },
      { label: "6月底", month: 6 },
      { label: "7月底", month: 7 },
      { label: "8月底", month: 8 },
      { label: "9月底", month: 9 },
    ];

    return xAxisPoints.map((pt) => {
      const entry: Record<string, number | string | null> = { label: pt.label };
      data.forEach((item) => {
        const key = labelFor(item);
        if (pt.month === undefined) {
          // Starting point shared by everyone.
          entry[key] = initialCapital;
        } else {
          const record = item.monthRecords.find((r) => r.month === pt.month);
          entry[key] = record ? record.capital : null;
        }
      });
      return entry;
    });
  }, [data, initialCapital]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <img src="/empty-state.svg" alt="No data" className="mb-4 h-24 w-24 opacity-40" />
        <p className="text-sm" style={{ color: "#94A3B8" }}>暂无数据</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 10000).toFixed(0)}万`;
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
    return value.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={formatCurrency} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
          formatter={(value: number) => [formatCurrency(value), ""]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {data.slice(0, 8).map((item, idx) => (
          <Line
            key={item.participantId}
            type="monotone"
            dataKey={labelFor(item)}
            stroke={COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

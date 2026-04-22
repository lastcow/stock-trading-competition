import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { RankingItem } from "@/types";
import { MONTH_LABELS } from "@/types";

const COLORS = ["#4F46E5", "#059669", "#DC2626", "#D97706", "#6366F1", "#0891B2", "#BE185D", "#65A30D"];

interface PerformanceChartProps {
  data: RankingItem[];
  initialCapital: number;
}

export default function PerformanceChart({ data, initialCapital }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    const months = [4, 5, 6, 7, 8, 9];
    return months.map((m) => {
      const entry: Record<string, number | string> = { month: MONTH_LABELS[m], monthNum: m };
      data.forEach((item) => {
        const record = item.monthRecords.find((r) => r.month === m);
        entry[item.participantName] = record ? record.capital : initialCapital;
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
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
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
            dataKey={item.participantName}
            stroke={COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

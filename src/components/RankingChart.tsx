import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { RankingItem } from "@/types";

interface RankingChartProps {
  data: RankingItem[];
}

export default function RankingChart({ data }: RankingChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({
        name: item.participantName,
        return: Number(item.totalReturn.toFixed(2)),
        change: Number(item.changePercent.toFixed(2)),
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <img src="/empty-state.svg" alt="No data" className="mb-4 h-24 w-24 opacity-40" />
        <p className="text-sm" style={{ color: "#94A3B8" }}>暂无数据</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} unit="%" />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748B" }} width={80} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
          formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value}%`, "收益率"]}
        />
        <Bar dataKey="return" radius={[0, 6, 6, 0]} barSize={20}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.return >= 0 ? "#059669" : "#DC2626"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

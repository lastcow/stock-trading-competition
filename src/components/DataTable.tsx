import { useState } from "react";

interface Column<T> {
  key: string;
  title: string;
  align?: "left" | "right" | "center";
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortKey?: (item: T) => number | string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  rankAccessor?: (item: T) => number;
}

export default function DataTable<T>({ columns, data, keyExtractor, rankAccessor }: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedData = [...data];
  if (sortCol) {
    const col = columns.find((c) => c.key === sortCol);
    if (col?.sortable && col.sortKey) {
      sortedData.sort((a, b) => {
        const av = col.sortKey!(a);
        const bv = col.sortKey!(b);
        return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
    if (rank === 2) return { bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1" };
    if (rank === 3) return { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" };
    return null;
  };

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "#F1F5F9" }}>
            {rankAccessor && (
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B", width: 60 }}>
                排名
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                style={{ color: "#64748B", cursor: col.sortable ? "pointer" : "default" }}
                onClick={() => {
                  if (col.sortable) {
                    setSortCol(col.key);
                    setSortDir(sortCol === col.key && sortDir === "desc" ? "asc" : "desc");
                  }
                }}
              >
                {col.title} {col.sortable && sortCol === col.key ? (sortDir === "desc" ? "▼" : "▲") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, idx) => {
            const rank = rankAccessor ? rankAccessor(item) : 0;
            const rankStyle = getRankStyle(rank);
            return (
              <tr
                key={keyExtractor(item)}
                className="border-b transition-colors hover:bg-slate-50"
                style={{ borderColor: "#F1F5F9" }}
              >
                {rankAccessor && (
                  <td className="px-4 py-3 text-center">
                    {rankStyle ? (
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: rankStyle.bg, color: rankStyle.color, border: `1px solid ${rankStyle.border}` }}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="text-sm font-medium" style={{ color: "#64748B" }}>{rank}</span>
                    )}
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                    style={{ color: "#1E293B" }}
                  >
                    {col.render(item, idx)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export type { Column };

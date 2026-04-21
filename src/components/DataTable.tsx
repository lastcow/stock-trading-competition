import { useState, useCallback } from 'react';

export interface Column<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortKey?: (item: T) => number | string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  rankAccessor?: (item: T) => number;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  rankAccessor,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback(
    (col: Column<T>) => {
      if (!col.sortable || !col.sortKey) return;
      if (sortColumn === col.key) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(col.key);
        setSortDirection('desc');
      }
    },
    [sortColumn]
  );

  const sortedData = [...data];
  if (sortColumn) {
    const col = columns.find((c) => c.key === sortColumn);
    if (col?.sortKey) {
      sortedData.sort((a, b) => {
        const aVal = col.sortKey!(a);
        const bVal = col.sortKey!(b);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortDirection === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
  }

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return { background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A' };
    if (rank === 2) return { background: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' };
    if (rank === 3) return { background: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' };
    return null;
  };

  const renderRankBadge = (rank: number) => {
    const style = getRankBadgeStyle(rank);
    if (!style) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ color: '#64748B' }}>
          {rank}
        </span>
      );
    }
    return (
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold"
        style={{ background: style.background, color: style.color, borderColor: style.borderColor }}
      >
        {rank}
      </span>
    );
  };

  return (
    <div
      className="w-full overflow-x-auto rounded-xl border"
      style={{ borderColor: '#E2E8F0' }}
    >
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {rankAccessor && (
              <th
                className="px-4 py-3 text-center text-xs font-semibold uppercase"
                style={{ width: '60px', color: '#64748B', letterSpacing: '0.04em' }}
              >
                排名
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase ${col.sortable ? 'cursor-pointer select-none hover:text-[#0F172A]' : ''}`}
                style={{
                  width: col.width,
                  color: '#64748B',
                  letterSpacing: '0.04em',
                  textAlign: col.align || 'left',
                }}
                onClick={() => handleSort(col)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.title}
                  {col.sortable && sortColumn === col.key && (
                    <span className="text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, rowIndex) => (
            <tr
              key={keyExtractor(item)}
              className="transition-colors hover:bg-[#F1F5F9]"
              style={{
                background: rowIndex % 2 === 1 ? '#FAFBFC' : 'transparent',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              {rankAccessor && (
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {renderRankBadge(rankAccessor(item))}
                  </div>
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-sm"
                  style={{
                    textAlign: col.align || 'left',
                    color: '#1E293B',
                  }}
                >
                  {col.render(item, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

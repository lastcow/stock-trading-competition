import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  suffix?: string;
  decimals?: number;
}

export default function StatCard({ label, value, subtext, icon, suffix, decimals = 0 }: StatCardProps) {
  const displayValue = typeof value === "number"
    ? value.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : value;

  return (
    <div
      className="rounded-2xl border p-5 transition-all hover:shadow-md"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(226, 232, 240, 0.8)",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#94A3B8" }}>
            {label}
          </span>
          <span className="text-2xl font-bold" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
            {displayValue}{suffix ? <span className="ml-1 text-lg">{suffix}</span> : null}
          </span>
          {subtext && (
            <span className="text-xs font-medium" style={{ color: "#64748B" }}>{subtext}</span>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#F1F5F9" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

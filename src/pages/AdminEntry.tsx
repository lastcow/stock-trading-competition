import { useState, useMemo, useCallback } from "react";
import { Navigate, Link } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/providers/trpc";
import {
  MARKET_CATEGORY_COMBINATIONS,
  MARKET_LABELS,
  CATEGORY_LABELS,
  MONTH_LABELS,
  MONTHS,
  type Market,
} from "@/types";
import { Save, ArrowLeft, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminEntry() {
  const { isAdmin, isLoading } = useAuthContext();
  const utils = trpc.useUtils();

  const initialMonth = useMemo(() => {
    const m = new Date().getMonth() + 1;
    return m >= 4 && m <= 9 ? m : 4;
  }, []);
  const [month, setMonth] = useState<number>(initialMonth);
  // Inputs keyed by `${groupIdx}:${participantId}` so the same participant
  // can have separate values per market section.
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: config } = trpc.competition.get.useQuery();

  const q0 = trpc.capital.rankings.useQuery({
    market: MARKET_CATEGORY_COMBINATIONS[0].market,
    type: MARKET_CATEGORY_COMBINATIONS[0].category,
    month: "overall",
  });
  const q1 = trpc.capital.rankings.useQuery({
    market: MARKET_CATEGORY_COMBINATIONS[1].market,
    type: MARKET_CATEGORY_COMBINATIONS[1].category,
    month: "overall",
  });
  const q2 = trpc.capital.rankings.useQuery({
    market: MARKET_CATEGORY_COMBINATIONS[2].market,
    type: MARKET_CATEGORY_COMBINATIONS[2].category,
    month: "overall",
  });
  const q3 = trpc.capital.rankings.useQuery({
    market: MARKET_CATEGORY_COMBINATIONS[3].market,
    type: MARKET_CATEGORY_COMBINATIONS[3].category,
    month: "overall",
  });
  const groupQueries = [q0, q1, q2, q3];

  const batchSave = trpc.capital.batchSave.useMutation({
    onSuccess: (results) => {
      utils.capital.rankings.invalidate();
      utils.capital.byMarketCategory.invalidate();
      utils.capital.byParticipant.invalidate();
      setStatus({ type: "success", text: `已保存 ${results.length} 条记录` });
      setInputs({});
      setTimeout(() => setStatus(null), 4000);
    },
    onError: (err) => {
      setStatus({ type: "error", text: `保存失败：${err.message}` });
      setTimeout(() => setStatus(null), 6000);
    },
  });

  const handleSaveAll = useCallback(() => {
    const entries = Object.entries(inputs)
      .map(([key, val]) => {
        const [groupIdx, pid] = key.split(":");
        const combo = MARKET_CATEGORY_COMBINATIONS[Number(groupIdx)];
        return {
          participantId: Number(pid),
          market: combo.market,
          month,
          capital: Number(val),
        };
      })
      .filter((e) => !isNaN(e.capital) && e.capital > 0);

    if (entries.length === 0) {
      setStatus({ type: "error", text: "请至少输入一项资金数额" });
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    batchSave.mutate(entries);
  }, [inputs, month, batchSave]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const getInitialCapital = (market: Market) =>
    market === "A_SHARES"
      ? Number(config?.initialCapitalAshare ?? 1000000)
      : Number(config?.initialCapitalUs ?? 1000000);

  const fmtCurrency = (value: number, market: Market) => {
    const symbol = market === "A_SHARES" ? "¥" : "$";
    return `${symbol}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const unsavedCount = Object.values(inputs).filter(
    (v) => v && !isNaN(Number(v)) && Number(v) > 0
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-6 py-4"
        style={{ borderColor: "#E2E8F0" }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100"
            style={{ color: "#64748B" }}
          >
            <ArrowLeft size={16} /> 返回
          </Link>
          <h1 className="text-xl font-bold" style={{ color: "#0F172A" }}>
            月度资金录入
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "#E2E8F0" }}>
            <Calendar size={16} style={{ color: "#64748B" }} />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border-0 bg-transparent text-sm outline-none"
              style={{ color: "#0F172A" }}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {MONTH_LABELS[m]} 月末
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={batchSave.isPending || unsavedCount === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#4F46E5" }}
          >
            <Save size={16} />
            {batchSave.isPending ? "保存中..." : `保存全部 (${unsavedCount})`}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {status && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
          style={{
            background: status.type === "success" ? "#ECFDF5" : "#FEF2F2",
            borderColor: status.type === "success" ? "#A7F3D0" : "#FECACA",
            color: status.type === "success" ? "#059669" : "#DC2626",
          }}
        >
          {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.text}
        </div>
      )}

      {/* Groups */}
      {MARKET_CATEGORY_COMBINATIONS.map((combo, idx) => {
        const q = groupQueries[idx];
        const rankings = q.data ?? [];
        const initialCapital = getInitialCapital(combo.market);

        return (
          <section
            key={`${combo.market}-${combo.category}`}
            className="overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h2 className="text-base font-semibold" style={{ color: "#0F172A" }}>
                {MARKET_LABELS[combo.market]} · {CATEGORY_LABELS[combo.category]}
              </h2>
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>
                {rankings.length} 位参赛者
              </span>
            </div>
            {q.isLoading ? (
              <div className="p-6 text-center text-sm" style={{ color: "#94A3B8" }}>
                加载中...
              </div>
            ) : rankings.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#94A3B8" }}>
                暂无参赛者
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                        姓名 / 团队
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                        起始资金
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                        上月资金
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                        {MONTH_LABELS[month]} 资金
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                        盈亏
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r) => {
                      const inputKey = `${idx}:${r.participantId}`;
                      const existingRecord = r.monthRecords.find((mr) => mr.month === month);
                      const prevRecord = r.monthRecords
                        .filter((mr) => mr.month < month)
                        .sort((a, b) => b.month - a.month)[0];
                      const prevCapital = prevRecord?.capital ?? initialCapital;
                      const typed = inputs[inputKey] ?? "";
                      const typedNum = Number(typed);
                      const validTyped = typed !== "" && !isNaN(typedNum) && typedNum > 0;
                      const displayedNew = validTyped
                        ? typedNum
                        : existingRecord?.capital ?? null;
                      const change = displayedNew != null ? displayedNew - prevCapital : null;

                      return (
                        <tr key={r.participantId} className="border-b" style={{ borderColor: "#F1F5F9" }}>
                          <td className="px-4 py-3 font-medium" style={{ color: "#0F172A" }}>
                            {r.participantName}
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: "#94A3B8" }}>
                            {fmtCurrency(initialCapital, combo.market)}
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: "#64748B" }}>
                            {fmtCurrency(prevCapital, combo.market)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={existingRecord ? String(existingRecord.capital) : "输入金额"}
                              value={typed}
                              onChange={(e) =>
                                setInputs((prev) => ({ ...prev, [inputKey]: e.target.value }))
                              }
                              className="w-36 rounded-lg border px-3 py-1.5 text-right text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
                              style={{ borderColor: "#E2E8F0" }}
                            />
                          </td>
                          <td
                            className="px-4 py-3 text-right font-medium"
                            style={{
                              color:
                                change == null ? "#CBD5E1" : change >= 0 ? "#059669" : "#DC2626",
                            }}
                          >
                            {change == null
                              ? "-"
                              : `${change >= 0 ? "+" : ""}${fmtCurrency(change, combo.market)}`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {validTyped ? (
                              <span
                                className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{ background: "#EEF2FF", color: "#4F46E5" }}
                              >
                                待保存
                              </span>
                            ) : existingRecord ? (
                              <span
                                className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{ background: "#ECFDF5", color: "#059669" }}
                              >
                                已录入
                              </span>
                            ) : (
                              <span
                                className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{ background: "#F1F5F9", color: "#94A3B8" }}
                              >
                                未录入
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {unsavedCount > 0 && (
        <div
          className="sticky bottom-4 z-40 flex items-center justify-between gap-3 rounded-xl border bg-white px-5 py-3 shadow-lg"
          style={{ borderColor: "#E2E8F0" }}
        >
          <span className="text-sm font-medium" style={{ color: "#0F172A" }}>
            {unsavedCount} 项待保存 · {MONTH_LABELS[month]}
          </span>
          <button
            onClick={handleSaveAll}
            disabled={batchSave.isPending}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#4F46E5" }}
          >
            <Save size={16} />
            {batchSave.isPending ? "保存中..." : "保存全部"}
          </button>
        </div>
      )}
    </div>
  );
}

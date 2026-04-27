import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Users, Trophy, TrendingUp, BarChart3, Globe,
  Calendar, Wallet, ChevronDown, Crown, Award, Star,
  Settings, UserCog,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/providers/trpc";
import type { RankingItem, Category } from "@/types";
import {
  MONTH_LABELS, MARKET_LABELS, CATEGORY_LABELS,
  MARKET_CATEGORY_COMBINATIONS, MONTHS,
} from "@/types";
import StatCard from "@/components/StatCard";
import PerformanceChart from "@/components/PerformanceChart";
import RankingChart from "@/components/RankingChart";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";

const TAB_ICONS: Record<string, React.ReactNode> = {
  PERSONAL: <User size={14} />,
  TEAM: <Users size={14} />,
};

export default function Dashboard() {
  const { isAdmin } = useAuthContext();
  const utils = trpc.useUtils();

  const [activeMarketIdx, setActiveMarketIdx] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | "overall">("overall");
  const [formExpanded, setFormExpanded] = useState(false);
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [leaderboardMarketIdx, setLeaderboardMarketIdx] = useState(0);

  const activeCombo = MARKET_CATEGORY_COMBINATIONS[activeMarketIdx];
  const activeMarket = activeCombo.market;
  const activeCategory = activeCombo.category;

  // tRPC queries
  const { data: competition } = trpc.competition.get.useQuery();
  const { data: participants } = trpc.participant.list.useQuery(
    { type: activeCategory },
    { enabled: !!activeMarket }
  );
  const { data: rankings, isLoading: rankingsLoading } = trpc.capital.rankings.useQuery(
    { market: activeMarket, type: activeCategory, month: activeMonth },
    { enabled: !!activeMarket }
  );
  const { data: allParticipants } = trpc.participant.list.useQuery();

  const leaderboardCombo = MARKET_CATEGORY_COMBINATIONS[leaderboardMarketIdx];
  const { data: leaderboardRankings } = trpc.capital.rankings.useQuery(
    { market: leaderboardCombo.market, type: leaderboardCombo.category, month: "overall" },
    { enabled: true }
  );

  // Mutations
  const saveRecord = trpc.capital.save.useMutation({
    onSuccess: () => {
      utils.capital.rankings.invalidate();
      utils.participant.list.invalidate();
    },
  });

  const createParticipant = trpc.participant.create.useMutation({
    onSuccess: () => utils.participant.list.invalidate(),
  });

  const initialCapital = activeMarket === "A_SHARES"
    ? Number(competition?.initialCapitalAshare ?? 1000000)
    : Number(competition?.initialCapitalUs ?? 1000000);

  const formatCurrency = useCallback((value: number) => {
    if (activeMarket === "A_SHARES") return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [activeMarket]);

  const handleCapitalInput = useCallback((participantId: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [participantId]: value }));
  }, []);

  const handleSaveRecord = useCallback((participantId: number) => {
    const capitalStr = formValues[participantId];
    if (!capitalStr || isNaN(Number(capitalStr))) return;
    const month = activeMonth === "overall" ? 9 : (activeMonth as number);
    saveRecord.mutate({
      participantId,
      market: activeMarket,
      month,
      capital: Number(capitalStr),
    }, {
      onSuccess: () => {
        setFormValues((prev) => ({ ...prev, [participantId]: "" }));
      },
    });
  }, [formValues, activeMonth, activeMarket, saveRecord]);

  // New participant form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Category>("PERSONAL");

  const handleAddParticipant = () => {
    if (!newName.trim()) return;
    createParticipant.mutate({
      name: newName.trim(),
      type: newType,
    }, {
      onSuccess: () => {
        setNewName("");
      },
    });
  };

  // Table columns
  const tableColumns: Column<RankingItem>[] = useMemo(() => [
    {
      key: "name", title: "姓名/团队", align: "left",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#4F46E5" }}>
            {item.participantName.charAt(0)}
          </div>
          <span className="font-medium">{item.participantName}</span>
        </div>
      ),
    },
    {
      key: "current", title: activeMonth === "overall" ? "最终资金" : `${MONTH_LABELS[activeMonth as number]}资金`, align: "right",
      render: (item) => <span className="font-semibold">{formatCurrency(item.currentCapital)}</span>,
    },
    {
      key: "change", title: "累计变动", align: "right",
      render: (item) => (
        <span style={{ color: item.change >= 0 ? "#059669" : "#DC2626" }}>
          {item.change >= 0 ? "+" : ""}{formatCurrency(item.change)}
        </span>
      ),
      sortable: true,
      sortKey: (item) => item.change,
    },
    {
      key: "totalReturn", title: "累计收益率", align: "right",
      render: (item) => (
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{ background: item.totalReturn >= 0 ? "#ECFDF5" : "#FEF2F2", color: item.totalReturn >= 0 ? "#059669" : "#DC2626" }}>
          {item.totalReturn >= 0 ? "+" : ""}{item.totalReturn.toFixed(2)}%
        </span>
      ),
      sortable: true,
      sortKey: (item) => item.totalReturn,
    },
    {
      key: "bestMonth", title: "最佳月份", align: "center",
      render: (item) => item.bestMonth > 0
        ? <span className="text-xs font-medium" style={{ color: "#059669" }}>{MONTH_LABELS[item.bestMonth]}</span>
        : <span className="text-xs" style={{ color: "#CBD5E1" }}>-</span>,
    },
    {
      key: "worstMonth", title: "最差月份", align: "center",
      render: (item) => item.worstMonth > 0
        ? <span className="text-xs font-medium" style={{ color: "#DC2626" }}>{MONTH_LABELS[item.worstMonth]}</span>
        : <span className="text-xs" style={{ color: "#CBD5E1" }}>-</span>,
    },
  ], [activeMonth, formatCurrency]);

  // KPI data
  const safeRankings = rankings || [];
  const topPerformer = safeRankings[0];
  const bestMonthlyReturn = safeRankings.length > 0
    ? Math.max(...safeRankings.map((r) => r.monthRecords.length > 0 ? Math.max(...r.monthRecords.map((m) => m.changePercent)) : 0))
    : 0;
  const avgReturn = safeRankings.length > 0
    ? safeRankings.reduce((sum, r) => sum + r.totalReturn, 0) / safeRankings.length
    : 0;
  const personalCount = allParticipants?.filter((p) => p.type === "PERSONAL").length ?? 0;
  const teamCount = allParticipants?.filter((p) => p.type === "TEAM").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border p-8 sm:p-10"
        style={{ backgroundImage: "url(/hero-pattern.svg)", backgroundRepeat: "repeat", backgroundSize: "400px 400px", borderColor: "rgba(226, 232, 240, 0.8)" }}>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-3xl font-bold sm:text-4xl" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              巅峰杯模拟股票交易大赛
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-2 text-base font-medium" style={{ color: "#64748B" }}>
              2026年4月 — 9月 | A股市场 · 美股市场
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-2 self-start rounded-full px-4 py-2" style={{ background: "#ECFDF5" }}>
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: "#10B981" }} />
            <span className="text-sm font-medium" style={{ color: "#059669" }}>进行中</span>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 mt-6 flex flex-wrap gap-4">
          {[
            { icon: <User size={20} color="#4F46E5" />, label: "参赛个人", value: `${personalCount}人` },
            { icon: <Users size={20} color="#4F46E5" />, label: "参赛团队", value: `${teamCount}队` },
            { icon: <Calendar size={20} color="#4F46E5" />, label: "比赛周期", value: "6个月" },
            { icon: <Wallet size={20} color="#4F46E5" />, label: "起始资金", value: "¥100万 / $100万" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + idx * 0.08 }}
              className="flex items-center gap-3 rounded-xl border bg-white px-5 py-3.5" style={{ borderColor: "#E2E8F0" }}>
              {stat.icon}
              <div>
                <div className="text-xs font-medium" style={{ color: "#94A3B8" }}>{stat.label}</div>
                <div className="text-lg font-bold" style={{ color: "#0F172A" }}>{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <StatCard label="当前冠军" value={topPerformer?.participantName || "-"}
            subtext={topPerformer ? `+${topPerformer.totalReturn.toFixed(2)}% 总收益` : undefined}
            icon={<Trophy size={32} color="#D97706" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <StatCard label="最佳月度收益" value={bestMonthlyReturn} suffix="%" decimals={2}
            icon={<TrendingUp size={32} color="#059669" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <StatCard label="平均收益率" value={avgReturn} suffix="%" decimals={2}
            icon={<BarChart3 size={32} color="#4F46E5" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <StatCard label="活跃市场" value="2个" subtext="A股 · 美股"
            icon={<Globe size={32} color="#6366F1" />} />
        </motion.div>
      </section>

      {/* Admin Panel */}
      {isAdmin && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="overflow-hidden rounded-2xl border"
          style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", borderColor: "rgba(226, 232, 240, 0.8)" }}>
          <div className="border-b px-6 py-4" style={{ borderColor: "#E2E8F0" }}>
            <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: "#0F172A" }}>
              <Settings size={20} color="#4F46E5" /> 管理员工具
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Add Participant */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#334155" }}>
                <UserCog size={16} color="#4F46E5" /> 添加参赛者
              </h3>
              <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="姓名/团队名" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]"
                  style={{ borderColor: "#E2E8F0" }} />
                <select value={newType} onChange={(e) => setNewType(e.target.value as Category)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "#E2E8F0" }}>
                  <option value="PERSONAL">个人</option>
                  <option value="TEAM">团队</option>
                </select>
                <button onClick={handleAddParticipant} disabled={createParticipant.isPending || !newName.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: "#4F46E5" }}>
                  {createParticipant.isPending ? "添加中..." : "添加"}
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: "#94A3B8" }}>
                新参赛者将同时参与 A股 与 美股 两个市场
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Main Tabs */}
      <section className="overflow-hidden rounded-2xl border"
        style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", borderColor: "rgba(226, 232, 240, 0.8)", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)" }}>
        <div className="px-6 pt-5">
          <div className="inline-flex rounded-xl p-1" style={{ background: "#E2E8F0" }}>
            {MARKET_CATEGORY_COMBINATIONS.map((combo, idx) => (
              <button key={`${combo.market}-${combo.category}`} onClick={() => setActiveMarketIdx(idx)}
                className="relative flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: activeMarketIdx === idx ? "#0F172A" : "#64748B",
                  background: activeMarketIdx === idx ? "#FFFFFF" : "transparent",
                  boxShadow: activeMarketIdx === idx ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}>
                {TAB_ICONS[combo.category]}
                {MARKET_LABELS[combo.market]} · {CATEGORY_LABELS[combo.category]}
              </button>
            ))}
          </div>
        </div>

        {/* Month Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto border-b px-6" style={{ borderColor: "#F1F5F9" }}>
          {MONTHS.map((month) => (
            <button key={month} onClick={() => setActiveMonth(month)}
              className="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all"
              style={{ color: activeMonth === month ? "#4F46E5" : "#94A3B8", borderColor: activeMonth === month ? "#4F46E5" : "transparent" }}>
              {MONTH_LABELS[month]}
            </button>
          ))}
          <button onClick={() => setActiveMonth("overall")}
            className="flex items-center gap-1 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all"
            style={{ color: activeMonth === "overall" ? "#4F46E5" : "#94A3B8", borderColor: activeMonth === "overall" ? "#4F46E5" : "transparent" }}>
            <Star size={14} /> 全程
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={`${activeMarketIdx}-${activeMonth}`}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-6">

              {/* Admin Data Entry */}
              {isAdmin && (
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
                  <button onClick={() => setFormExpanded(!formExpanded)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left">
                    <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>
                      {activeMonth === "overall" ? "录入最终数据（9月）" : `录入${MONTH_LABELS[activeMonth as number]}数据`}
                    </span>
                    <motion.div animate={{ rotate: formExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} style={{ color: "#94A3B8" }} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {formExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                        className="overflow-hidden">
                        <div className="border-t px-5 py-4" style={{ borderColor: "#E2E8F0" }}>
                          {!participants || participants.length === 0 ? (
                            <div className="flex flex-col items-center gap-4 py-8">
                              <img src="/empty-state.svg" alt="No participants" className="h-32 w-32 opacity-40" />
                              <p className="text-sm" style={{ color: "#94A3B8" }}>暂无参赛者</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr style={{ background: "#F1F5F9" }}>
                                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: "#64748B" }}>姓名/团队</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: "#64748B" }}>上期资金</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: "#64748B" }}>当月资金</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: "#64748B" }}>盈亏</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: "#64748B" }}>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {participants.map((p) => {
                                      const rankData = safeRankings.find((r) => r.participantId === p.id);
                                      const prevCapital = rankData?.currentCapital ?? initialCapital;
                                      const inputVal = formValues[p.id] || "";
                                      const newCapital = Number(inputVal) || 0;
                                      const change = newCapital > 0 ? newCapital - prevCapital : 0;
                                      return (
                                        <tr key={p.id} className="border-b" style={{ borderColor: "#F1F5F9" }}>
                                          <td className="px-3 py-2.5 font-medium" style={{ color: "#0F172A" }}>{p.name}</td>
                                          <td className="px-3 py-2.5 text-right" style={{ color: "#64748B" }}>{formatCurrency(prevCapital)}</td>
                                          <td className="px-3 py-2.5">
                                            <input type="number" placeholder="输入金额" value={inputVal}
                                              onChange={(e) => handleCapitalInput(p.id, e.target.value)}
                                              className="w-32 rounded-lg border px-3 py-1.5 text-right text-sm outline-none transition-all focus:border-[#4F46E5] focus:ring-2"
                                              style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }} />
                                          </td>
                                          <td className="px-3 py-2.5 text-right font-medium" style={{ color: change >= 0 ? "#059669" : "#DC2626" }}>
                                            {newCapital > 0 ? `${change >= 0 ? "+" : ""}${formatCurrency(change)}` : "-"}
                                          </td>
                                          <td className="px-3 py-2.5 text-right">
                                            <button onClick={() => handleSaveRecord(p.id)} disabled={!inputVal || saveRecord.isPending}
                                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:-translate-y-px disabled:opacity-40"
                                              style={{ background: "#4F46E5" }}>保存</button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.5)", borderColor: "#E2E8F0" }}>
                  <h3 className="mb-4 text-base font-semibold" style={{ color: "#0F172A" }}>资金增长趋势</h3>
                  <PerformanceChart data={safeRankings} initialCapital={initialCapital} />
                </div>
                <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.5)", borderColor: "#E2E8F0" }}>
                  <h3 className="mb-4 text-base font-semibold" style={{ color: "#0F172A" }}>
                    {activeMonth === "overall" ? "综合排名" : `${MONTH_LABELS[activeMonth as number]}排名`}
                  </h3>
                  <RankingChart data={safeRankings} />
                </div>
              </div>

              {/* Data Table */}
              <div>
                <h3 className="mb-3 text-base font-semibold" style={{ color: "#0F172A" }}>
                  {activeMonth === "overall" ? "综合表现" : `${MONTH_LABELS[activeMonth as number]}表现`}
                </h3>
                {rankingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
                  </div>
                ) : (
                  <DataTable columns={tableColumns} data={safeRankings} keyExtractor={(item) => item.participantId} rankAccessor={(item) => item.rank} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Final Leaderboard */}
      <section>
        <div className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #E2E8F0)" }} />
          <div className="flex items-center gap-2">
            <img src="/trophy-icon.svg" alt="Trophy" width="32" height="32" />
            <h2 className="text-2xl font-bold" style={{ color: "#0F172A" }}>巅峰榜 — 最终成绩</h2>
          </div>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, #E2E8F0)" }} />
        </div>

        <p className="mb-6 text-center text-sm font-medium" style={{ color: "#64748B" }}>
          2026年4月 — 9月 综合排名
          <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>最终结果</span>
        </p>

        {/* Leaderboard Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl p-1" style={{ background: "#E2E8F0" }}>
            {MARKET_CATEGORY_COMBINATIONS.map((combo, idx) => (
              <button key={`lb-${combo.market}-${combo.category}`} onClick={() => setLeaderboardMarketIdx(idx)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  color: leaderboardMarketIdx === idx ? "#0F172A" : "#64748B",
                  background: leaderboardMarketIdx === idx ? "#FFFFFF" : "transparent",
                  boxShadow: leaderboardMarketIdx === idx ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}>
                {TAB_ICONS[combo.category]}
                {MARKET_LABELS[combo.market]} · {CATEGORY_LABELS[combo.category]}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        {leaderboardRankings && leaderboardRankings.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="mb-8 flex items-end justify-center gap-4 px-4">
            {/* 2nd */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="flex w-[180px] flex-col items-center rounded-t-2xl border-2 border-[#CBD5E1] p-4"
              style={{ height: "160px", background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)" }}>
              <Award size={28} color="#94A3B8" />
              <span className="mt-1 text-sm font-bold" style={{ color: "#64748B" }}>亚军</span>
              <span className="mt-1 text-sm font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[1].participantName}</span>
              <span className="mt-1 text-lg font-bold" style={{ color: leaderboardRankings[1].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[1].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[1].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardCombo.market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[1].currentCapital / (leaderboardCombo.market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardCombo.market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="flex w-[200px] flex-col items-center rounded-t-2xl border-2 border-[#F59E0B] p-4"
              style={{ height: "200px", background: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)" }}>
              <Crown size={32} color="#F59E0B" />
              <span className="mt-1 text-sm font-bold" style={{ color: "#D97706" }}>冠军</span>
              <span className="mt-1 text-base font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[0].participantName}</span>
              <span className="mt-1 text-xl font-bold" style={{ color: leaderboardRankings[0].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[0].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[0].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardCombo.market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[0].currentCapital / (leaderboardCombo.market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardCombo.market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex w-[180px] flex-col items-center rounded-t-2xl border-2 border-[#D97706] p-4"
              style={{ height: "140px", background: "linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)" }}>
              <Award size={28} color="#D97706" />
              <span className="mt-1 text-sm font-bold" style={{ color: "#C2410C" }}>季军</span>
              <span className="mt-1 text-sm font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[2].participantName}</span>
              <span className="mt-1 text-base font-bold" style={{ color: leaderboardRankings[2].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[2].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[2].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardCombo.market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[2].currentCapital / (leaderboardCombo.market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardCombo.market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Full Table */}
        {leaderboardRankings && (
          <DataTable
            columns={[
              { key: "name", title: "姓名/团队", align: "left", render: (item: RankingItem) => (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#4F46E5" }}>{item.participantName.charAt(0)}</div>
                  <span className="font-medium">{item.participantName}</span>
                </div>
              )},
              { key: "return", title: "总收益率", align: "right", render: (item: RankingItem) => (
                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold" style={{ background: item.totalReturn >= 0 ? "#ECFDF5" : "#FEF2F2", color: item.totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                  {item.totalReturn >= 0 ? "+" : ""}{item.totalReturn.toFixed(2)}%
                </span>
              ), sortable: true, sortKey: (item: RankingItem) => item.totalReturn },
              { key: "best", title: "最佳月份", align: "center", render: (item: RankingItem) => item.bestMonth > 0 ? <span className="text-xs font-medium" style={{ color: "#059669" }}>{MONTH_LABELS[item.bestMonth]}</span> : <span style={{ color: "#CBD5E1" }}>-</span> },
              { key: "worst", title: "最差月份", align: "center", render: (item: RankingItem) => item.worstMonth > 0 ? <span className="text-xs font-medium" style={{ color: "#DC2626" }}>{MONTH_LABELS[item.worstMonth]}</span> : <span style={{ color: "#CBD5E1" }}>-</span> },
            ]}
            data={leaderboardRankings}
            keyExtractor={(item) => item.participantId}
            rankAccessor={(item) => item.rank}
          />
        )}
      </section>
    </div>
  );
}

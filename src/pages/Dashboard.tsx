import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Users, Trophy, TrendingUp, BarChart3, Globe,
  Calendar, Wallet, ChevronDown, Crown, Award, Star,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/providers/trpc";
import type { RankingItem, Market, Category } from "@/types";
import {
  MONTH_LABELS, MONTHS,
} from "@/types";

type Enriched = RankingItem & { market: Market };

type DashTab = {
  key: string;
  label: string;
  category: Category;
  market: Market | null; // null = combined across both markets
};

const TABS: DashTab[] = [
  { key: "personal-a", label: "A股 · 个人", category: "PERSONAL", market: "A_SHARES" },
  { key: "personal-us", label: "美股 · 个人", category: "PERSONAL", market: "US_STOCKS" },
  { key: "team", label: "团队", category: "TEAM", market: null },
];
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

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | "overall">("overall");
  const [formExpanded, setFormExpanded] = useState(false);
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [leaderboardTabIdx, setLeaderboardTabIdx] = useState(0);

  const activeTab = TABS[activeTabIdx];
  const activeCategory = activeTab.category;
  const activeMarket = activeTab.market; // null when team tab (combined)

  // tRPC queries
  const { data: competition } = trpc.competition.get.useQuery();
  const { data: participants } = trpc.participant.list.useQuery(
    { type: activeCategory },
    { enabled: activeMarket !== null }
  );
  // Single-market rankings for personal tabs
  const singleMarketRankingsQ = trpc.capital.rankings.useQuery(
    { market: activeMarket ?? "A_SHARES", type: activeCategory, month: activeMonth },
    { enabled: activeMarket !== null }
  );
  // Both-market team rankings, used by the combined team tab
  const teamARankingsQ = trpc.capital.rankings.useQuery(
    { market: "A_SHARES", type: "TEAM", month: activeMonth },
    { enabled: activeCategory === "TEAM" }
  );
  const teamUSRankingsQ = trpc.capital.rankings.useQuery(
    { market: "US_STOCKS", type: "TEAM", month: activeMonth },
    { enabled: activeCategory === "TEAM" }
  );

  const rankingsLoading = activeMarket !== null
    ? singleMarketRankingsQ.isLoading
    : teamARankingsQ.isLoading || teamUSRankingsQ.isLoading;

  const rawRankings: Enriched[] = useMemo(() => {
    if (activeMarket !== null) {
      return (singleMarketRankingsQ.data ?? []).map((r) => ({ ...r, market: activeMarket }));
    }
    return [
      ...(teamARankingsQ.data ?? []).map((r) => ({ ...r, market: "A_SHARES" as Market })),
      ...(teamUSRankingsQ.data ?? []).map((r) => ({ ...r, market: "US_STOCKS" as Market })),
    ];
  }, [activeMarket, singleMarketRankingsQ.data, teamARankingsQ.data, teamUSRankingsQ.data]);

  const { data: allParticipants } = trpc.participant.list.useQuery();
  const { data: allIndexes } = trpc.marketIndex.list.useQuery();

  // Index lookup by `${market}:${month}` -> changePercent
  const indexByKey = useMemo(() => {
    const m = new Map<string, number>();
    (allIndexes ?? []).forEach((i) => m.set(`${i.market}:${i.month}`, Number(i.changePercent)));
    return m;
  }, [allIndexes]);

  const cumulativeIndexReturn = useCallback(
    (market: "A_SHARES" | "US_STOCKS") => {
      let factor = 1;
      for (const m of MONTHS) {
        const pct = indexByKey.get(`${market}:${m}`);
        if (pct !== undefined) factor *= 1 + pct / 100;
      }
      return (factor - 1) * 100;
    },
    [indexByKey]
  );

  const leaderboardTab = TABS[leaderboardTabIdx];
  const leaderboardSingleQ = trpc.capital.rankings.useQuery(
    { market: leaderboardTab.market ?? "A_SHARES", type: leaderboardTab.category, month: "overall" },
    { enabled: leaderboardTab.market !== null }
  );
  const leaderboardTeamAQ = trpc.capital.rankings.useQuery(
    { market: "A_SHARES", type: "TEAM", month: "overall" },
    { enabled: leaderboardTab.category === "TEAM" }
  );
  const leaderboardTeamUSQ = trpc.capital.rankings.useQuery(
    { market: "US_STOCKS", type: "TEAM", month: "overall" },
    { enabled: leaderboardTab.category === "TEAM" }
  );

  const leaderboardRankings: Enriched[] = useMemo(() => {
    let raw: Enriched[];
    if (leaderboardTab.market !== null) {
      raw = (leaderboardSingleQ.data ?? []).map((r) => ({ ...r, market: leaderboardTab.market as Market }));
    } else {
      raw = [
        ...(leaderboardTeamAQ.data ?? []).map((r) => ({ ...r, market: "A_SHARES" as Market })),
        ...(leaderboardTeamUSQ.data ?? []).map((r) => ({ ...r, market: "US_STOCKS" as Market })),
      ];
    }
    let filtered = raw.filter((r) => r.code);

    if (leaderboardTab.category === "TEAM") {
      filtered = filtered.filter((r) => r.totalReturn > cumulativeIndexReturn(r.market));
    }

    filtered.sort((a, b) => b.totalReturn - a.totalReturn);
    filtered = filtered.map((r, i) => ({ ...r, rank: i + 1 }));

    return leaderboardTab.category === "PERSONAL" ? filtered.slice(0, 3) : filtered;
  }, [leaderboardTab.market, leaderboardTab.category, leaderboardSingleQ.data, leaderboardTeamAQ.data, leaderboardTeamUSQ.data, cumulativeIndexReturn]);

  // Mutations
  const saveRecord = trpc.capital.save.useMutation({
    onSuccess: () => {
      utils.capital.rankings.invalidate();
      utils.participant.list.invalidate();
    },
  });

  const initialFor = useCallback(
    (market: Market) =>
      market === "A_SHARES"
        ? Number(competition?.initialCapitalAshare ?? 1000000)
        : Number(competition?.initialCapitalUs ?? 1000000),
    [competition?.initialCapitalAshare, competition?.initialCapitalUs]
  );

  // For personal tabs: a single market initial capital. For combined team tab,
  // both markets are 1M so any value works for the chart's 4月初 anchor.
  const initialCapital = activeMarket !== null ? initialFor(activeMarket) : 1000000;

  const formatCurrencyFor = useCallback((value: number, market: Market) => {
    if (market === "A_SHARES") return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, []);

  const formatCurrency = useCallback(
    (value: number) => formatCurrencyFor(value, activeMarket ?? "A_SHARES"),
    [formatCurrencyFor, activeMarket]
  );

  const handleCapitalInput = useCallback((participantId: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [participantId]: value }));
  }, []);

  const handleSaveRecord = useCallback((participantId: number) => {
    if (activeMarket === null) return;
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

  // Table columns
  const tableColumns: Column<Enriched>[] = useMemo(() => [
    {
      key: "name", title: "参赛用户名", align: "left",
      render: (item) => {
        const display = item.code ?? `#${item.participantId}`;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#4F46E5" }}>
              {display.charAt(0)}
            </div>
            <span className="font-medium">{display}</span>
          </div>
        );
      },
    },
    ...(activeCategory === "TEAM" ? [{
      key: "market", title: "市场", align: "center" as const,
      render: (item: Enriched) => (
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{
            background: item.market === "A_SHARES" ? "#FEF3C7" : "#DBEAFE",
            color: item.market === "A_SHARES" ? "#D97706" : "#2563EB",
          }}>
          {item.market === "A_SHARES" ? "A股" : "美股"}
        </span>
      ),
    }] : []),
    {
      key: "current", title: activeMonth === "overall" ? "最终资金" : `${MONTH_LABELS[activeMonth as number]}资金`, align: "right",
      render: (item) => <span className="font-semibold">{formatCurrencyFor(item.currentCapital, item.market)}</span>,
    },
    {
      key: "change", title: "累计变动", align: "right",
      render: (item) => (
        <span style={{ color: item.change >= 0 ? "#059669" : "#DC2626" }}>
          {item.change >= 0 ? "+" : ""}{formatCurrencyFor(item.change, item.market)}
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
  ], [activeMonth, formatCurrencyFor, activeCategory]);

  // Public rankings — filter codeless participants, apply per-row team-vs-index
  // filter when in team category, sort by totalReturn, and re-rank.
  // Personal category is capped to top 3.
  const safeRankings: Enriched[] = useMemo(() => {
    let filtered = rawRankings.filter((r) => r.code);

    if (activeCategory === "TEAM") {
      filtered = filtered.filter((r) => {
        if (activeMonth === "overall") {
          return r.totalReturn > cumulativeIndexReturn(r.market);
        }
        const month = activeMonth as number;
        const idxPct = indexByKey.get(`${r.market}:${month}`);
        if (idxPct === undefined) return true;
        const teamMonth = r.monthRecords.find((mr) => mr.month === month);
        if (!teamMonth) return false;
        return teamMonth.changePercent > idxPct;
      });
    }

    filtered.sort((a, b) => b.totalReturn - a.totalReturn);
    filtered = filtered.map((r, i) => ({ ...r, rank: i + 1 }));

    return activeCategory === "PERSONAL" ? filtered.slice(0, 3) : filtered;
  }, [rawRankings, activeCategory, activeMonth, indexByKey, cumulativeIndexReturn]);
  const topPerformer = safeRankings[0];
  const bestMonthlyReturn = safeRankings.length > 0
    ? Math.max(...safeRankings.map((r) => r.monthRecords.length > 0 ? Math.max(...r.monthRecords.map((m) => m.changePercent)) : 0))
    : 0;
  const avgReturn = safeRankings.length > 0
    ? safeRankings.reduce((sum, r) => sum + r.totalReturn, 0) / safeRankings.length
    : 0;
  const personalAshareCount = allParticipants?.filter((p) => p.type === "PERSONAL" && p.aSharesCode).length ?? 0;
  const personalUsCount = allParticipants?.filter((p) => p.type === "PERSONAL" && p.usStocksCode).length ?? 0;
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
            { icon: <User size={20} color="#4F46E5" />, label: "个人 · A股", value: `${personalAshareCount}人` },
            { icon: <User size={20} color="#4F46E5" />, label: "个人 · 美股", value: `${personalUsCount}人` },
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
          <StatCard label="当前冠军" value={topPerformer ? (topPerformer.code ?? `#${topPerformer.participantId}`) : "-"}
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

      {/* Main Tabs */}
      <section className="overflow-hidden rounded-2xl border"
        style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", borderColor: "rgba(226, 232, 240, 0.8)", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)" }}>
        <div className="px-6 pt-5">
          <div className="inline-flex rounded-xl p-1" style={{ background: "#E2E8F0" }}>
            {TABS.map((tab, idx) => (
              <button key={tab.key} onClick={() => setActiveTabIdx(idx)}
                className="relative flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: activeTabIdx === idx ? "#0F172A" : "#64748B",
                  background: activeTabIdx === idx ? "#FFFFFF" : "transparent",
                  boxShadow: activeTabIdx === idx ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}>
                {TAB_ICONS[tab.category]}
                {tab.label}
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
            <motion.div key={`${activeTabIdx}-${activeMonth}`}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-6">

              {/* Admin Data Entry — only available on single-market tabs */}
              {isAdmin && activeMarket !== null && (
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
            {TABS.map((tab, idx) => (
              <button key={`lb-${tab.key}`} onClick={() => setLeaderboardTabIdx(idx)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  color: leaderboardTabIdx === idx ? "#0F172A" : "#64748B",
                  background: leaderboardTabIdx === idx ? "#FFFFFF" : "transparent",
                  boxShadow: leaderboardTabIdx === idx ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}>
                {TAB_ICONS[tab.category]}
                {tab.label}
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
              <span className="mt-1 text-sm font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[1].code ?? `#${leaderboardRankings[1].participantId}`}</span>
              <span className="mt-1 text-lg font-bold" style={{ color: leaderboardRankings[1].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[1].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[1].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardRankings[1].market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[1].currentCapital / (leaderboardRankings[1].market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardRankings[1].market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="flex w-[200px] flex-col items-center rounded-t-2xl border-2 border-[#F59E0B] p-4"
              style={{ height: "200px", background: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)" }}>
              <Crown size={32} color="#F59E0B" />
              <span className="mt-1 text-sm font-bold" style={{ color: "#D97706" }}>冠军</span>
              <span className="mt-1 text-base font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[0].code ?? `#${leaderboardRankings[0].participantId}`}</span>
              <span className="mt-1 text-xl font-bold" style={{ color: leaderboardRankings[0].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[0].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[0].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardRankings[0].market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[0].currentCapital / (leaderboardRankings[0].market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardRankings[0].market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex w-[180px] flex-col items-center rounded-t-2xl border-2 border-[#D97706] p-4"
              style={{ height: "140px", background: "linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)" }}>
              <Award size={28} color="#D97706" />
              <span className="mt-1 text-sm font-bold" style={{ color: "#C2410C" }}>季军</span>
              <span className="mt-1 text-sm font-bold" style={{ color: "#0F172A" }}>{leaderboardRankings[2].code ?? `#${leaderboardRankings[2].participantId}`}</span>
              <span className="mt-1 text-base font-bold" style={{ color: leaderboardRankings[2].totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                {leaderboardRankings[2].totalReturn >= 0 ? "+" : ""}{leaderboardRankings[2].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: "#64748B" }}>
                {leaderboardRankings[2].market === "A_SHARES" ? "¥" : "$"}{(leaderboardRankings[2].currentCapital / (leaderboardRankings[2].market === "A_SHARES" ? 10000 : 1)).toFixed(0)}{leaderboardRankings[2].market === "A_SHARES" ? "万" : ""}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Full Table */}
        {leaderboardRankings && (
          <DataTable
            columns={[
              { key: "name", title: "参赛用户名", align: "left", render: (item: Enriched) => {
                const display = item.code ?? `#${item.participantId}`;
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#4F46E5" }}>{display.charAt(0)}</div>
                    <span className="font-medium">{display}</span>
                  </div>
                );
              }},
              ...(leaderboardTab.category === "TEAM" ? [{
                key: "market", title: "市场", align: "center" as const,
                render: (item: Enriched) => (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: item.market === "A_SHARES" ? "#FEF3C7" : "#DBEAFE",
                      color: item.market === "A_SHARES" ? "#D97706" : "#2563EB",
                    }}>
                    {item.market === "A_SHARES" ? "A股" : "美股"}
                  </span>
                ),
              }] : []),
              { key: "return", title: "总收益率", align: "right", render: (item: Enriched) => (
                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold" style={{ background: item.totalReturn >= 0 ? "#ECFDF5" : "#FEF2F2", color: item.totalReturn >= 0 ? "#059669" : "#DC2626" }}>
                  {item.totalReturn >= 0 ? "+" : ""}{item.totalReturn.toFixed(2)}%
                </span>
              ), sortable: true, sortKey: (item: Enriched) => item.totalReturn },
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

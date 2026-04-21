import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  Trophy,
  TrendingUp,
  BarChart3,
  Globe,
  Calendar,
  Wallet,
  ChevronDown,
  Crown,
  Award,
  Star,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { MonthlyRankingItem } from '@/types';
import {
  MONTH_LABELS,
  MARKET_LABELS,
  CATEGORY_LABELS,
  MARKET_CATEGORY_COMBINATIONS,
} from '@/types';
import {
  getParticipantsByMarketCategory,
  getCompetitionConfig,
  calculateRankings,
  calculateOverallRankings,
  initializeDemoData,
  saveCapitalRecord,
} from '@/lib/dataStore';
import StatCard from '@/components/StatCard';
import PerformanceChart from '@/components/PerformanceChart';
import RankingChart from '@/components/RankingChart';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

const MONTHS = [4, 5, 6, 7, 8, 9];

const TAB_ICONS: Record<string, React.ReactNode> = {
  PERSONAL: <User size={14} />,
  TEAM: <Users size={14} />,
};

export default function Dashboard() {
  // Initialize demo data on first load
  useState(() => {
    initializeDemoData();
  });

  const { isAdmin } = useAuthContext();
  const config = getCompetitionConfig();

  // Active tab states
  const [activeMarketIdx, setActiveMarketIdx] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | 'overall'>('overall');
  const [formExpanded, setFormExpanded] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [leaderboardMarketIdx, setLeaderboardMarketIdx] = useState(0);

  const activeCombination = MARKET_CATEGORY_COMBINATIONS[activeMarketIdx];
  const activeMarket = activeCombination.market;
  const activeCategory = activeCombination.category;

  const participants = useMemo(
    () => getParticipantsByMarketCategory(activeMarket, activeCategory),
    [activeMarket, activeCategory]
  );

  const rankings = useMemo(
    () =>
      activeMonth === 'overall'
        ? calculateRankings(activeMarket, activeCategory, 9)
        : calculateRankings(activeMarket, activeCategory, activeMonth),
    [activeMarket, activeCategory, activeMonth]
  );

  const overallRankings = useMemo(
    () => calculateOverallRankings(activeMarket, activeCategory),
    [activeMarket, activeCategory]
  );

  const leaderboardRankings = useMemo(() => {
    const combo = MARKET_CATEGORY_COMBINATIONS[leaderboardMarketIdx];
    return calculateOverallRankings(combo.market, combo.category);
  }, [leaderboardMarketIdx]);

  // KPI data
  const allParticipants = useMemo(() => {
    const stored = localStorage.getItem('trading_competition_participants');
    return stored ? JSON.parse(stored) : [];
  }, []);

  const topPerformer = overallRankings[0];

  const initialCapital = config.initialCapital[activeMarket];

  // Format currency
  const formatCurrency = useCallback(
    (value: number) => {
      if (activeMarket === 'A_SHARES') {
        return `¥${value.toLocaleString()}`;
      }
      return `$${value.toLocaleString()}`;
    },
    [activeMarket]
  );

  // Form handlers
  const handleCapitalInput = useCallback(
    (participantId: string, value: string) => {
      setFormValues((prev) => ({ ...prev, [participantId]: value }));
    },
    []
  );

  const handleSaveRecord = useCallback(
    (participantId: string) => {
      const capitalStr = formValues[participantId];
      if (!capitalStr || isNaN(Number(capitalStr))) return;

      const month = activeMonth === 'overall' ? 9 : activeMonth;
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return;

      const capital = Number(capitalStr);
      const prevRecords = rankings.find((r) => r.participantId === participantId);
      const previousCapital = prevRecords?.currentCapital ?? initialCapital;
      const change = capital - previousCapital;
      const changePercent = previousCapital > 0 ? (change / previousCapital) * 100 : 0;

      saveCapitalRecord({
        id: `${participantId}_m${month}_${Date.now()}`,
        participantId,
        month,
        capital,
        change,
        changePercent: parseFloat(changePercent.toFixed(2)),
        inputBy: 'admin',
        inputAt: new Date().toISOString(),
      });

      setFormValues((prev) => ({ ...prev, [participantId]: '' }));
      window.location.reload();
    },
    [formValues, activeMonth, participants, rankings, initialCapital]
  );

  // Table columns
  const tableColumns: Column<MonthlyRankingItem>[] = useMemo(
    () => [
      {
        key: 'name',
        title: '姓名/团队',
        align: 'left',
        render: (item) => (
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: '#4F46E5' }}
            >
              {item.participantName.charAt(0)}
            </div>
            <span className="font-medium">{item.participantName}</span>
          </div>
        ),
      },
      {
        key: 'initial',
        title: '期初资金',
        align: 'right',
        render: (item) => formatCurrency(item.initialCapital),
      },
      {
        key: 'current',
        title: activeMonth === 'overall' ? '最终资金' : '本月资金',
        align: 'right',
        render: (item) => (
          <span className="font-semibold">{formatCurrency(item.currentCapital)}</span>
        ),
      },
      {
        key: 'change',
        title: activeMonth === 'overall' ? '累计变动' : '月度变动',
        align: 'right',
        render: (item) => (
          <span style={{ color: item.change >= 0 ? '#059669' : '#DC2626' }}>
            {item.change >= 0 ? '+' : ''}
            {formatCurrency(item.change)}
          </span>
        ),
        sortable: true,
        sortKey: (item) => item.change,
      },
      {
        key: 'changePercent',
        title: '变动率',
        align: 'right',
        render: (item) => (
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              background: item.changePercent >= 0 ? '#ECFDF5' : '#FEF2F2',
              color: item.changePercent >= 0 ? '#059669' : '#DC2626',
            }}
          >
            {item.changePercent >= 0 ? '+' : ''}
            {item.changePercent.toFixed(2)}%
          </span>
        ),
        sortable: true,
        sortKey: (item) => item.changePercent,
      },
      {
        key: 'totalReturn',
        title: '累计收益率',
        align: 'right',
        render: (item) => (
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              background: item.totalReturn >= 0 ? '#ECFDF5' : '#FEF2F2',
              color: item.totalReturn >= 0 ? '#059669' : '#DC2626',
            }}
          >
            {item.totalReturn >= 0 ? '+' : ''}
            {item.totalReturn.toFixed(2)}%
          </span>
        ),
        sortable: true,
        sortKey: (item) => item.totalReturn,
      },
    ],
    [formatCurrency, activeMonth]
  );

  // Leaderboard columns
  const leaderboardColumns = useMemo(
    () => [
      {
        key: 'name',
        title: '姓名/团队',
        align: 'left' as const,
        render: (item: (typeof overallRankings)[0]) => (
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: '#4F46E5' }}
            >
              {item.participantName.charAt(0)}
            </div>
            <span className="font-medium">{item.participantName}</span>
          </div>
        ),
      },
      {
        key: 'initial',
        title: '起始资金',
        align: 'right' as const,
        render: (_item: (typeof overallRankings)[0]) => formatCurrency(initialCapital),
      },
      {
        key: 'final',
        title: '最终资金',
        align: 'right' as const,
        render: (item: (typeof overallRankings)[0]) => (
          <span className="font-bold">{formatCurrency(item.finalCapital)}</span>
        ),
      },
      {
        key: 'totalChange',
        title: '总盈亏',
        align: 'right' as const,
        render: (item: (typeof overallRankings)[0]) => {
          const change = item.finalCapital - initialCapital;
          return (
            <span className="font-bold" style={{ color: change >= 0 ? '#059669' : '#DC2626' }}>
              {change >= 0 ? '+' : ''}
              {formatCurrency(change)}
            </span>
          );
        },
      },
      {
        key: 'totalReturn',
        title: '总收益率',
        align: 'right' as const,
        render: (item: (typeof overallRankings)[0]) => (
          <span
            className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold"
            style={{
              background: item.totalReturn >= 0 ? '#ECFDF5' : '#FEF2F2',
              color: item.totalReturn >= 0 ? '#059669' : '#DC2626',
            }}
          >
            {item.totalReturn >= 0 ? '+' : ''}
            {item.totalReturn.toFixed(2)}%
          </span>
        ),
        sortable: true,
        sortKey: (item: (typeof overallRankings)[0]) => item.totalReturn,
      },
      {
        key: 'bestMonth',
        title: '最佳月份',
        align: 'center' as const,
        render: (item: (typeof overallRankings)[0]) =>
          item.bestMonth > 0 ? (
            <span className="text-xs font-medium" style={{ color: '#059669' }}>
              {MONTH_LABELS[item.bestMonth]}
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              -
            </span>
          ),
      },
      {
        key: 'worstMonth',
        title: '最差月份',
        align: 'center' as const,
        render: (item: (typeof overallRankings)[0]) =>
          item.worstMonth > 0 ? (
            <span className="text-xs font-medium" style={{ color: '#DC2626' }}>
              {MONTH_LABELS[item.worstMonth]}
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              -
            </span>
          ),
      },
    ],
    [formatCurrency, initialCapital]
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ===== HERO SECTION ===== */}
      <section
        className="relative overflow-hidden rounded-2xl border p-8 sm:p-10"
        style={{
          backgroundImage: 'url(/hero-pattern.svg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 400px',
          borderColor: 'rgba(226, 232, 240, 0.8)',
        }}
      >
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            >
              <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                巅峰杯模拟股票交易大赛
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              className="mt-2 text-base font-medium"
              style={{ color: '#64748B' }}
            >
              2026年4月 — 9月 | A股市场 · 美股市场
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-2 self-start rounded-full px-4 py-2"
            style={{ background: '#ECFDF5' }}
          >
            <span
              className="inline-block h-2.5 w-2.5 animate-pulse-dot rounded-full"
              style={{ background: '#10B981' }}
            />
            <span className="text-sm font-medium" style={{ color: '#059669' }}>
              进行中
            </span>
          </motion.div>
        </div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 mt-6 flex flex-wrap gap-4"
        >
          {[
            { icon: <Users size={20} color="#4F46E5" />, label: '参赛人数', value: `${allParticipants.filter((p: {type: string}) => p.type === 'PERSONAL').length}人` },
            { icon: <Users size={20} color="#4F46E5" />, label: '参赛团队', value: `${allParticipants.filter((p: {type: string}) => p.type === 'TEAM').length}队` },
            { icon: <Calendar size={20} color="#4F46E5" />, label: '比赛周期', value: '6个月' },
            { icon: <Wallet size={20} color="#4F46E5" />, label: '起始资金', value: '¥1,000,000 / $100,000' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + idx * 0.08 }}
              className="flex items-center gap-3 rounded-xl border bg-white px-5 py-3.5"
              style={{ borderColor: '#E2E8F0' }}
            >
              {stat.icon}
              <div>
                <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                  {stat.label}
                </div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>
                  {stat.value}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== KPI SUMMARY CARDS ===== */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCard
            label="当前冠军"
            value={topPerformer?.participantName || '-'}
            subtext={topPerformer ? `+${topPerformer.totalReturn.toFixed(2)}% 总收益` : undefined}
            icon={<Trophy size={40} color="#D97706" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatCard
            label="最佳月度收益"
            value={rankings.length > 0 ? Math.max(...rankings.map((r) => r.changePercent)) : 0}
            valueSuffix="%"
            decimals={2}
            icon={<TrendingUp size={40} color="#059669" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatCard
            label="平均收益率"
            value={
              rankings.length > 0
                ? rankings.reduce((sum, r) => sum + r.totalReturn, 0) / rankings.length
                : 0
            }
            valueSuffix="%"
            decimals={2}
            icon={<BarChart3 size={40} color="#4F46E5" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatCard
            label="活跃市场"
            value="2个"
            subtext="A股 · 美股"
            icon={<Globe size={40} color="#6366F1" />}
          />
        </motion.div>
      </section>

      {/* ===== MAIN TAB CONTENT ===== */}
      <section
        className="overflow-hidden rounded-2xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(226, 232, 240, 0.8)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)',
        }}
      >
        {/* Primary Tabs */}
        <div className="px-6 pt-5">
          <div
            className="inline-flex rounded-xl p-1"
            style={{ background: '#E2E8F0' }}
          >
            {MARKET_CATEGORY_COMBINATIONS.map((combo, idx) => (
              <button
                key={`${combo.market}-${combo.category}`}
                onClick={() => setActiveMarketIdx(idx)}
                className="relative flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: activeMarketIdx === idx ? '#0F172A' : '#64748B',
                  background: activeMarketIdx === idx ? '#FFFFFF' : 'transparent',
                  boxShadow:
                    activeMarketIdx === idx
                      ? '0 1px 3px rgba(0,0,0,0.1)'
                      : 'none',
                }}
              >
                {TAB_ICONS[combo.category]}
                {MARKET_LABELS[combo.market]} · {CATEGORY_LABELS[combo.category]}
              </button>
            ))}
          </div>
        </div>

        {/* Month Sub-Tabs */}
        <div
          className="mt-4 flex gap-2 overflow-x-auto border-b px-6"
          style={{ borderColor: '#F1F5F9' }}
        >
          {MONTHS.map((month) => (
            <button
              key={month}
              onClick={() => setActiveMonth(month)}
              className="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all"
              style={{
                color: activeMonth === month ? '#4F46E5' : '#94A3B8',
                borderColor: activeMonth === month ? '#4F46E5' : 'transparent',
              }}
            >
              {MONTH_LABELS[month]}
            </button>
          ))}
          <button
            onClick={() => setActiveMonth('overall')}
            className="flex items-center gap-1 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all"
            style={{
              color: activeMonth === 'overall' ? '#4F46E5' : '#94A3B8',
              borderColor: activeMonth === 'overall' ? '#4F46E5' : 'transparent',
            }}
          >
            <Star size={14} />
            全程
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeMarketIdx}-${activeMonth}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {/* Admin Data Entry Form */}
              {isAdmin && (
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <button
                    onClick={() => setFormExpanded(!formExpanded)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                      录入月度数据
                    </span>
                    <motion.div
                      animate={{ rotate: formExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={18} style={{ color: '#94A3B8' }} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {formExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t px-5 py-4" style={{ borderColor: '#E2E8F0' }}>
                          {participants.length === 0 ? (
                            <div className="flex flex-col items-center gap-4 py-8">
                              <img src="/empty-state.svg" alt="No participants" className="h-32 w-32 opacity-40" />
                              <p className="text-sm" style={{ color: '#94A3B8' }}>
                                暂无参赛者
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr style={{ background: '#F1F5F9' }}>
                                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: '#64748B' }}>姓名/团队</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#64748B' }}>上期资金</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#64748B' }}>本月资金</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#64748B' }}>盈亏金额</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#64748B' }}>盈亏率</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#64748B' }}>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {participants.map((p) => {
                                      const prevRecord = rankings.find((r) => r.participantId === p.id);
                                      const previousCapital = prevRecord?.currentCapital ?? initialCapital;
                                      const newCapital = Number(formValues[p.id]) || 0;
                                      const change = newCapital > 0 ? newCapital - previousCapital : 0;
                                      const changePercent = previousCapital > 0 && newCapital > 0 ? (change / previousCapital) * 100 : 0;

                                      return (
                                        <tr key={p.id} className="border-b" style={{ borderColor: '#F1F5F9' }}>
                                          <td className="px-3 py-2.5 font-medium" style={{ color: '#0F172A' }}>{p.name}</td>
                                          <td className="px-3 py-2.5 text-right" style={{ color: '#64748B' }}>
                                            {formatCurrency(previousCapital)}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <input
                                              type="number"
                                              placeholder="输入资金"
                                              value={formValues[p.id] || ''}
                                              onChange={(e) => handleCapitalInput(p.id, e.target.value)}
                                              className="w-32 rounded-lg border px-3 py-1.5 text-right text-sm outline-none transition-all focus:border-[#4F46E5] focus:ring-2"
                                              style={{
                                                borderColor: '#E2E8F0',
                                                color: '#0F172A',
                                                background: '#FFFFFF',
                                              }}
                                            />
                                          </td>
                                          <td className="px-3 py-2.5 text-right font-medium" style={{ color: change >= 0 ? '#059669' : '#DC2626' }}>
                                            {newCapital > 0 ? `${change >= 0 ? '+' : ''}${formatCurrency(change)}` : '-'}
                                          </td>
                                          <td className="px-3 py-2.5 text-right">
                                            {newCapital > 0 ? (
                                              <span
                                                className="rounded px-2 py-0.5 text-xs font-semibold"
                                                style={{
                                                  background: changePercent >= 0 ? '#ECFDF5' : '#FEF2F2',
                                                  color: changePercent >= 0 ? '#059669' : '#DC2626',
                                                }}
                                              >
                                                {changePercent >= 0 ? '+' : ''}
                                                {changePercent.toFixed(2)}%
                                              </span>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 text-right">
                                            <button
                                              onClick={() => handleSaveRecord(p.id)}
                                              disabled={!formValues[p.id]}
                                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:translate-y-[-1px] disabled:opacity-40"
                                              style={{ background: '#4F46E5' }}
                                            >
                                              保存
                                            </button>
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

              {/* Charts Row */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Line Chart */}
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    borderColor: '#E2E8F0',
                  }}
                >
                  <h3 className="mb-4 text-base font-semibold" style={{ color: '#0F172A' }}>
                    资金增长趋势
                  </h3>
                  <PerformanceChart
                    market={activeMarket}
                    category={activeCategory}
                    months={MONTHS}
                    showAllMonths={activeMonth === 'overall'}
                  />
                </div>

                {/* Bar Chart */}
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    borderColor: '#E2E8F0',
                  }}
                >
                  <h3 className="mb-4 text-base font-semibold" style={{ color: '#0F172A' }}>
                    {activeMonth === 'overall' ? '综合排名' : `${MONTH_LABELS[activeMonth as number]} 排名`}
                  </h3>
                  <RankingChart data={rankings} />
                </div>
              </div>

              {/* Data Table */}
              <div>
                <h3 className="mb-3 text-base font-semibold" style={{ color: '#0F172A' }}>
                  {activeMonth === 'overall' ? '综合表现' : `${MONTH_LABELS[activeMonth as number]} 表现`}
                </h3>
                <DataTable
                  columns={tableColumns}
                  data={rankings}
                  keyExtractor={(item) => item.participantId}
                  rankAccessor={(item) => item.rank}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ===== FINAL LEADERBOARD ===== */}
      <section className="mt-8">
        {/* Divider */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
          <div className="flex items-center gap-2">
            <img src="/trophy-icon.svg" alt="Trophy" width="32" height="32" />
            <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
              巅峰榜 — 最终成绩
            </h2>
          </div>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
        </div>

        <p className="mb-6 text-center text-sm font-medium" style={{ color: '#64748B' }}>
          2026年4月 — 9月 综合排名
          <span
            className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}
          >
            最终结果
          </span>
        </p>

        {/* Leaderboard Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl p-1" style={{ background: '#E2E8F0' }}>
            {MARKET_CATEGORY_COMBINATIONS.map((combo, idx) => (
              <button
                key={`lb-${combo.market}-${combo.category}`}
                onClick={() => setLeaderboardMarketIdx(idx)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  color: leaderboardMarketIdx === idx ? '#0F172A' : '#64748B',
                  background: leaderboardMarketIdx === idx ? '#FFFFFF' : 'transparent',
                  boxShadow: leaderboardMarketIdx === idx ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {TAB_ICONS[combo.category]}
                {MARKET_LABELS[combo.market]} · {CATEGORY_LABELS[combo.category]}
              </button>
            ))}
          </div>
        </div>

        {/* Podium Display */}
        {leaderboardRankings.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex items-end justify-center gap-4 px-4"
          >
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="flex w-[180px] flex-col items-center rounded-t-2xl border-2 border-[#94A3B8] p-4"
              style={{
                height: '160px',
                background: 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)',
              }}
            >
              <Award size={28} color="#94A3B8" />
              <span className="mt-1 text-sm font-bold" style={{ color: '#64748B' }}>
                亚军
              </span>
              <span className="mt-1 text-sm font-bold" style={{ color: '#0F172A' }}>
                {leaderboardRankings[1].participantName}
              </span>
              <span className="mt-1 text-lg font-bold" style={{ color: '#059669' }}>
                +{leaderboardRankings[1].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: '#64748B' }}>
                {formatCurrency(leaderboardRankings[1].finalCapital)}
              </span>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex w-[200px] flex-col items-center rounded-t-2xl border-2 border-[#F59E0B] p-4"
              style={{
                height: '200px',
                background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)',
              }}
            >
              <Crown size={32} color="#F59E0B" />
              <span className="mt-1 text-sm font-bold" style={{ color: '#D97706' }}>
                冠军
              </span>
              <span className="mt-1 text-base font-bold" style={{ color: '#0F172A' }}>
                {leaderboardRankings[0].participantName}
              </span>
              <span className="mt-1 text-xl font-bold" style={{ color: '#059669' }}>
                +{leaderboardRankings[0].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: '#64748B' }}>
                {formatCurrency(leaderboardRankings[0].finalCapital)}
              </span>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex w-[180px] flex-col items-center rounded-t-2xl border-2 border-[#D97706] p-4"
              style={{
                height: '140px',
                background: 'linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)',
              }}
            >
              <Award size={28} color="#D97706" />
              <span className="mt-1 text-sm font-bold" style={{ color: '#C2410C' }}>
                季军
              </span>
              <span className="mt-1 text-sm font-bold" style={{ color: '#0F172A' }}>
                {leaderboardRankings[2].participantName}
              </span>
              <span className="mt-1 text-base font-bold" style={{ color: '#059669' }}>
                +{leaderboardRankings[2].totalReturn.toFixed(2)}%
              </span>
              <span className="mt-1 text-xs" style={{ color: '#64748B' }}>
                {formatCurrency(leaderboardRankings[2].finalCapital)}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Full Ranking Table */}
        <DataTable
          columns={leaderboardColumns}
          data={leaderboardRankings}
          keyExtractor={(item) => item.participantId}
          rankAccessor={(item) => item.rank}
        />
      </section>
    </div>
  );
}

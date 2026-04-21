import { ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-12 w-full border-t px-6 py-6"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div className="mx-auto flex max-w-page flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Left */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" width="80" height="20" className="h-5 w-auto opacity-60" />
          <span className="text-sm font-medium" style={{ color: '#64748B' }}>
            巅峰杯模拟股票交易大赛
          </span>
        </div>

        {/* Center */}
        <div className="text-xs" style={{ color: '#94A3B8' }}>
          数据更新时间: {currentYear}年
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
          <span>Powered by TradingView</span>
          <ExternalLink size={12} />
        </div>
      </div>
    </footer>
  );
}

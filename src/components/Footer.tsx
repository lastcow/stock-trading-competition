export default function Footer() {
  return (
    <footer className="border-t py-6" style={{ borderColor: "#E2E8F0", background: "rgba(255,255,255,0.5)" }}>
      <div className="mx-auto max-w-[1280px] px-6 text-center text-xs" style={{ color: "#94A3B8" }}>
        巅峰杯模拟股票交易大赛 &copy; 2026 | 数据存储于 PostgreSQL | TradingView 实时行情
      </div>
    </footer>
  );
}

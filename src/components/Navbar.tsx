import { useState, useCallback } from 'react';
import { LogIn, LogOut, Shield } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCompetitionConfig } from '@/lib/dataStore';

export default function Navbar() {
  const { isAdmin, login, logout } = useAuthContext();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const config = getCompetitionConfig();
  const endDate = new Date(config.endDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      const success = login(email, password);
      if (success) {
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
      } else {
        setLoginError('邮箱或密码错误');
      }
    },
    [email, password, login]
  );

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(248, 250, 252, 0.92)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        height: '64px',
      }}
    >
      <div className="mx-auto flex h-full max-w-page items-center justify-between px-6">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" width="120" height="30" className="h-[30px] w-auto" />
          <div className="hidden sm:block">
            <div className="text-lg font-bold tracking-tight" style={{ color: '#0F172A' }}>
              巅峰杯
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: '#64748B', letterSpacing: '0.05em' }}
            >
              模拟股票交易大赛
            </div>
          </div>
        </div>

        {/* Right: Status + Timer + Admin */}
        <div className="flex items-center gap-3">
          {/* TradingView badge */}
          <div
            className="hidden items-center gap-2 rounded-full px-3.5 py-1.5 md:flex"
            style={{ background: '#ECFDF5' }}
          >
            <span
              className="inline-block h-2 w-2 animate-pulse-dot rounded-full"
              style={{ background: '#10B981' }}
            />
            <span className="text-xs font-medium" style={{ color: '#059669' }}>
              实时行情
            </span>
          </div>

          {/* Countdown timer */}
          <div className="hidden text-sm font-medium lg:block" style={{ color: '#475569' }}>
            距离比赛结束: <span className="font-semibold" style={{ color: '#0F172A' }}>{daysLeft}天</span>
          </div>

          {/* Admin section */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: '#EEF2FF' }}
              >
                <Shield size={14} style={{ color: '#4F46E5' }} />
                <span className="text-xs font-medium" style={{ color: '#4F46E5' }}>
                  管理员
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:translate-y-[-1px]"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  background: '#FFFFFF',
                }}
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowLoginForm(!showLoginForm)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:translate-y-[-1px]"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  background: '#FFFFFF',
                }}
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">管理员登录</span>
              </button>

              {/* Login dropdown */}
              {showLoginForm && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-5 shadow-lg"
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
                  }}
                >
                  <h3 className="mb-3 text-sm font-semibold" style={{ color: '#0F172A' }}>
                    管理员登录
                  </h3>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <input
                        type="email"
                        placeholder="邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#4F46E5] focus:ring-2"
                        style={{
                          borderColor: '#E2E8F0',
                          color: '#0F172A',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#4F46E5] focus:ring-2"
                        style={{
                          borderColor: '#E2E8F0',
                          color: '#0F172A',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>
                    {loginError && (
                      <p className="text-xs" style={{ color: '#DC2626' }}>
                        {loginError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-all hover:translate-y-[-1px]"
                      style={{ background: '#4F46E5' }}
                    >
                      登录
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

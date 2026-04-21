import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/providers/trpc";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { isAdmin, user, login, logout } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      login(data);
      setShowLogin(false);
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(248, 250, 252, 0.92)",
        backdropFilter: "blur(16px) saturate(180%)",
        borderColor: "rgba(226, 232, 240, 0.6)",
        height: 64,
      }}
    >
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" width="160" height="40" />
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#EEF2FF", color: "#4F46E5" }}
              >
                <ShieldCheck size={14} />
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all hover:bg-slate-100"
                style={{ color: "#64748B" }}
              >
                <LogOut size={16} />
                退出
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-px"
                style={{ background: "#4F46E5" }}
              >
                <LogIn size={16} />
                管理员登录
              </button>
              {showLogin && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl border bg-white p-4 shadow-lg"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
                      style={{ borderColor: "#E2E8F0" }}
                    />
                    <input
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
                      style={{ borderColor: "#E2E8F0" }}
                    />
                    {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
                    <button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: "#4F46E5" }}
                    >
                      {loginMutation.isPending ? "登录中..." : "登录"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmail("joy@zheng.me"); setPassword("Paradise@188"); }}
                      className="text-xs"
                      style={{ color: "#4F46E5" }}
                    >
                      填入默认账号
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

import { useState, useMemo, useCallback } from "react";
import { Navigate, Link } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/providers/trpc";
import { CATEGORY_LABELS, type Category } from "@/types";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  Check,
  X,
  Users,
  User,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from "lucide-react";

type Participant = {
  id: number;
  name: string;
  type: string;
  aSharesCode: string | null;
  usStocksCode: string | null;
  avatar: string | null;
  createdAt: Date;
};

export default function AdminParticipants() {
  const { isAdmin, isLoading } = useAuthContext();
  const utils = trpc.useUtils();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Category>("PERSONAL");
  const [editAShares, setEditAShares] = useState("");
  const [editUsStocks, setEditUsStocks] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Category>("PERSONAL");
  const [newAShares, setNewAShares] = useState("");
  const [newUsStocks, setNewUsStocks] = useState("");

  const { data: participants = [] } = trpc.participant.list.useQuery();

  const flash = useCallback((type: "success" | "error", text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus(null), 3500);
  }, []);

  const invalidate = useCallback(() => {
    utils.participant.list.invalidate();
    utils.capital.rankings.invalidate();
  }, [utils]);

  const createMut = trpc.participant.create.useMutation({
    onSuccess: () => {
      invalidate();
      setNewName("");
      setNewAShares("");
      setNewUsStocks("");
      flash("success", "已添加");
    },
    onError: (e) => flash("error", e.message),
  });

  const updateMut = trpc.participant.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      flash("success", "已保存");
    },
    onError: (e) => flash("error", e.message),
  });

  const deleteMut = trpc.participant.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setPendingDeleteId(null);
      flash("success", "已删除");
    },
    onError: (e) => flash("error", e.message),
  });

  const bulkDeleteMut = trpc.participant.bulkDelete.useMutation({
    onSuccess: (res) => {
      invalidate();
      setSelected(new Set());
      setBulkConfirming(false);
      flash("success", `已删除 ${res.deleted} 位参赛者`);
    },
    onError: (e) => flash("error", e.message),
  });

  const personals = useMemo(
    () => participants.filter((p) => p.type === "PERSONAL"),
    [participants]
  );
  const teams = useMemo(
    () => participants.filter((p) => p.type === "TEAM"),
    [participants]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  function toggleSelect(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditType(p.type as Category);
    setEditAShares(p.aSharesCode ?? "");
    setEditUsStocks(p.usStocksCode ?? "");
  }

  function commitEdit() {
    if (editingId == null) return;
    const name = editName.trim();
    if (!name) {
      flash("error", "名称不能为空");
      return;
    }
    updateMut.mutate({
      id: editingId,
      name,
      type: editType,
      aSharesCode: editAShares.trim() || null,
      usStocksCode: editUsStocks.trim() || null,
    });
  }

  function handleDelete(id: number) {
    if (pendingDeleteId === id) {
      deleteMut.mutate({ id });
    } else {
      setPendingDeleteId(id);
      setTimeout(() => {
        setPendingDeleteId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (bulkConfirming) {
      bulkDeleteMut.mutate({ ids: Array.from(selected) });
    } else {
      setBulkConfirming(true);
      setTimeout(() => setBulkConfirming(false), 3000);
    }
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    createMut.mutate({
      name,
      type: newType,
      aSharesCode: newAShares.trim() || null,
      usStocksCode: newUsStocks.trim() || null,
    });
  }

  const renderRow = (p: Participant) => {
    const isEditing = editingId === p.id;
    const isPendingDelete = pendingDeleteId === p.id;
    const isSelected = selected.has(p.id);

    return (
      <tr key={p.id} className="border-b" style={{ borderColor: "#F1F5F9" }}>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(p.id)}
            disabled={isEditing}
            className="h-4 w-4 cursor-pointer rounded"
            style={{ accentColor: "#4F46E5" }}
          />
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
              style={{ borderColor: "#E2E8F0" }}
            />
          ) : (
            <span className="font-medium" style={{ color: "#0F172A" }}>
              {p.name}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as Category)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ borderColor: "#E2E8F0" }}
            >
              <option value="PERSONAL">个人</option>
              <option value="TEAM">团队</option>
            </select>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                background: p.type === "PERSONAL" ? "#EEF2FF" : "#FEF3C7",
                color: p.type === "PERSONAL" ? "#4F46E5" : "#D97706",
              }}
            >
              {p.type === "PERSONAL" ? <User size={12} /> : <Users size={12} />}
              {CATEGORY_LABELS[p.type as Category]}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              type="text"
              value={editAShares}
              onChange={(e) => setEditAShares(e.target.value)}
              placeholder="A股代号"
              className="w-32 rounded-lg border px-3 py-1.5 font-mono text-xs outline-none focus:border-[#4F46E5]"
              style={{ borderColor: "#E2E8F0" }}
            />
          ) : p.aSharesCode ? (
            <span className="font-mono text-xs" style={{ color: "#0F172A" }}>{p.aSharesCode}</span>
          ) : (
            <span className="text-xs" style={{ color: "#CBD5E1" }}>—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              type="text"
              value={editUsStocks}
              onChange={(e) => setEditUsStocks(e.target.value)}
              placeholder="美股代号"
              className="w-32 rounded-lg border px-3 py-1.5 font-mono text-xs outline-none focus:border-[#4F46E5]"
              style={{ borderColor: "#E2E8F0" }}
            />
          ) : p.usStocksCode ? (
            <span className="font-mono text-xs" style={{ color: "#0F172A" }}>{p.usStocksCode}</span>
          ) : (
            <span className="text-xs" style={{ color: "#CBD5E1" }}>—</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>
          {new Date(p.createdAt).toLocaleDateString("zh-CN")}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={commitEdit}
                  disabled={updateMut.isPending}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: "#059669" }}
                >
                  <Check size={14} />
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: "#F1F5F9", color: "#64748B" }}
                >
                  <X size={14} />
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(p)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:bg-indigo-50"
                  style={{ color: "#4F46E5" }}
                >
                  <Edit3 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleteMut.isPending}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  style={{
                    background: isPendingDelete ? "#FEE2E2" : "transparent",
                    color: "#DC2626",
                  }}
                >
                  {isPendingDelete ? (
                    <>
                      <AlertTriangle size={14} />
                      再点确认
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      删除
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, list: Participant[]) => (
    <section className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#E2E8F0" }}>
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "#E2E8F0" }}
      >
        <h2 className="flex items-center gap-2 text-base font-semibold" style={{ color: "#0F172A" }}>
          {icon}
          {title}
        </h2>
        <span className="text-xs font-medium" style={{ color: "#64748B" }}>
          {list.length} 位
        </span>
      </div>
      {list.length === 0 ? (
        <div className="p-6 text-center text-sm" style={{ color: "#94A3B8" }}>
          暂无
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                  姓名 / 团队
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                  A股代号
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                  美股代号
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748B" }}>
                  添加日期
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#64748B" }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>{list.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );

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
            参赛者管理
          </h1>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMut.isPending}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: bulkConfirming ? "#B91C1C" : "#DC2626" }}
          >
            {bulkConfirming ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
            {bulkConfirming
              ? `再点确认删除 ${selected.size} 项`
              : `删除选中 (${selected.size})`}
          </button>
        )}
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

      {/* Add */}
      <section className="rounded-2xl border bg-white p-6" style={{ borderColor: "#E2E8F0" }}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#334155" }}>
          <UserPlus size={16} color="#4F46E5" /> 添加参赛者
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            placeholder="姓名 / 团队名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 lg:col-span-2"
            style={{ borderColor: "#E2E8F0" }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as Category)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#E2E8F0" }}
          >
            <option value="PERSONAL">个人</option>
            <option value="TEAM">团队</option>
          </select>
          <input
            type="text"
            placeholder="A股代号 (选填)"
            value={newAShares}
            onChange={(e) => setNewAShares(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
            style={{ borderColor: "#E2E8F0" }}
          />
          <input
            type="text"
            placeholder="美股代号 (选填)"
            value={newUsStocks}
            onChange={(e) => setNewUsStocks(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[#4F46E5] focus:ring-2"
            style={{ borderColor: "#E2E8F0" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            新参赛者将同时参与 A股 与 美股 两个市场，代号选填
          </p>
          <button
            onClick={handleAdd}
            disabled={createMut.isPending || !newName.trim()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#4F46E5" }}
          >
            {createMut.isPending ? "添加中..." : "添加"}
          </button>
        </div>
      </section>

      {renderSection("个人", <User size={16} color="#4F46E5" />, personals)}
      {renderSection("团队", <Users size={16} color="#D97706" />, teams)}

      <p className="text-center text-xs" style={{ color: "#94A3B8" }}>
        删除参赛者会同时删除其全部资金记录
      </p>
    </div>
  );
}

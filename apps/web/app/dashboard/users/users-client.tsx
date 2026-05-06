"use client";

import { useEffect, useState } from "react";
import { api, type Branch, type PaginatedResponse } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Role } from "@ims/rbac";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  branchIds: string[];
  isActive: boolean;
  createdAt: string;
}

export default function UsersPageClient() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.SALES_STAFF);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([
        api.get<PaginatedResponse<User>>("users"),
        api.get<PaginatedResponse<Branch>>("branches", { limit: "100" })
      ]);
      setUsers(u.items);
      setBranches(b.items);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const isGlobal = role === Role.ADMIN || role === Role.SUPER_ADMIN;
      await api.post("users", {
        name,
        email,
        password,
        role,
        branchIds: !isGlobal ? selectedBranches : []
      });
      toast("User created successfully");
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole(Role.SALES_STAFF);
      setSelectedBranches([]);
      loadData();
    } catch (err) {
      toast((err as Error).message || "Failed to create user", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage system access and roles</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? "Cancel" : "Add New User"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <form onSubmit={onCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">System Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input-dark">
                  <option value={Role.SUPER_ADMIN}>Super Admin</option>
                  <option value={Role.ADMIN}>Admin</option>
                  <option value={Role.WAREHOUSE_MANAGER}>Warehouse Manager</option>
                  <option value={Role.BRANCH_MANAGER}>Branch Manager</option>
                  <option value={Role.SALES_STAFF}>Sales Staff</option>
                </select>
              </div>

              {(role !== Role.ADMIN && role !== Role.SUPER_ADMIN) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Assigned Branches</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-slate-900/50 rounded-lg border border-white/[0.06]">
                    {branches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedBranches([...selectedBranches, b.id]);
                            else setSelectedBranches(selectedBranches.filter((id) => id !== b.id));
                          }}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button type="submit" disabled={pending} className="btn btn-primary w-full">
                  {pending ? "Creating..." : "Create Account"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Scope</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Loading users...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        (u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN) 
                          ? "bg-indigo-500/10 text-indigo-400" 
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center gap-1.5 text-xs ${u.isActive ? "text-emerald-500" : "text-slate-500"}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`}
                      />
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 italic">
                      {(u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN) ? "Global Access" : `${u.branchIds.length} Branch(es)`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

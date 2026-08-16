"use client";

import React, { useState, useEffect } from "react";
import { Plus, Users, Shield, Key, Check, AlertTriangle, UserCheck, Activity, Eye, EyeOff } from "lucide-react";
import SkeletonTable from "@/components/shared/SkeletonTable";
import { createPortal } from "react-dom";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("users"); // users, rbac
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals Toggles
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  
  // User Form State
  const [selectedUser, setSelectedUser] = useState<any>(null); // null if creating
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRoleId, setUserRoleId] = useState("");
  const [userIsActive, setUserIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Role Form State
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // RBAC Selection State
  const [selectedRbacRole, setSelectedRbacRole] = useState<any>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [updatingRbac, setUpdatingRbac] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const uRes = await fetch("/api/settings/users", { headers: { Authorization: `Bearer ${token}` } });
      const rRes = await fetch("/api/settings/roles", { headers: { Authorization: `Bearer ${token}` } });

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      } else {
        const uData = await uRes.json();
        throw new Error(uData.error || "Failed to load users");
      }

      if (rRes.ok) {
        const rData = await rRes.json();
        setRoles(rData.roles || []);
        setPermissions(rData.permissions || []);
        
        // Auto-select first role for RBAC if none selected
        if (rData.roles && rData.roles.length > 0 && !selectedRbacRole) {
          const firstRole = rData.roles[0];
          setSelectedRbacRole(firstRole);
          setSelectedPermIds(firstRole.permissions.map((rp: any) => rp.permissionId));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, []);

  // Update selected permission checkboxes when RBAC role changes
  useEffect(() => {
    if (selectedRbacRole) {
      // Find matching role in the local roles state to get latest mappings
      const latestRole = roles.find((r) => r.id === selectedRbacRole.id);
      if (latestRole) {
        setSelectedPermIds(latestRole.permissions.map((rp: any) => rp.permissionId));
      }
    }
  }, [selectedRbacRole, roles]);

  const handleOpenUserModal = (user: any = null) => {
    setSelectedUser(user);
    if (user) {
      setUserName(user.name);
      setUserEmail(user.email);
      setUserPassword(""); // Keep blank if not editing password
      setUserRoleId(user.roleId);
      setUserIsActive(user.isActive);
    } else {
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRoleId(roles[0]?.id || "");
      setUserIsActive(true);
    }
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || (!selectedUser && !userPassword) || !userRoleId) {
      alert("Please fill out all required fields.");
      return;
    }

    setSavingUser(true);
    const token = localStorage.getItem("token");
    const url = selectedUser ? `/api/settings/users/${selectedUser.id}` : "/api/settings/users";
    const method = selectedUser ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword || undefined,
          roleId: userRoleId,
          isActive: userIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save user account");

      alert(selectedUser ? "User account updated successfully." : "New user account created successfully.");
      setIsUserModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) {
      alert("Role name is required.");
      return;
    }

    setSavingRole(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "createRole",
          name: roleName,
          description: roleDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create role");

      alert("Role created successfully.");
      setIsRoleModalOpen(false);
      setRoleName("");
      setRoleDesc("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSaveRbacMapping = async () => {
    if (!selectedRbacRole) return;

    setUpdatingRbac(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "updateMapping",
          roleId: selectedRbacRole.id,
          permissionIds: selectedPermIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update RBAC mappings");

      alert("Role permission mapping updated successfully.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingRbac(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">System Settings & Controls</h2>
            <p className="text-xs text-slate-500 mt-1">Configure secure user credentials, passwords, dynamic access privileges, and RBAC mapping</p>
          </div>

          <div className="flex gap-2">
            {activeTab === "users" ? (
              <button
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Create User Account
              </button>
            ) : (
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Add System Role
              </button>
            )}
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 gap-1 pt-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("rbac")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "rbac"
                ? "border-blue-500 text-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <Shield className="w-4 h-4" />
            RBAC Permissions Mapping
          </button>
        </div>
      </div>

      {/* Main content grid */}
      {loading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : error ? (
        <div className="p-8 text-center text-rose-500 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          {error}
        </div>
      ) : activeTab === "users" ? (
        /* ==================== TAB: USER ACCOUNTS ==================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center text-[10px]">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      {user.name}
                    </td>
                    <td className="p-4 text-slate-500 font-mono">{user.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {user.role.name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800/40"
                      }`}>
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenUserModal(user)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-all text-[11px]"
                      >
                        Edit Account / Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================== TAB: RBAC PRIVILEGES ==================== */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left list of system roles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-2">Select System Role</span>
            <div className="space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRbacRole(role)}
                  className={`w-full text-left p-3 rounded-xl transition-all text-xs flex justify-between items-center ${
                    selectedRbacRole?.id === role.id
                      ? "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/10"
                      : "hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-[13px]">{role.name}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedRbacRole?.id === role.id ? "text-blue-100" : "text-slate-400"}`}>
                      {role.description || "No description set"}
                    </div>
                  </div>
                  {selectedRbacRole?.id === role.id && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Right privileges settings panel */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Permissions for: <span className="text-blue-500 font-black">{selectedRbacRole?.name || "No Role Selected"}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Toggle privileges checkboxes and click save to apply changes globally</p>
                </div>

                <button
                  onClick={handleSaveRbacMapping}
                  disabled={updatingRbac || !selectedRbacRole}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                >
                  {updatingRbac ? "Saving..." : "Save Role Permissions"}
                </button>
              </div>

              {selectedRbacRole?.name.toLowerCase() === "admin" ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-semibold flex gap-2">
                  <Activity className="w-5 h-5 flex-shrink-0" />
                  <div>
                    The <span className="font-black">Admin</span> role has complete global access root permissions bypass config.
                    Changes here represent base mapping, but Admins automatically possess all functional scopes.
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {permissions.map((perm) => {
                  const isChecked = selectedPermIds.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer select-none transition-all ${
                        isChecked
                          ? "bg-slate-50/50 dark:bg-slate-950/20 border-blue-500/50 dark:border-blue-500/30"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.id)}
                      />
                      <div>
                        <span className="block text-xs font-black font-mono tracking-wide text-slate-800 dark:text-slate-100">
                          {perm.name}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                          {perm.description || "No description provided"}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE / EDIT USER MODAL ==================== */}
      {mounted && isUserModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedUser ? "Update User Account" : "Create User Account"}
              </h3>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-medium">Set system credentials and access levels for employees.</p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Raza"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ali@hvacerp.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Password {selectedUser && <span className="text-[10px] text-slate-400 font-normal italic">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!selectedUser}
                    placeholder={selectedUser ? "••••••••" : "Enter password"}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">System Role</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={userRoleId}
                    onChange={(e) => setUserRoleId(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    value={userIsActive ? "active" : "inactive"}
                    onChange={(e) => setUserIsActive(e.target.value === "active")}
                  >
                    <option value="active" className="text-emerald-500">ACTIVE</option>
                    <option value="inactive" className="text-slate-400">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  {savingUser ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== CREATE ROLE MODAL ==================== */}
      {mounted && isRoleModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add System Role</h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xl font-bold transition-all p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-medium">Define a new system role category to assign permissions mapping.</p>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Brief description of responsibilities..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-16"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  {savingRole ? "Adding..." : "Add Role"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

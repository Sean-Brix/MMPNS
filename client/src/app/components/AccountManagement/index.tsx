import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, ShieldCheck, Search, Filter,
  CheckCircle2, XCircle, RefreshCw, KeyRound, ChevronDown,
  MoreHorizontal, Eye, EyeOff,
} from 'lucide-react';
import { getAccounts, updateAccountStatus, resetAccountPassword } from '../../../utils/apiClient';
import { CreateAccountForm } from './CreateAccountForm';
import type { UserRole } from '../../../utils/auth';

interface AccountManagementProps {
  callerRole: 'registrar' | 'admin' | 'superadmin';
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher', student: 'Student', principal: 'Principal',
  librarian: 'Librarian', registrar: 'Registrar', admin: 'System Admin',
  security: 'Security', superadmin: 'Superadmin',
};

const ROLE_COLORS: Record<string, string> = {
  teacher:    'bg-emerald-100 text-emerald-800',
  student:    'bg-blue-100 text-blue-800',
  principal:  'bg-green-100 text-green-800',
  librarian:  'bg-amber-100 text-amber-800',
  registrar:  'bg-purple-100 text-purple-800',
  security:   'bg-cyan-100 text-cyan-900',
  admin:      'bg-slate-100 text-slate-800',
  superadmin: 'bg-rose-100 text-rose-800',
};

type Tab = 'all' | 'create';

export const AccountManagement: React.FC<AccountManagementProps> = ({ callerRole }) => {
  const [tab, setTab] = useState<Tab>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Password reset state
  const [resetTarget, setResetTarget] = useState<{ uid: string; displayName: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAccounts();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    let result = [...users];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter((u) => u.status === statusFilter);
    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAccountStatus(user.uid, newStatus);
      setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, status: newStatus } : u));
      setActionMsg(`${user.displayName} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Failed to update status.'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword || resetLoading) return;
    setResetLoading(true);
    try {
      await resetAccountPassword(resetTarget.uid, newPassword);
      setActionMsg(`Password reset for ${resetTarget.displayName}.`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Failed to reset password.'}`);
    } finally {
      setResetLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const uniqueRoles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div className="space-y-4">
      {/* Action feedback */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
          >
            {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['all', 'All Accounts', Users], ['create', 'Create Account', UserPlus]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Create Account */}
      {tab === 'create' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Account</h3>
          <CreateAccountForm
            callerRole={callerRole}
            onCreated={(user) => {
              setUsers((prev) => [...prev, user]);
              setTab('all');
            }}
            onCancel={() => setTab('all')}
          />
        </div>
      )}

      {/* All Accounts */}
      {tab === 'all' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, username, email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={loadUsers} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400">{filteredUsers.length} account{filteredUsers.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading accounts...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No accounts found.</p>
              {searchQuery && <p className="text-gray-400 text-xs mt-1">Try clearing the search filter.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Username</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Last Login</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-gray-600">{user.initials || '??'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                            {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono">{user.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${user.status === 'active' ? 'text-green-700' : 'text-red-600'}`}>
                          {user.status === 'active'
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Never'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition-colors text-xs ${
                              user.status === 'active'
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {user.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setResetTarget({ uid: user.uid, displayName: user.displayName }); setNewPassword(''); }}
                            title="Reset password"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reset Password</h3>
                  <p className="text-xs text-gray-500">{resetTarget.displayName}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showResetPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/30"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowResetPwd(!showResetPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResetTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading || newPassword.length < 6}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#145218] disabled:opacity-60"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

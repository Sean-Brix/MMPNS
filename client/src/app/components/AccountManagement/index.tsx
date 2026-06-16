import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, Search, CheckCircle2, XCircle, RefreshCw,
  KeyRound, Eye, EyeOff, Pencil, Save, X,
} from 'lucide-react';
import { getAccounts, updateAccountStatus, resetAccountPassword, updateAccountProfile } from '../../../utils/apiClient';
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

type AccountStatus = 'active' | 'inactive';

interface AccountEditForm {
  uid: string;
  role: UserRole;
  username: string;
  status: AccountStatus;
  firstName: string;
  middleName: string;
  lastName: string;
  extension: string;
  email: string;
  contactNumber: string;
  department: string;
  position: string;
  employeeId: string;
  advisoryClass: string;
  subjects: string;
  lrn: string;
  noOfSiblings: string;
  monthlyFamilyIncome: string;
  province: string;
  city: string;
  gradeLevel: string;
  section: string;
  gender: string;
  guardianName: string;
  guardianContact: string;
}

const EDITABLE_ROLES_BY_CALLER: Record<AccountManagementProps['callerRole'], UserRole[]> = {
  registrar: ['teacher', 'principal', 'librarian', 'admin'],
  admin: ['teacher', 'student', 'principal', 'librarian', 'registrar', 'security', 'admin'],
  superadmin: ['teacher', 'student', 'principal', 'librarian', 'registrar', 'security', 'admin', 'superadmin'],
};

const STAFF_DETAIL_ROLES = new Set<UserRole>(['teacher', 'principal', 'librarian', 'registrar', 'security', 'admin']);
const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/30 focus:border-[#185C20] transition-all';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

const valueOf = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const numberOrZero = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  const [editForm, setEditForm] = useState<AccountEditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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

  const startEditing = (user: any) => {
    setEditForm({
      uid: user.uid,
      role: user.role,
      username: user.username || user.studentCode || '',
      status: user.status === 'inactive' ? 'inactive' : 'active',
      firstName: valueOf(user.firstName),
      middleName: valueOf(user.middleName),
      lastName: valueOf(user.lastName),
      extension: valueOf(user.extension),
      email: valueOf(user.email),
      contactNumber: valueOf(user.contactNumber),
      department: valueOf(user.department),
      position: valueOf(user.position),
      employeeId: valueOf(user.employeeId),
      advisoryClass: valueOf(user.advisoryClass),
      subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : valueOf(user.subjects),
      lrn: valueOf(user.lrn),
      noOfSiblings: valueOf(user.noOfSiblings),
      monthlyFamilyIncome: valueOf(user.monthlyFamilyIncome),
      province: valueOf(user.province),
      city: valueOf(user.city),
      gradeLevel: valueOf(user.gradeLevel),
      section: valueOf(user.section),
      gender: valueOf(user.gender),
      guardianName: valueOf(user.guardianName),
      guardianContact: valueOf(user.guardianContact),
    });
  };

  const updateEditForm = (field: keyof AccountEditForm, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editForm || editLoading) return;

    const username = editForm.username.trim().toLowerCase();
    if (!username) {
      setActionMsg(editForm.role === 'student' ? 'Student login code is required.' : 'Username is required.');
      setTimeout(() => setActionMsg(''), 4000);
      return;
    }

    const payload: Record<string, any> = {
      role: editForm.role,
      username,
      status: editForm.status,
      firstName: editForm.firstName.trim(),
      middleName: editForm.middleName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim(),
      contactNumber: editForm.contactNumber.trim(),
    };

    if (editForm.role === 'student') {
      payload.extension = editForm.extension.trim();
      payload.lrn = editForm.lrn.trim();
      payload.noOfSiblings = numberOrZero(editForm.noOfSiblings);
      payload.monthlyFamilyIncome = numberOrZero(editForm.monthlyFamilyIncome);
      payload.province = editForm.province.trim();
      payload.city = editForm.city.trim();
      payload.gradeLevel = editForm.gradeLevel.trim();
      payload.section = editForm.section.trim();
      payload.gender = editForm.gender.trim();
      payload.guardianName = editForm.guardianName.trim();
      payload.guardianContact = editForm.guardianContact.trim();
    }

    if (STAFF_DETAIL_ROLES.has(editForm.role)) {
      payload.department = editForm.department.trim();
      payload.position = editForm.position.trim();
    }

    if (editForm.role === 'teacher') {
      payload.employeeId = editForm.employeeId.trim();
      payload.advisoryClass = editForm.advisoryClass.trim();
      payload.subjects = editForm.subjects
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean);
    }

    setEditLoading(true);
    try {
      const res = await updateAccountProfile(editForm.uid, payload);
      setUsers((prev) => prev.map((user) => (user.uid === editForm.uid ? res.user : user)));
      setEditForm(null);
      setActionMsg(`${res.user.displayName || username} has been updated.`);
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Failed to update account.'}`);
    } finally {
      setEditLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const uniqueRoles = Array.from(new Set(users.map((u) => u.role)));
  const editableRoles = EDITABLE_ROLES_BY_CALLER[callerRole] || [];

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
                    <React.Fragment key={user.uid}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
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
                              onClick={() => startEditing(user)}
                              title="Edit details"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
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
                              onClick={() => {
                                const isSameTarget = resetTarget?.uid === user.uid;
                                setResetTarget(isSameTarget ? null : { uid: user.uid, displayName: user.displayName });
                                setNewPassword('');
                                setShowResetPwd(false);
                              }}
                              title="Reset password"
                              className={`p-1.5 rounded-lg transition-colors ${
                                resetTarget?.uid === user.uid
                                  ? 'text-[#185C20] bg-[#185C20]/10'
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {resetTarget?.uid === user.uid && (
                        <tr className="bg-[#185C20]/[0.03]">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-col md:flex-row md:items-end gap-3">
                              <div className="md:w-72">
                                <label className={labelClass}>New Password for {resetTarget.displayName}</label>
                                <div className="relative">
                                  <input
                                    type={showResetPwd ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className={`${inputClass} pr-10`}
                                    minLength={6}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowResetPwd(!showResetPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    title={showResetPwd ? 'Hide password' : 'Show password'}
                                  >
                                    {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setResetTarget(null)}
                                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleResetPassword}
                                  disabled={resetLoading || newPassword.length < 6}
                                  className="px-3 py-2 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#145218] disabled:opacity-60"
                                >
                                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Account Modal */}
      <AnimatePresence>
        {editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Edit Account Details</h3>
                  <p className="text-xs text-gray-500 mt-1">Update profile, login, status, and role-specific details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => updateEditForm('role', e.target.value)}
                      className={inputClass}
                    >
                      {Array.from(new Set([editForm.role, ...editableRoles])).map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{editForm.role === 'student' ? 'Student Login Code' : 'Username'}</label>
                    <input
                      value={editForm.username}
                      onChange={(e) => updateEditForm('username', e.target.value)}
                      className={inputClass}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => updateEditForm('status', e.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identity</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input value={editForm.firstName} onChange={(e) => updateEditForm('firstName', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Middle Name</label>
                      <input value={editForm.middleName} onChange={(e) => updateEditForm('middleName', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input value={editForm.lastName} onChange={(e) => updateEditForm('lastName', e.target.value)} className={inputClass} />
                    </div>
                    {editForm.role === 'student' && (
                      <div>
                        <label className={labelClass}>Extension</label>
                        <input value={editForm.extension} onChange={(e) => updateEditForm('extension', e.target.value)} className={inputClass} placeholder="Jr., III, etc." />
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => updateEditForm('email', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Contact Number</label>
                      <input value={editForm.contactNumber} onChange={(e) => updateEditForm('contactNumber', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>

                {STAFF_DETAIL_ROLES.has(editForm.role) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Staff Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Department</label>
                        <input value={editForm.department} onChange={(e) => updateEditForm('department', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Position</label>
                        <input value={editForm.position} onChange={(e) => updateEditForm('position', e.target.value)} className={inputClass} />
                      </div>
                      {editForm.role === 'teacher' && (
                        <>
                          <div>
                            <label className={labelClass}>Employee ID</label>
                            <input value={editForm.employeeId} onChange={(e) => updateEditForm('employeeId', e.target.value)} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Advisory Class</label>
                            <input value={editForm.advisoryClass} onChange={(e) => updateEditForm('advisoryClass', e.target.value)} className={inputClass} />
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>Subjects</label>
                            <input
                              value={editForm.subjects}
                              onChange={(e) => updateEditForm('subjects', e.target.value)}
                              className={inputClass}
                              placeholder="Comma-separated"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {editForm.role === 'student' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>LRN</label>
                        <input value={editForm.lrn} onChange={(e) => updateEditForm('lrn', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Grade Level</label>
                        <input value={editForm.gradeLevel} onChange={(e) => updateEditForm('gradeLevel', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Section</label>
                        <input value={editForm.section} onChange={(e) => updateEditForm('section', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Gender</label>
                        <input value={editForm.gender} onChange={(e) => updateEditForm('gender', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>No. of Siblings</label>
                        <input type="number" min="0" value={editForm.noOfSiblings} onChange={(e) => updateEditForm('noOfSiblings', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Monthly Family Income</label>
                        <input type="number" min="0" value={editForm.monthlyFamilyIncome} onChange={(e) => updateEditForm('monthlyFamilyIncome', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Province</label>
                        <input value={editForm.province} onChange={(e) => updateEditForm('province', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input value={editForm.city} onChange={(e) => updateEditForm('city', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Guardian Contact</label>
                        <input value={editForm.guardianContact} onChange={(e) => updateEditForm('guardianContact', e.target.value)} className={inputClass} />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Guardian Name</label>
                        <input value={editForm.guardianName} onChange={(e) => updateEditForm('guardianName', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
                <button onClick={() => setEditForm(null)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#145218] disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {editLoading ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

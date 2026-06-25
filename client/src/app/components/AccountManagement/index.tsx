import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, Search, CheckCircle2, XCircle, RefreshCw,
  KeyRound, Eye, EyeOff, Pencil, Save, X, Trash2,
} from 'lucide-react';
import { getAccounts, updateAccountStatus, resetAccountPassword, updateAccountProfile, deleteAccount } from '../../../utils/apiClient';
import { CreateAccountForm } from './CreateAccountForm';
import { getStoredSession, type UserRole } from '../../../utils/auth';
import {
  useRowSelection, SelectCheckbox, BulkEditField, ConfirmDialog,
  runBulk, summarizeBulk,
} from '../common/BulkActions';
import { Pagination } from '../registrar/shared';

interface AccountManagementProps {
  callerRole: 'registrar' | 'admin' | 'superadmin';
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher', student: 'Student', principal: 'Principal',
  librarian: 'Librarian', registrar: 'Multi-Role', admin: 'System Admin',
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

const ACCOUNT_PAGE_SIZE = 10;
const STAFF_DETAIL_ROLES = new Set<UserRole>(['teacher', 'principal', 'librarian', 'registrar', 'security', 'admin']);
const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/30 focus:border-[#185C20] transition-all';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

// Fields that are safe to apply to many accounts at once. Unique fields
// (username/login code, email, LRN, employee ID) are intentionally excluded —
// every account needs its own distinct value, so bulk-setting them is invalid.
type BulkFieldKey = 'status' | 'department' | 'position' | 'gradeLevel' | 'section' | 'province' | 'city';

const BULK_TEXT_FIELDS: Array<{ key: BulkFieldKey; label: string; appliesTo: 'staff' | 'student'; placeholder?: string }> = [
  { key: 'department', label: 'Department', appliesTo: 'staff' },
  { key: 'position',   label: 'Position',   appliesTo: 'staff' },
  { key: 'gradeLevel', label: 'Grade Level', appliesTo: 'student', placeholder: 'e.g. Grade 7' },
  { key: 'section',    label: 'Section',     appliesTo: 'student', placeholder: 'e.g. St. Anne' },
  { key: 'province',   label: 'Province',    appliesTo: 'student' },
  { key: 'city',       label: 'City',        appliesTo: 'student' },
];

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
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Password reset state
  const [resetTarget, setResetTarget] = useState<{ uid: string; displayName: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [editForm, setEditForm] = useState<AccountEditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Bulk selection / editing
  const selection = useRowSelection<string>();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkEnabled, setBulkEnabled] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | 'edit' | 'delete'>(null);
  const currentUsername = (getStoredSession()?.username || '').toLowerCase();

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAccounts({
        page,
        pageSize: ACCOUNT_PAGE_SIZE,
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(res.users || []);
      setTotalUsers(res.total ?? res.users?.length ?? 0);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, roleFilter, statusFilter]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAccountStatus(user.uid, newStatus);
      setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, status: newStatus } : u));
      setActionMsg(`${user.displayName} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
      void loadUsers();
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
      void loadUsers();
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Failed to update account.'}`);
    } finally {
      setEditLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalUsers / ACCOUNT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const uniqueRoles = Object.keys(ROLE_LABELS);
  const editableRoles = EDITABLE_ROLES_BY_CALLER[callerRole] || [];

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  // ─── Bulk selection ───────────────────────────────────────────────────────────
  const editableRoleSet = useMemo(() => new Set(editableRoles), [editableRoles]);

  // A row can be bulk-selected only if the caller may edit that role, and it is
  // not the caller's own account (protects against self-deactivation/deletion).
  const isSelectable = useCallback(
    (user: any) => editableRoleSet.has(user.role) && (user.username || '').toLowerCase() !== currentUsername,
    [editableRoleSet, currentUsername],
  );

  const selectableUsers = useMemo(() => filteredUsers.filter(isSelectable), [filteredUsers, isSelectable]);
  const selectedUsers = useMemo(
    () => filteredUsers.filter((u) => selection.isSelected(u.uid)),
    [filteredUsers, selection.isSelected],
  );

  // Drop selections for rows no longer visible/selectable (filter, refresh, delete).
  useEffect(() => {
    selection.retain(selectableUsers.map((u) => u.uid));
  }, [selectableUsers, selection.retain]);

  const allVisibleSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selection.isSelected(u.uid));
  const someVisibleSelected = selectableUsers.some((u) => selection.isSelected(u.uid));

  const openBulkEdit = () => {
    setBulkValues({ status: 'active' });
    setBulkEnabled(new Set());
    setBulkEditOpen(true);
  };

  const toggleBulkField = (key: string, enabled: boolean) => {
    setBulkEnabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const buildBulkPayload = (): Record<string, any> => {
    const payload: Record<string, any> = {};
    bulkEnabled.forEach((key) => {
      const value = bulkValues[key] ?? '';
      payload[key] = key === 'status' ? value : value.trim();
    });
    return payload;
  };

  const performBulkEdit = async () => {
    const payload = buildBulkPayload();
    const uids = selectedUsers.map((u) => u.uid);
    setBulkBusy(true);
    try {
      const updatedById = new Map<string, any>();
      const result = await runBulk(uids, async (uid) => {
        const res = await updateAccountProfile(uid, payload);
        updatedById.set(uid, res.user);
      });
      setUsers((prev) => prev.map((u) => updatedById.get(u.uid) || u));
      setActionMsg(summarizeBulk('Updated', result));
      void loadUsers();
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Bulk update failed.'}`);
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
      setBulkEditOpen(false);
      selection.clear();
      setTimeout(() => setActionMsg(''), 5000);
    }
  };

  const performBulkDelete = async () => {
    const targets = [...selectedUsers];
    const uids = targets.map((u) => u.uid);
    setBulkBusy(true);
    try {
      const succeeded = new Set<string>();
      const result = await runBulk(uids, async (uid) => {
        await deleteAccount(uid);
        succeeded.add(uid);
      });
      setUsers((prev) => prev.filter((u) => !succeeded.has(u.uid)));
      setTotalUsers((prev) => Math.max(0, prev - succeeded.size));
      setActionMsg(summarizeBulk('Deleted', result));
      void loadUsers();
    } catch (err: any) {
      setActionMsg(`Error: ${err?.message || 'Bulk delete failed.'}`);
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
      selection.clear();
      setTimeout(() => setActionMsg(''), 5000);
    }
  };

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
              setUsers((prev) => [user, ...prev]);
              setTotalUsers((prev) => prev + 1);
              setTab('all');
              void loadUsers();
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
            <span className="text-xs text-gray-400">{totalUsers} account{totalUsers !== 1 ? 's' : ''}</span>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {selection.count > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-[#185C20]/5 border-b border-[#185C20]/10"
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="text-sm font-medium text-[#185C20]">
                    {selection.count} selected
                  </span>
                  <button
                    onClick={openBulkEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#185C20] text-white text-xs font-medium hover:bg-[#145218] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit selected
                  </button>
                  <button
                    onClick={() => setConfirmBulk('delete')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete selected
                  </button>
                  <button
                    onClick={() => selection.clear()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <th className="w-10 px-4 py-3">
                      <SelectCheckbox
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        onChange={() => selection.setMany(selectableUsers.map((u) => u.uid), !allVisibleSelected)}
                        disabled={selectableUsers.length === 0}
                        className="accent-[#185C20]"
                        ariaLabel="Select all accounts"
                      />
                    </th>
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
                      <tr className={`transition-colors ${selection.isSelected(user.uid) ? 'bg-[#185C20]/[0.04]' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <SelectCheckbox
                            checked={selection.isSelected(user.uid)}
                            onChange={() => selection.toggle(user.uid)}
                            disabled={!isSelectable(user)}
                            className="accent-[#185C20]"
                            title={isSelectable(user) ? 'Select account' : 'This account cannot be bulk-edited'}
                            ariaLabel={`Select ${user.displayName}`}
                          />
                        </td>
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
                          <td colSpan={7} className="px-4 py-3">
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
            <Pagination
              page={safePage}
              pageCount={pageCount}
              totalItems={totalUsers}
              pageSize={ACCOUNT_PAGE_SIZE}
              onChange={setPage}
            />
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

      {/* Bulk Edit Modal */}
      <AnimatePresence>
        {bulkEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Edit {selection.count} account{selection.count === 1 ? '' : 's'}</h3>
                  <p className="text-xs text-gray-500 mt-1">Enable a field to apply the same value to every selected account.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkEditOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Unique fields (username / login code, email, LRN, employee ID) cannot be bulk-edited — each account needs its own value.
                  Role-specific fields are only applied to accounts of the matching role.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <BulkEditField
                    label="Status"
                    enabled={bulkEnabled.has('status')}
                    onToggle={(en) => toggleBulkField('status', en)}
                    accentClass="accent-[#185C20]"
                  >
                    <select
                      value={bulkValues.status || 'active'}
                      onChange={(e) => setBulkValues((p) => ({ ...p, status: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </BulkEditField>

                  {BULK_TEXT_FIELDS.map((field) => (
                    <BulkEditField
                      key={field.key}
                      label={field.label}
                      hint={field.appliesTo === 'staff' ? 'Staff accounts only' : 'Student accounts only'}
                      enabled={bulkEnabled.has(field.key)}
                      onToggle={(en) => toggleBulkField(field.key, en)}
                      accentClass="accent-[#185C20]"
                    >
                      <input
                        value={bulkValues[field.key] || ''}
                        onChange={(e) => setBulkValues((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    </BulkEditField>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
                <button onClick={() => setBulkEditOpen(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={() => setConfirmBulk('edit')}
                  disabled={bulkEnabled.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#145218] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Apply to {selection.count} account{selection.count === 1 ? '' : 's'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk confirmations */}
      <ConfirmDialog
        open={confirmBulk === 'edit'}
        title="Apply bulk changes"
        message={`Apply the selected field changes to ${selection.count} account${selection.count === 1 ? '' : 's'}? Fields that don't match an account's role are skipped.`}
        confirmLabel="Apply changes"
        busy={bulkBusy}
        onConfirm={performBulkEdit}
        onCancel={() => setConfirmBulk(null)}
      />
      <ConfirmDialog
        open={confirmBulk === 'delete'}
        title="Delete accounts"
        intent="danger"
        message={`Permanently delete ${selection.count} account${selection.count === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={bulkBusy}
        onConfirm={performBulkDelete}
        onCancel={() => setConfirmBulk(null)}
      />
    </div>
  );
};
